/**
 * arXiv — preprints.
 *
 * Explicitly not peer reviewed. Presence here is evidence that a claim was made,
 * which is a different thing from evidence that it is true, and the interface
 * labels it that way rather than treating a preprint as a result.
 */
import { get } from "../lib/http.js";
import { parseFeed } from "../lib/xml.js";
import { paper, emptyResult } from "../lib/schema.js";

/**
 * One category per request. A combined OR query is far slower on arXiv's side and
 * reliably times out; several small queries are both faster and politer.
 */
const CATEGORIES = ["cs.AI", "cs.LG", "cs.CL"];
const QUERY = (category, max) =>
  `https://export.arxiv.org/api/query?search_query=cat:${category}` +
  `&sortBy=submittedDate&sortOrder=descending&max_results=${max}`;

export default {
  id: "arxiv", label: "arXiv", sourceId: "arxiv", tier: 1,

  async run({ perCategory = 12 } = {}) {
    const result = emptyResult();
    const notes = [];
    const seen = new Set();

    for (const category of CATEGORIES) {
      const response = await get(QUERY(category, perCategory), {
        accept: "application/atom+xml", timeout: 40_000,
      });
      if (!response.ok) { notes.push(`${category}: ${response.error}`); continue; }

      for (const item of parseFeed(response.body, { limit: perCategory })) {
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        result.research.push(paper({
          title: item.title.replace(/\s+/g, " "),
          url: item.url,
          publishedAt: item.publishedAt,
          authors: item.author ? [item.author] : [],
          summary: item.summary,
          categories: item.categories.length ? item.categories : [category],
        }));
      }
    }

    result.research.sort((a, b) => (a.publishedAt || "") < (b.publishedAt || "") ? 1 : -1);
    return { ...result, notes };
  },
};
