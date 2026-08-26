/** CONCEPTS — technology, energy, systems and geopolitics. */

export const TECH_CONCEPTS = [
  {
    id: "scaling-laws", term: "Scaling Laws", domain: "technology",
    tags: ["ai"], node: "ai_capability",
    levels: {
      beginner:
        "Bigger AI models trained on more data with more computing power have reliably performed better. That predictability is why so much money is being spent on compute.",
      intermediate:
        "Empirical relationships link model loss to compute, parameters and data as smooth power laws across many orders of magnitude. Smooth loss curves are what let a lab commit billions before knowing what the model will be able to do — the loss is predictable even when the capabilities are not.",
      advanced:
        "Compute-optimal training changed the allocation: for a fixed budget, training a smaller model on more tokens beats a larger model on fewer. Inference-time compute added a second axis — spending more per query rather than more per training run — which shifts the economics from a capex-heavy to a more variable-cost profile.",
      expert:
        "Three live constraints. Data: high-quality text is finite, and synthetic data's contribution to capability is contested. Power and packaging: the binding limits are physical, not algorithmic. And the loss-to-capability gap: predicting cross-entropy is not predicting whether a model can do a job, so scaling laws forecast the input to the thing anyone cares about, not the thing itself. Any investment case that treats them as a capability forecast is over-reading them.",
    },
    misconception:
      "That scaling laws predict capability. They predict loss. The mapping from loss to useful ability is empirical, jumpy and not well understood.",
    watch: ["Compute-optimal frontier", "Inference vs training spend mix", "Benchmark saturation", "Cost per token"],
    related: ["jevons-paradox", "s-curve", "productivity"],
  },
  {
    id: "jevons-paradox", term: "Jevons Paradox", domain: "economics",
    tags: ["energy", "ai"],
    levels: {
      beginner:
        "When something gets more efficient, we often use so much more of it that total consumption goes up, not down.",
      intermediate:
        "Jevons observed it with coal in 1865: better steam engines used less coal per unit of work, which made steam power economic in more applications, which raised total coal use. Efficiency lowers effective price, and lower prices raise demand.",
      advanced:
        "Whether the rebound is partial or exceeds 100% depends on demand elasticity and on whether the efficiency gain opens genuinely new applications. For mature uses the rebound is partial; for uses that were previously uneconomic it can be very large.",
      expert:
        "This is the central argument in AI energy forecasting, and it cuts both ways. Cheaper inference per token expands the set of viable applications, plausibly raising total compute demand faster than efficiency reduces it — the observed pattern so far. The counter-case is that some workloads have a demand ceiling, in which case efficiency shows up as lower cost rather than higher volume. Both are consistent with the historical record; which applies is an empirical question nobody has settled.",
    },
    history: "Coal in the 1860s, lighting efficiency over two centuries, and vehicle fuel economy all show partial to complete rebound.",
    related: ["scaling-laws", "second-order-thinking", "s-curve"],
  },
  {
    id: "s-curve", term: "Technology Diffusion", domain: "technology",
    tags: ["adoption"],
    levels: {
      beginner:
        "New technologies spread slowly at first, then very fast, then level off. Plotted over time it looks like an S.",
      intermediate:
        "The slow start is not lack of potential — it is cost, missing complements and unfamiliarity. Once cost falls below a threshold and the supporting infrastructure exists, adoption accelerates sharply, then saturates as the remaining non-adopters are the hardest cases.",
      advanced:
        "Forecasts fail at both bends. In the flat early phase, extrapolation understates; in the steep phase, extrapolation overstates by projecting exponential growth into saturation. Most technology hype cycles are the emotional residue of these two errors happening in sequence.",
      expert:
        "The useful discipline is identifying the rate-limiting complement rather than the technology. Electrification of factories took forty years not because motors were unavailable but because the productivity gain required reorganising the factory floor around distributed power. For any current technology the question is the same: what has to be rebuilt around it, and how long does that take?",
    },
    history:
      "Electric motors were available in the 1890s; the factory productivity surge came in the 1920s, after plant layouts were redesigned.",
    related: ["creative-destruction", "productivity", "scaling-laws", "network-effects"],
  },
  {
    id: "network-effects", term: "Network Effects", domain: "business",
    tags: ["strategy", "tech"],
    levels: {
      beginner:
        "Some products get more valuable as more people use them. A phone network with one user is worthless.",
      intermediate:
        "Direct effects come from users valuing other users (messaging, marketplaces). Indirect effects come from a larger user base attracting complements (app developers for a platform). Both create winner-take-most dynamics.",
      advanced:
        "They are usually local rather than global: a marketplace is dense in one city and worthless in the next, which is why they are attacked city by city. Multi-homing — users on several platforms at once — dilutes the advantage substantially, and low switching costs make an apparently dominant network contestable.",
      expert:
        "The current question is whether AI capability is a network-effect business or a commodity. Data feedback loops are weaker than assumed when the underlying models are trained on broadly available corpora, and capability gaps between frontier and open-weight models have repeatedly compressed. If the moat is distribution and switching cost rather than model quality, the value accrues to whoever owns the customer relationship, not whoever trains the best model.",
    },
    related: ["moat", "s-curve", "creative-destruction"],
  },
  {
    id: "supply-chain-bullwhip", term: "The Bullwhip Effect", domain: "business",
    tags: ["operations"], node: "supply_chain",
    levels: {
      beginner:
        "Small changes in customer demand cause bigger swings further up the supply chain. Each level over-orders to be safe, and the exaggeration compounds.",
      intermediate:
        "Retailers add a buffer, distributors add a buffer on that, manufacturers add another. A 5% demand change becomes a 30% swing in component orders — and the reverse on the way down, producing gluts.",
      advanced:
        "Drivers are demand signal processing, order batching, price promotions and shortage gaming (ordering more than needed when allocation is rationed). Shortage gaming is the one that dominates in a genuine shortage, and it produces phantom demand that vanishes the moment supply normalises.",
      expert:
        "The 2020–23 goods cycle was a textbook case at global scale: a demand shift plus a supply shock produced double-ordering, then a rapid inventory correction that was mistaken for demand collapse. Distinguishing real from phantom demand in real time is the hard part, and order books are unreliable precisely when they are most watched — which matters directly to how anyone reads current semiconductor and equipment backlogs.",
    },
    watch: ["Inventory-to-sales ratios", "Order backlog vs shipment growth", "Cancellation rates", "Lead times"],
    related: ["capex-cycle", "tariffs", "second-order-thinking"],
  },
  {
    id: "export-controls", term: "Export Controls", domain: "geopolitics",
    tags: ["policy", "tech"], node: "export_controls",
    levels: {
      beginner:
        "Rules stopping companies from selling certain advanced technology to certain countries — mainly the most powerful computer chips and the machines that make them.",
      intermediate:
        "They work by targeting chokepoints: stages of production where very few suppliers exist. The most-cited example is extreme ultraviolet lithography, made by a single company, which makes the constraint enforceable in a way that a broad ban would not be.",
      advanced:
        "Effectiveness depends on multilateral participation — unilateral controls redirect trade rather than prevent it — and on the target's ability to substitute. The measurable effects so far are a redirection of demand toward compliant products, an acceleration of domestic substitution efforts, and immediate revenue loss for equipment suppliers.",
      expert:
        "The strategic debate is whether controls buy time or accelerate the outcome they aim to prevent by guaranteeing the target a captive domestic market and unlimited state funding. The historical record on technology denial is mixed and the evaluation horizon is decades, which means near-term evidence is close to uninformative in either direction. Both sides of this argument are currently reasoning from priors.",
    },
    watch: ["Control scope changes", "Equipment revenue by region", "Domestic substitution milestones", "Multilateral alignment"],
    related: ["industrial-policy", "sanctions-policy", "trade-fragmentation"],
  },
  {
    id: "industrial-policy", term: "Industrial Policy", domain: "geopolitics",
    tags: ["policy"], node: "industrial_policy",
    levels: {
      beginner:
        "Governments deliberately supporting particular industries — with subsidies, tax credits or protection — rather than leaving it to the market.",
      intermediate:
        "The rationale is that some industries have spillovers markets underprice: national security, learning-by-doing, or strategic supply resilience. The objection is that governments are poor at picking winners and the subsidies persist long after the rationale expires.",
      advanced:
        "The empirical record is mixed and highly conditional. It has worked where there was a clear technological target, export discipline forcing competitiveness, and a willingness to end support. It has failed where subsidy became an entitlement. Semiconductor policy globally is currently a large simultaneous experiment in this, with multiple jurisdictions subsidising the same capacity.",
      expert:
        "The coordination problem is the interesting one: when many countries subsidise the same industry simultaneously, the aggregate result is global overcapacity and a transfer to buyers. Individually rational, collectively value-destroying — and there is no mechanism to prevent it, because the security rationale is not tradeable.",
    },
    watch: ["Subsidy disbursement vs announcement", "Capacity additions vs demand", "Utilisation rates"],
    related: ["export-controls", "tariffs", "capex-cycle"],
  },
  {
    id: "sanctions-policy", term: "Sanctions", domain: "geopolitics",
    tags: ["policy", "finance"],
    levels: {
      beginner:
        "Restrictions on trading or doing business with a country, company or person — used as pressure short of military force.",
      intermediate:
        "Financial sanctions work through the dollar clearing system: cutting access to dollar settlement is far more powerful than a trade ban, because almost all international transactions touch it somewhere.",
      advanced:
        "Effectiveness depends on multilateral participation and on the target's substitution options. Targets adapt — shadow fleets, alternative payment rails, barter, third-country intermediation — so measured effects decay over time while the administrative burden persists.",
      expert:
        "The second-order cost is to the sanctioning power itself. Every use of the dollar system as an instrument raises the expected value of building alternatives to it. That does not produce rapid de-dollarisation, because no substitute has comparable depth, but it does show up at the margins in reserve diversification, gold accumulation by central banks, and commodity invoicing experiments. The cost is real, gradual, and hard to attribute.",
    },
    related: ["dollar", "export-controls", "trade-fragmentation"],
  },
  {
    id: "trade-fragmentation", term: "Trade Fragmentation", domain: "geopolitics",
    tags: ["trade"], node: "trade_fragmentation",
    levels: {
      beginner:
        "The world splitting into trading blocs that trade more within themselves and less across the divide.",
      intermediate:
        "It raises costs by duplicating capacity and forgoing comparative advantage. The effect on prices is a one-off level shift as supply chains reconfigure, plus a persistent efficiency loss.",
      advanced:
        "Trade data shows more reconfiguration than reduction: direct bilateral flows fall while flows through intermediary countries rise, which means measured decoupling overstates real decoupling. Value-added trade statistics tell a different story from gross flows.",
      expert:
        "The consequential channel is technology diffusion, not goods prices. Fragmented standards and restricted knowledge flows slow the spread of productivity-enhancing technology, which compounds over decades in a way that a one-off cost increase does not. That effect is real, large in present-value terms, and essentially unmeasurable in real time.",
    },
    watch: ["Bilateral vs third-country flows", "Value-added trade shares", "Standards divergence", "FDI by bloc"],
    related: ["comparative-advantage", "tariffs", "sanctions-policy", "supply-chain-bullwhip"],
  },
  {
    id: "grid-constraints", term: "Grid Interconnection", domain: "technology",
    tags: ["energy"], node: "grid_capacity",
    levels: {
      beginner:
        "You can build a power plant or a data centre quickly. Connecting it to the electricity network is what takes years.",
      intermediate:
        "Interconnection requires studies, upgrades and equipment — transformers and switchgear with multi-year lead times — plus permits for transmission lines that cross many jurisdictions. The queue, not the generation technology, is usually the binding constraint.",
      advanced:
        "Queues are processed largely in order, so a speculative project ahead of a real one delays it. Reform efforts have moved toward cluster studies and financial commitment requirements to clear speculative applications, but the transformer and high-voltage cable supply chain is a separate physical constraint that reform does not address.",
      expert:
        "This is why large electricity buyers have moved toward behind-the-meter generation, existing-plant power purchase agreements and co-location at existing interconnects — all of which are ways of buying position in a queue rather than adding capacity. The system-level consequence is that new load is being met partly by reallocating existing firm capacity, which raises prices for everyone else and turns an engineering constraint into a political one.",
    },
    watch: ["Interconnection queue duration", "Transformer lead times", "PPA pricing for existing nuclear and gas", "Retail rate cases"],
    related: ["jevons-paradox", "capex-cycle", "s-curve"],
  },
  {
    id: "energy-density", term: "Energy Density and Firmness", domain: "technology",
    tags: ["energy"],
    levels: {
      beginner:
        "Some energy sources give a lot of power from a small space, all the time. Others are cheap but only work when the wind blows or the sun shines.",
      intermediate:
        "'Firm' capacity can be dispatched on demand — gas, nuclear, hydro. Variable renewables are often the cheapest energy but not the cheapest reliable energy, because reliability has to be bought separately through storage, transmission or backup generation.",
      advanced:
        "Levelised cost of energy compares sources on cost per megawatt-hour and systematically ignores when that energy arrives. System-level cost includes firming, transmission and curtailment, and it rises non-linearly as the variable share grows. Comparing an LCOE for solar to one for nuclear is comparing different products.",
      expert:
        "For a data centre the relevant metric is cost per firm megawatt-year at a specific location with a specific interconnection date — a number that bears little relation to headline LCOE. That is why hyperscaler procurement has focused on existing nuclear output and on gas, despite renewables being cheaper per megawatt-hour: the buyer is purchasing availability and speed, not energy.",
    },
    watch: ["Capacity factors", "System LCOE studies", "Curtailment rates", "Capacity market prices"],
    related: ["grid-constraints", "jevons-paradox"],
  },
  {
    id: "security-dilemma", term: "The Security Dilemma", domain: "geopolitics",
    tags: ["strategy"], node: "geopolitical_risk",
    levels: {
      beginner:
        "When one country builds up its defences, its neighbours feel less safe and build up theirs. Everyone acts defensively and everyone ends up less secure.",
      intermediate:
        "The dilemma arises because intentions are unobservable — only capabilities are. A purely defensive build-up is indistinguishable from preparation for aggression, so rational actors must respond to the capability.",
      advanced:
        "Its severity depends on whether offensive and defensive capabilities are distinguishable and on whether offence or defence has the advantage. When they are indistinguishable and offence is favoured, the dilemma is acute and arms races are hard to stop.",
      expert:
        "It applies directly to technology competition. Compute, semiconductors and AI capability are dual-use by construction, so no restriction can be read as purely defensive by the other side. That makes escalation self-reinforcing and makes credible commitment — the standard exit from the dilemma — unusually difficult, since verification regimes for compute and models do not yet exist in any enforceable form.",
    },
    related: ["export-controls", "trade-fragmentation", "sanctions-policy"],
  },
  {
    id: "financial-instability", term: "Financial Instability", domain: "economics",
    tags: ["risk", "history"], node: "financial_instability",
    levels: {
      beginner:
        "Long periods of calm encourage people to take more risk, which eventually makes the system fragile. Stability breeds instability.",
      intermediate:
        "Minsky's hypothesis describes a progression from hedge finance (income covers debt service), to speculative finance (income covers interest only), to Ponzi finance (repayment requires asset prices to keep rising). Each stage looks fine until asset prices stop rising.",
      advanced:
        "The mechanism is that risk appetite and leverage are endogenous to realised volatility. A long calm period lowers measured risk, which permits more leverage under any volatility-based risk framework, which raises actual fragility while reported risk falls.",
      expert:
        "Where the fragility sits has moved. Post-2008 regulation made banks demonstrably safer and pushed maturity transformation into non-bank intermediaries, funds and private credit — where leverage is less visible, reporting is slower and there is no lender of last resort. The system may be safer against the last crisis and no safer in aggregate. Nobody knows, because the data required to answer it is not collected.",
    },
    history:
      "1929, 1987, 1998, 2000, 2008 and 2023 differ in every particular and share the structure: leverage plus a repricing plus a funding mismatch.",
    watch: ["Non-bank leverage", "Private credit growth", "Repo volumes", "Volatility-adjusted positioning"],
    related: ["leverage", "moral-hazard", "bank-run", "liquidity", "reflexivity"],
  },
  {
    id: "demographics", term: "Demographics", domain: "economics",
    tags: ["structural"], node: "aging",
    levels: {
      beginner:
        "Populations in most rich countries are getting older, with fewer working-age people supporting more retirees.",
      intermediate:
        "It is the most predictable force in economics — everyone who will be 40 in twenty years is already alive. It shapes growth (fewer workers), fiscal balances (pensions and healthcare), and possibly interest rates.",
      advanced:
        "The effect on rates is genuinely contested. One view holds that ageing raises savings and lowers r*, as more people save for retirement. Another holds that retirees dissave and shrink the labour force, raising r* and inflation. The two mechanisms operate at different points in the demographic transition, and most economies are between them.",
      expert:
        "Policy levers are limited and slow: fertility policy has weak measured effects, immigration is politically constrained, and productivity growth is not directly controllable. This is precisely why automation and AI are strategically interesting to ageing economies — they are the only lever that does not require changing the number of people. That reframes automation from a labour-market threat to a demographic necessity, at least in aggregate.",
    },
    watch: ["Dependency ratios", "Participation by age cohort", "Net migration", "Pension funding gaps"],
    related: ["productivity", "fiscal-policy", "monetary-policy"],
  },
];
