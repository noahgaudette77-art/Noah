/** The concept corpus, indexed. */
import { MACRO_CONCEPTS } from "./concepts-macro.js";
import { MARKET_CONCEPTS } from "./concepts-markets.js";
import { TECH_CONCEPTS } from "./concepts-tech.js";

export const CONCEPTS = [...MACRO_CONCEPTS, ...MARKET_CONCEPTS, ...TECH_CONCEPTS];

export const CONCEPT_BY_ID = new Map(CONCEPTS.map((concept) => [concept.id, concept]));
export const concept = (id) => CONCEPT_BY_ID.get(id) || null;

export const DOMAINS = [
  { id: "economics", label: "Economics", icon: "chart" },
  { id: "markets", label: "Markets", icon: "pulse" },
  { id: "investing", label: "Investing", icon: "target" },
  { id: "business", label: "Business", icon: "building" },
  { id: "technology", label: "Technology", icon: "cpu" },
  { id: "geopolitics", label: "Geopolitics", icon: "globe" },
  { id: "history", label: "History", icon: "book" },
  { id: "science", label: "Science", icon: "flask" },
];

export const LEVELS = [
  { id: "beginner", label: "Beginner", note: "The intuition, in plain language." },
  { id: "intermediate", label: "Intermediate", note: "The mechanism and why it matters." },
  { id: "advanced", label: "Advanced", note: "How practitioners actually use it." },
  { id: "expert", label: "Expert", note: "The argument professionals are still having." },
];

export const byDomain = (domainId) => CONCEPTS.filter((c) => c.domain === domainId);

/** Concepts attached to a world-model node, for the node drawer. */
export const conceptsForNode = (nodeId) => CONCEPTS.filter((c) => c.node === nodeId);

/** Undirected concept adjacency, used by the knowledge graph view. */
export function conceptLinks() {
  const links = new Set();
  for (const c of CONCEPTS) {
    for (const other of c.related || []) {
      if (!CONCEPT_BY_ID.has(other)) continue;
      links.add([c.id, other].sort().join("|"));
    }
  }
  return [...links].map((key) => {
    const [a, b] = key.split("|");
    return { a, b };
  });
}

export function searchConcepts(query, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return CONCEPTS
    .map((c) => {
      const term = c.term.toLowerCase();
      let score = 0;
      if (term === q) score = 100;
      else if (term.startsWith(q)) score = 72;
      else if (term.includes(q)) score = 54;
      else if ((c.tags || []).some((t) => t.includes(q))) score = 34;
      else if (c.levels.beginner.toLowerCase().includes(q)) score = 16;
      return { concept: c, score };
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((hit) => hit.concept);
}
