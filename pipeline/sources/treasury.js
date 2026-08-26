/**
 * US Treasury — the daily par yield curve, plus the average interest rate the
 * federal government actually pays on its debt.
 *
 * The curve is the single most useful keyless dataset available: it gives the
 * real 2s10s spread, the shape, and the level, all from the issuer itself.
 */
import { get, getJson } from "../lib/http.js";
import { series, emptyResult } from "../lib/schema.js";

const CURVE = (year) =>
  `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=${year}`;
const AVG_RATE =
  "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?sort=-record_date&page%5Bsize%5D=60";

const TENORS = [
  ["BC_1MONTH", "1m", 1 / 12], ["BC_3MONTH", "3m", 0.25], ["BC_6MONTH", "6m", 0.5],
  ["BC_1YEAR", "1y", 1], ["BC_2YEAR", "2y", 2], ["BC_3YEAR", "3y", 3],
  ["BC_5YEAR", "5y", 5], ["BC_7YEAR", "7y", 7], ["BC_10YEAR", "10y", 10],
  ["BC_20YEAR", "20y", 20], ["BC_30YEAR", "30y", 30],
];

export default {
  id: "treasury", label: "US Treasury", sourceId: "treasury-fiscal", tier: 1,

  async run({ now = new Date() } = {}) {
    const result = emptyResult();
    const notes = [];
    const rows = [];

    // Cross a year boundary cleanly: pull the previous year too when it is early.
    const years = now.getUTCMonth() < 3
      ? [now.getUTCFullYear() - 1, now.getUTCFullYear()]
      : [now.getUTCFullYear()];

    for (const year of years) {
      const response = await get(CURVE(year), { accept: "application/atom+xml, application/xml" });
      if (!response.ok) { notes.push(`curve ${year}: ${response.error}`); continue; }
      rows.push(...parseCurve(response.body));
    }

    if (rows.length) {
      rows.sort((a, b) => (a.date < b.date ? -1 : 1));

      for (const [field, tenor] of TENORS) {
        const observations = rows
          .filter((row) => Number.isFinite(row.values[field]))
          .map((row) => ({ d: row.date, v: row.values[field] }));
        if (!observations.length) continue;
        result.series.push(series({
          id: `ust${tenor}`, label: `US Treasury ${tenor}`, unit: "%",
          sourceId: "treasury-fiscal", observations,
          nodeId: tenor === "2y" ? "ust2y" : tenor === "10y" ? "ust10y" : null,
          note: "Daily par yield curve rate published by the US Treasury.",
        }));
      }

      const spread = rows
        .filter((row) => Number.isFinite(row.values.BC_10YEAR) && Number.isFinite(row.values.BC_2YEAR))
        .map((row) => ({ d: row.date, v: Number((row.values.BC_10YEAR - row.values.BC_2YEAR).toFixed(3)) }));
      if (spread.length) {
        result.series.push(series({
          id: "curve_2s10s", label: "Yield curve (10y − 2y)", unit: "pp",
          sourceId: "treasury-fiscal", nodeId: "yield_curve", observations: spread,
          note: "Computed from the Treasury par curve. Negative values are an inversion.",
        }));
      }

      // The latest full curve, for the term-structure chart.
      const last = rows[rows.length - 1];
      result.curve = {
        asOf: last.date,
        sourceId: "treasury-fiscal",
        points: TENORS
          .filter(([field]) => Number.isFinite(last.values[field]))
          .map(([field, tenor, years]) => ({ tenor, years, yield: last.values[field] })),
      };
    }

    const avg = await getJson(AVG_RATE);
    if (avg.ok && Array.isArray(avg.json?.data)) {
      const total = avg.json.data.filter((row) => row.security_desc === "Total Interest-bearing Debt");
      if (total.length) {
        result.series.push(series({
          id: "avg_debt_rate", label: "Average rate on federal debt", unit: "%",
          sourceId: "treasury-fiscal",
          observations: total.map((row) => ({ d: row.record_date, v: Number(row.avg_interest_rate_amt) })),
          note: "The weighted average coupon the US government actually pays. Adjusts slowly, as old bonds mature.",
        }));
      }
    } else if (!avg.ok) {
      notes.push(`avg rates: ${avg.error}`);
    }

    return { ...result, notes };
  },
};

function parseCurve(xml) {
  const blocks = xml.match(/<m:properties>[\s\S]*?<\/m:properties>/g) || [];
  return blocks.map((block) => {
    const date = (block.match(/<d:NEW_DATE[^>]*>([^<]+)</) || [])[1];
    const values = {};
    for (const match of block.matchAll(/<d:(BC_[A-Z0-9_]+)[^>]*>([^<]*)</g)) {
      const parsed = Number(match[2]);
      if (Number.isFinite(parsed)) values[match[1]] = parsed;
    }
    return date ? { date: date.slice(0, 10), values } : null;
  }).filter(Boolean);
}
