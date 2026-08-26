/** CONCEPTS — markets, investing, business and the reasoning habits behind them. */

export const MARKET_CONCEPTS = [
  {
    id: "valuation", term: "Valuation", domain: "investing",
    tags: ["equities"], node: "equity_valuation",
    levels: {
      beginner:
        "What you pay for a dollar of a company's profits. A P/E of 20 means paying $20 for $1 of annual earnings.",
      intermediate:
        "A multiple is shorthand for a discounted cash flow calculation. It embeds assumptions about growth, the discount rate and how long any advantage lasts. 'Cheap' and 'expensive' are meaningless without naming those assumptions.",
      advanced:
        "Value equals cash flows discounted at a rate reflecting their risk. Multiples compress that into one number, which is why they mislead: a high multiple can mean an overpriced business or a durable one with a long reinvestment runway. The variable that most often decides the outcome is competitive fade — how quickly returns on capital decay toward the cost of capital.",
      expert:
        "Valuation has weak predictive power over horizons under five years and meaningful power over ten-plus, which makes it almost useless as a timing tool and essential as a return-expectation tool. Accounting also distorts it: intangible investment is expensed rather than capitalised, so R&D-heavy firms show understated book value and overstated current earnings quality relative to industrial-era comparables.",
    },
    misconception:
      "That a low P/E is cheap. It is frequently a market correctly pricing a business whose earnings are about to fall.",
    watch: ["Forward P/E vs 10-year history", "EV/EBIT", "Free cash flow yield", "Return on invested capital"],
    related: ["earnings", "free-cash-flow", "margin-of-safety", "moat"],
  },
  {
    id: "earnings", term: "Earnings and Revisions", domain: "investing",
    tags: ["equities"], node: "earnings_growth",
    levels: {
      beginner:
        "Profit. Share prices tend to follow profits over time, but they respond to changes in expectations about profits much faster.",
      intermediate:
        "What moves a stock on results day is the surprise against expectations plus the change in guidance — not the absolute number. A company can report record profits and fall 10% if the market expected more.",
      advanced:
        "Earnings revision momentum — the direction analysts are moving their estimates — has been one of the more persistent cross-sectional return factors, because estimates adjust with a lag and in the same direction. Accounting earnings are also manageable; cash flow is harder to manage, so a widening gap between the two is a standard quality warning.",
      expert:
        "The measurement debate is about whether reported earnings are economically meaningful for asset-light businesses. Expensed intangibles depress current earnings for firms investing in future capability, while share-based compensation excluded from adjusted metrics inflates them. Any factor built on reported earnings is partly measuring accounting policy rather than economics.",
    },
    watch: ["Revision breadth", "Guidance changes", "Cash flow vs net income", "Share count"],
    related: ["valuation", "free-cash-flow", "base-rates"],
  },
  {
    id: "free-cash-flow", term: "Free Cash Flow", domain: "investing",
    tags: ["accounting"],
    levels: {
      beginner:
        "The cash a business actually has left after paying to run and maintain itself. Profit is an opinion; cash is a fact.",
      intermediate:
        "Operating cash flow minus capital expenditure. It matters because it is what can fund dividends, buybacks, acquisitions or debt repayment without raising new money.",
      advanced:
        "The judgement call is separating maintenance capex from growth capex — only the first is required to sustain current cash flow, but companies rarely disclose the split. A business can show negative free cash flow while creating enormous value, if the spending earns above its cost of capital. Amazon's first two decades are the canonical case.",
      expert:
        "For AI-era infrastructure businesses the useful-life assumption is the hinge: depreciation schedules for accelerators determine both reported earnings and implied maintenance capex, and reasonable people disagree about whether the right number is three years or six. That single assumption moves valuation by more than most of the operational debate does.",
    },
    watch: ["FCF conversion vs net income", "Maintenance vs growth capex", "Depreciation schedules and useful life"],
    related: ["valuation", "earnings", "capex-cycle"],
  },
  {
    id: "moat", term: "Competitive Advantage", domain: "business",
    tags: ["strategy"],
    levels: {
      beginner:
        "Something that stops competitors from taking a company's profits — a brand people trust, a network that gets better with more users, a cost nobody can match.",
      intermediate:
        "In competitive markets, high returns attract entry until returns fall to the cost of capital. A moat is whatever prevents that. The test is not 'is this company good' but 'why can't a well-funded competitor copy it'.",
      advanced:
        "The durable sources are narrow: intangible assets (brand, patents, licences), switching costs, network effects, cost advantages from scale or process, and efficient scale in markets too small for two players. Everything else — good management, first-mover status, a superior product today — is temporary. The measurable signature is a sustained spread of return on invested capital over weighted average cost of capital.",
      expert:
        "The interesting question is what happens when the technology substrate changes underneath a moat. Switching costs collapse when migration becomes cheap; network effects are vulnerable to multi-homing and to a new interaction layer capturing the user relationship. Moats fail slowly then all at once, and the incumbent's financials look excellent right up to the inflection because the installed base pays until it doesn't.",
    },
    history:
      "Kodak held patents, brand and manufacturing scale in film — and invented the digital sensor. Its moat was real and irrelevant to the next substrate.",
    watch: ["ROIC vs WACC spread", "Customer retention and churn", "Pricing power in downturns", "Share of new customers"],
    related: ["network-effects", "creative-destruction", "s-curve", "valuation"],
  },
  {
    id: "margin-of-safety", term: "Margin of Safety", domain: "investing",
    tags: ["risk"],
    levels: {
      beginner:
        "Only buy something for meaningfully less than you think it's worth, so you can be somewhat wrong and still be fine.",
      intermediate:
        "It exists because valuation is an estimate with error bars, not a measurement. The size of the discount you require should scale with how uncertain your estimate is — a stable utility needs less than an early-stage biotech.",
      advanced:
        "In practice it is a statement about the distribution of outcomes, not the mean. It biases toward businesses whose downside is bounded — hard assets, net cash, non-cyclical demand — and against those where the bear case is zero. Position sizing is the other half: an idea with a wide distribution deserves a smaller position regardless of its expected value.",
      expert:
        "The tension is that margin of safety and quality trade off. Discounted prices cluster in businesses with real problems, and the highest-quality compounders rarely offer one. Resolving that is the central disagreement between deep value and quality-growth approaches, and both have long stretches of underperformance that look like being wrong.",
    },
    related: ["valuation", "risk-vs-uncertainty", "base-rates"],
  },
  {
    id: "base-rates", term: "Base Rates and the Outside View", domain: "investing",
    tags: ["reasoning"],
    levels: {
      beginner:
        "Before believing a specific story, ask how often things like this have worked out. Most startups fail; most mergers disappoint; most turnarounds don't turn.",
      intermediate:
        "The inside view builds a forecast from the specifics of the case. The outside view starts from what happened in the reference class of similar cases. People systematically over-weight the inside view because the specifics are vivid and the statistics are not.",
      advanced:
        "The discipline is picking the reference class honestly. 'Companies growing revenue above 40% for five consecutive years' has a knowable historical frequency and a knowable decay curve. Anchoring a forecast to that distribution and then adjusting for specifics beats building from specifics alone — a result that holds across domains from project schedules to drug approvals.",
      expert:
        "The failure mode is a genuinely novel reference class, where base rates either don't exist or come from a structurally different regime. This is exactly the situation with frontier AI economics — and the honest answer is wider error bars, not abandoning the outside view for a compelling narrative. Reference class forecasting is most valuable precisely when it is least comfortable.",
    },
    misconception:
      "That a compelling specific story overrides an unfavourable base rate. The story is usually why the base rate exists.",
    related: ["margin-of-safety", "risk-vs-uncertainty", "second-order-thinking"],
  },
  {
    id: "second-order-thinking", term: "Second-Order Thinking", domain: "investing",
    tags: ["reasoning"],
    levels: {
      beginner:
        "Don't stop at what happens next. Ask what happens after that — and how everyone else will respond.",
      intermediate:
        "First-order: rates fall, so borrowing is cheaper, so stocks rise. Second-order: cheaper borrowing raises demand, which raises inflation, which may force rates back up. The second-order effect frequently reverses the first.",
      advanced:
        "In markets there is an additional layer: the first-order effect is usually already priced. Excess return comes from correctly anticipating the second- and third-order consequences that consensus has not yet worked through, or from having a different view of the probability distribution rather than the central case.",
      expert:
        "The failure mode is over-application. Chains of reasoning compound uncertainty multiplicatively — a four-step chain of 80%-likely links is a coin flip. Sophisticated investors lose money on elaborate second-order theses that were correct at every step except the one that mattered. The discipline is to state which link is load-bearing and what would falsify it.",
    },
    related: ["reflexivity", "base-rates", "jevons-paradox"],
  },
  {
    id: "reflexivity", term: "Reflexivity", domain: "markets",
    tags: ["reasoning"], node: "risk_appetite",
    levels: {
      beginner:
        "In markets, what people believe changes what happens. Believing a company will succeed makes its shares rise, which makes raising money cheap, which helps it succeed.",
      intermediate:
        "Prices are not just a reflection of fundamentals — they are an input to them. Cheap equity funds expansion; expensive credit forces retrenchment. This creates self-reinforcing cycles in both directions that can run far past what fundamentals alone justify.",
      advanced:
        "The mechanism runs through the cost of capital and through collateral values. A rising asset price expands borrowing capacity, which finances purchases, which raises the price. The reversal is symmetric and faster, because margin calls have no patience.",
      expert:
        "Reflexivity explains why fundamentals-based timing fails and why the same analysis can be right about a business and wrong about its stock for years. It also constrains central banks: policy acts on expectations that respond to policy expectations. There is no fixed point to solve for, only a path that depends on the order in which beliefs update.",
    },
    related: ["second-order-thinking", "financial-conditions", "leverage"],
  },
  {
    id: "volatility", term: "Volatility", domain: "markets",
    tags: ["risk"], node: "volatility",
    levels: {
      beginner:
        "How much prices move around. High volatility means big swings in both directions, which usually means uncertainty is high.",
      intermediate:
        "Implied volatility — what options prices say — is the market's expectation of future movement, and it is usually higher than what actually happens. That gap is the insurance premium sellers earn for bearing the risk of being wrong.",
      advanced:
        "Volatility clusters: calm follows calm, storms follow storms. It is also asymmetric — equity volatility rises far more on declines than on rallies, because leverage and hedging demand both increase when prices fall. Risk models denominated in volatility therefore force selling into exactly the conditions that raised volatility.",
      expert:
        "The structural issue is that volatility targeting has become a large enough share of positioning to be self-referential: low realised volatility invites leverage, leverage amplifies the next shock, the shock forces mechanical de-leveraging. Volatility is not only a measure of risk in the system; it is now partly a determinant of it.",
    },
    misconception:
      "That volatility equals risk. It measures dispersion. Permanent loss of capital is risk, and the two diverge exactly when it matters.",
    watch: ["VIX and its term structure", "MOVE index", "Realised vs implied spread"],
    related: ["risk-vs-uncertainty", "leverage", "reflexivity"],
  },
  {
    id: "risk-vs-uncertainty", term: "Risk vs Uncertainty", domain: "investing",
    tags: ["risk", "reasoning"],
    levels: {
      beginner:
        "Risk is when you don't know the outcome but you know the odds — like a dice roll. Uncertainty is when you don't even know the odds.",
      intermediate:
        "Knight's distinction. Most financial models handle risk well and uncertainty badly, because uncertainty cannot be expressed as a probability distribution without inventing one.",
      advanced:
        "The practical consequence is that models calibrated on historical distributions fail at regime changes, which are precisely the events that matter. Value-at-risk answers 'how bad on a normal bad day', not 'how bad on the worst day', and the tails of financial returns are consistently fatter than the models assume.",
      expert:
        "Under genuine uncertainty the rational response is not a better point estimate but robustness: survive being wrong. That means bounded leverage, liquidity you don't need until you do, and avoiding strategies whose loss function is unbounded. The premium for selling insurance against tail events is real and persistent — and it is compensation for a loss profile that eventually arrives.",
    },
    related: ["volatility", "margin-of-safety", "base-rates", "leverage"],
  },
  {
    id: "duration", term: "Duration", domain: "markets",
    tags: ["bonds", "risk"],
    levels: {
      beginner:
        "A measure of how much a bond's price falls when interest rates rise. Longer bonds move more.",
      intermediate:
        "Roughly, price change equals minus duration times the yield change. A bond with duration 8 loses about 8% if yields rise one percentage point. Duration rises with maturity and falls with coupon, because a higher coupon returns your money sooner.",
      advanced:
        "Modified duration is a first-order approximation; convexity is the second-order correction, and it is a positive attribute — a convex bond falls less than duration predicts and rises more. Duration is also a portfolio concept: any asset with long-dated cash flows carries it, which is why growth equities and real estate behave like long bonds in a rate shock.",
      expert:
        "The consequential application is asset-liability matching. Pension funds and insurers hold long liabilities whose present value moves with rates, so an unhedged duration gap is a solvency risk in either direction. The 2022 UK LDI episode showed the failure mode: hedging the gap with leverage converts a slow solvency risk into an immediate liquidity one, and the collateral call arrives faster than the assets can be sold.",
    },
    misconception:
      "That bonds are the safe asset. They are safe against default and dangerous against rate moves — 2022 was a larger drawdown in long Treasuries than in most equity bear markets.",
    watch: ["Portfolio duration", "Convexity", "Asset-liability duration gaps"],
    related: ["bond-yields", "risk-vs-uncertainty", "leverage", "liquidity"],
  },
  {
    id: "leverage", term: "Leverage", domain: "markets",
    tags: ["risk", "credit"],
    levels: {
      beginner:
        "Using borrowed money to invest more than you have. It multiplies gains and multiplies losses — and losses can exceed what you put in.",
      intermediate:
        "The danger is not the leverage ratio but the interaction of leverage with liquidity. A levered position that has to be closed at the worst moment realises a loss that an unlevered holder could have waited out.",
      advanced:
        "Nearly every financial crisis is a leverage story: the asset was fine, the funding was short, and the mismatch forced sales into a falling market. The amplification comes from mark-to-market collateral requirements, which are procyclical by construction.",
      expert:
        "Hidden leverage is the recurring problem, because it is hidden by definition — off-balance-sheet vehicles in 2007, basis trades and total return swaps more recently. Regulators measure what is reported; the fragility accumulates where reporting is thin. The useful question is never 'how much leverage is there' but 'where would a forced seller be, and who would have to buy'.",
    },
    history:
      "LTCM in 1998 was not wrong about its convergence trades. It was wrong about surviving long enough for them to converge.",
    watch: ["Margin debt", "Dealer repo", "Basis trade positioning", "Fund gross vs net exposure"],
    related: ["volatility", "bank-run", "credit-spreads", "liquidity"],
  },
  {
    id: "liquidity", term: "Liquidity", domain: "markets",
    tags: ["risk"],
    levels: {
      beginner:
        "How easily something can be sold without moving its price. Cash is perfectly liquid; a house is not.",
      intermediate:
        "Liquidity is a property of the market, not the asset, and it varies with conditions. The same bond can be liquid on a calm Tuesday and untradeable in a panic — exactly when holders want to sell.",
      advanced:
        "Market liquidity (transaction costs) and funding liquidity (ability to finance positions) reinforce each other. When funding tightens, market makers reduce inventory, which widens spreads, which raises the risk of holding inventory. The spiral is fast and mostly invisible until it starts.",
      expert:
        "The structural change since 2008 is that dealer balance sheets shrank relative to outstanding issuance, so the intermediation buffer is thinner even as markets grew. Episodes like the March 2020 Treasury dislocation showed the most liquid market in the world becoming illiquid at the moment its liquidity was most needed. The policy answer so far has been central bank backstops, which works and creates the obvious incentive problem.",
    },
    watch: ["Bid-ask spreads", "Market depth", "Dealer inventories", "Cross-currency basis"],
    related: ["leverage", "volatility", "bank-run"],
  },
  {
    id: "bank-run", term: "Bank Runs and Duration Risk", domain: "markets",
    tags: ["banks", "history"],
    levels: {
      beginner:
        "Banks lend out money that depositors can withdraw at any time. If enough depositors ask at once, the bank cannot pay — even if its loans are perfectly good.",
      intermediate:
        "This is maturity transformation: borrow short, lend long. It is the core function of banking and its core fragility. Deposit insurance exists to make the run irrational by removing the reason to be first in line.",
      advanced:
        "The Diamond–Dybvig model shows two equilibria exist simultaneously — no run and run — with the outcome depending only on belief. That is why confidence, rather than solvency, is the operative variable, and why a solvent bank can fail.",
      expert:
        "The 2023 US regional bank failures updated the model in two ways: uninsured deposit concentration made the run base far more coordinated, and digital banking made withdrawal speed orders of magnitude faster than any historical precedent. Held-to-maturity accounting also allowed unrealised duration losses to accumulate invisibly. The mechanism was ancient; the velocity was new.",
    },
    history:
      "1907, 1930–33, Northern Rock in 2007, and the 2023 regional bank episode — the same structure, four different technologies.",
    related: ["bond-yields", "liquidity", "moral-hazard", "credit-channel"],
  },
  {
    id: "moral-hazard", term: "Moral Hazard", domain: "economics",
    tags: ["policy", "risk"],
    levels: {
      beginner:
        "If someone else covers your losses, you take bigger risks. Insurance changes behaviour.",
      intermediate:
        "In finance it describes the incentive created by rescues: if institutions expect to be saved, they hold less capital and take more risk, making the next rescue more likely and larger.",
      advanced:
        "The policy problem is a genuine dilemma, not a failure of nerve. Refusing to rescue imposes enormous costs on people who did nothing wrong; rescuing creates the expectation of the next rescue. Every crisis response is a choice between certain present costs and probabilistic future ones.",
      expert:
        "'Constructive ambiguity' — never confirming who would be saved — was the standard answer and has largely stopped working, because market participants price the historical record rather than the stated policy. The remaining tools are ex-ante: capital requirements, resolution regimes and structural limits, which are unpopular precisely in the calm periods when they could be imposed.",
    },
    related: ["bank-run", "leverage", "financial-instability"],
  },
  {
    id: "diversification", term: "Diversification", domain: "investing",
    tags: ["risk", "portfolio"],
    levels: {
      beginner:
        "Don't put everything in one thing. Different investments fail at different times, so a mix is steadier than any single holding.",
      intermediate:
        "The benefit comes from imperfect correlation, not from the number of holdings. Twenty stocks in the same industry facing the same risk is one position wearing twenty name tags.",
      advanced:
        "Most idiosyncratic risk is diversified away within roughly 20–30 genuinely independent positions; beyond that the marginal benefit is small and the marginal cost — dilution of your best ideas — is real. What cannot be diversified away is systematic risk, which is the risk you are actually paid to bear.",
      expert:
        "Correlations are regime-dependent and rise toward one in a crisis, which means diversification fails when needed. The stock–bond correlation is the case that matters most for institutional portfolios: negative when shocks are demand-driven, positive when they are supply- or inflation-driven. A 60/40 portfolio is a bet on the shock type, not a neutral position.",
    },
    watch: ["Rolling stock–bond correlation", "Cross-asset correlation in drawdowns"],
    related: ["risk-vs-uncertainty", "volatility"],
  },
  {
    id: "capex-cycle", term: "The Capital Expenditure Cycle", domain: "business",
    tags: ["cycle", "strategy"], node: "business_investment",
    levels: {
      beginner:
        "Companies build capacity when demand is strong and prices are high. By the time it's finished, demand has often cooled — and the new capacity makes the glut worse.",
      intermediate:
        "The lag between deciding to build and producing output is what creates the cycle. Every producer sees the same high price and responds the same way, so supply arrives simultaneously and in excess. This is the hog cycle, and it applies to semiconductors, shipping, mining, housing and data centres alike.",
      advanced:
        "Cycle amplitude scales with lead time and with capital intensity. Shipping and mining have the longest lead times and the most violent cycles; software has almost none. The best returns in capital-intensive industries come from investing at the point of maximum pessimism, when capex has been cut and nobody will finance new supply.",
      expert:
        "The live question in any boom is whether demand is structural or cyclical, because that determines whether the capacity being built is malinvestment. Telecom fibre in 1999 was both: massively overbuilt for that decade's demand, and the foundation of the next. Capital was destroyed and capacity was useful — those are not contradictory, and the distinction matters entirely to who bears the loss.",
    },
    history:
      "Semiconductors have run this cycle roughly every four years since the 1970s. The pattern has never stopped being surprising to participants.",
    watch: ["Capex-to-sales ratios", "Order backlogs and lead times", "Announced capacity vs demand growth"],
    related: ["free-cash-flow", "creative-destruction", "s-curve"],
  },
  {
    id: "creative-destruction", term: "Creative Destruction", domain: "business",
    tags: ["strategy", "history"],
    levels: {
      beginner:
        "New technologies create value by destroying the industries they replace. The gains and the losses are both real, and they land on different people.",
      intermediate:
        "Schumpeter's argument was that this is the engine of growth rather than a side effect of it. The incumbent's decline is not a market failure — it is the mechanism by which resources move to more productive uses.",
      advanced:
        "The incumbent's failure is usually rational at each step: serving existing profitable customers, protecting margin, avoiding cannibalisation. Christensen's disruption theory formalises why the correct local decision produces the wrong global outcome, and why the incumbent's financials look strongest shortly before the inflection.",
      expert:
        "The political economy is the unresolved part. Aggregate gains are diffuse and future; concentrated losses are immediate and organised. Societies that failed to compensate the losers have reliably produced political backlash against the technology, the trade, or the institutions. Whether the transition is managed is not a question about technology at all.",
    },
    history:
      "Automobiles destroyed a large carriage and stabling economy. Employment recovered; the specific people and towns largely did not.",
    related: ["moat", "s-curve", "comparative-advantage", "productivity"],
  },
];
