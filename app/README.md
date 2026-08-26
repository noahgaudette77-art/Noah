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

**Runs on real data, or says it has none.** Seven institutional sources answer
without any credential: the US Treasury daily yield curve, Federal Reserve and ECB
press feeds, Bank of Canada rates and FX, SEC EDGAR filings, World Bank
indicators, arXiv preprints. Where data is genuinely unavailable — equity and
commodity prices — the view is empty and names what is missing. Nothing is filled
in with a plausible-looking number.

**Teaches.** 57 concepts at four genuinely different depths, 14 historical
lessons, and a quiz that generates unlimited questions from the world model with
answers checkable against an authored mechanism. Mastery decays if you do not
revisit it, because that is what actually happens to knowledge.

## Getting real data in

```bash
INTEL_CONTACT="you@example.com" node pipeline/run.js --brief
```

`INTEL_CONTACT` is only for the SEC, whose access policy requires a contact
address in the User-Agent. Without it the SEC adapter skips itself and records why;
every other source still runs.

For automation, set `INTEL_CONTACT` as a repository variable and let
`.github/workflows/intelligence.yml` run it — weekdays for the daily layer, Monday
for the weekly brief. It commits the JSON snapshots back to the repo.

## Keyboard

`⌘K` or `/` command palette · `?` shortcuts · `1`–`9` jump to a section ·
`Esc` close.

## Caveats, stated plainly

Model output enumerates transmission channels and ranks them by plausibility. It
is not a forecast, its numbers are relative weights inside one authored model, and
nothing here is investment advice. Edges are analytical judgements with stated
confidence, not measured coefficients.

Progress, watchlists, forecasts and research live in your browser's local storage
and are exportable as JSON. Nothing about what you read leaves the device.

See [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) for how it is put together
and why.
