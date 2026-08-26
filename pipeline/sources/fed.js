/** Federal Reserve — press releases. Tier 1: the institution publishing itself. */
import { get } from "../lib/http.js";
import { parseFeed } from "../lib/xml.js";
import { story, emptyResult } from "../lib/schema.js";

const FEEDS = [
  { url: "https://www.federalreserve.gov/feeds/press_all.xml", kind: "release" },
  { url: "https://www.federalreserve.gov/feeds/speeches.xml", kind: "speech" },
];

export default {
  id: "fed", label: "Federal Reserve", sourceId: "fed-press", tier: 1,

  async run() {
    const result = emptyResult();
    const notes = [];

    for (const feed of FEEDS) {
      const response = await get(feed.url, { accept: "application/rss+xml, application/xml" });
      if (!response.ok) { notes.push(`${feed.url}: ${response.error}`); continue; }
      for (const item of parseFeed(response.body, { limit: 40 })) {
        result.stories.push(story({
          ...item, sourceId: "fed-press", tier: 1, kind: feed.kind, region: "us",
          topics: classify(item.title, item.summary),
        }));
      }
    }
    return { ...result, notes };
  },
};

function classify(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  const topics = [];
  if (/fomc|monetary policy|federal funds|interest rate|target range/.test(text)) topics.push("monetary");
  if (/bank|supervis|enforcement|capital|stress test|holding compan/.test(text)) topics.push("banking");
  if (/payment|fednow|clearing|settlement/.test(text)) topics.push("payments");
  if (/beige book|economic conditions|labor market|inflation/.test(text)) topics.push("economy");
  if (/speech|remarks|testimony/.test(text)) topics.push("commentary");
  return topics.length ? topics : ["policy"];
}
