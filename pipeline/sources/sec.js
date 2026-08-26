/**
 * SEC EDGAR — the primary record for US corporate disclosure.
 *
 * Tracked companies are chosen because they sit on a node in the world model,
 * so a filing can be attached to a transmission chain. That is coverage, not a
 * recommendation, and the interface says so wherever the list appears.
 *
 * EDGAR requires a declaring User-Agent and asks for modest request rates; the
 * shared HTTP layer serialises per host and spaces requests accordingly.
 */
import { getJson, hasContact } from "../lib/http.js";
import { filing, emptyResult } from "../lib/schema.js";

const TICKER_MAP = "https://www.sec.gov/files/company_tickers.json";
const SUBMISSIONS = (cik) => `https://data.sec.gov/submissions/CIK${String(cik).padStart(10, "0")}.json`;

/** ticker → the world-model node the company's economics attach to. */
export const TRACKED = {
  NVDA: "accelerators", AMD: "accelerators", AVGO: "networking", TSM: "foundry",
  ASML: "semicap", AMAT: "semicap", LRCX: "semicap", MU: "hbm",
  MSFT: "cloud_capex", GOOGL: "cloud_capex", AMZN: "cloud_capex", META: "ai_capex",
  ORCL: "cloud_capex", DLR: "data_center_reits", EQIX: "data_center_reits",
  VRT: "dc_cooling", ETN: "grid_equipment", GEV: "gas_turbines", CEG: "nuclear_power",
  NEE: "utilities", CAT: "industrials", FCX: "copper", XOM: "energy_sector",
  CVX: "energy_sector", JPM: "banks", UNP: "transports", DE: "agriculture",
};

const FORMS_OF_INTEREST = new Set([
  "8-K", "10-Q", "10-K", "S-1", "S-4", "SC 13D", "SC 13G", "DEF 14A", "6-K", "20-F",
]);

export default {
  id: "sec", label: "SEC EDGAR", sourceId: "sec-edgar", tier: 1,

  async run({ maxCompanies = 26, sinceDays = 21 } = {}) {
    const result = emptyResult();
    const notes = [];

    if (!hasContact) {
      return {
        ...result,
        skipped: true,
        notes: ["Skipped: SEC's access policy requires a contact address in the User-Agent. " +
                "Set INTEL_CONTACT to an email address and re-run."],
      };
    }

    const map = await getJson(TICKER_MAP);
    if (!map.ok) return { ...result, notes: [`ticker map: ${map.error}`] };

    const cikByTicker = new Map();
    for (const entry of Object.values(map.json || {})) {
      if (entry?.ticker) cikByTicker.set(entry.ticker.toUpperCase(), entry);
    }

    const cutoff = Date.now() - sinceDays * 86_400_000;
    const tickers = Object.keys(TRACKED).slice(0, maxCompanies);

    for (const ticker of tickers) {
      const entry = cikByTicker.get(ticker);
      if (!entry) { notes.push(`${ticker}: not found in EDGAR ticker map`); continue; }

      const response = await getJson(SUBMISSIONS(entry.cik_str));
      if (!response.ok) { notes.push(`${ticker}: ${response.error}`); continue; }

      const recent = response.json?.filings?.recent;
      if (!recent?.form) continue;

      const name = response.json.name || entry.title;
      for (let i = 0; i < recent.form.length && i < 40; i++) {
        const form = recent.form[i];
        const filedAt = recent.filingDate[i];
        if (!FORMS_OF_INTEREST.has(form)) continue;
        if (Date.parse(filedAt) < cutoff) break;             // list is newest-first
        result.filings.push(filing({
          company: name, ticker, cik: String(entry.cik_str), form, filedAt,
          description: recent.primaryDocDescription?.[i] || recent.items?.[i] || "",
          url: `https://www.sec.gov/Archives/edgar/data/${entry.cik_str}/${String(recent.accessionNumber[i]).replace(/-/g, "")}/${recent.primaryDocument[i]}`,
        }));
      }
    }

    result.filings.sort((a, b) => (a.filedAt < b.filedAt ? 1 : -1));
    return { ...result, notes, tracked: TRACKED };
  },
};
