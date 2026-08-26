/**
 * Equity prices — the one thing this platform could never read for free.
 *
 * Every other source here is keyless. Per-company share prices are not: no
 * provider publishes them without a credential under terms that permit
 * automated access, and the one keyless option (Stooq) began serving a bot
 * challenge, which is an access control and not something to route around.
 *
 * So this adapter is the platform's only keyed source, and it behaves like the
 * SEC ones do when their condition is unmet: it skips itself, records why, and
 * lets every other source run. Nothing downstream fabricates a price in its
 * absence — the companies screen keeps saying it has none.
 *
 *   INTEL_EQUITY_KEY            the primary provider's key
 *   INTEL_EQUITY_PROVIDER       finnhub (default) | alphavantage
 *   INTEL_EQUITY_KEY_FALLBACK   optional key for the other provider, which is
 *                               then asked for whatever the first could not answer
 *
 * The key is read from the environment and used only here, in the pipeline.
 * It is never written into the JSON snapshots and never reaches the browser.
 *
 * WHY FINNHUB IS THE DEFAULT. Alpha Vantage's free tier is 25 requests per day,
 * which cannot cover 27 companies even once. Finnhub's is 60 per minute, which
 * covers them comfortably. Alpha Vantage is still implemented because it was
 * asked for, but it will need several days to fill the screen.
 */

import { getJson } from "../lib/http.js";
import { emptyResult } from "../lib/schema.js";
import { TRACKED } from "./sec.js";

const KEY = (process.env.INTEL_EQUITY_KEY || "").trim();
/** An optional second key, so the fallback provider can have its own. */
const FALLBACK_KEY = (process.env.INTEL_EQUITY_KEY_FALLBACK || "").trim();
const PROVIDER = (process.env.INTEL_EQUITY_PROVIDER || "finnhub").trim().toLowerCase();

/**
 * Depositary receipts represent a fixed number of ordinary shares, and the
 * ratio is not in any filing this pipeline reads. Multiplying an ADR price by
 * the ordinary share count from a 20-F overstates market capitalisation by
 * exactly that ratio — a five-fold error for TSM, silently.
 *
 * So a company flagged here never gets a locally computed market cap. It gets
 * the provider's figure if the provider supplies one (the provider knows the
 * ratio), and otherwise it gets a price and no valuation, with the reason said
 * out loud rather than a number that looks fine and is wrong.
 */
const DEPOSITARY_RECEIPTS = new Set(["TSM", "ASML"]);

const PROVIDERS = {
  finnhub: {
    label: "Finnhub",
    sourceId: "finnhub",
    site: "https://finnhub.io/docs/api",
    /** Quote is one call; the profile carries currency, share count and cap. */
    async read(ticker, key) {
      const quote = await getJson(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${key}`);
      if (!quote.ok) return { error: quote.error };
      const price = Number(quote.json?.c);
      // Finnhub answers an unknown symbol with zeroes rather than an error.
      if (!Number.isFinite(price) || price <= 0) return { error: "no quote returned" };

      const profile = await getJson(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${key}`);
      const p = profile.ok ? profile.json || {} : {};

      return {
        price,
        previousClose: Number.isFinite(Number(quote.json?.pc)) ? Number(quote.json.pc) : null,
        changePct: Number.isFinite(Number(quote.json?.dp)) ? Number(quote.json.dp) : null,
        // Finnhub timestamps the quote in seconds; a missing one means today's.
        asOf: quote.json?.t ? new Date(quote.json.t * 1000).toISOString() : new Date().toISOString(),
        currency: p.currency || "USD",
        exchange: p.exchange || null,
        // Reported in millions of the listing currency.
        marketCap: Number.isFinite(Number(p.marketCapitalization))
          ? Number(p.marketCapitalization) * 1e6 : null,
        sharesOutstanding: Number.isFinite(Number(p.shareOutstanding))
          ? Number(p.shareOutstanding) * 1e6 : null,
      };
    },
  },

  alphavantage: {
    label: "Alpha Vantage",
    sourceId: "alphavantage",
    site: "https://www.alphavantage.co/documentation/",
    async read(ticker, key) {
      const response = await getJson(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${key}`);
      if (!response.ok) return { error: response.error };

      // Alpha Vantage returns 200 with a Note or Information field when the
      // daily allowance is spent. Treating that as data would write nothing,
      // silently, for every remaining ticker.
      const throttle = response.json?.Note || response.json?.Information;
      if (throttle) return { error: `rate limited: ${String(throttle).slice(0, 120)}`, fatal: true };

      const quote = response.json?.["Global Quote"] || {};
      const price = Number(quote["05. price"]);
      if (!Number.isFinite(price) || price <= 0) return { error: "no quote returned" };

      return {
        price,
        previousClose: Number(quote["08. previous close"]) || null,
        changePct: Number(String(quote["10. change percent"] || "").replace("%", "")) || null,
        asOf: quote["07. latest trading day"]
          ? `${quote["07. latest trading day"]}T21:00:00.000Z` : new Date().toISOString(),
        // GLOBAL_QUOTE carries no currency; every tracked ticker is US-listed.
        currency: "USD",
        exchange: null,
        marketCap: null,
        sharesOutstanding: null,
      };
    },
  },
};

/**
 * The chain: the configured provider first, then the other one for whatever it
 * could not answer. They fail differently — Finnhub returns zeroes for a symbol
 * it does not carry, Alpha Vantage stops dead when its daily allowance is spent
 * — so a second provider genuinely recovers tickers rather than just retrying.
 *
 * Each may carry its own key: INTEL_EQUITY_KEY for the primary,
 * INTEL_EQUITY_KEY_FALLBACK for the second. With only one key set, the fallback
 * is skipped rather than being sent a credential that is not its own.
 */
function chain() {
  const primary = PROVIDERS[PROVIDER];
  if (!primary) return [];
  const other = Object.values(PROVIDERS).find((entry) => entry !== primary);
  const steps = [{ provider: primary, key: KEY }];
  if (other && FALLBACK_KEY) steps.push({ provider: other, key: FALLBACK_KEY });
  return steps;
}

export default {
  id: "equities", label: "Equity prices", sourceId: PROVIDERS[PROVIDER]?.sourceId || "finnhub", tier: 2,

  async run() {
    const result = { ...emptyResult(), prices: [] };

    if (!PROVIDERS[PROVIDER]) {
      return {
        ...result, skipped: true,
        notes: [`Unknown INTEL_EQUITY_PROVIDER "${PROVIDER}". Use finnhub or alphavantage.`],
      };
    }

    if (!KEY) {
      return {
        ...result, skipped: true,
        notes: [
          "Skipped: no INTEL_EQUITY_KEY set, so there are no share prices and the companies "
          + `screen will continue to say so. Get a free key from ${PROVIDERS[PROVIDER].site} and `
          + "set INTEL_EQUITY_KEY to enable valuation.",
        ],
      };
    }

    const notes = [];
    const got = new Map();
    let remaining = Object.keys(TRACKED);
    const total = remaining.length;

    for (const { provider, key } of chain()) {
      if (!remaining.length) break;
      const failed = [];

      for (const ticker of remaining) {
        const reading = await provider.read(ticker, key);

        if (reading.error) {
          failed.push(ticker);
          // A spent daily allowance fails every remaining ticker identically,
          // so stopping keeps the note readable and the provider unbothered.
          if (reading.fatal) {
            notes.push(`${provider.label} stopped at ${ticker}: ${reading.error}`);
            // Everything not yet reached is still outstanding for the next provider.
            for (const rest of remaining.slice(remaining.indexOf(ticker) + 1)) failed.push(rest);
            break;
          }
          continue;
        }

        got.set(ticker, {
          ticker,
          price: Number(reading.price.toPrecision(9)),
          previousClose: reading.previousClose,
          changePct: reading.changePct,
          currency: reading.currency,
          exchange: reading.exchange,
          asOf: reading.asOf,
          marketCap: reading.marketCap,
          sharesOutstanding: reading.sharesOutstanding,
          // Read by the valuation layer, which refuses to compute a market cap
          // for these from a filed ordinary-share count.
          isDepositaryReceipt: DEPOSITARY_RECEIPTS.has(ticker),
          sourceId: provider.sourceId,
          providerLabel: provider.label,
        });
      }

      const recovered = remaining.length - failed.length;
      if (chain().length > 1) {
        notes.push(`${provider.label}: ${recovered} of ${remaining.length} quoted`);
      }
      remaining = [...new Set(failed)];
    }

    if (remaining.length) {
      notes.push(`No quote from any provider for ${remaining.length} of ${total}: `
        + remaining.slice(0, 8).join(", ") + (remaining.length > 8 ? " and more" : ""));
    }

    result.prices = [...got.values()];
    if (!result.prices.length) {
      return { ...result, skipped: true, notes: notes.length ? notes : ["No quotes returned."] };
    }

    return { ...result, notes };
  },
};
