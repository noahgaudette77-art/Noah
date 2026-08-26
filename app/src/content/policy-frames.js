/**
 * POLICY FRAMES — how to read an instrument, kept strictly separate from what
 * the instrument says.
 *
 * The platform's politics surface splits everything into four registers, and
 * the split is the point:
 *
 *   FACT           a document exists, on a date, issued by a named body.
 *                  Comes from the Federal Register. Not authored here.
 *   STRUCTURAL     a durable fact about how the domain works, true across
 *                  administrations. Authored, and only where it is genuinely
 *                  durable — nothing here should need revising on a news cycle.
 *   INTERPRETATION what an action on this variable usually means. Authored,
 *                  labelled as inference, and carrying both the assumption it
 *                  rests on and the observation that would falsify it.
 *   UNCERTAINTY    what is not known. Authored. Questions, not hedged claims.
 *
 * The rule that keeps this honest: nothing in `reading` may assert that a
 * particular thing has happened. It describes how to read an instrument if one
 * appears, and the instruments themselves come from the primary source.
 *
 * Scenarios are not authored at all — they are propagated through the world
 * model, so the chain shown is the model's and can be inspected edge by edge.
 */

const frame = (nodeId, extra) => ({ nodeId, ...extra });

export const POLICY_FRAMES = [
  frame("tariffs", {
    label: "Tariffs and trade remedies",
    instruments: ["Proclamation", "Section 301 action", "Antidumping or countervailing duty order"],
    structural: [
      "A tariff is collected from the importer of record, not from the exporting country. Who ultimately bears it depends on demand elasticity and on the currency, and is an empirical question with different answers per product.",
      "US tariff authority is mostly delegated: Section 232 covers national security, Section 301 covers unfair practices, and each carries its own investigation and notice requirements. The procedural route constrains how quickly a rate can move.",
      "Announced rates and collected rates diverge. Exclusions, de minimis thresholds, transshipment and pre-positioned inventory all sit between a proclamation and a customs receipt.",
    ],
    reading: "A tariff instrument is a price change with a lag, not an immediate cost shock. Read the effective date and the exclusion process before the headline rate: those determine when, and how much of, the change actually reaches a landed cost.",
    restsOn: "That importers cannot durably route around the measure — through exclusions, substitution or origin shifting.",
    wrongIf: "Import volumes hold up at roughly prior prices, which would indicate the burden is being absorbed upstream or the measure is being circumvented.",
    unknowns: [
      "How much of the incidence lands on the exporter's margin versus the importer's price, which differs by product and is rarely measured contemporaneously.",
      "Whether retaliation follows, and against which sectors — usually chosen for political concentration rather than economic symmetry.",
      "Whether the measure survives litigation and the next administration, which determines if firms actually relocate production or simply wait.",
    ],
  }),

  frame("sanctions", {
    label: "Sanctions",
    instruments: ["Executive order", "Continuation of national emergency", "OFAC regulations"],
    structural: [
      "Most US sanctions programmes rest on a declared national emergency under IEEPA, which lapses annually unless continued. The yearly continuation notice is a procedural requirement, not a new decision.",
      "The binding constraint is usually secondary exposure: institutions outside the sanctioning jurisdiction over-comply to protect dollar access, and that over-compliance does more than the designation itself.",
      "Sanctions are far easier to impose than to remove. Delisting requires an affirmative process, so the stock of restrictions ratchets up over time.",
    ],
    reading: "Read a designation for what it does to counterparties rather than to the named entity. The named party has usually already been de-risked by the market; the measurable effect runs through banks, insurers and shippers deciding what they will still touch.",
    restsOn: "That the sanctioning jurisdiction controls a chokepoint — dollar clearing, a reserve currency, a technology, an insurance market — that the target cannot substitute quickly.",
    wrongIf: "Trade in the restricted good continues at similar volume through alternative settlement or intermediaries, which would show the chokepoint has been routed around.",
    unknowns: [
      "The size of the evasion channel, which is unobservable almost by construction and usually estimated from residuals rather than measured.",
      "Whether restriction accelerates the development of alternative settlement systems — a cost that arrives years later and is attributed elsewhere when it does.",
      "How much of the observed effect is the sanction and how much is the conflict that prompted it.",
    ],
  }),

  frame("export_controls", {
    label: "Export controls",
    instruments: ["Entity List revision", "EAR rule", "Continuation of national emergency"],
    structural: [
      "Export controls restrict capability rather than volume: the target is what a buyer can build, not what they can buy this quarter.",
      "The Entity List is a licensing requirement, not a prohibition. Licences may be granted, denied, or presumed denied, and the presumption is where the policy actually sits.",
      "Controls on tools bite harder and longer than controls on products, because a fabrication process cannot be reverse-engineered from its output.",
    ],
    reading: "Read a control for its effect on the receiving industry's roadmap, not its next order book. Near-term revenue frequently rises as buyers stockpile ahead of an effective date, which is the opposite of the eventual direction.",
    restsOn: "That the controlled capability has no adequate substitute and that allied jurisdictions apply comparable rules.",
    wrongIf: "The target demonstrates a domestically produced equivalent at commercial yield, or an allied supplier fills the gap without restriction.",
    unknowns: [
      "How much indigenous capability the restriction accelerates, and on what timeline — the central disagreement in the field, with no clean way to observe the counterfactual.",
      "Actual licence approval rates, which are not published in a form that permits year-on-year comparison.",
      "Stockpile depth at controlled buyers, which determines how long reported demand stays disconnected from underlying demand.",
    ],
  }),

  frame("geopolitical_risk", {
    label: "Conflict and national emergencies",
    instruments: ["Executive order", "Continuation of national emergency", "Presidential determination"],
    structural: [
      "A declared national emergency is a legal instrument granting specific statutory powers. Dozens are in continuous force at any time, and a continuation notice signals procedural maintenance rather than escalation.",
      "Markets price geopolitical risk through insurance, freight and energy long before they price it through output — the shipping and options markets move first because they must.",
      "Conflict raises risk premia broadly but affects real activity narrowly, through specific chokepoints. Conflating the two produces most bad geopolitical analysis.",
    ],
    reading: "Read an emergency declaration for the authorities it unlocks, not for its rhetoric. The operative question is what the declaring party may now do without further process, since that is what changes the distribution of outcomes.",
    restsOn: "That the powers granted are used, and that the affected chokepoint has no rapid substitute.",
    wrongIf: "Freight rates, war-risk insurance and energy differentials stay flat — the practitioners closest to the risk are not repricing it.",
    unknowns: [
      "Whether a declaration precedes action or substitutes for it. Both patterns are common and they are hard to distinguish contemporaneously.",
      "The duration, which dominates the economic effect and is the part nobody forecasts well.",
      "Second-round effects through alliance behaviour and defence procurement, which arrive over years and are shaped by budget cycles rather than events.",
    ],
  }),

  frame("election_risk", {
    label: "Electoral and policy risk",
    instruments: ["Executive order", "Rescission of prior rule", "Regulatory agenda"],
    structural: [
      "Elections are scheduled, so their timing carries no information. What carries information is the change in the distribution of policy outcomes, and that moves continuously.",
      "Executive action is fast and reversible; legislation is slow and durable. Which instrument a policy arrives through predicts how long it lasts far better than its content does.",
      "Rescissions of prior rules cluster after a transition, and the volume of them measures a change in direction more reliably than any single new rule.",
    ],
    reading: "Read policy risk as a change in variance, not a change in level. For most assets, an election that could plausibly go either way widens the distribution well before it shifts the mean, and that widening is the tradeable and forecastable part.",
    restsOn: "That the policies at stake genuinely differ in effect, rather than differing in framing while converging in practice.",
    wrongIf: "Implied volatility on the affected exposures does not rise into the event — the market does not regard the branches as materially different.",
    unknowns: [
      "How much announced policy survives contact with institutional constraint, which is close to unknowable in advance and where most political forecasting fails.",
      "Whether a change in administration reverses prior executive action or ratifies it, which has gone both ways on similar questions.",
    ],
  }),

  frame("trade_fragmentation", {
    label: "Trade fragmentation",
    instruments: ["Trade agreement", "Procurement rule", "Supply-chain determination"],
    structural: [
      "Duplicating capacity across blocs raises the cost of the same output. That cost is real and permanent, and it shows up as lower measured productivity rather than as a visible line item.",
      "Fragmentation is slow. Supply chains are relationships and qualified processes, not spot purchases, so redirection takes years and is frequently partial.",
      "Trade statistics understate it: goods increasingly reach the same destination through a third country, so bilateral balances move more than underlying dependence does.",
    ],
    reading: "Read a fragmentation measure as a productivity tax paid over a decade, not as a demand shock. The near-term effect is usually a capital-spending boom in the duplicating region, which looks like strength and is partly the cost being capitalised.",
    restsOn: "That relocated capacity is genuinely less efficient than what it replaces — otherwise the policy is merely accelerating a shift that was happening anyway.",
    wrongIf: "Unit costs in the relocating industry fall to parity, which would indicate the original concentration reflected policy rather than comparative advantage.",
    unknowns: [
      "How much redirected trade is genuine relocation and how much is transshipment relabelled, which the trade data cannot presently separate.",
      "Whether the duplicated capacity is ever fully utilised, or whether it becomes the overhang of the next cycle.",
    ],
  }),

  frame("energy_transition", {
    label: "Energy policy",
    instruments: ["Executive order", "EPA or DOE rule", "Licensing framework"],
    structural: [
      "Electricity demand is set by connection queues and capacity, not by policy preference. A rule that changes what may be built changes the queue years before it changes the generation mix.",
      "Permitting and interconnection timelines dominate technology cost in determining what actually gets built in the US. This is the binding constraint and it is administrative.",
      "Generation assets last decades. A rule changing new-build economics moves the installed base very slowly, and reversals arrive before much of the base has turned over.",
    ],
    reading: "Read an energy rule through the interconnection queue. Whether it shortens or lengthens the path from proposal to operating asset predicts its effect better than which technology it nominally favours.",
    restsOn: "That the constraint is administrative rather than physical — that projects are waiting on process, not on equipment, transmission or capital.",
    wrongIf: "Queue times and completion rates do not respond after the rule takes effect, indicating the binding constraint was elsewhere.",
    unknowns: [
      "How much of announced data-centre load is genuinely additive versus the same project queued in several places at once — a known duplication in interconnection data that utilities cannot fully resolve.",
      "Whether a rule survives litigation, which for major environmental rules is closer to a coin flip than the announcement implies.",
    ],
  }),
];

export const FRAME_BY_NODE = new Map(POLICY_FRAMES.map((entry) => [entry.nodeId, entry]));

export const frameFor = (nodeId) => FRAME_BY_NODE.get(nodeId) || null;

/** The policy nodes this corpus can frame, in the order the view should show them. */
export const framedNodes = () => POLICY_FRAMES.map((entry) => entry.nodeId);
