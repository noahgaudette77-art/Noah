# Meridian

A personal intelligence platform. Primary-source signal, an authored causal model
of the world, and a learning system built on top of both.

Open `app/index.html` on any static host. There is no build step, no framework and
no runtime dependency.

```bash
node scripts/serve.js       # → http://localhost:4173/app/index.html
```

## What it does

**Answers "and then what?"** — 137 macro, sector, commodity and technology
variables connected by 217 authored causal edges, each with a stated mechanism,
lag and confidence. A shock propagates through it and returns first-, second- and
third-order consequences ranked by plausibility, with the chain that produced
each one. Where independent routes disagree about the sign, it says so.

**Runs on real data, or says it has none.** Eight institutional sources answer
without any credential: the US Treasury daily yield curve, Federal Reserve and ECB
press feeds, Bank of Canada rates and FX, SEC EDGAR filings, World Bank
indicators, arXiv preprints, and FRED for equity indices, volatility, commodities,
credit spreads, real yields and the core macro set. Series that arrive under
someone else's copyright — S&P Dow Jones, Nasdaq, CBOE, ICE — carry that holder
through to an Attribution panel, because that is the condition they come under.
Where data is genuinely unavailable — per-company share prices — the view is empty
and names what is missing. Nothing is filled in with a plausible-looking number.

**Screens companies on what they filed.** Revenue, margins, cash flow and
balance sheet for 26 companies, pulled from SEC XBRL and going back over a
decade, each attached to the model variable its economics depend on. There is no
per-company price, so there is no valuation — the screen says so everywhere, and
the categories that would need one are listed as unavailable rather than
approximated.

**Argues with itself.** Ten live debates state consensus and the case against it
at full strength, each ending with what would settle it. Alongside them, the
model derives which consequences of the week's material are underappreciated —
and which are already priced, because most claims presented as contrarian are
first-order effects in costume.

**Answers questions.** Ask it "what happens if oil rises", "how does AI capital
expenditure affect copper", "who is exposed to electricity demand", "what am I
missing". No language model is involved: the question is routed to an intent and
the answer assembled from the model and the corpora. It cannot invent an
answer — and it will tell you it does not know rather than bluff.

**Teaches.** 57 concepts at four genuinely different depths, 14 historical
lessons, seven ordered curriculum tracks, and a quiz that generates unlimited
questions from the world model with answers checkable against an authored
mechanism. Mastery decays if you do not revisit it, because that is what actually
happens to knowledge.

## Getting real data in

```bash
INTEL_CONTACT="you@example.com" node pipeline/run.js --brief
```

`INTEL_CONTACT` is only for the SEC, whose access policy requires a contact
address in the User-Agent. Without it the SEC adapters skip themselves and record
why; every other source still runs.

Run a single adapter with `--only=fred`. Partial runs merge rather than
overwrite: what the skipped sources wrote last time is carried forward, and so are
their recorded gaps, so re-running one adapter cannot quietly clear a failure
notice by not looking.

Company fundamentals refresh weekly rather than daily — they change four times a
year, and re-fetching four megabytes per company every morning to re-read the
same number is not a reasonable use of someone else's servers. Force one with
`node pipeline/run.js --fundamentals`.

For automation, set `INTEL_CONTACT` as a repository variable and let
`.github/workflows/intelligence.yml` run it — weekdays for the daily layer, Monday
for the weekly brief. It commits the JSON snapshots back to the repo.

## Keyboard

`⌘K` or `/` command palette (type a question and it offers to answer it) ·
`?` shortcuts · `0`–`9` jump to a section · `Esc` close.

## Caveats, stated plainly

Model output enumerates transmission channels and ranks them by plausibility. It
is not a forecast, its numbers are relative weights inside one authored model, and
nothing here is investment advice. Edges are analytical judgements with stated
confidence, not measured coefficients.

Progress, watchlists, forecasts and research live in your browser's local storage
and are exportable as JSON. Nothing about what you read leaves the device.

See [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) for how it is put together
and why.
