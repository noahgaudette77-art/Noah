/**
 * LIVE DEBATES — consensus, the case against it, and what would settle it.
 *
 * Selection rule: only questions where competent people currently disagree and
 * where the disagreement is resolvable in principle. A debate with no
 * observation that could settle it is not a debate, it is a preference, and it
 * does not belong here.
 *
 * Both sides are stated as their strongest version. The point is not to reach a
 * verdict — it is to know what you would have to see to change your mind, which
 * is the only part of an opinion that does any work.
 */

const debate = (id, topic, extra) => ({ id, topic, ...extra });

export const DEBATES = [
  debate("ai-capex", "Is the AI build-out investment or overbuild?", {
    domain: "technology", nodes: ["ai_capex", "data_center_buildout", "accelerators"],
    concepts: ["capex-cycle", "base-rates", "jevons-paradox", "free-cash-flow"],
    consensus: {
      claim: "Spending is justified by demand that is real, visible and growing faster than capacity.",
      whyHeld: "Capacity is contracted ahead, hyperscaler revenue is growing, and the constraint has consistently been supply rather than demand.",
      evidence: [
        "Accelerator and packaging capacity has been allocated rather than sold, which is the signature of excess demand.",
        "Large buyers have been signing multi-year power agreements — a commitment that is expensive to make speculatively.",
        "Cloud revenue growth has accelerated alongside the spend rather than lagging it.",
      ],
    },
    contrarian: {
      claim: "A meaningful share of the demand is circular, and the depreciation assumption is doing more work than the demand data.",
      case: [
        "Some contracted demand is between participants in the same build — vendors financing customers, labs backed by their compute suppliers. That is revenue, and it is not independent end demand.",
        "Whether an accelerator is a three-year or six-year asset changes reported earnings and implied maintenance capex enormously, and reasonable analysts disagree about it.",
        "The historical base rate for capital-intensive booms where lead times are long is overbuild, not equilibrium. Semiconductors have run that cycle roughly every four years since the 1970s.",
      ],
      evidence: [
        "Telecom fibre in 1999 was a real technology, genuinely useful a decade later, and a catastrophe for the investors who funded it.",
        "Capex-to-revenue ratios at the largest buyers have moved to levels without precedent in their own histories.",
      ],
    },
    whatWouldSettleIt: [
      "Disclosure separating end-customer revenue from revenue earned within the build itself.",
      "Useful-life assumptions converging, or a large writedown establishing the real number.",
      "Utilisation rates on installed capacity — the figure nobody publishes and everybody would like.",
    ],
    stakes: "Decides whether the largest private capital cycle in technology compounds or is written down, and whether the physical capacity outlives the companies that funded it.",
  }),

  debate("r-star", "Has the neutral rate moved structurally higher?", {
    domain: "economics", nodes: ["real_rate", "policy_rate", "term_premium", "fiscal_deficit"],
    concepts: ["monetary-policy", "real-vs-nominal", "demographics", "term-premium"],
    consensus: {
      claim: "The forces that pushed the neutral real rate down for three decades — ageing, savings gluts, weak productivity — have not reversed, so rates return toward pre-2020 norms.",
      whyHeld: "Demographics are the most predictable variable in economics, and they still point toward abundant savings and scarce investment demand.",
      evidence: [
        "Long-run demographic projections are essentially fixed and point the same direction they did in 2015.",
        "Every previous post-crisis period of high rates eventually reverted.",
      ],
    },
    contrarian: {
      claim: "Fiscal deficits at full employment, defence and energy capex, and reshoring have raised the demand for savings enough to move the neutral rate up for a decade.",
      case: [
        "The savings glut argument assumed investment demand stayed weak. Grid, defence, semiconductor and data centre capex are large, simultaneous and policy-driven rather than cyclical.",
        "Government borrowing at this scale during an expansion competes for the same savings.",
        "If the stock–bond correlation stays positive, bonds no longer hedge equities, which raises the term premium structurally rather than cyclically.",
      ],
      evidence: [
        "The average interest cost on government debt is still rising as old low-coupon issues mature — the adjustment is years from complete.",
        "Term premium estimates have moved up from deeply negative levels without a corresponding change in the policy path.",
      ],
    },
    whatWouldSettleIt: [
      "A full cycle. r* is unobservable and estimated with wide error bands, so nothing settles it quickly.",
      "Whether the stock–bond correlation reverts to negative in the next growth scare.",
      "Whether capex intensity persists once the current policy programmes finish disbursing.",
    ],
    stakes: "Sets the discount rate for every asset, the sustainable level of government debt, and whether the last three decades or the last three years were the anomaly.",
  }),

  debate("private-credit", "Is private credit safer than bank lending, or is it where the next problem forms?", {
    domain: "markets", nodes: ["credit_spreads", "bank_lending", "financial_instability"],
    concepts: ["credit-channel", "financial-instability", "liquidity", "leverage"],
    consensus: {
      claim: "It is structurally safer: the capital is locked up, so there are no runnable liabilities and no forced selling.",
      whyHeld: "The 2008 failure mode was maturity transformation — long assets funded overnight. Closed-end funds do not have that mismatch.",
      evidence: [
        "Drawdown capital cannot be redeemed on demand, which removes the run mechanism that destroyed the shadow banking system.",
        "Losses fall on institutional investors who signed up for them, not on insured depositors.",
      ],
    },
    contrarian: {
      claim: "The fragility has moved rather than disappeared, into a place where marks are appraisals and the data required to see it is not collected.",
      case: [
        "Valuations are appraisal-based rather than market-based, so stress shows up late and in one step rather than continuously.",
        "Growing distribution into insurance balance sheets and retail-accessible vehicles reintroduces liabilities that can be called.",
        "Leverage at the fund level, and at the borrower level, is not consolidated anywhere a regulator can see it.",
      ],
      evidence: [
        "Public credit spreads may understate tightening if the marginal borrower has left the lit market.",
        "Every crisis in the historical record formed where the reporting was thinnest, not where it was most watched.",
      ],
    },
    whatWouldSettleIt: [
      "A full credit downturn — the first real test of appraisal marks at this scale.",
      "Disclosure of fund-level leverage and payment-in-kind income as a share of returns.",
      "Whether insurance regulators force mark consistency before or after the test.",
    ],
    stakes: "Whether post-2008 regulation made the system safer or relocated the risk to somewhere nobody has a time series for.",
  }),

  debate("ai-power", "Does AI energy demand break the grid, or does efficiency absorb it?", {
    domain: "technology", nodes: ["power_demand", "grid_capacity", "electricity_price", "ai_capex"],
    concepts: ["jevons-paradox", "grid-constraints", "energy-density"],
    consensus: {
      claim: "Load growth is real and the grid cannot be built fast enough, so electricity becomes the binding constraint on compute.",
      whyHeld: "Interconnection queues, transformer lead times and transmission permitting all operate on multi-year timescales that no amount of capital compresses.",
      evidence: [
        "Developed-market load was flat for two decades and has resumed growing.",
        "Large buyers are contracting existing firm generation rather than waiting for new build — the behaviour of someone facing a shortage.",
      ],
    },
    contrarian: {
      claim: "Efficiency gains per unit of useful work are compounding faster than the load forecasts assume, and announced pipelines are not capacity.",
      case: [
        "Forecasts extrapolate current efficiency. Both silicon and model efficiency have improved by large multiples across short periods.",
        "Announced data centre pipelines are options, not commitments — the same project frequently appears in several utilities' queues at once.",
        "Jevons cuts both ways: it predicts more total demand only if cheaper inference opens genuinely new applications, which is an empirical question, not a law.",
      ],
      evidence: [
        "Interconnection queue reform is explicitly designed to purge speculative applications, on the assumption that many are.",
        "Historical load forecasts during previous technology cycles overshot substantially.",
      ],
    },
    whatWouldSettleIt: [
      "Realised load versus forecast load in the regions with the largest pipelines, over three years.",
      "Queue withdrawal rates once financial commitment requirements bind.",
      "Whether efficiency per useful task, rather than per token, actually improves.",
    ],
    stakes: "Determines utility capital plans, electricity prices for everyone else, and whether the compute constraint is silicon or power.",
  }),

  debate("productivity", "Will AI show up in the productivity statistics this decade?", {
    domain: "economics", nodes: ["productivity", "labor_automation", "ai_adoption"],
    concepts: ["productivity", "s-curve", "scaling-laws", "creative-destruction"],
    consensus: {
      claim: "Yes — adoption is far faster than previous general-purpose technologies, so the lag will be shorter.",
      whyHeld: "Deployment requires no new physical infrastructure at the user's end, and diffusion through software has historically been much faster than through capital equipment.",
      evidence: [
        "Adoption curves for the software layer are steeper than for any previous general-purpose technology.",
        "Measured gains in specific tasks — drafting, coding, support — are large and replicated.",
      ],
    },
    contrarian: {
      claim: "The binding constraint is organisational redesign, which moves at the speed of managerial turnover and capital replacement, not at the speed of software.",
      case: [
        "Electric motors were available in the 1890s and the factory productivity surge arrived in the 1920s. The delay was reorganising the factory, not the motor.",
        "Task-level gains do not aggregate to firm-level output when the bottleneck is elsewhere in the process.",
        "Much of the measured benefit so far is a fuel saving on the old line shaft — the same work, slightly cheaper.",
      ],
      evidence: [
        "Solow's paradox held for roughly two decades before computers appeared in the statistics.",
        "Firms reporting large AI savings are overwhelmingly reporting cost per task, not output per hour.",
      ],
    },
    whatWouldSettleIt: [
      "Total factor productivity growth sustained above its post-2005 trend for several years.",
      "Firm-level evidence of process redesign rather than task substitution.",
      "Whether measured output captures the gains at all, given how badly GDP handles quality and consumer surplus.",
    ],
    stakes: "Productivity growth is the entire remaining source of rising living standards in ageing economies. Nothing else in macro matters as much.",
  }),

  debate("semi-cycle", "Has the semiconductor cycle been repealed?", {
    domain: "business", nodes: ["semis", "accelerators", "foundry", "hbm"],
    concepts: ["capex-cycle", "supply-chain-bullwhip", "base-rates"],
    consensus: {
      claim: "This is a secular build-out, not a cycle — AI demand is structural and capacity is genuinely short.",
      whyHeld: "Every prior downturn followed inventory building against speculative demand. This time the buyers are a handful of well-capitalised firms with visible end demand.",
      evidence: [
        "Leading-edge and packaging capacity remain allocated rather than freely purchasable.",
        "Buyer concentration means less of the double-ordering that has historically driven the bust.",
      ],
    },
    contrarian: {
      claim: "Concentration makes the cycle sharper, not milder, and shortage gaming is exactly what allocation produces.",
      case: [
        "When allocation is rationed, customers order more than they need to secure supply. That phantom demand vanishes the instant supply normalises — the bullwhip's clearest form.",
        "Every capacity expansion announced today arrives simultaneously, because everyone read the same shortage.",
        "Concentrated buyers can cut simultaneously as easily as they can order simultaneously.",
      ],
      evidence: [
        "The industry has run this cycle roughly every four years since the 1970s, and each time participants explained why it was different.",
        "The 2021–23 goods cycle was a textbook bullwhip at global scale, mistaken at the time for durable demand.",
      ],
    },
    whatWouldSettleIt: [
      "Order backlog growth versus shipment growth — a widening gap is phantom demand accumulating.",
      "Cancellation rates once lead times normalise.",
      "Whether announced capacity additions exceed plausible demand growth on any published forecast.",
    ],
    stakes: "The most capital-intensive industry in the world is expanding on the assumption that this time is different. It has been wrong about that before.",
  }),

  debate("dedollarisation", "Is the dollar's role eroding?", {
    domain: "geopolitics", nodes: ["usd", "gold", "sanctions", "trade_fragmentation"],
    concepts: ["dollar", "sanctions-policy", "network-effects"],
    consensus: {
      claim: "No meaningful erosion. There is no substitute with comparable depth, liquidity and legal predictability, and incentive is not capability.",
      whyHeld: "Reserve currency status runs on network effects. Every previous prediction of its end has been wrong, including after 1971.",
      evidence: [
        "No alternative offers a bond market of comparable size and openness.",
        "Dollar invoicing and offshore dollar credit have both continued to grow in absolute terms.",
      ],
    },
    contrarian: {
      claim: "Erosion is happening at the margins that matter, and the network effect masks it until the moment it does not.",
      case: [
        "Central bank gold accumulation has run well above its historical pace, which is a portfolio statement rather than a trading one.",
        "Bilateral commodity settlement and alternative payment rails are being built precisely because reserve assets proved sanctionable.",
        "Network effects are stable until a coordination point moves. They do not decay gradually — that is the whole property.",
      ],
      evidence: [
        "Reserve composition shifts are slow, small and consistently in one direction.",
        "The incentive to build alternatives is now explicit policy in several large economies rather than theoretical.",
      ],
    },
    whatWouldSettleIt: [
      "The share of cross-border payments settled outside dollar rails, over a decade rather than a quarter.",
      "Whether any alternative bond market deepens enough to absorb reserve-scale flows.",
      "COFER reserve composition trends net of valuation effects.",
    ],
    stakes: "Dollar status subsidises US borrowing costs and gives its financial sanctions their force. Both are large, and neither is guaranteed.",
  }),

  debate("china-property", "Is China's property adjustment a balance sheet recession?", {
    domain: "economics", nodes: ["china_growth", "home_prices", "bank_lending", "copper"],
    concepts: ["credit-channel", "financial-instability", "demographics"],
    consensus: {
      claim: "It follows Japan's template: households and developers repair balance sheets, demand stays weak, and policy pushes on a string.",
      whyHeld: "The structural setup is close — a property bubble, indebted developers, local government finance dependent on land sales, and households whose principal asset is falling.",
      evidence: [
        "Household precautionary saving has risen and stayed high.",
        "Credit demand has been weak despite easing, which is the diagnostic signature of the mechanism.",
      ],
    },
    contrarian: {
      claim: "The state controls the banking system and the pace of loss recognition, which makes this a policy choice rather than a mechanical process.",
      case: [
        "Japan's outcome was driven substantially by how slowly bad debt was recognised. That variable is directly controllable here.",
        "Household leverage is lower and the savings rate higher, so the repair required is smaller in scale.",
        "Manufacturing and export capacity give an alternative growth channel Japan did not have to the same degree.",
      ],
      evidence: [
        "Sweden resolved a comparable shock in years rather than decades, by recognising losses fast.",
        "Industrial output and export share have continued to grow through the property adjustment.",
      ],
    },
    whatWouldSettleIt: [
      "The pace of developer loss recognition versus forbearance.",
      "Whether household savings rates normalise or stay elevated for several years.",
      "Whether credit growth responds to easing with the usual lag or fails to.",
    ],
    stakes: "China is the marginal buyer of most industrial commodities and a major source of manufactured goods disinflation. Which path it takes reaches everyone.",
  }),

  debate("nuclear", "Is the nuclear revival real?", {
    domain: "technology", nodes: ["nuclear_power", "smr", "power_demand", "uranium"],
    concepts: ["energy-density", "capex-cycle", "base-rates", "s-curve"],
    consensus: {
      claim: "Yes — firm carbon-free baseload matches what large electricity buyers now need, and money has arrived.",
      whyHeld: "Corporate power agreements for existing nuclear output are signed and public, and restart projects are underway.",
      evidence: [
        "Existing plants are being revalued and recontracted at prices that would have been implausible a few years ago.",
        "Policy support is bipartisan in a way it has not been for decades.",
      ],
    },
    contrarian: {
      claim: "Revaluing existing plants is not new supply, and no modular design has yet demonstrated the cost curve the thesis depends on.",
      case: [
        "Contracting existing output reallocates firm capacity — it raises prices for everyone else and adds nothing to the system.",
        "The entire small-modular case rests on the second and third unit costing materially less than the first. That has not been tested at commercial scale.",
        "Large nuclear has a long and consistent record of schedule and cost overruns, in every jurisdiction.",
      ],
      evidence: [
        "First-of-a-kind costs in recent Western large builds ran far above estimates.",
        "Announced pipelines are intentions; the historical conversion rate from announcement to operating reactor is poor.",
      ],
    },
    whatWouldSettleIt: [
      "Unit two and unit three of any modular design delivered materially cheaper and faster than unit one.",
      "Whether restarts and uprates deliver on schedule.",
      "Whether new large builds start at all, rather than being discussed.",
    ],
    stakes: "Firm carbon-free generation is the piece the energy transition has no substitute for. If modular economics do not work, gas fills the gap.",
  }),

  debate("labour-automation", "Does AI displace workers or fill a demographic hole?", {
    domain: "economics", nodes: ["labor_automation", "aging", "labor_supply", "unemployment"],
    concepts: ["demographics", "creative-destruction", "productivity", "comparative-advantage"],
    consensus: {
      claim: "Displacement is real but gradual, and ageing workforces absorb it — the jobs disappear roughly as fast as the workers retire.",
      whyHeld: "Working-age populations are shrinking across most large economies, so automation substitutes for labour that would not have existed anyway.",
      evidence: [
        "Dependency ratios are deteriorating on a schedule that is already determined.",
        "Historically, automation reallocated labour rather than eliminating it in aggregate.",
      ],
    },
    contrarian: {
      claim: "The aggregate arithmetic conceals the distribution: the workers displaced and the workers retiring are not the same people, in the same places, with the same skills.",
      case: [
        "The China shock literature found adjustment costs in affected labour markets were far larger and more persistent than models assumed. Displaced workers did not smoothly relocate.",
        "Entry-level cognitive work is the most automatable and also the training ground for everything above it. Removing the bottom rung is not the same as removing a job.",
        "Aggregate gains with concentrated losses is a political problem long before it is an economic one.",
      ],
      evidence: [
        "Automobiles destroyed the carriage economy; employment recovered and the specific towns largely did not.",
        "Hiring in junior roles is the most sensitive to any cost saving, and the least visible in aggregate unemployment.",
      ],
    },
    whatWouldSettleIt: [
      "Entry-level hiring rates in exposed occupations, separated from the aggregate.",
      "Whether displaced workers' earnings recover within a few years or permanently step down.",
      "Occupational mobility data, which is where the previous consensus was wrong.",
    ],
    stakes: "Whether the transition is managed is not a question about technology. Societies that did not compensate the losers reliably turned against the technology, the trade, or the institutions.",
  }),
];

export const DEBATE_BY_ID = new Map(DEBATES.map((entry) => [entry.id, entry]));
export const debateFor = (id) => DEBATE_BY_ID.get(id) || null;
export const debatesForNode = (nodeId) => DEBATES.filter((entry) => entry.nodes.includes(nodeId));
export const debatesForConcept = (conceptId) => DEBATES.filter((entry) => (entry.concepts || []).includes(conceptId));

/** Deterministic weekly rotation, matching the lesson engine's cadence. */
export function debateForWeek(weekStartIso) {
  const weeks = Math.floor(Date.parse(`${weekStartIso}T00:00:00Z`) / 6.048e8);
  const index = ((weeks % DEBATES.length) + DEBATES.length) % DEBATES.length;
  return DEBATES[index];
}
