/**
 * CONCEPTS — economics, money and policy.
 *
 * Four depths per concept, because "explain this" means different things to
 * different readers and the same reader on different days. The depths are
 * genuinely different explanations, not the same sentence at four lengths:
 * beginner gives the intuition, expert gives the argument professionals are
 * actually having.
 *
 * `misconception` is deliberate. Most of what people get wrong about
 * economics is not missing information — it is a confidently held wrong model.
 */

export const MACRO_CONCEPTS = [
  {
    id: "yield-curve", term: "The Yield Curve", domain: "economics",
    tags: ["rates", "recession", "bonds"], node: "yield_curve",
    levels: {
      beginner:
        "A chart of what the government pays to borrow for different lengths of time. Normally, borrowing for longer costs more — the same way a 5-year fixed mortgage usually costs more than a 1-year one.",
      intermediate:
        "Long yields are roughly the average of expected future short-term rates plus a premium for tying money up. When the curve inverts — short rates above long — the market is saying it expects the central bank to be cutting rates in the future, which usually means it expects the economy to weaken.",
      advanced:
        "Decompose the long yield into expected average policy rates plus a term premium. Inversion means the expectations component is downward-sloping: markets price cuts. It has preceded most post-war US recessions, but the lag has ranged from months to over two years, and the curve typically re-steepens before the recession actually starts — because cuts begin. Using inversion as a timing signal has cost people years of returns.",
      expert:
        "The predictive content is contested in exactly the places it matters. Term premium estimates are model-dependent (ACM and Kim–Wright disagree by enough to change the story), so 'the expectations component' is inferred, not observed. Quantitative easing suppressed term premium directly, which mechanically flattens the curve without carrying the usual information about growth. And the signal is conditional on the policy regime: an inversion driven by falling inflation expectations is a different animal from one driven by a central bank deliberately restricting demand.",
    },
    misconception:
      "That inversion causes recessions, or dates them. It is a price, not a mechanism — and the un-inversion has historically been closer to the event than the inversion.",
    history:
      "The 2006 inversion preceded the 2007–09 recession; the 2019 inversion preceded a pandemic nobody's yield curve was forecasting.",
    watch: ["10y minus 2y spread", "10y minus 3-month spread", "Where inversion sits on the curve"],
    related: ["bond-yields", "term-premium", "monetary-policy", "recession"],
  },
  {
    id: "inflation", term: "Inflation", domain: "economics",
    tags: ["prices", "cpi"], node: "headline_inflation",
    levels: {
      beginner:
        "The rate at which prices rise. If inflation is 3%, what cost $100 last year costs $103 now — so money buys less than it used to.",
      intermediate:
        "Measured as the change in the price of a fixed basket of goods and services. It matters because it is a rate of change, not a level: inflation falling from 9% to 3% does not mean prices fell, only that they are rising more slowly. Prices that rose stay risen, which is why disinflation feels nothing like relief.",
      advanced:
        "Inflation is not one thing. Goods inflation is global, tradable and responsive to the exchange rate and freight. Services inflation is domestic and mostly wages. Shelter is measured with roughly a year's lag against market rents. A single headline number aggregates processes with completely different persistence — which is why central banks watch the composition, not the print.",
      expert:
        "The live argument is about what anchors expectations and how much of any episode is demand versus supply. A pure supply shock raises the price level once; a demand shock or de-anchored expectations raises the rate persistently. Distinguishing them in real time is genuinely hard — the 2021–23 episode was argued about for two years and is still contested. The policy asymmetry is what matters: acting late against a demand shock is far more costly than acting early against a supply shock.",
    },
    misconception:
      "That falling inflation means falling prices. That is deflation, and it is a different and generally worse problem.",
    history:
      "The 1970s took two rounds of tightening because the first was abandoned early; Volcker's 1979–82 campaign broke the expectation at the cost of a deep recession.",
    watch: ["Core services ex-shelter", "3- and 6-month annualised core", "5y5y forward breakevens"],
    related: ["core-inflation", "inflation-expectations", "monetary-policy", "wage-price"],
  },
  {
    id: "core-inflation", term: "Core Inflation", domain: "economics",
    tags: ["prices", "cpi"], node: "core_inflation",
    levels: {
      beginner:
        "Inflation with food and energy removed, because those two jump around so much they can hide the underlying trend.",
      intermediate:
        "Not because food and fuel don't matter — they matter enormously to households — but because they are volatile and mean-reverting. Core is a better forecast of where headline inflation will be in a year than headline itself is.",
      advanced:
        "Core is one of several trend estimators: trimmed mean, median CPI and sticky-price CPI all attempt the same job with different exclusion rules. Each fails differently. Fixed exclusion (core) fails when the excluded category has a persistent trend; trimmed measures fail when the shock is broad rather than concentrated.",
      expert:
        "The deeper problem is that 'trend inflation' is a latent variable being estimated by proxies that were validated in a different regime. When a supply shock passes into services through wages, core stops being exogenous to the shock it was designed to exclude. This is why the useful decomposition during the last cycle became cyclical versus acyclical components rather than core versus headline.",
    },
    misconception:
      "That central bankers use core because they don't buy groceries. They use it because it forecasts headline better.",
    watch: ["Core PCE", "Trimmed mean PCE", "Core services ex-housing"],
    related: ["inflation", "sticky-inflation", "shelter-cpi"],
  },
  {
    id: "sticky-inflation", term: "Sticky vs Flexible Prices", domain: "economics",
    tags: ["prices"], node: "services_inflation",
    levels: {
      beginner:
        "Some prices change constantly — petrol, airline seats. Others barely move for a year — haircuts, rent, insurance. The slow ones tell you more about where inflation is heading.",
      intermediate:
        "Flexible prices respond to today's conditions. Sticky prices are reset infrequently, so when a firm does reset one, it prices in its expectation of the whole coming period. That makes sticky prices a window into expectations.",
      advanced:
        "Menu costs and staggered contracts mean a share of prices is always out of date. Aggregate price level adjustment is therefore gradual even when the shock is instant — the source of monetary non-neutrality in New Keynesian models and the reason policy has real effects at all.",
      expert:
        "State-dependent pricing changes the picture: in high-inflation regimes firms reprice more often, so the Phillips curve steepens and stickiness itself declines. This is why an inflation surge can become self-accelerating, and why credibility is a genuine economic asset rather than a rhetorical one.",
    },
    watch: ["Atlanta Fed sticky-price CPI", "Frequency of price changes in micro data"],
    related: ["inflation", "core-inflation", "wage-price"],
  },
  {
    id: "shelter-cpi", term: "Shelter in the CPI", domain: "economics",
    tags: ["prices", "housing"], node: "shelter_inflation",
    levels: {
      beginner:
        "About a third of the US inflation basket is housing costs — and the way it's measured means it reflects rents from roughly a year ago.",
      intermediate:
        "Statistical agencies estimate what homeowners would pay to rent their own homes (owners' equivalent rent) and sample existing leases, most of which were signed months ago. So when market rents turn, CPI shelter turns much later.",
      advanced:
        "The lag is a design consequence, not an error: CPI measures consumption expenditure, and most households are on existing leases. Market rent indices lead official shelter by roughly nine to fifteen months, which makes near-term shelter inflation unusually forecastable and makes the headline number backward-looking in a knowable way.",
      expert:
        "The practical question is whether to look through it. Doing so assumes the lag structure is stable, which it is not — new-tenant and all-tenant rent growth diverge with turnover rates, and turnover fell sharply when mortgage lock-in reduced moving. A policymaker who looked through shelter in 2022 was right; one who did so mechanically in a different turnover regime would not be.",
    },
    watch: ["New-tenant repeat rent index", "Market rent indices", "Turnover rates"],
    related: ["inflation", "core-inflation"],
  },
  {
    id: "inflation-expectations", term: "Inflation Expectations", domain: "economics",
    tags: ["prices", "credibility"], node: "inflation_expectations",
    levels: {
      beginner:
        "What people think inflation will be. It matters because expecting price rises changes behaviour — you ask for a bigger raise, and firms raise prices in advance.",
      intermediate:
        "Expectations can be 'anchored' (people assume inflation returns to target regardless of today's number) or 'de-anchored' (people extrapolate). Anchoring is the single most valuable asset a central bank owns, and it is not visible until it is gone.",
      advanced:
        "Three sources, each flawed: surveys of households (noisy, heavily driven by petrol prices), surveys of professionals (smooth, slow, herd-prone) and market breakevens (contaminated by liquidity and inflation risk premia). They frequently disagree, and no one of them is the real thing.",
      expert:
        "Whether firms and households form expectations in a way that matters for the Phillips curve is genuinely disputed. Evidence on rational inattention suggests households mostly do not think about aggregate inflation at all until it becomes salient — which makes 'anchoring' partly a statement about attention rather than belief. If so, the policy target is the salience threshold, not the expectation.",
    },
    misconception:
      "That expectations are a forecast. They are closer to a behavioural input: what matters is not whether people are right but what they do.",
    watch: ["5y5y forward breakeven", "University of Michigan long-run", "NY Fed SCE"],
    related: ["inflation", "monetary-policy", "wage-price"],
  },
  {
    id: "wage-price", term: "Wages, Prices and Productivity", domain: "economics",
    tags: ["labour", "prices"], node: "wage_growth",
    levels: {
      beginner:
        "Rising wages are only inflationary if workers aren't producing correspondingly more. If output per hour rises as fast as pay, costs per unit don't change.",
      intermediate:
        "Unit labour cost is wage growth minus productivity growth. A 4% raise with 2% productivity growth is 2% cost pressure. This is why 'wage growth is too high' is an incomplete statement without a productivity number attached.",
      advanced:
        "The wage–price spiral requires a feedback loop: prices raise wage demands, wages raise costs, costs raise prices. Historically this needed institutional transmission — indexation clauses, sectoral bargaining — which is far weaker in most economies now than in the 1970s.",
      expert:
        "The direction of causality is contested. Some of the evidence suggests wages follow prices rather than lead them, making wage growth a symptom rather than a cause. If so, targeting wage growth directly is targeting the thermometer. The counterargument is that in a tight labour market the distinction stops mattering because both are driven by the same excess demand.",
    },
    watch: ["Employment Cost Index", "Unit labour costs", "Atlanta Fed wage tracker"],
    related: ["inflation", "productivity", "unemployment"],
  },
  {
    id: "monetary-policy", term: "Monetary Policy", domain: "economics",
    tags: ["central-banks", "rates"], node: "policy_rate",
    levels: {
      beginner:
        "How a central bank influences the economy, mainly by setting the interest rate at which banks lend to each other overnight. Raise it to cool things down, cut it to warm them up.",
      intermediate:
        "The policy rate propagates outward: to bond yields, to mortgage and business borrowing rates, to the exchange rate, to asset prices, and finally to spending and hiring. Each step takes time — the standard estimate is 'long and variable lags' of roughly 12 to 18 months to peak effect.",
      advanced:
        "Multiple transmission channels operate at once with different speeds: the interest-rate channel (cost of capital), the credit channel (bank willingness to lend), the exchange rate channel (import prices and external demand), the asset price channel (wealth and collateral), and the expectations channel (which works instantly if the bank is credible). Their relative strength depends on the structure of the economy — fixed-rate mortgage share alone changes the speed of transmission by years.",
      expert:
        "The unresolved question is r* — the neutral real rate — which is unobservable, estimated with wide error bands, and possibly shifted by demographics, productivity and fiscal stance. Policy is set relative to a number nobody can measure. Add the fiscal-monetary interaction: when deficits are large and issuance skews long, the central bank's control over the yield curve weakens even as its control over the front end is unchanged.",
    },
    misconception:
      "That the central bank 'sets interest rates'. It sets one overnight rate and influences the rest through expectations — which is why guidance can move markets more than the decision does.",
    watch: ["Policy statements and dot plots", "Market-implied path", "Financial conditions indices"],
    related: ["yield-curve", "real-vs-nominal", "quantitative-easing", "financial-conditions"],
  },
  {
    id: "quantitative-easing", term: "Quantitative Easing and Tightening", domain: "economics",
    tags: ["central-banks", "balance-sheet"], node: "balance_sheet",
    levels: {
      beginner:
        "When rates are already near zero, a central bank can create reserves and buy bonds instead. That pushes bond prices up and their yields down, making borrowing cheaper.",
      intermediate:
        "QE works mainly by removing duration risk from private portfolios (portfolio balance) and by signalling that policy will stay easy (signalling). Tightening reverses it: the balance sheet shrinks as bonds mature and are not replaced, so private investors must absorb more duration.",
      advanced:
        "QE is not 'printing money' in the inflationary sense: it swaps one government liability (bonds) for another (reserves). Reserves sit at the central bank and do not mechanically become deposits. The inflationary channel, to the extent there is one, runs through asset prices, credit creation and the fiscal stance it enables — not through the monetary base.",
      expert:
        "Effect sizes are the argument. Event studies show large announcement effects, flow-based studies show much smaller ones, and neither cleanly separates QE from the expectations it also shifted. QT's effect is even less well identified because it has run largely in the background during periods dominated by rate policy. The practical constraint discovered in 2019 and again later is the reserve floor: nobody knows where 'ample' becomes 'scarce' until repo rates spike.",
    },
    watch: ["Balance sheet size and composition", "Reserve balances", "Repo market spreads"],
    related: ["monetary-policy", "term-premium", "bond-yields"],
  },
  {
    id: "real-vs-nominal", term: "Real vs Nominal", domain: "economics",
    tags: ["rates", "prices"], node: "real_rate",
    levels: {
      beginner:
        "Nominal is the number on the label. Real is that number after subtracting inflation. A 5% return with 6% inflation loses you money.",
      intermediate:
        "The real interest rate is what actually governs decisions: whether a company builds a factory, whether a household saves. A 10% nominal rate with 12% inflation is stimulative; a 3% nominal rate with 0% inflation is restrictive.",
      advanced:
        "There is no single real rate. Ex-ante real rates use expected inflation (unobservable, so proxied by breakevens or surveys); ex-post real rates use realised inflation (knowable but backward-looking). They differ by the forecast error, which is largest exactly when the distinction matters most.",
      expert:
        "Whether the relevant real rate for corporate investment is the government real yield at all is arguable — the marginal project is discounted at a firm-specific hurdle that includes a credit spread and an equity risk premium, both of which move independently. This is why financial conditions indices outperform the policy rate as a predictor of activity.",
    },
    misconception:
      "Thinking a high interest rate is automatically tight. Turkey and 1970s America both ran double-digit nominal rates that were deeply negative in real terms.",
    watch: ["10-year TIPS yield", "Real policy rate vs r* estimates"],
    related: ["monetary-policy", "inflation", "bond-yields"],
  },
  {
    id: "term-premium", term: "Term Premium", domain: "economics",
    tags: ["bonds", "rates"], node: "term_premium",
    levels: {
      beginner:
        "The extra yield investors demand for lending long instead of short — compensation for the risk that rates move against them while their money is tied up.",
      intermediate:
        "A 10-year yield equals expected average short rates over ten years plus this premium. When the premium rises, long yields can climb even if nobody has changed their view on the central bank.",
      advanced:
        "It is not observable. It is backed out by models (ACM, Kim–Wright) that impose structure on the expectations component. Different models produce materially different premium estimates from the same yield curve, so any statement 'term premium rose' is a statement about a model.",
      expert:
        "It responds to duration supply (issuance composition, QT), to inflation uncertainty (whether bonds hedge equities or not), and to the stability of the buyer base. The regime question is whether bonds still diversify equities: in a supply-shock world where inflation and growth move oppositely, they do not, which raises the premium structurally rather than cyclically.",
    },
    watch: ["ACM term premium estimate", "Coupon issuance mix", "Stock–bond correlation"],
    related: ["bond-yields", "yield-curve", "quantitative-easing"],
  },
  {
    id: "bond-yields", term: "Bond Yields and Prices", domain: "markets",
    tags: ["bonds", "rates"], node: "ust10y",
    levels: {
      beginner:
        "A bond pays a fixed amount. If you pay less for it, your return — the yield — is higher. So bond prices and yields always move in opposite directions.",
      intermediate:
        "Yield is the discount rate that makes future coupons and principal equal today's price. Because the payments are fixed, the only way the market repricing risk shows up is through the price, and therefore the yield.",
      advanced:
        "Duration measures price sensitivity to yield: a bond with duration 8 loses roughly 8% for a 100bp yield rise, plus a convexity adjustment. Duration rises with maturity and falls with coupon — which is why zero-coupon and long-dated bonds are the most violent instruments in a rate move.",
      expert:
        "The 2022 lesson was that duration risk is not a small tail: a 10-year Treasury lost more in a year than most equity drawdowns, and held-to-maturity accounting concealed it until deposits fled. The interaction of duration risk with funding risk — not duration risk alone — is what turned an interest rate move into bank failures.",
    },
    watch: ["10-year yield", "Real yields", "MOVE index"],
    related: ["duration", "yield-curve", "term-premium", "bank-run"],
  },
  {
    id: "credit-spreads", term: "Credit Spreads", domain: "markets",
    tags: ["credit", "risk"], node: "credit_spreads",
    levels: {
      beginner:
        "The extra interest a company pays compared with the government. Riskier borrower, bigger gap.",
      intermediate:
        "The spread compensates for expected default losses plus a risk premium plus a liquidity premium. It is the cleanest continuously-priced measure of how the market feels about corporate risk — updated every second, unlike defaults, which show up much later.",
      advanced:
        "Spread decomposition matters: most of the historical high-yield spread has been compensation for illiquidity and risk aversion rather than realised default loss. Spreads widen well before defaults rise, and they widen fastest where refinancing walls are nearest.",
      expert:
        "The measurement problem now is that a growing share of corporate credit has migrated to private markets, where marks are appraisal-based and stale. Public spreads may therefore understate the true tightening as the marginal borrower is no longer the marginal quoted bond. Watching public spreads alone is watching the lit half of the market.",
    },
    watch: ["High-yield OAS", "Investment-grade OAS", "Maturity walls", "Private credit marks"],
    related: ["credit-channel", "financial-conditions", "leverage"],
  },
  {
    id: "credit-channel", term: "The Credit Channel", domain: "economics",
    tags: ["banks", "credit"], node: "bank_lending",
    levels: {
      beginner:
        "Interest rates matter, but so does whether banks are actually willing to lend. A cheap loan you can't get is not cheap.",
      intermediate:
        "Policy works partly by changing bank behaviour: higher rates raise expected loan losses and funding costs, so banks tighten standards. Surveys of loan officers lead actual credit growth by several quarters.",
      advanced:
        "Two sub-channels: the bank lending channel (bank balance sheet capacity) and the balance sheet channel (borrower net worth as collateral). The second is a financial accelerator — falling asset prices reduce collateral, which reduces credit, which reduces asset prices.",
      expert:
        "Non-bank intermediation has changed the mechanics. Private credit funds are not deposit-funded and not capital-constrained the same way, so a bank tightening no longer implies an equivalent tightening for a mid-market borrower. Whether that dampens the cycle or relocates the fragility is one of the genuinely open questions in current macro-financial policy.",
    },
    watch: ["Senior Loan Officer Survey", "Commercial and industrial loan growth", "Private credit issuance"],
    related: ["credit-spreads", "bank-run", "financial-conditions"],
  },
  {
    id: "financial-conditions", term: "Financial Conditions", domain: "economics",
    tags: ["rates", "markets"], node: "financial_conditions",
    levels: {
      beginner:
        "How easy it is to get and afford money overall — not just the central bank's rate, but borrowing costs, share prices, and the currency taken together.",
      intermediate:
        "A financial conditions index aggregates rates, credit spreads, equity levels and the exchange rate. It exists because the policy rate alone is a poor predictor of activity — markets can ease conditions faster than a central bank tightens them.",
      advanced:
        "This creates a reflexive problem for policymakers: if markets rally on the expectation of cuts, conditions loosen, which reduces the need for cuts. Central banks are effectively steering a vehicle whose steering responds to predictions about where it will be steered.",
      expert:
        "Index construction is not neutral. Equity-heavy indices read easy in an AI-driven melt-up even while small-business credit is genuinely scarce. Aggregate conditions can look loose while the marginal borrower faces a wall — the distributional composition matters more than the index level, and no widely-used index captures it.",
    },
    watch: ["Chicago Fed NFCI", "Goldman FCI", "Small business credit availability surveys"],
    related: ["monetary-policy", "credit-spreads", "reflexivity"],
  },
  {
    id: "gdp", term: "Gross Domestic Product", domain: "economics",
    tags: ["growth"], node: "gdp",
    levels: {
      beginner:
        "The total value of everything an economy produces in a period. The headline measure of whether the economy is growing.",
      intermediate:
        "Measurable three ways that should agree: output, expenditure and income. They don't quite, and the gap (the statistical discrepancy) is sometimes informative. Real GDP strips out inflation; nominal GDP is what determines tax receipts and debt sustainability.",
      advanced:
        "GDP is heavily revised — initial US estimates have historically moved by amounts large enough to change the narrative of a quarter. It also excludes household production, undervalues quality improvements, and counts remediation spending as output. Gross domestic income sometimes tells a different story and has occasionally been the more accurate early signal.",
      expert:
        "For anything digital, the measurement problem is structural: consumer surplus from zero-price services does not enter GDP at all, and quality-adjusted deflators for software and semiconductors are contested enough to change measured productivity growth materially. If AI's main effect is on quality and consumer surplus rather than measured output, GDP will understate it — the same way it understated the early internet.",
    },
    misconception:
      "That two negative quarters is the definition of a recession. In the US, a dating committee makes that call using employment, income and production.",
    watch: ["Real GDP vs GDI", "Revisions", "Nominal growth vs debt cost"],
    related: ["productivity", "unemployment", "recession"],
  },
  {
    id: "unemployment", term: "Unemployment", domain: "economics",
    tags: ["labour"], node: "unemployment",
    levels: {
      beginner:
        "The share of people who want a job and are looking for one but don't have one. Someone who stops looking is not counted.",
      intermediate:
        "That exclusion matters: the rate can fall because people found work or because they gave up. Participation rate and employment-to-population ratio give a fuller picture, and the headline rate is a lagging indicator — it turns after the downturn has begun.",
      advanced:
        "The Sahm rule formalises the non-linearity: a 0.5pp rise in the three-month average from its twelve-month low has historically coincided with recession onset. The mechanism is that labour markets do not deteriorate gradually — firms hoard labour, then release it in a discrete adjustment.",
      expert:
        "Whether the current relationship holds depends on why unemployment is rising. A rise driven by labour supply growth (immigration, participation) is benign in a way a rise driven by layoffs is not, and the headline rate cannot distinguish them. Every historical recession rule was estimated on a sample where labour supply growth was stable — which recently it has not been.",
    },
    watch: ["Sahm rule gap", "Hires and quits rates", "Continuing claims", "Participation by cohort"],
    related: ["beveridge-curve", "wage-price", "gdp"],
  },
  {
    id: "beveridge-curve", term: "The Beveridge Curve", domain: "economics",
    tags: ["labour"], node: "job_openings",
    levels: {
      beginner:
        "A relationship between job vacancies and unemployment: when there are lots of open jobs, few people are unemployed, and vice versa.",
      intermediate:
        "It matters for policy because it describes whether cooling the economy costs jobs. If the curve is steep, vacancies can fall a long way before unemployment rises — a soft landing is possible. If flat, cooling demand costs employment immediately.",
      advanced:
        "The curve shifts as well as moves along. Outward shifts indicate worse matching efficiency — skills or geographic mismatch, or search frictions. The 2021–23 period featured an unusually high vacancy-to-unemployment ratio, which is precisely the region where the curve is steepest and where cooling might be cheap.",
      expert:
        "The disagreement was substantive and consequential: one camp argued vacancies could normalise without unemployment rising because the curve was in its steep region; another argued no historical episode had achieved a fall of that size without recession. That this was a live argument between competent economists — resolvable only ex post — is a useful reminder about the confidence any macro forecast deserves.",
    },
    watch: ["Vacancies per unemployed worker", "Quits rate", "Matching efficiency estimates"],
    related: ["unemployment", "wage-price"],
  },
  {
    id: "productivity", term: "Productivity", domain: "economics",
    tags: ["growth"], node: "productivity",
    levels: {
      beginner:
        "How much gets produced per hour worked. It's the only way living standards rise sustainably — everything else is redistribution or working longer.",
      intermediate:
        "Long-run growth equals labour force growth plus productivity growth. With ageing populations shrinking the first term, the second is the entire story for most developed economies.",
      advanced:
        "Measured productivity is output divided by hours, so it inherits every measurement problem in both. It is also strongly procyclical in the short run through labour hoarding, which makes quarterly readings nearly uninformative. Total factor productivity — the residual after capital and labour — is what actually captures technological progress, and it is a residual, meaning it absorbs all measurement error.",
      expert:
        "Solow's paradox is the reference case: computers were visible everywhere except the productivity statistics, until they showed up with a decade's lag in the late 1990s. The lag came from the complementary investments — reorganising firms around the technology, not just buying it. Any claim that AI will or won't raise productivity has to engage with that lag structure, and most claims in either direction don't.",
    },
    history:
      "US productivity growth averaged around 3% in 1947–73, roughly 1.5% in 1973–95, rose again in 1995–2004, then slowed. Nobody has a fully satisfying explanation for any of the transitions.",
    watch: ["Total factor productivity", "Business sector output per hour", "Capital deepening"],
    related: ["gdp", "wage-price", "scaling-laws", "creative-destruction"],
  },
  {
    id: "fiscal-policy", term: "Fiscal Policy", domain: "economics",
    tags: ["government", "debt"], node: "fiscal_deficit",
    levels: {
      beginner:
        "Government spending and taxation. Spending more or taxing less adds demand to the economy; the reverse subtracts it.",
      intermediate:
        "Deficits are funded by issuing bonds, which adds to debt. What matters for sustainability is not the debt level but the relationship between the interest rate on the debt and the growth rate of the economy — r versus g.",
      advanced:
        "When nominal growth exceeds the average interest cost, debt-to-GDP falls even with a primary deficit. When it doesn't, stabilising the ratio requires primary surpluses. Because the average cost of a debt stock adjusts slowly as old bonds mature, a rate regime change takes years to fully transmit to the interest bill.",
      expert:
        "Fiscal-monetary interaction is where this becomes interesting. Large deficits at full employment work against monetary tightening, and heavy long-duration issuance raises term premium in a way the central bank does not control. Fiscal dominance — where debt service constrains policy choice — is not a binary state but a spectrum, and the position on it is revealed by how the bond market reacts to fiscal news rather than monetary news.",
    },
    watch: ["Primary balance", "Average interest cost vs nominal growth", "Issuance duration mix"],
    related: ["monetary-policy", "term-premium", "bond-yields"],
  },
  {
    id: "tariffs", term: "Tariffs", domain: "economics",
    tags: ["trade", "policy"], node: "tariffs",
    levels: {
      beginner:
        "A tax on imported goods. The importing company pays it to its own government, and usually passes some of it on in the price.",
      intermediate:
        "Who actually bears the cost — the incidence — depends on elasticities. If foreign suppliers have no alternative market, they cut prices and bear it. If domestic buyers have no alternative supplier, they pay it. Empirical work on the 2018–19 US tariffs found the pass-through to US prices was close to complete.",
      advanced:
        "Beyond the price effect there are three second-order channels: retaliation against exporters, input-cost inflation for domestic manufacturers who import components, and supply chain redirection through third countries, which shows up as trade diversion rather than reshoring.",
      expert:
        "The strategic argument for tariffs is not efficiency, which they reduce, but resilience and bargaining leverage — genuinely different objectives that standard trade models do not price. The empirical difficulty is that resilience benefits are counterfactual and diffuse while costs are measurable and concentrated, so evidence-based debate systematically undercounts one side.",
    },
    misconception:
      "That the exporting country pays the tariff. The importer remits it; the incidence is split by elasticity.",
    watch: ["Effective tariff rate", "Import price indices ex-tariff", "Trade diversion via third countries"],
    related: ["comparative-advantage", "supply-chain-bullwhip", "industrial-policy"],
  },
  {
    id: "comparative-advantage", term: "Comparative Advantage", domain: "economics",
    tags: ["trade"],
    levels: {
      beginner:
        "Even if one country is better at making everything, both countries gain by specialising in what they give up least to produce, then trading.",
      intermediate:
        "The insight is about opportunity cost, not absolute skill. A surgeon who types faster than their assistant should still not do the typing. Ricardo's argument is that this scales to nations.",
      advanced:
        "The theorem says trade raises aggregate output. It does not say everyone gains: the Stolper–Samuelson result implies the scarce factor loses in real terms. Aggregate gains with concentrated losses is the entire political economy of trade in one sentence.",
      expert:
        "The 'China shock' literature found adjustment costs in affected US labour markets were far larger and more persistent than the standard model assumed — displaced workers did not smoothly relocate. That does not refute comparative advantage; it refutes the auxiliary assumption of costless reallocation on which the political case for trade rested.",
    },
    history:
      "Ricardo's 1817 cloth-and-wine example remains the standard teaching case, two centuries on.",
    related: ["tariffs", "creative-destruction"],
  },
  {
    id: "dollar", term: "The Dollar's Role", domain: "economics",
    tags: ["currency", "global"], node: "usd",
    levels: {
      beginner:
        "Most international trade and borrowing happens in US dollars, even between countries that aren't the US. That gives the dollar's value global consequences.",
      intermediate:
        "Because so much of the world's debt is denominated in dollars, a rising dollar increases the real burden on foreign borrowers who earn in other currencies. The dollar is therefore a global financial condition, not just an exchange rate.",
      advanced:
        "The global financial cycle argument holds that US monetary policy propagates worldwide through the dollar and through cross-border banking, so floating exchange rates do not deliver the monetary independence the classical trilemma promises. Capital flows, not just trade flows, do the transmitting.",
      expert:
        "Reserve currency status persists on network effects — depth, liquidity, rule of law, and the absence of a substitute at scale. Sanctions on reserve assets create a genuine incentive to diversify, but incentive is not capability: no alternative offers comparable depth. The realistic path is gradual fragmentation at the margins in commodity invoicing and settlement rails rather than displacement.",
    },
    watch: ["Trade-weighted dollar", "Cross-currency basis", "Reserve composition (COFER)", "Offshore dollar credit"],
    related: ["monetary-policy", "em-stress", "sanctions-policy"],
  },
  {
    id: "recession", term: "Recessions", domain: "economics",
    tags: ["cycle"],
    levels: {
      beginner:
        "A significant, broad decline in economic activity lasting more than a few months — output falls, unemployment rises.",
      intermediate:
        "In the US, the NBER dates recessions using depth, diffusion and duration across employment, income, production and sales — not the popular two-negative-quarters rule. Dating is announced well after the fact, sometimes by a year.",
      advanced:
        "Recessions are usually not caused by the thing everyone was watching. The proximate trigger is generally a leverage unwind meeting a policy tightening, and the propagation runs through credit availability and labour hoarding ending simultaneously. Recessions are non-linear: the economy does not decelerate smoothly to zero.",
      expert:
        "Forecasting them is close to unsolved. Professional forecasters have historically failed to predict most recessions even one quarter ahead, because the mechanism is a regime change in behaviour rather than an extrapolation. The practical response is not better point forecasts but position sizing that survives being wrong — which is a risk-management answer to a forecasting question.",
    },
    watch: ["Sahm rule", "Yield curve un-inversion", "Credit spreads", "Temporary help employment"],
    related: ["yield-curve", "unemployment", "credit-spreads", "base-rates"],
  },
  {
    id: "em-stress", term: "Emerging Market Stress", domain: "economics",
    tags: ["global", "currency"], node: "em_stress",
    levels: {
      beginner:
        "Developing countries often borrow in dollars but earn in their own currency. When the dollar rises, their debt gets harder to repay.",
      intermediate:
        "This is currency mismatch. It converts an exchange rate move into a solvency problem, and it is why emerging market crises cluster around dollar strength and US rate rises rather than around domestic mistakes alone.",
      advanced:
        "The classic sequence is: dollar strength → tighter domestic financial conditions → capital outflow → currency defence via reserves or rate rises → domestic recession. 'Original sin' — the inability to borrow long-term in one's own currency — has weakened as local-currency bond markets deepened, but foreign ownership of those bonds reintroduces the flow risk through a different door.",
      expert:
        "The modern vulnerability is less sovereign than corporate, and increasingly it sits outside the banking system where data is thin. IMF and BIS coverage of offshore corporate dollar liabilities is incomplete by construction, so exposure estimates are lower bounds. Crises tend to originate in the parts of the balance sheet nobody has a time series for.",
    },
    watch: ["Dollar index", "EM local vs hard currency spreads", "Reserve adequacy", "BIS offshore dollar credit"],
    related: ["dollar", "credit-spreads", "leverage"],
  },
];
