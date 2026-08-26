# Meridian — architecture

A personal intelligence platform: primary-source signal, an authored causal model
of the world, and a learning system built on top of both.

It lives in `app/` and does not touch the storefront that occupies the repository
root. Serving `app/index.html` from any static host is the whole deployment.

---

## 1. The assessment this started from

The repository was a static, dependency-free storefront: hand-rolled build script,
no framework, no bundler, no runtime dependencies, deployed by dropping files on a
host. That constraint turned out to be the right one to keep. A data-dense reading
application benefits far more from loading instantly and being inspectable than
from a component framework, and a zero-dependency posture removes the largest
supply-chain risk a project like this would otherwise carry.

So: **vanilla ES modules, no build step, no dependencies**. The browser's own
module loader does the code splitting; views are dynamically imported on
navigation. The trade-off is a hand-written ~100-line hyperscript layer instead of
a framework, and hand-drawn SVG charts instead of a charting library. Both were
worth it — the charts in particular could not look like this if a library were
drawing them.

---

## 2. The honesty constraint, and what it forced

The brief's most important instruction was: do not build a beautiful interface
full of fabricated data and call it finished. That single constraint determined
most of the architecture.

**What it ruled out.** Equity index levels, commodity prices, volatility. There is
no source publishing them without credentials under terms permitting automated
access. The one free option began serving a bot challenge mid-build; working
around an access control was not on the table. So those views are empty, the
empty states name what is missing and what would fill it, and the adapter slot
exists in the data layer for whenever a key is configured.

**What it ruled in.** A surprising amount. Every one of these answers without a
credential:

| Source | What it gives | Verified |
|---|---|---|
| US Treasury | The full daily par yield curve, every tenor | ✓ |
| Federal Reserve | Press releases, statements, speeches | ✓ |
| ECB | Press feed, and euro reference exchange rates | ✓ |
| Bank of Canada | Policy rate, benchmark yields, USD/CAD | ✓ |
| SEC EDGAR | Company filings for tracked issuers | ✓ (needs a contact address) |
| World Bank | Long-run structural indicators | ✓ |
| arXiv | Recent preprints in ML and adjacent fields | ✓ |

That is enough for a real yield curve, a real 2s10s spread, real currency series,
real policy documents and real corporate disclosure. All of it tier 1 — published
by the institution that created the fact.

**The third category** is content that is neither live data nor fabrication:
economics, history, and the structure of how things transmit. The Federal Reserve
was created in 1913. Duration measures price sensitivity to yield. Higher oil
prices raise gasoline prices and pressure airlines. None of that needs an API, and
writing it down is not inventing it. That is where most of the application's
substance lives, and it is why the platform is useful on the first run, before any
pipeline has executed.

---

## 3. The world model

The differentiator. `app/src/content/world-nodes.js` and `world-edges.js` define
**137 variables and 217 typed causal edges**, hand-authored. Every edge carries:

```js
e("mortgage_rate", "housing_activity", -1, 0.8, 3, "high",
  "Buyers finance a monthly payment, not a price; higher rates price out
   marginal buyers immediately.")
//  ^sign  ^strength  ^lag in months  ^confidence  ^the mechanism
```

The `why` field is not documentation — it is the claim. It appears in the
interface wherever the edge is used, so no chain is ever asserted without its
reason attached.

`domain/propagate.js` walks the graph from a shock, damping 0.72 per hop and
stepping confidence down beyond the second, and returns effects ordered by
salience with the path that produced each. Because contributions from independent
routes are summed, the engine also detects when two chains disagree about the sign
and flags the node as **contested** — which is a finding, not a defect: it
identifies exactly the question a real analyst would argue about.

This one model does a great deal of work:

- **Simulator / what-if** — propagate a shock, list assumptions.
- **Connect the dots** — every route between two variables, weakest link named.
- **Macro → company** — sector and industry nodes are on the same graph.
- **Story ranking** — a development's `consequence` score is how far its subject
  propagates, so an FOMC statement outranks an enforcement action structurally
  rather than by keyword weight.
- **Quiz generation** — questions derived from edges, with a correct answer
  checkable against an authored mechanism. No model invents a question and then
  grades its own answer.
- **Challenge scoring** — a free-text answer is matched against the enumerated
  consequences, and the interface shows the chains the reader missed.

The pipeline imports the same modules the browser does. One model, two consumers.

---

## 4. The pipeline

```
sources → dedupe → entity link → cluster → rank → JSON snapshots → static client
```

`pipeline/run.js` orchestrates seven adapters. A source that fails is recorded in
the manifest and the run continues; the client reads the manifest and tells the
reader exactly what is missing. Notable properties:

- **Rate limiting per host**, with stricter gaps for hosts that ask for them.
- **403 treated as transient** — several public APIs use it for throttling.
- **SEC skips itself** when `INTEL_CONTACT` is unset, because their access policy
  requires a contact address. The pipeline honours that rather than routing
  around it.
- **Partial runs merge.** `--only=boc` carries forward what the skipped sources
  wrote last time rather than deleting it. Cluster identity is derived from the
  lead item, not a loop index, so merging is idempotent.

Stage detail: deduplication is URL-canonical plus title Jaccard; clustering is
agglomerative with **average link** (single link chains unrelated stories through
a bridge item); entity linking is an authored lexicon, deliberately not a model,
because a wrong link silently corrupts every downstream chain.

Ranking decomposes into six components and every score is explainable in prose —
`explainScore()` produces the sentence the interface shows.

**Automation.** `.github/workflows/intelligence.yml` runs weekdays for the daily
layer and Mondays for the brief, then commits the snapshots. No server, no
database, no secrets beyond an optional contact address.

---

## 5. The learning system

Scores are designed to be hard to game, because a score you can farm is not
feedback. Opening a page earns 4 XP; answering a hard question correctly earns 26;
mastery decays between reviews on a simplified SM-2 schedule capped at 120 days —
this material is about a changing world, so "learned forever" is not an available
state.

The Global Knowledge Score has four components so no single behaviour moves it
much: **depth** (average mastery), **breadth** (domains genuinely represented),
**retention** (whether mastery survives between reviews) and **reasoning**
(scenario questions, which test transfer rather than recall).

Corpus: 57 concepts at four genuinely different explanation depths — the expert
level is the argument professionals are still having, not a longer version of the
beginner one — plus 14 historical lessons, 40 authored questions written against
misconceptions, and unbounded generated questions from the world model.

---

## 6. Layout

```
app/
  index.html            single entry, ES module bootstrap
  styles/               tokens → base → components
  src/
    core/               dom, store, router, format          (no domain knowledge)
    domain/             worldmodel, propagate, learning,
                        quiz, confidence                    (no DOM)
    content/            the authored corpus                 (data only)
    data/               registry, loader, status vocabulary
    ui/                 shell, palette, search, charts,
                        components, views
data/                   pipeline output, committed
pipeline/               sources, stages, orchestrator, brief
tests/browser.mjs       routes, layout and interaction checks
```

`domain/` never imports from `ui/`, and `ui/` never fetches. The pipeline imports
`domain/` and `content/` directly, which is why the ranking in Node and the
simulation in the browser cannot drift apart.

---

## 7. Running it

```bash
node scripts/serve.js                  # http://localhost:4173/app/index.html
INTEL_CONTACT=you@example.com \
  node pipeline/run.js --brief         # fetch real data, write snapshots
npm run check                          # syntax-check every module
npm run test:browser                   # needs playwright installed separately
```

The application works before the pipeline has ever run. Views that need data show
what is missing and the command that produces it.

---

## 8. What is deliberately not here

- **No prices.** Explained above. The slot exists; it is empty on purpose.
- **No LLM at runtime.** Nothing in the browser calls a model. Summaries,
  explanations, questions and chains are authored or derived. An optional
  server-side analysis stage can be added to the pipeline, where a key can be held
  safely — it would never run in the client.
- **No accounts, no server, no database.** Progress is local storage, exportable
  as JSON. Nothing about what you read leaves the device.
- **No probabilities on risks.** The risk radar ranks reach, not likelihood,
  because a made-up probability is worse than none.

---

## 9. What I would build next

1. **A keyed market-data adapter** behind the existing provider interface —
   equities, commodities and volatility, which are the largest genuine gap.
2. **A server-side AI stage in the pipeline** for summarisation and entity
   extraction, with output labelled as model-generated and every claim still
   carrying its source. The client stays model-free.
3. **Forecast resolution against the archive** — the scorecard currently relies on
   the user resolving their own claims; the archive already holds enough to
   resolve some automatically.
4. **Widening the world model.** 217 edges cover the macro-financial and AI-energy
   chains well and healthcare, defence and agriculture thinly. The format makes
   extension mechanical.
