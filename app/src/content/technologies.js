/**
 * EMERGING TECHNOLOGY RADAR
 *
 * Every entry carries the two fields that matter most and are almost always
 * missing from technology commentary: what would validate the thesis, and what
 * would invalidate it. An entry with no falsifier is an opinion.
 *
 *   stage  now          deployed at commercial scale, economics established
 *          developing   real deployments, economics still being proven
 *          early        works in the lab or in narrow production, scale unproven
 *          experimental credible research direction, no commercial proof
 *          watchlist    plausible and worth tracking; evidence is thin
 */

const t = (id, name, stage, extra) => ({ id, name, stage, ...extra });

export const TECHNOLOGIES = [
  t("frontier-models", "Frontier language and multimodal models", "now", {
    node: "ai_capability", domain: "ai",
    what: "Large models trained on broad corpora that generalise across tasks without task-specific training.",
    why: "The upstream driver of every other node in the AI chain — compute demand, data centre build-out and electricity load all trace back to what these can do and how much they are used.",
    barriers: ["Power and packaging capacity", "High-quality data supply", "Inference cost at scale", "Reliability in high-stakes workflows"],
    players: ["A small number of frontier labs", "Hyperscale cloud providers", "An open-weight ecosystem several months behind"],
    applications: ["Drafting and summarisation", "Code generation", "Support and triage", "Analysis and research assistance"],
    validate: "Sustained enterprise deployment into workflows that change headcount or throughput, visible in company disclosures rather than in press releases.",
    invalidate: "Capability gains flattening while inference cost stays high, or reliability failing to reach the threshold that regulated industries require.",
    economics: "Currently the largest private capital cycle in technology. Whether returns justify it depends on adoption depth, not on capability.",
    concepts: ["scaling-laws", "jevons-paradox", "s-curve"],
  }),

  t("inference-scaling", "Inference-time compute", "developing", {
    node: "compute_demand", domain: "ai",
    what: "Spending more computation per query — search, sampling, verification — rather than more on training.",
    why: "Shifts the cost structure from capital expenditure toward variable cost, which changes both the unit economics and the shape of demand for accelerators.",
    barriers: ["Latency budgets", "Cost per query at consumer scale", "Diminishing returns beyond some compute budget"],
    players: ["Frontier labs", "Inference infrastructure providers"],
    applications: ["Mathematical and scientific reasoning", "Code verification", "Agentic workflows"],
    validate: "Products priced by compute consumed rather than by seat, with margins that hold as usage grows.",
    invalidate: "Returns to additional inference compute saturating well below the cost customers will bear.",
    economics: "A variable-cost model is easier to finance than a capex-heavy one, but harder to defend on margin.",
    concepts: ["scaling-laws", "free-cash-flow"],
  }),

  t("advanced-packaging", "Advanced packaging", "now", {
    node: "advanced_packaging", domain: "semis",
    what: "Stacking and interconnecting multiple die in one package, so memory sits beside the processor.",
    why: "Repeatedly the binding constraint on accelerator shipments — more binding than wafer capacity at the leading edge.",
    barriers: ["Capacity additions take years", "Yield on complex stacks", "Concentration among very few suppliers"],
    players: ["Leading-edge foundries", "Memory manufacturers", "Assembly and test specialists"],
    applications: ["AI accelerators", "High-performance computing", "Networking silicon"],
    validate: "Capacity expansion announcements converting into shipped units within the stated schedule.",
    invalidate: "An architectural shift that reduces memory-bandwidth dependence, making the bottleneck irrelevant.",
    economics: "A chokepoint with pricing power, and therefore a policy instrument as well as an industrial one.",
    concepts: ["capex-cycle", "supply-chain-bullwhip", "export-controls"],
  }),

  t("liquid-cooling", "Liquid cooling at rack scale", "developing", {
    node: "dc_cooling", domain: "infrastructure",
    what: "Direct-to-chip and immersion cooling, replacing air in high-density racks.",
    why: "Rack power density has passed what air can remove. This is not an efficiency upgrade; it is a precondition for the density current accelerators require.",
    barriers: ["Retrofitting existing halls", "Serviceability and leak risk", "Fragmented standards"],
    players: ["Thermal equipment vendors", "Data centre operators", "Server manufacturers"],
    applications: ["AI training halls", "High-density inference"],
    validate: "Liquid becoming the default in new-build specifications rather than an option.",
    invalidate: "Accelerator power draw plateauing enough for improved air cooling to remain sufficient.",
    economics: "A durable content increase per megawatt of new capacity, on a multi-year build cycle.",
    concepts: ["capex-cycle", "s-curve"],
  }),

  t("grid-interconnect", "Grid interconnection capacity", "now", {
    node: "grid_capacity", domain: "energy",
    what: "Transmission, substations and the queue process that connects new load and generation to the network.",
    why: "The binding constraint on data centre siting in most developed markets — and a permitting problem rather than a technology one, which makes it slower to solve.",
    barriers: ["Multi-jurisdiction permitting", "Transformer and high-voltage cable lead times", "Queue processes designed for a different era"],
    players: ["Transmission operators", "Grid equipment manufacturers", "Regulators"],
    applications: ["Data centre load", "Electrification of transport and heat", "Renewable interconnection"],
    validate: "Queue durations shortening and equipment lead times normalising while load growth continues.",
    invalidate: "Behind-the-meter generation and co-location scaling far enough to route around the grid entirely.",
    economics: "Rate base expansion for utilities, and a multi-year order book for equipment makers.",
    concepts: ["grid-constraints", "energy-density", "capex-cycle"],
  }),

  t("smr", "Small modular reactors", "early", {
    node: "smr", domain: "energy",
    what: "Factory-built nuclear reactors in the tens-to-hundreds of megawatts range, intended to be repeatable rather than bespoke.",
    why: "Firm, carbon-free baseload matches large electricity buyers' procurement goals. The thesis is that factory production breaks the cost escalation that has defined large nuclear builds.",
    barriers: ["No commercial fleet yet demonstrates the cost curve", "Regulatory precedent for each design", "Fuel supply for some designs", "First-of-a-kind costs"],
    players: ["Several reactor developers", "Utilities", "Large corporate offtakers"],
    applications: ["Data centre power", "Industrial heat", "Grid firming"],
    validate: "A second and third unit of the same design delivered materially cheaper and faster than the first. That is the entire thesis, and it has not yet been tested.",
    invalidate: "First-of-a-kind costs persisting into later units, which would mean the learning curve does not exist at this scale.",
    economics: "Currently a real option rather than a business. Treat announced pipelines as intentions, not capacity.",
    concepts: ["energy-density", "capex-cycle", "s-curve"],
  }),

  t("grid-storage", "Grid-scale storage", "now", {
    node: "storage", domain: "energy",
    what: "Battery systems that shift electricity in time, typically over two to four hours.",
    why: "Intermittent generation creates intraday price spreads. Storage revenue is that spread, so the economics improve as the variable share of generation grows.",
    barriers: ["Duration beyond a few hours remains costly", "Market design for capacity value", "Interconnection queues, again"],
    players: ["Battery manufacturers", "Independent power producers", "Utilities"],
    applications: ["Peak shaving", "Frequency response", "Renewable firming"],
    validate: "Merchant projects earning their return from arbitrage without capacity payments.",
    invalidate: "Spreads compressing as storage saturates the arbitrage opportunity it exists to capture.",
    economics: "Cost curve has fallen steeply; the question is now market design rather than technology.",
    concepts: ["energy-density", "jevons-paradox"],
  }),

  t("robotics-general", "General-purpose robotics", "early", {
    node: "robotics", domain: "ai",
    what: "Robots using learned perception and control rather than pre-programmed motion, aimed at varied tasks in unstructured spaces.",
    why: "Perception improved dramatically with the same techniques that improved language models. Manipulation and reliability did not improve as fast, and that gap is where the thesis lives.",
    barriers: ["Dexterity and contact-rich manipulation", "Data scarcity for physical tasks", "Safety certification", "Unit cost"],
    players: ["Robotics startups", "Industrial automation incumbents", "Automotive manufacturers"],
    applications: ["Logistics handling", "Manufacturing assembly", "Inspection"],
    validate: "Deployment into varied, unstructured environments with uptime that justifies the capital, disclosed in operator financials.",
    invalidate: "Demonstrations continuing to outrun deployments — the pattern for the last decade.",
    economics: "Labour scarcity in ageing economies is a genuine and durable pull. Cost per task is the number that decides it.",
    concepts: ["s-curve", "demographics", "productivity"],
  }),

  t("autonomy", "Autonomous vehicles", "developing", {
    node: "autonomous_vehicles", domain: "ai",
    what: "Driverless operation, commercially live in geofenced urban areas.",
    why: "Feasibility is no longer the question — cost per mile and the rate of geographic expansion are.",
    barriers: ["Cost per vehicle", "Remote assistance ratios", "Regulatory approval city by city", "Weather and edge cases"],
    players: ["Ride-hailing autonomy operators", "Automotive manufacturers", "Trucking-focused developers"],
    applications: ["Urban ride-hailing", "Long-haul freight", "Yard and port operations"],
    validate: "Unit economics positive without subsidy in more than one metropolitan market.",
    invalidate: "Expansion staying linear in cities per year while costs stay high — the slow path that looks like success and is not.",
    economics: "If cost per mile falls materially, freight and personal transport economics both change. That is a large if with a long history of slipping.",
    concepts: ["s-curve", "creative-destruction", "base-rates"],
  }),

  t("post-quantum", "Post-quantum cryptography", "developing", {
    node: "cybersecurity", domain: "security",
    what: "Encryption designed to resist attack by a future quantum computer, and the migration of existing systems onto it.",
    why: "The migration is happening now regardless of when — or whether — cryptographically relevant quantum computing arrives, because encrypted data captured today can be decrypted later.",
    barriers: ["Migration scope across every system", "Performance overhead", "Long-lived embedded devices"],
    players: ["Standards bodies", "Security vendors", "Cloud providers"],
    applications: ["Transport security", "Signing and identity", "Long-lived archives"],
    validate: "Migration mandates with deadlines converting into procurement.",
    invalidate: "Nothing plausible invalidates the migration itself; the timing of the underlying threat remains genuinely unknown.",
    economics: "Non-discretionary security spending, which is the most defensive revenue profile in technology.",
    concepts: ["security-dilemma"],
  }),

  t("quantum-compute", "Quantum computing", "experimental", {
    node: "quantum", domain: "frontier",
    what: "Computation using quantum states, with error correction as the central engineering problem.",
    why: "Error-corrected logical qubits have been improving. Commercially decisive applications remain unproven, and the gap between milestone and application is the entire question.",
    barriers: ["Physical qubit counts required per logical qubit", "Error rates", "No demonstrated commercial advantage at scale"],
    players: ["Hardware research groups", "Cloud providers", "National programmes"],
    applications: ["Simulation of quantum systems", "Certain optimisation problems", "Cryptanalysis, eventually"],
    validate: "A commercially valuable problem solved faster or cheaper than classical hardware can, on a real workload.",
    invalidate: "Error correction overhead staying high enough that useful scale remains out of reach for a decade or more.",
    economics: "Research spending, not a market. Any equity thesis here is a venture bet wearing a public listing.",
    concepts: ["s-curve", "base-rates"],
  }),

  t("computational-bio", "Computational biology", "developing", {
    node: "biotech_platform", domain: "science",
    what: "Machine learning applied to protein structure, target identification, molecular design and trial design.",
    why: "Structure prediction changed preclinical workflows in a way that is already visible. Whether it changes clinical success rates — the expensive part — is not yet established.",
    barriers: ["Clinical trials remain the cost and the bottleneck", "Biological validation is slow", "Data quality and access"],
    players: ["Pharmaceutical R&D", "AI-native drug discovery firms", "Academic groups"],
    applications: ["Target discovery", "Molecule design", "Trial patient selection"],
    validate: "Approved therapies whose discovery path is attributable to computational methods, with better phase transition rates.",
    invalidate: "Preclinical speed-ups failing to move clinical success rates, which is where nearly all the cost sits.",
    economics: "Compresses the cheap part of drug development. The expensive part is unchanged so far.",
    concepts: ["base-rates", "s-curve"],
  }),

  t("hbm-supply", "High-bandwidth memory supply", "now", {
    node: "hbm", domain: "semis",
    what: "Stacked DRAM providing the memory bandwidth that large-model throughput depends on.",
    why: "Memory bandwidth, not raw compute, limits large-model inference. Capacity is contracted years ahead and cannot be expanded quickly.",
    barriers: ["Capacity is largely pre-sold", "Yield on tall stacks", "Very few qualified suppliers"],
    players: ["Three memory manufacturers", "Accelerator designers", "Foundries doing the packaging"],
    applications: ["AI accelerators", "High-performance computing"],
    validate: "Contracted capacity growth converting to shipments, and pricing holding through a cycle.",
    invalidate: "Architectures that reduce bandwidth dependence, or a conventional memory downturn dragging pricing with it.",
    economics: "Historically the most cyclical segment in semiconductors. Present tightness is not evidence the cycle is repealed.",
    concepts: ["capex-cycle", "supply-chain-bullwhip"],
  }),

  t("agentic-software", "Agentic software", "developing", {
    node: "labor_automation", domain: "ai",
    what: "Systems that plan and execute multi-step tasks against real tools and data, rather than answering a single prompt.",
    why: "This is where the substitution for cognitive labour actually happens, if it happens. A model that answers questions is a tool; a system that completes tasks is a substitute.",
    barriers: ["Reliability compounding across steps", "Permissions and auditability", "Integration with systems of record", "Liability when it acts"],
    players: ["Frontier labs", "Enterprise software vendors", "Systems integrators"],
    applications: ["Software engineering", "Back-office processing", "Research and analysis", "Support resolution"],
    validate: "Task completion rates good enough that a human reviews outcomes rather than steps — and headcount or throughput moving in disclosed numbers.",
    invalidate: "Per-step reliability failing to compound, so supervision cost cancels the saving. This is the current state for most workflows.",
    economics: "The gap between capability and organisational redesign is where the productivity effect lives, and history says that gap is measured in years.",
    concepts: ["productivity", "s-curve", "creative-destruction"],
  }),

  t("rare-earth-processing", "Rare earth processing outside China", "early", {
    node: "rare_earths", domain: "materials",
    what: "Separation and refining capacity for rare earth elements built outside the currently dominant processing base.",
    why: "The elements are not geologically rare; the processing is concentrated. That concentration is what makes them a policy lever rather than an ordinary input.",
    barriers: ["Separation is chemically difficult and environmentally regulated", "Pricing power of the incumbent producer", "Long permitting timelines"],
    players: ["Mining companies", "Government-backed processing ventures", "Magnet manufacturers"],
    applications: ["Permanent magnets for motors", "Wind turbines", "Defence systems"],
    validate: "Qualified magnet output from non-incumbent processing at commercial volume and acceptable cost.",
    invalidate: "Incumbent pricing undercutting new capacity into unprofitability — which has happened before, more than once.",
    economics: "Strategic rather than commercial. Subsidy is likely a permanent feature of the cost structure.",
    concepts: ["export-controls", "industrial-policy", "trade-fragmentation"],
  }),

  t("fusion", "Fusion energy", "experimental", {
    node: "nuclear_power", domain: "energy",
    what: "Energy from fusing light nuclei, with net energy gain from the reaction demonstrated in a laboratory setting.",
    why: "Scientific milestones have been reached. Engineering a plant that delivers net electricity to a grid, repeatedly and economically, is a substantially harder and separate problem.",
    barriers: ["Net electrical gain, not just scientific gain", "Materials under sustained neutron flux", "Tritium supply", "Capital cost of a first plant"],
    players: ["Private fusion ventures", "National laboratories", "International projects"],
    applications: ["Baseload electricity, eventually"],
    validate: "A plant delivering sustained net electricity to a grid — a milestone nobody has reached.",
    invalidate: "Materials or tritium constraints pushing commercial timelines beyond the point where cheaper firm alternatives make it irrelevant.",
    economics: "Not investable as an operating business on any near horizon. Treat timelines from interested parties accordingly.",
    concepts: ["energy-density", "base-rates", "s-curve"],
  }),

  t("space-comms", "Low-earth-orbit communications", "now", {
    node: "space", domain: "frontier",
    what: "Large satellite constellations providing broadband and connectivity from low orbit.",
    why: "Falling launch cost changed what is economic in orbit. Communications and imaging are the applications where that has already converted into revenue.",
    barriers: ["Constellation replacement cost", "Spectrum and landing rights", "Orbital congestion"],
    players: ["Launch providers", "Constellation operators", "Ground equipment makers"],
    applications: ["Rural and maritime broadband", "Direct-to-device", "Military communications"],
    validate: "Subscriber economics covering constellation replacement over a full satellite lifetime.",
    invalidate: "Replacement capex outrunning subscriber revenue, which is the historical failure mode for satellite ventures.",
    economics: "Capital-intensive with a genuine moat once operating, if the replacement cycle is affordable.",
    concepts: ["capex-cycle", "network-effects"],
  }),

  t("water-infrastructure", "Water infrastructure", "watchlist", {
    node: "water_stress", domain: "infrastructure",
    what: "Treatment, reuse, desalination and distribution capacity in water-constrained regions.",
    why: "Water is a binding input for agriculture, semiconductor fabrication and thermal generation simultaneously, and the constraint is regional rather than global.",
    barriers: ["Energy intensity of desalination", "Municipal financing and rate-setting", "Political sensitivity of pricing water"],
    players: ["Utilities", "Equipment manufacturers", "Engineering contractors"],
    applications: ["Municipal supply", "Industrial reuse", "Agricultural efficiency"],
    validate: "Sustained rate increases and capital programmes converting into equipment orders.",
    invalidate: "Politics continuing to suppress water pricing below the level that funds investment — the status quo in most jurisdictions.",
    economics: "Slow, regulated, and durable. The opposite risk profile to everything else on this list.",
    concepts: ["capex-cycle"],
  }),
];

export const STAGES = [
  { id: "now", label: "Now", note: "Deployed at commercial scale; economics established." },
  { id: "developing", label: "Developing", note: "Real deployments; economics still being proven." },
  { id: "early", label: "Early", note: "Works in narrow production; scale unproven." },
  { id: "experimental", label: "Experimental", note: "Credible research direction; no commercial proof." },
  { id: "watchlist", label: "Watchlist", note: "Plausible and worth tracking; evidence is thin." },
];

export const TECH_BY_ID = new Map(TECHNOLOGIES.map((entry) => [entry.id, entry]));
export const technology = (id) => TECH_BY_ID.get(id) || null;
export const byStage = (stage) => TECHNOLOGIES.filter((entry) => entry.stage === stage);

/**
 * FUTURE MAP — structural trends on a decade horizon.
 * Forecasts are labelled as forecasts, and the "what would change this" field
 * exists so a reader can tell when the map has gone stale.
 */
export const FUTURE_MAP = [
  {
    id: "compute-power", label: "Compute and electricity converge",
    nodes: ["ai_capex", "power_demand", "grid_capacity"],
    now: "AI capital expenditure is running well ahead of the grid's ability to connect new load. Buyers are contracting existing firm generation rather than waiting for new build.",
    near: "Interconnection and equipment lead times, not chips, become the visible constraint on capacity growth. Electricity prices in dense data centre regions become a political issue.",
    mid: "Either grid build-out catches up, or compute siting relocates toward available power — which redraws the map of where the industry is.",
    long: "Electricity becomes a first-order input to the technology sector's cost structure in a way it has not been since the mainframe era.",
    changes: "A step change in model efficiency that decouples capability from energy, or a demand plateau that removes the pressure entirely.",
  },
  {
    id: "demographics", label: "Ageing forces the automation question",
    nodes: ["aging", "labor_supply", "labor_automation"],
    now: "Working-age populations are shrinking across most large developed economies, and immigration — the fastest lever — is politically constrained nearly everywhere.",
    near: "Labour scarcity concentrates in care, construction and logistics. Wage pressure persists in exactly the sectors that are hardest to automate.",
    mid: "Automation shifts from a cost argument to a capacity argument: the work does not get done otherwise.",
    long: "Fiscal sustainability depends on productivity growth that has no precedent in the post-1970 record.",
    changes: "A sustained fertility reversal, a major shift in immigration policy, or a productivity surge that arrives earlier than any historical analogue suggests.",
  },
  {
    id: "fragmentation", label: "Trade fragments along technology lines",
    nodes: ["trade_fragmentation", "export_controls", "reshoring"],
    now: "Export controls target semiconductor chokepoints; subsidy programmes duplicate capacity in several jurisdictions simultaneously.",
    near: "Duplicated capacity meets demand, and utilisation — not construction — becomes the number that matters. Trade routes through intermediary countries continue to grow faster than direct bilateral flows.",
    mid: "Standards divergence begins to slow technology diffusion, which compounds in a way a one-off cost increase does not.",
    long: "The efficiency loss is permanent and diffuse; the resilience gain is real and unmeasurable. Both will be argued about with the same data.",
    changes: "A de-escalation that removes the security rationale, or an escalation that converts controls into outright decoupling.",
  },
  {
    id: "energy-transition", label: "Electrification pulls hard on materials",
    nodes: ["electrification", "copper", "grid_equipment"],
    now: "Motors, cabling, chargers and grid all consume copper, and mine supply takes roughly a decade to add from a standing start.",
    near: "Grid equipment lead times stay extended. Copper's supply response continues to lag any demand signal by years.",
    mid: "Either substitution and efficiency close the gap, or materials cost becomes a visible drag on the transition's pace.",
    long: "The materials intensity of electrification is either solved by recycling and substitution, or it sets the speed limit.",
    changes: "A large new low-cost supply source, a substitution away from copper in major applications, or a demand path materially below current projections.",
  },
  {
    id: "credit-shift", label: "Credit intermediation keeps moving out of banks",
    nodes: ["credit_spreads", "bank_lending", "financial_instability"],
    now: "Private credit has grown quickly, is valued by appraisal rather than market price, and is increasingly held by insurers and retail-accessible vehicles.",
    near: "A full credit cycle tests appraisal-based marks for the first time at this scale.",
    mid: "Either the structure proves more resilient than bank intermediation — no runnable liabilities — or the fragility surfaces where the data is thinnest.",
    long: "Regulation follows whichever answer arrives, as it always has.",
    changes: "A credit downturn severe enough to test the marks, or a disclosure regime that makes the exposure measurable in advance.",
  },
];
