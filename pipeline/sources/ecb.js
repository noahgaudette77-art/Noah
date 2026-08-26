/** European Central Bank — press feed plus the euro reference exchange rate. */
import { get, getJson } from "../lib/http.js";
import { parseFeed } from "../lib/xml.js";
import { story, series, emptyResult } from "../lib/schema.js";

const PRESS = "https://www.ecb.europa.eu/rss/press.html";
const EXCHANGE =
  "https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=260&format=jsondata";

export default {
  id: "ecb", label: "European Central Bank", sourceId: "ecb-press", tier: 1,

  async run() {
    const result = emptyResult();
    const notes = [];

    const press = await get(PRESS, { accept: "application/rss+xml, application/xml" });
    if (press.ok) {
      for (const item of parseFeed(press.body, { limit: 30 })) {
        result.stories.push(story({
          ...item, sourceId: "ecb-press", tier: 1, kind: "release", region: "europe",
          topics: /rate|monetary|inflation|governing council/i.test(`${item.title} ${item.summary}`)
            ? ["monetary"] : ["policy"],
        }));
      }
    } else {
      notes.push(`press: ${press.error}`);
    }

    const fx = await getJson(EXCHANGE);
    if (fx.ok) {
      const observations = readSdmx(fx.json);
      if (observations.length) {
        result.series.push(series({
          id: "eurusd", label: "EUR/USD", unit: "USD per EUR",
          sourceId: "ecb-data", nodeId: "eurusd", observations,
          note: "ECB euro foreign exchange reference rate, published each business day at 16:00 CET.",
        }));
      }
    } else {
      notes.push(`exchange rates: ${fx.error}`);
    }

    return { ...result, notes };
  },
};

/** SDMX-JSON: observation values sit in a keyed map alongside a separate time dimension. */
function readSdmx(payload) {
  try {
    const dataSet = payload?.dataSets?.[0];
    const seriesKey = Object.keys(dataSet?.series || {})[0];
    const points = dataSet?.series?.[seriesKey]?.observations || {};
    const timeValues = payload?.structure?.dimensions?.observation?.[0]?.values || [];
    return Object.entries(points).map(([index, value]) => ({
      d: timeValues[Number(index)]?.id,
      v: Array.isArray(value) ? value[0] : value,
    })).filter((o) => o.d && o.v !== null);
  } catch {
    return [];
  }
}
