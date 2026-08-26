/** LESSONS — technology, finance and the industrial record. */

export const LESSONS_B = [
  {
    id: "transistor-fairchild",
    title: "The Transistor, the Traitorous Eight, and Why Silicon Valley Is Where It Is",
    domain: "technology", era: "1947–1971", minutes: 8,
    hook: "Eight engineers quit at once because their boss was impossible to work for. The company they founded is the ancestor of most of the semiconductor industry.",
    sections: {
      whatHappened:
        "In December 1947 at Bell Labs, John Bardeen and Walter Brattain demonstrated the point-contact transistor; William Shockley followed with the more manufacturable junction transistor in 1951. The three shared the 1956 Nobel Prize in Physics. Shockley left to found Shockley Semiconductor in Mountain View, California, in 1956 — choosing the location largely to be near his mother. He proved an extraordinarily difficult manager, and in 1957 eight of his researchers resigned together to found Fairchild Semiconductor. In 1958–59 Jack Kilby at Texas Instruments and Robert Noyce at Fairchild independently arrived at the integrated circuit; Noyce's planar process was the one that scaled to manufacturing.",
      whyItHappened:
        "The transistor came from a deliberate, well-funded basic research programme with a clear applied goal: replacing vacuum tubes in telephone switching. Bell Labs licensed the technology broadly, partly under antitrust pressure, which spread it far faster than a closed strategy would have. The Fairchild diaspora happened because semiconductors were a knowledge business where the critical assets walked out of the door each evening — and because a novel financing structure, later recognisable as venture capital, made leaving feasible.",
      whoMattered:
        "Bardeen, Brattain and Shockley for the invention; Noyce and Gordon Moore among the eight who left; Arthur Rock, who arranged the Fairchild financing and effectively demonstrated the venture capital model. Fairchild alumni went on to found Intel, AMD, National Semiconductor and dozens of others — the 'Fairchildren'. Moore's 1965 article in Electronics, observing that transistor counts per chip were doubling at a regular cadence, became the industry's coordinating forecast.",
      whatChanged:
        "Moore's Law functioned less as a physical law than as a self-fulfilling industry roadmap: because everyone believed and planned against it, suppliers, equipment makers and customers coordinated their investments to hit it. Californian employment law is a genuine and underrated factor — non-compete agreements are largely unenforceable in California, so the talent mobility that built the region was legally possible there and much harder elsewhere.",
      whyItMattersToday:
        "Every current question about semiconductor concentration, export controls and industrial policy inherits this history. The industry's structure — fabless designers, contract foundries, a handful of equipment monopolies — emerged from decades of specialisation, and it is precisely that specialisation which created the chokepoints now being used as policy instruments.",
      lessons: [
        "Talent mobility compounds. Regions that make leaving easy accumulate more companies than regions that lock people in.",
        "A widely believed roadmap can coordinate an entire supply chain's investment and become partly self-fulfilling.",
        "Basic research with patient funding and broad licensing produced more value than any of the participants captured.",
      ],
      connection:
        "Today's frontier AI labs have the same structure risk: the critical assets are people, the knowledge is portable, and the capital requirements now exceed what a small team can raise. If compute scale becomes the binding constraint rather than talent, the Fairchild dynamic reverses — and the industry consolidates rather than fragments. Which of those is happening is one of the more consequential open questions in the sector.",
    },
    concepts: ["s-curve", "creative-destruction", "network-effects", "export-controls", "moat"],
    nodes: ["semis", "foundry", "ai_capability", "export_controls"],
    sources: [
      { label: "Nobel Prize — Physics 1956", url: "https://www.nobelprize.org/prizes/physics/1956/summary/", tier: 1 },
      { label: "Computer History Museum — Silicon Engine timeline", url: "https://www.computerhistory.org/siliconengine/", tier: 2 },
    ],
  },

  {
    id: "dotcom-fibre",
    title: "The Dot-Com Bust: When Capital Is Destroyed and Capacity Survives",
    domain: "history", era: "1995–2004", minutes: 8,
    hook: "Investors lost a fortune building fibre optic cable nobody needed. A decade later, that cable was what made streaming video and cloud computing possible.",
    sections: {
      whatHappened:
        "The Nasdaq Composite peaked on 10 March 2000 near 5,048 and fell roughly 78% to its October 2002 low. Telecommunications was the epicentre of the capital destruction: carriers raised enormous debt to lay long-haul fibre on the belief that internet traffic was doubling every three months — a figure that was widely repeated, sourced to a single carrier's early data, and wrong. Global Crossing and WorldCom filed among the largest bankruptcies in US history to that point. Estimates at the time suggested only a small fraction of installed fibre was actually carrying traffic.",
      whyItHappened:
        "A genuine technological transformation, a plausible growth extrapolation, an equity market that rewarded capacity announcements, and debt financing that made the build possible. The traffic-doubling claim propagated because it justified what everyone wanted to do anyway. Accounting fraud at WorldCom and elsewhere extended the cycle past the point where the numbers should have stopped it.",
      whoMattered:
        "Carriers who built. Bond investors who funded it — and who bore most of the loss. The equipment makers who booked the revenue. And the buyers of distressed fibre assets afterwards, who acquired the physical network for a small fraction of its construction cost and built profitable businesses on it.",
      whatChanged:
        "The physical capacity did not disappear when the companies did; it changed owners at a much lower price. That dark fibre, lit progressively with improving optical equipment, underpinned the broadband, streaming and cloud era. The capital was destroyed. The asset was not.",
      whyItMattersToday:
        "This is the essential distinction for any infrastructure boom: whether the capacity being built is useful and merely early, or genuinely unnecessary. Both cases destroy capital for the original investors. Only one leaves a foundation. Railway manias in the nineteenth century produced the same pattern — ruined investors, functioning railways.",
      lessons: [
        "'The technology was real' and 'the investment was a disaster' are entirely compatible statements about the same period.",
        "A widely repeated growth statistic with a single weak source can move tens of billions of dollars. Check the provenance of the number everyone is quoting.",
        "Whoever buys the asset out of bankruptcy often captures most of the eventual value. Being right early is a distinct financial outcome from being right.",
        "Debt determines who survives. The same overbuild funded by equity is a bad decade; funded by debt it is a bankruptcy.",
      ],
      connection:
        "The AI data centre build-out is the live version of this question, and the honest answer is that it is not yet determinable. The useful diagnostic is not whether the technology is real — it is — but the financing structure, the depreciation assumptions on the equipment, and whether contracted demand comes from end customers or from other participants in the same build. Fibre was a fifteen-year asset that survived its owners. Whether accelerators are a three-year or a six-year asset is a materially different question, and it decides who is left holding the loss.",
    },
    concepts: ["capex-cycle", "base-rates", "valuation", "leverage", "s-curve"],
    nodes: ["ai_capex", "data_center_buildout", "venture_funding", "credit_spreads"],
    sources: [
      { label: "FRED — NASDAQ Composite Index", url: "https://fred.stlouisfed.org/series/NASDAQCOM", tier: 1 },
      { label: "SEC — EDGAR full-text search of filings", url: "https://efts.sec.gov/LATEST/search-index?q=", tier: 1 },
    ],
  },

  {
    id: "electrification-productivity",
    title: "The Dynamo and the Computer: Why Technology Takes Decades to Show Up",
    domain: "history", era: "1890–1930", minutes: 7,
    hook: "Factories had electric motors for thirty years before electricity made them more productive. The delay was not the technology. It was that nobody had rebuilt the factory yet.",
    sections: {
      whatHappened:
        "Practical electric motors were commercially available from the 1890s. US manufacturing productivity growth did not accelerate meaningfully until the 1920s. Economic historian Paul David examined this in a 1990 paper, 'The Dynamo and the Computer', written to explain why computers were similarly invisible in productivity statistics at the time.",
      whyItHappened:
        "Steam-powered factories were organised around a central engine driving overhead line shafts, with machines placed by proximity to the power source rather than by workflow. Buildings were multi-storey to minimise shaft length. The first electric installations simply replaced the steam engine with one large electric motor driving the same shafts — capturing a fuel saving and nothing else. The productivity gain required 'unit drive': a small motor on each machine, which freed layout entirely. That permitted single-storey factories organised around material flow, overhead cranes, and eventually the assembly line. Realising it meant scrapping existing plants and retraining the workforce, which happened only as old capital wore out and as a generation of managers who thought in electrical terms took over.",
      whoMattered:
        "Paul David for the analysis. The factory engineers who reorganised production around the new constraint rather than retrofitting the old one. Henry Ford, whose moving assembly line was an application of what unit drive made possible, not of the motor itself.",
      whatChanged:
        "The framework generalised: general-purpose technologies require complementary co-invention — in organisation, skills and business processes — before their productivity effect appears. The lag is measured in decades, and it is dominated by the rate at which organisations and capital stock can be replaced, not by the rate of technical progress.",
      whyItMattersToday:
        "It is the single most relevant historical case for AI. Firms deploying AI into existing workflows are installing a large motor on the old line shaft: real savings, small effect. The productivity gain, if it comes, requires redesigning the process around what the technology makes cheap — and that is limited by organisational change speed, not model capability.",
      lessons: [
        "Technology diffusion is gated by organisational redesign, and organisations change roughly at the speed of capital replacement and managerial turnover.",
        "The first application of any general-purpose technology is imitating the thing it replaces. The value comes from the second application.",
        "The productivity statistics can be honestly flat while an enormous transformation is underway. Solow's paradox was a measurement observation, not a debunking.",
      ],
      connection:
        "Assessing AI's economic effect requires distinguishing three things that are constantly conflated: capability (rising fast), deployment (rising slower), and organisational redesign around it (barely started). Firms reporting large AI savings are usually reporting the fuel saving. The layout change has not happened yet — and on this precedent, it takes a decade or more, and the winners are frequently not the incumbents.",
    },
    concepts: ["productivity", "s-curve", "creative-destruction", "scaling-laws"],
    nodes: ["ai_adoption", "labor_automation", "productivity"],
    sources: [
      { label: "BLS — Productivity and Costs", url: "https://www.bls.gov/productivity/", tier: 1 },
      { label: "NBER — Working papers on general purpose technologies", url: "https://www.nber.org/papers", tier: 1 },
    ],
  },

  {
    id: "toyota-production-system",
    title: "Toyota: How a Small Carmaker Rewrote Manufacturing",
    domain: "business", era: "1948–1990", minutes: 7,
    hook: "Toyota's advantage was not a machine or a patent. It was a set of ideas about inventory and defects that competitors could read about in detail and still could not copy.",
    sections: {
      whatHappened:
        "Post-war Toyota lacked capital, scale and a large domestic market. Taiichi Ohno developed a production system built on two pillars: just-in-time, in which parts arrive as needed rather than being stockpiled, and jidoka, in which any worker can stop the line when a defect appears. Kanban cards signalled replenishment. Continuous small improvements — kaizen — accumulated. By the 1980s Toyota's quality and productivity advantage over Western manufacturers was large and well documented.",
      whyItHappened:
        "Scarcity forced it. Toyota could not afford large inventories or the rework that Western mass production tolerated, so it eliminated the need for both. Ohno's insight was that inventory conceals problems: reduce it and defects surface immediately, forcing a fix at the source rather than an inspection at the end.",
      whoMattered:
        "Ohno and Eiji Toyoda. W. Edwards Deming, the American statistician whose quality-control teaching found a far more receptive audience in post-war Japan than at home. The MIT International Motor Vehicle Program, whose 1990 book 'The Machine That Changed the World' popularised 'lean production' in the West. And the NUMMI joint venture from 1984, where Toyota took over a closed GM plant, rehired the same workforce that GM had considered its worst, and produced cars at Toyota quality — demonstrating that the system, not the workers, was the variable.",
      whatChanged:
        "Lean methods spread across manufacturing and then well beyond it — into software development, healthcare and services. Toyota published extensively and hosted competitors' tours, which turned out to be safe: the practices were visible, but the managerial culture that sustained them was not transferable by observation.",
      whyItMattersToday:
        "It is the definitive case that operational capability can be a durable competitive advantage — harder to copy than a patent precisely because it is a system of habits rather than an artefact. It is also the origin of the just-in-time supply chains whose fragility was exposed in 2020, which is a genuine cost of the model and not a refutation of it.",
      lessons: [
        "A process advantage can be more durable than a technological one, because it cannot be bought.",
        "Inventory hides problems. So do all buffers, in every kind of system — the reason to reduce them is diagnostic as much as financial.",
        "NUMMI is the cleanest natural experiment in management: same plant, same workers, different system, transformed result.",
        "Efficiency and resilience genuinely trade off. Just-in-time was correct for four decades of stable trade and expensive during a pandemic.",
      ],
      connection:
        "The post-2020 shift toward inventory buffers and dual sourcing is a partial retreat from a model that was optimal under different assumptions. That retreat costs working capital and margin permanently — a structural, ongoing cost of a more fragmented world that shows up in company financials rather than in trade statistics.",
    },
    concepts: ["moat", "supply-chain-bullwhip", "creative-destruction", "productivity"],
    nodes: ["supply_chain", "manufacturing", "reshoring", "industrials"],
    sources: [
      { label: "Toyota — Toyota Production System", url: "https://global.toyota/en/company/vision-and-philosophy/production-system/", tier: 1 },
      { label: "US Census — Manufacturers' Shipments, Inventories and Orders", url: "https://www.census.gov/manufacturing/m3/", tier: 1 },
    ],
  },

  {
    id: "japan-bubble",
    title: "Japan's Bubble and the Balance Sheet Recession",
    domain: "history", era: "1985–2005", minutes: 8,
    hook: "At the peak, the land under the Imperial Palace was said to be worth more than all the real estate in California. What followed was not a crash so much as a twenty-year deleveraging.",
    sections: {
      whatHappened:
        "Following the 1985 Plaza Accord, coordinated intervention drove the yen sharply higher, hurting Japanese exporters. The Bank of Japan eased aggressively in response. Credit expanded into equities and land, with cross-shareholdings and land-collateralised lending amplifying both. The Nikkei 225 peaked on 29 December 1989 near 38,915 and then fell for years; land prices followed. What came after was not a sharp recession but a prolonged stagnation with persistent deflation, through which the index remained far below its peak for over three decades.",
      whyItHappened:
        "Richard Koo's balance sheet recession framework is the most useful account: when asset prices collapse but the debt used to buy them remains, firms shift from maximising profit to minimising debt. They repay rather than invest, even at zero interest rates, because they are technically insolvent on a mark-to-market basis and know it. Monetary policy loses traction because the problem is not the price of credit but the absence of anyone wanting it. Banks compounded this by rolling over loans to unviable borrowers — 'zombie lending' — which kept capacity in the market and suppressed the returns of healthy competitors.",
      whoMattered:
        "The Bank of Japan, criticised both for easing too long and for tightening too abruptly in 1989–90. Koo, for the diagnosis. Ben Bernanke, who in 1999 published a paper on Japanese self-induced paralysis and then, as Fed chair, applied the resulting conclusions to the US in 2008 — one of the clearest cases of an academic critique becoming policy.",
      whatChanged:
        "Japan pioneered the zero-rate policy toolkit: ZIRP from 1999, quantitative easing from 2001, later yield curve control. Every one of these was adopted elsewhere after 2008. Japan was the laboratory, and the rest of the world used the results.",
      whyItMattersToday:
        "It established that policy rates hitting zero is a real constraint, that deflation expectations are extremely hard to reverse once established, and that the speed of recognising and writing off bad debt matters more than the size of the losses. Sweden's rapid resolution in the early 1990s and Japan's slow one produced very different decades from comparable shocks.",
      lessons: [
        "When the private sector is repairing balance sheets, monetary policy pushes on a string. The binding constraint is willingness to borrow, not the cost of borrowing.",
        "Zombie lending protects employment in the short run and suppresses aggregate productivity for a decade.",
        "Recognising losses quickly is painful and correct. Every incentive facing regulators and banks points the other way.",
        "Deflation expectations are far harder to un-anchor than inflation expectations. Prevention and cure are not symmetric.",
      ],
      connection:
        "The framework is the standard lens for China's property adjustment: heavily indebted developers, local government finance dependent on land sales, households whose principal asset is falling in value. Whether it becomes a Japanese-style balance sheet recession depends on the speed of loss recognition and on whether households increase precautionary saving — both of which are policy-responsive and both of which are currently contested.",
    },
    concepts: ["credit-channel", "monetary-policy", "financial-instability", "leverage", "quantitative-easing"],
    nodes: ["china_growth", "home_prices", "bank_lending", "policy_rate"],
    sources: [
      { label: "Bank of Japan — Statistics", url: "https://www.boj.or.jp/en/statistics/index.htm", tier: 1 },
      { label: "IMF — Japan country report archive", url: "https://www.imf.org/en/Countries/JPN", tier: 1 },
    ],
  },

  {
    id: "gfc-2008",
    title: "2008: How a Housing Correction Became a Global Crisis",
    domain: "history", era: "2006–2010", minutes: 9,
    hook: "US subprime mortgages were too small a market to threaten the world economy. Leverage, opacity and short-term funding made them exactly big enough.",
    sections: {
      whatHappened:
        "US house prices peaked around 2006 and began falling. Subprime mortgages, packaged into mortgage-backed securities and repackaged into collateralised debt obligations, had been rated highly on models that assumed regionally uncorrelated house prices. As defaults rose, the securities' values became unknowable, and because they were held throughout the financial system as collateral, nobody could assess counterparty solvency. Bear Stearns was absorbed in March 2008; Lehman Brothers filed for bankruptcy on 15 September 2008; AIG was rescued the following day. Money market funds broke the buck, the commercial paper market froze, and the crisis spread globally within weeks.",
      whyItHappened:
        "Several failures compounded. Originators had no residual exposure to loans they sold on, removing the incentive to underwrite carefully. Rating agencies were paid by issuers and applied models with a fatally wrong correlation assumption. Banks funded long-dated illiquid assets with overnight repo, so a loss of confidence became an immediate funding failure. Leverage in the shadow banking system was largely outside the regulatory perimeter and outside the data. And the risk was concentrated exactly where it was believed to be diversified.",
      whoMattered:
        "The rating agencies, whose models made the securities institutionally purchasable. Regulators who had visibility into banks but not into the funding markets that mattered. The small number of investors who read the loan tapes rather than the ratings. Central bankers and treasury officials who improvised a response with legal authority designed for a different century.",
      whatChanged:
        "Basel III raised capital and introduced liquidity requirements. Stress testing became routine. Derivatives moved toward central clearing. Resolution regimes were created to wind down large institutions. Banks became demonstrably safer — and a substantial share of credit intermediation moved to non-banks, where the leverage is less visible and there is no lender of last resort.",
      whyItMattersToday:
        "The crisis established that opacity plus leverage plus short-term funding is the recurring structure of financial crises, regardless of the asset. Post-crisis regulation addressed the banks specifically. Whether it reduced systemic fragility or relocated it into private credit, funds and non-bank intermediaries is genuinely unresolved, and the data required to settle it is not collected.",
      lessons: [
        "Correlation assumptions are where risk models fail, because correlations rise toward one exactly in the scenario the model is supposed to cover.",
        "'AAA' is a rating, not a fact. Any assessment paid for by the issuer carries a structural conflict.",
        "The system's fragility lives in the funding structure, not the asset. Good assets financed overnight are a crisis waiting for a trigger.",
        "Regulation is written against the last crisis. The next one forms where the reporting is thin.",
      ],
      connection:
        "Private credit has grown rapidly, is valued by appraisal rather than by market price, and is held increasingly by insurers and retail-accessible vehicles. None of that is evidence of a crisis. It is, precisely, the profile of a place where fragility could accumulate unobserved — which is the one durable lesson of 2008: watch where the data isn't.",
    },
    concepts: ["leverage", "liquidity", "credit-spreads", "moral-hazard", "financial-instability", "bank-run"],
    nodes: ["credit_spreads", "bank_lending", "home_prices", "financial_instability"],
    sources: [
      { label: "Financial Crisis Inquiry Commission — Final Report", url: "https://www.govinfo.gov/app/details/GPO-FCIC", tier: 1 },
      { label: "Federal Reserve History — The Great Recession", url: "https://www.federalreservehistory.org/essays/great-recession-and-its-aftermath", tier: 1 },
    ],
  },

  {
    id: "asian-crisis-1997",
    title: "1997: The Crisis That Taught Emerging Markets to Hoard Reserves",
    domain: "history", era: "1997–1999", minutes: 7,
    hook: "Countries with balanced budgets, high savings and fast growth collapsed in months — because they had borrowed in a currency they could not print.",
    sections: {
      whatHappened:
        "On 2 July 1997 Thailand abandoned its dollar peg after exhausting reserves defending it. The baht fell sharply, and contagion spread to Indonesia, Malaysia, South Korea and the Philippines. Currencies and equity markets collapsed; Indonesia's crisis contributed directly to the fall of the Suharto government. The IMF provided large programmes conditioned on fiscal tightening and structural reform, a policy mix widely criticised afterwards as procyclical and inappropriate for a crisis that was not fiscal in origin.",
      whyItHappened:
        "Currency mismatch. Domestic banks and corporates borrowed cheaply in dollars and lent in local currency, betting implicitly that the peg would hold. When it broke, dollar liabilities exploded in local-currency terms while assets did not. Short-term external debt exceeded reserves in several cases, which made a self-fulfilling run rational for creditors. Pegs and open capital accounts had encouraged exactly the borrowing that made the peg indefensible.",
      whoMattered:
        "The IMF, whose conditionality became the crisis's most enduring controversy. Malaysia's government, which imposed capital controls against near-universal advice — a decision that looked reckless and has been reassessed considerably more favourably since. Korea's rapid recovery, which showed the difference credible restructuring makes.",
      whatChanged:
        "Emerging economies drew a clear conclusion: never again depend on the IMF. Reserve accumulation became systematic, exchange rates were allowed to float more freely, and local-currency bond markets were deliberately developed. Global reserve holdings rose enormously over the following decade — with the side effect of channelling substantial savings into US Treasuries, contributing to the low long-term yields of the 2000s.",
      whyItMattersToday:
        "Reserve adequacy and currency composition of debt remain the first things to check on any emerging market. The crisis also permanently altered the politics of international financial institutions: their advice is now weighed against a specific and widely remembered failure.",
      lessons: [
        "Currency mismatch turns an exchange rate move into a solvency crisis. The unit of account of your liabilities matters more than their size.",
        "A fixed exchange rate with an open capital account and independent monetary policy cannot all hold at once. The trilemma is not negotiable.",
        "Crisis policy advice is a political act with decades-long consequences for who is trusted.",
        "Countries learn, and the lesson they learn shapes global capital flows for a generation.",
      ],
      connection:
        "When the dollar strengthens and US rates rise, the same diagnostic applies: who borrowed in dollars, what are their reserves, and how much of the debt is short-term. The vulnerability today sits more with corporates and offshore entities than with sovereigns — which is harder to see, because the reporting is worse.",
    },
    concepts: ["em-stress", "dollar", "liquidity", "leverage"],
    nodes: ["usd", "em_stress", "policy_rate", "credit_spreads"],
    sources: [
      { label: "IMF — The IMF and the Asian Crisis", url: "https://www.imf.org/external/np/exr/facts/asia.htm", tier: 1 },
      { label: "BIS — Global liquidity indicators", url: "https://www.bis.org/statistics/gli.htm", tier: 1 },
    ],
  },
];
