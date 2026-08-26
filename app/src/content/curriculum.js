/**
 * CURRICULUM — ordered paths through the concept corpus.
 *
 * The gap ranker already answers "what am I weakest at". This answers a
 * different question: "what should I learn *in what order*", which matters
 * because most of these ideas are only comprehensible once another one is in
 * place. You cannot usefully think about the yield curve before you can think
 * about a bond yield.
 *
 * Each stage states its goal as something you should be able to *do*, not
 * something you should have read.
 */

export const TRACKS = [
  {
    id: "money", title: "Money and monetary policy", icon: "scale",
    why: "The single most consequential set of decisions in the economy, made by people whose reasoning is public and largely legible once you know the vocabulary.",
    stages: [
      { label: "The measuring stick",
        goal: "Tell whether a given interest rate is actually tight or loose.",
        concepts: ["inflation", "real-vs-nominal", "core-inflation"], lessons: [] },
      { label: "The instrument",
        goal: "Explain how one overnight rate reaches a mortgage, a factory and a currency.",
        concepts: ["monetary-policy", "credit-channel", "financial-conditions"], lessons: ["federal-reserve-1913"] },
      { label: "The signal",
        goal: "Read a yield curve and say what it does and does not tell you.",
        concepts: ["bond-yields", "duration", "yield-curve", "term-premium"], lessons: [] },
      { label: "The hard part",
        goal: "Say what it costs to break an inflation, and why credibility is an asset.",
        concepts: ["inflation-expectations", "wage-price", "sticky-inflation", "shelter-cpi"],
        lessons: ["oil-shocks-1970s", "volcker-disinflation"] },
      { label: "When it stops working",
        goal: "Explain why cutting to zero can fail to stimulate anything.",
        concepts: ["quantitative-easing", "fiscal-policy"], lessons: ["japan-bubble", "bretton-woods"] },
    ],
  },
  {
    id: "markets", title: "Markets and instruments", icon: "chart",
    why: "Prices are not opinions about value; they are the output of positioning, leverage and constraint. Most market commentary confuses the two.",
    stages: [
      { label: "What a price is",
        goal: "Explain why a bond falls when rates rise, without reciting it.",
        concepts: ["bond-yields", "duration"], lessons: [] },
      { label: "What risk is",
        goal: "Distinguish volatility from risk, and risk from uncertainty.",
        concepts: ["volatility", "risk-vs-uncertainty", "diversification"], lessons: [] },
      { label: "What breaks",
        goal: "Identify where a forced seller would be, before there is one.",
        concepts: ["leverage", "liquidity", "credit-spreads", "bank-run"],
        lessons: ["gfc-2008", "asian-crisis-1997"] },
      { label: "Why it is reflexive",
        goal: "Explain how prices change the fundamentals they are supposed to reflect.",
        concepts: ["reflexivity", "financial-instability", "moral-hazard"], lessons: [] },
    ],
  },
  {
    id: "investing", title: "Investing and valuation", icon: "target",
    why: "The analytical part is learnable and the temperamental part is not, but knowing which is which is most of the benefit.",
    stages: [
      { label: "The arithmetic",
        goal: "Say what a multiple actually assumes.",
        concepts: ["valuation", "earnings", "free-cash-flow"], lessons: [] },
      { label: "The business",
        goal: "Answer 'why can't a well-funded competitor copy this' with something specific.",
        concepts: ["moat", "network-effects", "capex-cycle"],
        lessons: ["toyota-production-system", "transistor-fairchild"] },
      { label: "The discipline",
        goal: "State the base rate before the story, every time.",
        concepts: ["base-rates", "margin-of-safety", "second-order-thinking"], lessons: ["dotcom-fibre"] },
    ],
  },
  {
    id: "ai-energy", title: "The AI and energy chain", icon: "cpu",
    why: "The largest capital cycle running, and one where the physical constraints are more decisive than the software — which is why most commentary about it misses.",
    stages: [
      { label: "What is actually improving",
        goal: "Say precisely what scaling laws predict, and what they do not.",
        concepts: ["scaling-laws", "s-curve"], lessons: [] },
      { label: "The physical layer",
        goal: "Name the binding constraint on compute capacity this year, and why.",
        concepts: ["grid-constraints", "energy-density", "supply-chain-bullwhip"], lessons: [] },
      { label: "The economics",
        goal: "Argue both sides of whether efficiency reduces or raises total demand.",
        concepts: ["jevons-paradox", "capex-cycle", "free-cash-flow"], lessons: ["dotcom-fibre"] },
      { label: "The payoff, if any",
        goal: "Explain why a technology can be transformative and invisible in the statistics for a decade.",
        concepts: ["productivity", "creative-destruction"], lessons: ["electrification-productivity"] },
    ],
  },
  {
    id: "geopolitics", title: "Geopolitics and trade", icon: "globe",
    why: "Policy is now a first-order input to supply chains and technology, and the mechanisms are unfamiliar to most people who learned markets in the 1990s.",
    stages: [
      { label: "The gains and who gets them",
        goal: "State comparative advantage and its distributional catch in one breath.",
        concepts: ["comparative-advantage", "tariffs"], lessons: ["the-container"] },
      { label: "The instruments",
        goal: "Explain why chokepoints make export controls enforceable where bans are not.",
        concepts: ["export-controls", "sanctions-policy", "industrial-policy"], lessons: [] },
      { label: "The system",
        goal: "Say why the dollar's role survived losing its gold anchor.",
        concepts: ["dollar", "em-stress", "trade-fragmentation"], lessons: ["bretton-woods", "asian-crisis-1997"] },
      { label: "The dynamic",
        goal: "Explain why defensive moves are indistinguishable from preparation.",
        concepts: ["security-dilemma"], lessons: [] },
    ],
  },
  {
    id: "structure", title: "Structural forces", icon: "horizon",
    why: "The slow variables decide more than the fast ones and get a fraction of the attention, precisely because nothing about them is news on any given day.",
    stages: [
      { label: "The arithmetic of growth",
        goal: "Name the only two sources of long-run growth.",
        concepts: ["gdp", "productivity", "demographics"], lessons: [] },
      { label: "Labour",
        goal: "Say whether a falling unemployment rate is good news, and what you would check.",
        concepts: ["unemployment", "beveridge-curve", "wage-price"], lessons: [] },
      { label: "The long shadow",
        goal: "Explain why policy responses are designed against the last crisis.",
        concepts: ["recession", "creative-destruction"], lessons: ["great-depression", "haber-bosch"] },
    ],
  },
  {
    id: "thinking", title: "Thinking about it well", icon: "brain",
    why: "Most analytical failures are not missing information. They are a confidently held wrong model, applied to a case it does not fit.",
    stages: [
      { label: "Start outside",
        goal: "Give the reference class before the narrative.",
        concepts: ["base-rates", "risk-vs-uncertainty"], lessons: [] },
      { label: "Keep going",
        goal: "Name the load-bearing link in your own chain of reasoning.",
        concepts: ["second-order-thinking", "jevons-paradox", "reflexivity"], lessons: [] },
      { label: "Survive being wrong",
        goal: "Size a position for the case where your thesis is correct and you are early.",
        concepts: ["margin-of-safety", "leverage", "diversification"], lessons: ["japan-bubble"] },
    ],
  },
];

export const TRACK_BY_ID = new Map(TRACKS.map((track) => [track.id, track]));
export const track = (id) => TRACK_BY_ID.get(id) || null;

/** Every track a concept appears in, for the concept page. */
export function tracksForConcept(conceptId) {
  return TRACKS.filter((entry) =>
    entry.stages.some((stage) => stage.concepts.includes(conceptId)));
}
