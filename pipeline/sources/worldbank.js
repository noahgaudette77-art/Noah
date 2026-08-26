/**
 * World Bank — long-run structural series.
 *
 * Annual, revised, and years behind the present. That is exactly what it is for:
 * these are the slow variables, and a monthly print tells you nothing about them.
 */
import { getJson } from "../lib/http.js";
import { series, emptyResult } from "../lib/schema.js";

const INDICATORS = [
  { code: "NY.GDP.MKTP.KD.ZG", id: "wb_gdp_growth", label: "World GDP growth", unit: "%", country: "WLD" },
  { code: "SP.POP.65UP.TO.ZS", id: "wb_aging", label: "Population aged 65+", unit: "% of total", country: "WLD", nodeId: "aging" },
  { code: "EG.USE.ELEC.KH.PC", id: "wb_electricity_pc", label: "Electricity use per capita", unit: "kWh", country: "WLD" },
  { code: "NE.TRD.GNFS.ZS", id: "wb_trade_share", label: "Trade as share of world GDP", unit: "%", country: "WLD", nodeId: "trade_flows" },
];

const URL = (country, code) =>
  `https://api.worldbank.org/v2/country/${country}/indicator/${code}?format=json&per_page=70`;

export default {
  id: "worldbank", label: "World Bank", sourceId: "worldbank", tier: 1,

  async run() {
    const result = emptyResult();
    const notes = [];

    for (const indicator of INDICATORS) {
      const response = await getJson(URL(indicator.country, indicator.code));
      if (!response.ok) { notes.push(`${indicator.id}: ${response.error}`); continue; }
      const rows = Array.isArray(response.json) ? response.json[1] : null;
      if (!Array.isArray(rows)) { notes.push(`${indicator.id}: unexpected payload`); continue; }

      const observations = rows
        .filter((row) => row.value !== null)
        .map((row) => ({ d: `${row.date}-12-31`, v: row.value }));
      if (!observations.length) continue;

      result.series.push(series({
        id: indicator.id, label: indicator.label, unit: indicator.unit,
        sourceId: "worldbank", nodeId: indicator.nodeId || null, observations,
        note: "Annual. World Bank data is revised and typically lags the present by a year or more.",
      }));
    }
    return { ...result, notes };
  },
};
