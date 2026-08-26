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

**What it ruled out.** Per-company share prices, and therefore every valuation
multiple. No source publishes them without credentials under terms permitting
automated access; the one free option began serving a bot challenge mid-build,
and working around an access control was not on the table. So the companies
screen ranks fundamentals and says, in the interface itself, that there is no
price here and what that costs you. It does not approximate one.

That gap used to be much wider — index levels, volatility and commodities were
all missing too, until FRED turned out to redistribute them without a key. The
lesson generalised: the boundary between "impossible without credentials" and
"available all along" moved twice during this build, both times by reading terms
of service rather than assuming them.

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
| FRED (St. Louis Fed) | 28 curated series: equity indices, VIX, commodities, credit spreads, real yields, breakevens, and the core macro set | ✓ |

That is enough for a real yield curve, a real 2s10s spread, real currency series,
real policy documents, real corporate disclosure, and — through FRED — real
equity, volatility, commodity and credit series. All of it tier 1: published by
the institution that created the fact, or redistributed by one under a licence
that names the originator.

**Attribution is a condition, not a footnote.** Much of what FRED redistributes is
copyrighted by someone else — S&P Dow Jones Indices, Nasdaq, CBOE, ICE, the IMF,
Freddie Mac, the Chicago Fed. The adapter carries each series' copyright holder
and its FRED page through to the client, and the markets view renders an
Attribution panel grouping every series by holder, with public-domain US
government series listed separately. Using the data without that panel would
breach the terms it arrives under.

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

`pipeline/run.js` orchestrates eight daily adapters plus a weekly fundamentals pass. A source that fails is recorded in
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
- **Gaps survive partial runs too.** The manifest carries forward the *failure*
  records of sources it skipped, marked with when they were recorded. Without
  that, re-running one adapter would clear "one source is failing" from the
  status bar by not looking — the exact failure mode the manifest exists to
  prevent.
- **Empty CSV fields are rejected before coercion.** FRED marks a missing
  observation as an empty field or `.`, and `Number("")` is `0`, which is finite.
  Coercing first turned every market holiday into a price of zero — a spike that
  looked like a crash. The parser rejects the raw string before it becomes a
  number, and legitimate zeros (the Chicago Fed's financial conditions index sits
  around zero by construction; the 10-year real yield genuinely touched 0.00% in
  January 2020) survive.
- **Thinning is cadence-aware.** Long daily series are thinned outside a recent
  window to keep the payload sane. Applying that to a monthly series silently
  redefined its derived year-over-year change, because a month-over-month
  difference became a ten-month one. The thinner measures the median gap between
  observations first and leaves anything slower than roughly three weeks alone.
- **Soft rejections are retried.** Several public services return 403 or 406
  under load rather than as real authorisation or content-negotiation failures;
  the same URL and headers succeed seconds later. Treating those as permanent
  silently drops a source, so they are retried with backoff and only recorded as
  a gap if they persist.

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

## 5. Companies, without a price

The most useful thing EDGAR gives away is XBRL company facts: revenue, margins,
cash flow, balance sheet and share counts exactly as filed, going back over a
decade, for anyone who declares a contact address. That is enough for a real
fundamental screen — 26 companies, each attached to the world-model node its
economics actually depend on.

What it is not enough for is valuation, and the interface says so on every
surface that shows a number. Without a price there is no multiple, no yield, no
market capitalisation. The profile score is a **percentile rank within the
covered universe** across growth, profitability, cash generation, returns,
balance sheet and consistency — a rank, not a rating, and silent on whether
anything is cheap. Categories that would need a price (Undervalued, Contrarian,
High risk / high potential) are listed as unavailable rather than approximated.

Three things in the extractor are load-bearing and were only discovered by
running it:

- **Tag fallbacks.** Filers move between XBRL concepts as standards change. A
  single-tag extractor silently truncates a company's history at the year it
  switched, and the truncation looks like data rather than like a bug.
- **One currency per company.** TSM files the same fact in TWD and USD with very
  different coverage. Mixing them produced a −96% revenue growth rate that was
  arithmetically fine and completely wrong. The dominant currency is now chosen
  once and every monetary metric locked to it — which also means absolute
  revenue is not comparable across filers, while every ratio is.
- **Tickers move.** `XOM` currently resolves to a newly-registered holding
  entity with no filing history. Rather than render a mysteriously blank row, it
  is excluded, named, and explained.

The per-company page pairs the filed figures with a **research frame** rather
than a thesis: the model supplies what drives and what pressures that company's
node, each with its mechanism and confidence, plus the modelled risks that
actually reach it. The argument is left to the reader, which is the only honest
division of labour when the platform cannot see a price.

---

## 6. Contrarian, curriculum, ask

Three surfaces built on top of what already existed rather than beside it.

**Contrarian** has two halves. Ten authored debates state consensus and the case
against it at their strongest, and each ends with what would settle it — the only
part of an opinion that does any work, and the part almost always missing. The
derived half asks the model which consequences of this week's material are
*underappreciated*, on the heuristic that markets price first-order effects
within hours, so what survives as an edge is well-evidenced, several steps out
and slow. It names specific nodes precisely so the heuristic can be checked. It
also names what is **already priced**, because most claims presented as
contrarian are first-order effects in costume.

**Curriculum** answers a different question from the gap ranker. Gaps say what
you are weakest at; tracks say what to learn *in what order*, which matters
because most of these ideas are only comprehensible once another is in place.
Seven tracks, 26 stages, every one of the 57 concepts covered, and each stage
states its goal as something you should be able to *do*.

**Ask** is a deterministic query interface — no language model, nothing
generated. A question is matched to one of ten intents, entities are resolved
against the corpora (with an alias table, because people type "the Fed" and
"stocks"), and the answer is assembled from the engines that already exist. The
consequence is a system that cannot hallucinate and also cannot bluff: an
unmatched question returns an honest miss and a list of what it *can* answer.

---

## 7. The learning system

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

## 8. Layout

```
app/
  index.html            single entry, ES module bootstrap
  styles/               tokens → base → components
  src/
    core/               dom, store, router, format          (no domain knowledge)
    domain/             worldmodel, propagate, learning, quiz,
                        company, contrarian, curriculum,
                        ask, confidence                     (no DOM)
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

## 9. Running it

```bash
node scripts/serve.js                  # http://localhost:4173/app/index.html
INTEL_CONTACT=you@example.com \
  node pipeline/run.js --brief         # fetch real data, write snapshots
npm run check                          # syntax-check every module
npm run test:browser                   # needs playwright installed separately
node pipeline/run.js --fundamentals    # refresh company filings (weekly cadence)
```

The application works before the pipeline has ever run. Views that need data show
what is missing and the command that produces it.

---

## 10. What is deliberately not here

- **No per-company prices.** Index levels, volatility, commodities and credit
  spreads are real and live; individual equity prices are not, so there are no
  valuation multiples. Every company surface repeats what that absence costs
  rather than approximating around it.
- **No LLM at runtime.** Nothing in the browser calls a model. Summaries,
  explanations, questions and chains are authored or derived. An optional
  server-side analysis stage can be added to the pipeline, where a key can be held
  safely — it would never run in the client.
- **No accounts, no server, no database.** Progress is local storage, exportable
  as JSON. Nothing about what you read leaves the device.
- **No probabilities on risks.** The risk radar ranks reach, not likelihood,
  because a made-up probability is worse than none.

---

## 11. What I would build next

1. **A keyed adapter for per-company prices** behind the existing provider
   interface. FRED closed the index, volatility, commodity and credit gaps, so
   this is what is left: it is the one thing standing between a fundamental
   screen and a genuine opportunity screen, because without a price there is no
   multiple and without a multiple there is no expectation to disagree with.
2. **A server-side AI stage in the pipeline** for summarisation and entity
   extraction, with output labelled as model-generated and every claim still
   carrying its source. The client stays model-free.
3. **Forecast resolution against the archive** — the scorecard currently relies on
   the user resolving their own claims; the archive already holds enough to
   resolve some automatically.
4. **Widening the world model.** 217 edges cover the macro-financial and AI-energy
   chains well and healthcare, defence and agriculture thinly. The format makes
   extension mechanical.
5. **Widening company coverage** beyond the 26 that sit on a model node, and
   adding segment-level revenue where filers disclose it.
6. **Teaching `ask` to compose** — it routes to one intent today, where several
   questions would be better answered by two engines in sequence.
