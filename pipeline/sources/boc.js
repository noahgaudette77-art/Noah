/** Bank of Canada — Valet API. Documented, keyless, and the cleanest of the lot. */
import { getJson, get } from "../lib/http.js";
import { parseFeed } from "../lib/xml.js";
import { series, story, emptyResult } from "../lib/schema.js";

const SERIES = {
  FXUSDCAD: { id: "usdcad", label: "USD/CAD", unit: "CAD per USD", nodeId: "usdcad", group: "Currency" },
  "BD.CDN.10YR.DQ.YLD": { id: "cangov10y", label: "Canada 10-year bond yield", unit: "%", group: "Canada" },
  "BD.CDN.2YR.DQ.YLD": { id: "cangov2y", label: "Canada 2-year bond yield", unit: "%", group: "Canada" },
  V39079: { id: "boc_policy_rate", label: "Bank of Canada target rate", unit: "%", nodeId: "boc_rate", group: "Canada" },
};

const OBSERVATIONS = (keys, recent) =>
  `https://www.bankofcanada.ca/valet/observations/${keys.join(",")}/json?recent=${recent}`;
const PRESS = "https://www.bankofcanada.ca/content_type/press-releases/feed/";

export default {
  id: "boc", label: "Bank of Canada", sourceId: "boc-valet", tier: 1,

  async run() {
    const result = emptyResult();
    const notes = [];

    const keys = Object.keys(SERIES);
    const response = await getJson(OBSERVATIONS(keys, 400));
    if (response.ok && Array.isArray(response.json?.observations)) {
      const buckets = Object.fromEntries(keys.map((key) => [key, []]));
      for (const observation of response.json.observations) {
        for (const key of keys) {
          const value = observation[key]?.v;
          if (value !== undefined && value !== "") buckets[key].push({ d: observation.d, v: Number(value) });
        }
      }
      for (const [key, meta] of Object.entries(SERIES)) {
        if (!buckets[key].length) continue;
        result.series.push(series({
          ...meta, sourceId: "boc-valet", observations: buckets[key],
          note: response.json.seriesDetail?.[key]?.description?.slice(0, 220) || null,
        }));
      }
    } else {
      notes.push(`observations: ${response.error}`);
    }

    const press = await get(PRESS, { accept: "application/rss+xml, application/xml" });
    if (press.ok) {
      for (const item of parseFeed(press.body, { limit: 20 })) {
        result.stories.push(story({
          ...item, sourceId: "boc-press", tier: 1, kind: "release", region: "canada",
          topics: /rate|monetary|inflation/i.test(item.title) ? ["monetary"] : ["policy"],
        }));
      }
    } else {
      notes.push(`press: ${press.error}`);
    }

    return { ...result, notes };
  },
};
