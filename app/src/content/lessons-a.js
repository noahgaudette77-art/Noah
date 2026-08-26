/**
 * LESSONS — the history engine.
 *
 * One is surfaced each Monday. Every lesson answers the same seven questions,
 * and the last one — the connection to now — is the reason the others are here.
 *
 * Dates, names and sequences are drawn from the standard historical record and
 * are checkable against the sources listed on each lesson. Where a magnitude is
 * disputed or an interpretation contested, the text says so rather than picking
 * a side and presenting it as settled.
 */

export const LESSONS_A = [
  {
    id: "federal-reserve-1913",
    title: "How a Panic Created the Federal Reserve",
    domain: "history", era: "1907–1913", minutes: 7,
    hook: "The most powerful economic institution in the world exists because in 1907 a single private banker had to lock the country's financiers in his library until they agreed to stop a bank run.",
    sections: {
      whatHappened:
        "In October 1907 a failed attempt to corner the stock of United Copper triggered runs on the trust companies that had financed it. The Knickerbocker Trust, then one of New York's largest, suspended payments. With no central bank, there was no institution able to lend against good collateral to solvent institutions facing a liquidity crisis. J.P. Morgan, aged 70 and holding no public office, convened the leading bankers, audited the failing trusts himself, and organised private rescue pools — reportedly keeping the participants in his library overnight until they committed funds. The panic subsided, but the episode made the absence of a lender of last resort impossible to ignore.",
      whyItHappened:
        "The United States had operated without a central bank since Andrew Jackson let the Second Bank's charter lapse in 1836, out of a deep and durable political suspicion of concentrated financial power. The resulting system was structurally prone to seasonal liquidity crises: an 'inelastic' currency could not expand when agricultural regions drew down reserves at harvest, and a pyramided reserve structure concentrated country-bank deposits in a handful of New York institutions. Panics in 1873, 1884, 1893 and 1907 were not accidents; they were the system working as designed.",
      whoMattered:
        "J.P. Morgan, whose private action demonstrated both the need for a public institution and the danger of relying on one man. Senator Nelson Aldrich, who led the National Monetary Commission and convened the secret 1910 meeting at Jekyll Island, Georgia, where the outline of the plan was drafted by bankers including Paul Warburg. Carter Glass and Woodrow Wilson, who reshaped that plan into something politically passable by dispersing power across regional Reserve Banks rather than concentrating it in New York.",
      whatChanged:
        "The Federal Reserve Act was signed on 23 December 1913. Its compromise architecture — twelve regional Reserve Banks with private member-bank shareholders, coordinated by a Washington board — was designed to answer the political objection rather than the economic one. That structure still shapes how US monetary policy is made and argued about, including the rotating regional votes on the Federal Open Market Committee.",
      whyItMattersToday:
        "Every debate about central bank independence, mandate and legitimacy is a continuation of the 1913 compromise. The Fed was created to prevent liquidity crises; it has since acquired responsibility for inflation, employment, and — since 2008 — financial stability, without a corresponding expansion of its democratic accountability. That gap is the source of essentially every modern political attack on it, from both directions.",
      lessons: [
        "Institutions are usually built in the aftermath of a crisis, which means they are designed against the last failure rather than the next one.",
        "The Fed's federated structure was a political solution to a political problem. Its economic consequences were an afterthought, and are still being managed.",
        "A private actor filling a public role is a warning sign, not a durable solution — the 1907 rescue worked and could not have been repeated.",
      ],
      connection:
        "The 2023 regional bank failures reran the 1907 problem with modern technology: solvent-by-some-measures institutions facing a coordinated withdrawal faster than any historical precedent. The response — emergency lending against collateral valued at par — was the lender-of-last-resort function the Fed was created to provide. The argument that followed, about whether the backstop had been extended to institutions that had not paid for it, is the moral hazard question that was raised at Jekyll Island and never settled.",
    },
    concepts: ["bank-run", "moral-hazard", "monetary-policy", "financial-instability"],
    nodes: ["policy_rate", "bank_lending", "financial_instability"],
    sources: [
      { label: "Federal Reserve History — The Panic of 1907", url: "https://www.federalreservehistory.org/essays/panic-of-1907", tier: 1 },
      { label: "Federal Reserve History — Federal Reserve Act Signed", url: "https://www.federalreservehistory.org/essays/federal-reserve-act-signed", tier: 1 },
    ],
  },

  {
    id: "great-depression",
    title: "The Great Depression: When Policy Made It Worse",
    domain: "history", era: "1929–1939", minutes: 9,
    hook: "The crash was not the disaster. What turned a severe recession into a decade-long collapse was a sequence of policy decisions that each looked defensible at the time.",
    sections: {
      whatHappened:
        "US equities peaked in September 1929 and crashed in late October. What followed was not a normal downturn: roughly a third of US banks failed between 1930 and 1933, the money supply contracted by about a third, industrial production fell by close to half, and unemployment peaked near 25% in 1933. World trade collapsed. The contraction spread globally through the gold standard, and countries that left gold earlier — Britain in 1931, the United States in 1933 — recovered earlier.",
      whyItHappened:
        "Friedman and Schwartz's monetary explanation holds that the Federal Reserve allowed the money supply to collapse by failing to act as lender of last resort during successive banking panics. Bernanke's later work added a credit channel: bank failures destroyed the relationship-specific knowledge required to lend, so credit did not resume even when money did. Eichengreen and Temin emphasised the gold standard as the transmission mechanism and the constraint — defending a gold parity required raising rates into a depression. Smoot–Hawley tariffs in 1930 and the retaliation they triggered accelerated the collapse in trade. These explanations are complementary rather than competing.",
      whoMattered:
        "The Federal Reserve Board, which raised rates in 1931 to defend the gold parity after Britain devalued. Andrew Mellon, whose reported 'liquidate labor, liquidate stocks' posture captured the liquidationist view that the depression was a necessary purge. Franklin Roosevelt, who took the US off gold in April 1933 and whose banking holiday and deposit insurance stopped the runs. Marriner Eccles, who reshaped the Fed into something that could act.",
      whatChanged:
        "Deposit insurance (FDIC), the separation of commercial and investment banking (Glass–Steagall), securities regulation (SEC), and eventually the intellectual acceptance that aggregate demand could be deficient and that governments could act on it. The Employment Act of 1946 made macroeconomic stabilisation an explicit government responsibility for the first time.",
      whyItMattersToday:
        "The Depression is the reference case every subsequent policymaker has studied. Bernanke was a Depression scholar before he was Fed chair, and the 2008 response — flooding the system with liquidity, backstopping money markets, refusing to let the money supply contract — was explicitly designed against the 1930s failure. The 2020 response was faster still. Both were, in a real sense, arguments with Andrew Mellon.",
      lessons: [
        "The worst outcomes come from policy responses, not shocks. The shock is the test; the response determines the result.",
        "A fixed exchange rate regime exports deflation. Whoever leaves first recovers first, which makes commitment to a peg unstable exactly when it matters.",
        "Trade retaliation is fast, symmetrical and much harder to reverse than to start.",
        "Studying the last catastrophe is genuinely useful — 2008 and 2020 were both handled better because of it — but it guarantees the next surprise arrives somewhere unstudied.",
      ],
      connection:
        "The 2020 pandemic response was the anti-1930s: immediate, enormous, coordinated between fiscal and monetary authorities. It avoided the deflationary collapse and produced an inflation the 1930s playbook had nothing to say about. Fighting the last war works right up to the point where it stops.",
    },
    concepts: ["bank-run", "monetary-policy", "tariffs", "recession", "financial-instability"],
    nodes: ["bank_lending", "policy_rate", "tariffs", "unemployment"],
    sources: [
      { label: "Federal Reserve History — The Great Depression", url: "https://www.federalreservehistory.org/essays/great-depression", tier: 1 },
      { label: "NBER — US Business Cycle Expansions and Contractions", url: "https://www.nber.org/research/data/us-business-cycle-expansions-and-contractions", tier: 1 },
    ],
  },

  {
    id: "bretton-woods",
    title: "Bretton Woods and the Day the Dollar Was Cut Loose",
    domain: "history", era: "1944–1973", minutes: 8,
    hook: "For twenty-seven years the world's currencies were anchored to the dollar and the dollar was anchored to gold. On a Sunday evening in 1971, a US president ended it in a television address.",
    sections: {
      whatHappened:
        "In July 1944, delegates from forty-four allied nations met at the Mount Washington Hotel in Bretton Woods, New Hampshire, to design the post-war monetary order. The result: currencies pegged to the US dollar, the dollar convertible to gold at $35 an ounce, and two new institutions — the International Monetary Fund to lend against balance-of-payments crises, and the International Bank for Reconstruction and Development, now part of the World Bank. The system delivered a quarter-century of expanding trade and stable exchange rates. On 15 August 1971, facing a run on US gold reserves, Richard Nixon suspended convertibility. The attempted repair at the Smithsonian that December failed, and by 1973 the major currencies were floating.",
      whyItHappened:
        "The system contained a structural contradiction identified by Robert Triffin in 1960 and named after him. Global trade growth required a growing supply of dollar reserves, which required the US to run deficits — but the more dollars accumulated abroad, the less credible the promise to convert them into a fixed stock of gold. Vietnam War spending and Great Society programmes accelerated the arithmetic. By 1971 foreign dollar claims far exceeded US gold holdings, and France in particular was converting.",
      whoMattered:
        "John Maynard Keynes, who proposed an international clearing union and a synthetic reserve asset (bancor) and lost the argument to American negotiating power. Harry Dexter White, the US Treasury official whose dollar-centred plan prevailed. Robert Triffin, who diagnosed the flaw a decade before it detonated. Nixon and Treasury Secretary John Connally, who ended it — Connally's remark to European counterparts that the dollar 'is our currency, but it's your problem' remains the most quoted line in international monetary economics.",
      whatChanged:
        "Floating exchange rates, the end of any commodity anchor for money, and the beginning of an era in which central banks needed a domestic nominal anchor of their own. Inflation targeting, adopted decades later, is the eventual answer to the question Nixon's decision opened. The dollar's central role survived the end of gold convertibility, which surprised most contemporaries and is the single most important fact about the current monetary system.",
      whyItMattersToday:
        "Every discussion of de-dollarisation is a discussion about whether a network effect can outlive the arrangement that created it. It has, for over fifty years, because the alternatives lack depth, liquidity and legal predictability — not because of gold, treaties or force. That is a fragile-sounding foundation that has proven remarkably durable.",
      lessons: [
        "Systems fail at their structural contradiction, and the contradiction is usually identified well in advance by someone nobody acts on.",
        "Reserve currency status is a network effect. It persists long after the original justification disappears, and it is lost gradually and then suddenly, if at all.",
        "'Temporary' emergency measures — Nixon's suspension was announced as temporary — have a way of becoming the permanent architecture.",
      ],
      connection:
        "Central bank gold buying, bilateral commodity settlement in local currencies, and sanctions-driven reserve diversification are all Triffin-adjacent questions: what happens when the issuer's interests and the system's requirements diverge. So far, the answer remains that there is no substitute at scale — but the incentive to build one is now explicit rather than theoretical.",
    },
    concepts: ["dollar", "monetary-policy", "sanctions-policy", "em-stress"],
    nodes: ["usd", "gold", "policy_rate"],
    sources: [
      { label: "IMF — The end of the Bretton Woods system", url: "https://www.imf.org/external/about/histend.htm", tier: 1 },
      { label: "Federal Reserve History — Nixon Ends Bretton Woods", url: "https://www.federalreservehistory.org/essays/gold-convertibility-ends", tier: 1 },
    ],
  },

  {
    id: "oil-shocks-1970s",
    title: "The Oil Shocks and the Death of the Phillips Curve",
    domain: "history", era: "1973–1982", minutes: 8,
    hook: "Economists had a stable trade-off between inflation and unemployment. Then both went up at once, for a decade, and the profession had to rebuild its foundations.",
    sections: {
      whatHappened:
        "In October 1973, in response to Western support for Israel during the Yom Kippur War, Arab members of OPEC declared an embargo and cut production. Crude prices roughly quadrupled within months. A second shock followed the 1979 Iranian revolution. Western economies experienced simultaneous high inflation and high unemployment — 'stagflation' — which the dominant macroeconomic framework held to be nearly impossible.",
      whyItHappened:
        "An oil shock is a supply shock: it raises prices and reduces output at the same time. But the persistence was not caused by oil alone. Monetary policy had been accommodative through the late 1960s, inflation expectations had already begun rising, and US wage and price controls imposed in 1971 suppressed the symptom while the cause continued. When controls lifted, prices caught up. Indexation clauses in wage contracts, far more common then than now, converted a one-off price level shock into a persistent inflation rate.",
      whoMattered:
        "Milton Friedman and Edmund Phelps, who had argued in 1968 — before the event — that the Phillips curve trade-off would vanish once workers adjusted expectations, and were vindicated. Arthur Burns, Fed chair through most of the decade, who has been criticised for accommodating inflation under political pressure. The OPEC members who discovered that a cartel controlling a commodity with short-run inelastic demand has extraordinary pricing power.",
      whatChanged:
        "The expectations-augmented Phillips curve became standard. Central bank credibility became a recognised economic asset. The energy intensity of GDP in developed economies fell substantially over subsequent decades — partly through efficiency, partly through moving heavy industry elsewhere. Strategic petroleum reserves were established, and non-OPEC production in the North Sea and Alaska was accelerated.",
      whyItMattersToday:
        "Every supply shock since is analysed against this template. The 2021–23 episode raised exactly the 1970s question — whether a relative price shock becomes a persistent inflation — and the answer turned on whether expectations stayed anchored and whether wage-setting institutions transmitted it. They largely did not, which is why the outcome differed. That was not luck; it was the product of institutional changes made because of the 1970s.",
      lessons: [
        "A supply shock raises the price level once. It raises the inflation rate only if expectations or indexation transmit it.",
        "Suppressing a price is not addressing a price. Controls delay and concentrate the adjustment.",
        "The most valuable economic ideas are the ones that predict a regime change before it happens. Friedman and Phelps published in 1968 and were largely ignored until the data forced the issue.",
      ],
      connection:
        "The world is more exposed to electricity prices than to crude today, and the AI build-out is adding load faster than firm generation can be built. If an electricity price shock arrives, the 1970s question returns in a new commodity: does it pass into wages and expectations, or does it stay a relative price change? The institutional answer — weak indexation, credible central banks — is the same, until it isn't.",
    },
    concepts: ["inflation", "inflation-expectations", "wage-price", "monetary-policy"],
    nodes: ["oil", "headline_inflation", "policy_rate", "electricity_price"],
    sources: [
      { label: "Federal Reserve History — Oil Shock of 1973–74", url: "https://www.federalreservehistory.org/essays/oil-shock-of-1973-74", tier: 1 },
      { label: "EIA — Petroleum & Other Liquids historical data", url: "https://www.eia.gov/petroleum/data.php", tier: 1 },
    ],
  },

  {
    id: "volcker-disinflation",
    title: "Volcker: What It Actually Costs to Break Inflation",
    domain: "history", era: "1979–1983", minutes: 7,
    hook: "The Federal Reserve took the policy rate near 20%, put two million people out of work, received bricks in the mail from bankrupt homebuilders — and permanently changed what central banks are believed to be willing to do.",
    sections: {
      whatHappened:
        "Paul Volcker became Fed chair in August 1979 with US inflation running in double digits. On 6 October 1979 the FOMC announced a change of operating procedure: targeting the growth of bank reserves rather than the funds rate directly, which permitted rates to rise as far as necessary. The effective federal funds rate peaked around 20% in 1981. The economy entered a severe recession; unemployment reached about 10.8% in late 1982, the highest post-war reading at that time. Inflation fell from roughly 14–15% in early 1980 to around 3% by 1983.",
      whyItHappened:
        "Two previous tightening attempts in the 1970s had been abandoned when unemployment rose, which taught markets and wage-setters that the Fed would blink. Breaking that expectation required demonstrating a willingness to accept the cost, not merely announcing one. The reserve-targeting procedure was in part a device for depoliticising the rate level: the committee was not choosing 20%, the procedure was producing it.",
      whoMattered:
        "Volcker, who absorbed extraordinary political pressure — congressional censure attempts, protests at the Fed building, construction workers mailing unsold lumber and car dealers mailing keys. Presidents Carter and Reagan, both of whom declined to intervene, which was a necessary condition and is often left out of the story. Farmers who blockaded the Fed with tractors, whose anger was rational: they bore concentrated costs for a diffuse public good.",
      whatChanged:
        "Central bank credibility was established as a real and measurable asset. Inflation expectations became anchored in a way that lasted decades, which meant subsequent shocks could be absorbed at far lower cost. The episode also cemented the case for central bank independence, since no elected official could have sustained the policy.",
      whyItMattersToday:
        "In 2021–23 the disinflation was achieved with a far smaller employment cost than most historical estimates of the sacrifice ratio implied. The most persuasive explanation is that Volcker had already paid the price: because expectations were anchored, the Fed did not need to prove anything, and could act on the price level without first having to re-establish credibility. Today's cheap disinflation was purchased in 1981.",
      lessons: [
        "Credibility is an asset accumulated by costly action and spent silently for decades afterwards.",
        "The costs of disinflation are concentrated on identifiable people, and the benefits are diffuse. That asymmetry is why it is politically almost impossible without institutional insulation.",
        "The sacrifice ratio is not a constant. It depends on whether anyone believes you.",
      ],
      connection:
        "Every argument about central bank independence is an argument about whether the institution could do this again if it had to. The answer determines the value of the credibility asset — and unlike most assets, its value is only observable at the moment it is tested.",
    },
    concepts: ["monetary-policy", "inflation-expectations", "unemployment", "recession"],
    nodes: ["policy_rate", "core_inflation", "unemployment", "inflation_expectations"],
    sources: [
      { label: "Federal Reserve History — Anti-inflation Measures of October 1979", url: "https://www.federalreservehistory.org/essays/anti-inflation-measures", tier: 1 },
      { label: "FRED — Effective Federal Funds Rate", url: "https://fred.stlouisfed.org/series/FEDFUNDS", tier: 1 },
    ],
  },

  {
    id: "the-container",
    title: "The Box That Rewired the World Economy",
    domain: "business", era: "1956–1980s", minutes: 7,
    hook: "A trucking executive who knew nothing about ships cut the cost of loading cargo by something close to two orders of magnitude — and in doing so made it economic to manufacture on the other side of the planet.",
    sections: {
      whatHappened:
        "On 26 April 1956, a converted tanker named the Ideal-X sailed from Newark to Houston carrying fifty-eight truck trailer bodies on its deck. Before containerisation, cargo was loaded piece by piece by gangs of longshoremen — slow, expensive, theft-prone, and requiring ships to spend most of their time in port rather than at sea. The container eliminated the handling step: the box is packed once at origin and opened at destination, moving between truck, rail and ship without being unpacked.",
      whyItHappened:
        "Malcom McLean owned a trucking company and was solving his own problem — his trucks queued for hours at ports. He bought a shipping line to do it, having been told by industry incumbents that it would not work. The critical follow-on was standardisation: containers only interoperate if everyone's boxes, ships, cranes and chassis share dimensions and fittings. ISO standards agreed through the 1960s made the network effect possible. The Vietnam War then provided the US military as an anchor customer at the scale needed to prove the economics.",
      whoMattered:
        "McLean, who understood that he was not in the shipping business but the freight-moving business. The International Organization for Standardization committees, whose unglamorous work created the interoperability. The longshoremen's unions, whose members were the concentrated losers and who negotiated substantial transition settlements — one of the better-handled labour transitions in industrial history. Port authorities in Newark and Oakland, who invested early; established ports like Manhattan and London's docklands, which did not, and whose waterfront economies disappeared.",
      whatChanged:
        "Shipping costs fell to the point where they largely ceased to be a factor in location decisions. That, more than any trade agreement, enabled globally distributed manufacturing: it is the reason a product can be designed in one country, assembled from components made in five others, and sold in a hundred. Port geography shifted permanently toward deep water and land availability.",
      whyItMattersToday:
        "The container is the standard case study for infrastructure-enabled transformation: the technology is trivial, the standardisation is hard, the network effects are decisive, and the second-order consequences dwarf the first-order ones. Nobody in 1956 was forecasting that a steel box would relocate global manufacturing.",
      lessons: [
        "The transformative technology is often mundane. What matters is that it removes a step from a process everyone assumed was necessary.",
        "Standards and interoperability capture more value than the invention, and take far longer to establish.",
        "Second-order effects dominate. The first-order effect was cheaper loading; the second-order effect was the reorganisation of world manufacturing.",
        "Incumbent geography is not destiny. New York's port did not adapt and lost an entire industrial economy to New Jersey.",
      ],
      connection:
        "Ask of any current technology: what step does it remove, and what becomes economic once that step is gone? For AI, the removed step is producing a first draft of structured cognitive work. The container analogy suggests the consequences will show up not in the drafting but in what organisations attempt once drafting is nearly free — and that the standardisation layer, not the model, is where the durable value settles.",
    },
    concepts: ["comparative-advantage", "s-curve", "network-effects", "creative-destruction"],
    nodes: ["trade_flows", "freight", "transports", "supply_chain"],
    sources: [
      { label: "ISO — Freight containers (TC 104)", url: "https://www.iso.org/committee/51156.html", tier: 1 },
      { label: "World Bank — Container port traffic data", url: "https://data.worldbank.org/indicator/IS.SHP.GOOD.TU", tier: 1 },
    ],
  },

  {
    id: "haber-bosch",
    title: "Haber–Bosch: The Reaction That Feeds Half the World",
    domain: "science", era: "1909–present", minutes: 7,
    hook: "Roughly half the nitrogen in your body passed through an industrial reactor. The process that put it there also connects the price of natural gas to the price of food.",
    sections: {
      whatHappened:
        "Nitrogen makes up most of the atmosphere but is nearly inert — plants cannot use it directly. Before 1909, agriculture depended on biological fixation, manure, and mined deposits of Chilean nitrate and guano, which were finite and geopolitically contested. Fritz Haber demonstrated in 1909 that atmospheric nitrogen could be combined with hydrogen into ammonia under high temperature and pressure with an iron catalyst. Carl Bosch industrialised it at BASF, solving extraordinary high-pressure engineering problems. Both received Nobel Prizes.",
      whyItHappened:
        "The immediate driver was a widely predicted food crisis: William Crookes had warned in 1898 that wheat yields would fail to keep pace with population as nitrate deposits depleted. The immediate application was less benign — fixed nitrogen is also the feedstock for explosives, and the process allowed Germany to continue the First World War after the Allied blockade cut off Chilean nitrate. Haber also directed Germany's chemical weapons programme, which makes him one of the most morally complicated figures in the history of science.",
      whoMattered:
        "Haber, for the chemistry. Bosch, for the engineering that turned a laboratory demonstration into industrial scale — arguably the harder problem. Crookes, for naming the crisis clearly enough that it was worth solving. Norman Borlaug later, whose Green Revolution wheat varieties were bred specifically to convert abundant nitrogen into grain rather than height, and without which the fertiliser would have had far less effect.",
      whatChanged:
        "Global population roughly quadrupled during the twentieth century, and estimates commonly attribute the food supply for a substantial share of it — around half is the frequently cited figure — to synthetic nitrogen. It also created major environmental consequences: nitrogen runoff drives freshwater and coastal eutrophication, and ammonia production is energy-intensive and a significant industrial source of carbon dioxide.",
      whyItMattersToday:
        "Ammonia production consumes roughly one to two percent of world energy, and the hydrogen feedstock is overwhelmingly made from natural gas. That makes fertiliser cost a direct function of gas prices, which is why the 2022 European gas shock became a global food-price event. It is one of the cleanest examples in the economy of a physical dependency that most people never see.",
      lessons: [
        "Some technologies are load-bearing for civilisation and almost entirely invisible in public discussion.",
        "The same capability can be a food supply and a weapons supply. Dual-use is not a modern problem.",
        "Solving a resource constraint frequently creates a different constraint — here, from nitrate scarcity to nitrogen pollution and energy dependence.",
      ],
      connection:
        "Trace the chain the platform models: natural gas → ammonia → fertiliser → crop yields → food prices → headline inflation → political stability. This is not an abstraction. It is why a European energy shock shows up in food-importing countries' politics with a lag of roughly two seasons, and why 'energy security' and 'food security' are frequently the same policy question.",
    },
    concepts: ["s-curve", "jevons-paradox", "supply-chain-bullwhip"],
    nodes: ["natgas", "agriculture", "headline_inflation", "geopolitical_risk"],
    sources: [
      { label: "Nobel Prize — Fritz Haber, Chemistry 1918", url: "https://www.nobelprize.org/prizes/chemistry/1918/haber/facts/", tier: 1 },
      { label: "FAO — World fertilizer trends and outlook", url: "https://www.fao.org/publications", tier: 1 },
    ],
  },
];
