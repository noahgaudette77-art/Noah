#!/usr/bin/env node
/**
 * Browser checks for the intelligence application.
 *
 * Playwright is not a dependency of this repository — the application ships
 * with none. Install it only when you want to run these:
 *
 *   npm i -D playwright && npx playwright install chromium
 *   node scripts/serve.js &
 *   node tests/browser.mjs
 *
 * Covers three things a syntax check cannot: every route renders without a
 * console error, no layout overflows at any width, and the interactive flows
 * (palette, drawer, simulator, graph, quiz, challenge, theme) actually work.
 */

import { chromium } from "playwright";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE || "http://localhost:4173/app/index.html";

/**
 * Use whatever Chromium is already on the machine when its build number does
 * not match the installed Playwright's expectation — common on CI images that
 * ship a browser separately. Falls back to Playwright's own resolution.
 */
function chromiumPath() {
  if (process.env.PW_CHROMIUM) return process.env.PW_CHROMIUM;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !existsSync(root)) return undefined;
  const dir = readdirSync(root).filter((name) => /^chromium-\d+$/.test(name)).sort().pop();
  if (!dir) return undefined;
  const binary = path.join(root, dir, "chrome-linux", "chrome");
  return existsSync(binary) ? binary : undefined;
}
const problems = [];
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) problems.push(name);
};

const ROUTES = [
  "/", "/ask", "/daily", "/weekly", "/archive", "/stream", "/markets", "/economy",
  "/companies", "/companies/NVDA", "/companies/TSM",
  "/graph", "/simulator", "/debates", "/debates/ai-capex", "/radar", "/future",
  "/knowledge", "/knowledge/yield-curve", "/history", "/history/great-depression",
  "/curriculum", "/curriculum/money",
  "/learn", "/learn?start=quiz", "/learn?start=challenge",
  "/research", "/watchlist", "/forecasts", "/sources", "/settings", "/nope",
];

const VIEWPORTS = [
  ["desktop", { width: 1440, height: 900 }],
  ["tablet", { width: 834, height: 1112 }],
  ["mobile", { width: 390, height: 844 }],
];

const browser = await chromium.launch({ executablePath: chromiumPath() });

/* --- 1. Every route renders cleanly ------------------------------------- */
console.log("\nRoutes");
{
  const page = await (await browser.newContext({ viewport: VIEWPORTS[0][1] })).newPage();
  page.on("pageerror", (error) => problems.push(`pageerror ${page.url()}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console ${page.url()}: ${message.text()}`);
  });
  let rendered = 0;
  for (const route of ROUTES) {
    await page.goto(`${BASE}#${route}`, { waitUntil: "load" });
    await page.waitForTimeout(600);
    const chars = await page.evaluate(() => document.querySelector(".view")?.innerText?.length || 0);
    if (chars > 20) rendered++;
    else problems.push(`${route} rendered ${chars} characters`);
  }
  check(`${rendered}/${ROUTES.length} routes render`, rendered === ROUTES.length);
  await page.context().close();
}

/* --- 2. No horizontal overflow at any width ----------------------------- */
console.log("\nLayout");
for (const [name, viewport] of VIEWPORTS) {
  const page = await (await browser.newContext({ viewport })).newPage();
  let worst = 0;
  for (const route of ["/", "/daily", "/markets", "/graph", "/weekly", "/learn", "/companies", "/ask", "/curriculum"]) {
    await page.goto(`${BASE}#${route}`, { waitUntil: "load" });
    await page.waitForTimeout(500);
    worst = Math.max(worst, await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth));
  }
  check(`${name} (${viewport.width}px) has no horizontal overflow`, worst <= 1, `${worst}px`);
  await page.context().close();
}

/* --- 3. Interactive flows ------------------------------------------------ */
console.log("\nInteractions");
{
  const page = await (await browser.newContext({ viewport: VIEWPORTS[0][1] })).newPage();
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));

  await page.goto(`${BASE}#/`, { waitUntil: "load" });
  await page.waitForTimeout(600);

  await page.keyboard.press("Control+k");
  await page.waitForTimeout(200);
  check("command palette opens", await page.isVisible(".palette"));
  await page.keyboard.type("yield curve");
  await page.waitForTimeout(250);
  check("palette searches the corpus", (await page.locator(".palette__item").count()) > 0);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  check("palette navigates", (await page.evaluate(() => location.hash)) !== "#/");
  await page.keyboard.press("Escape");

  await page.goto(`${BASE}#/stream`, { waitUntil: "load" });
  await page.waitForTimeout(600);
  await page.locator(".rowitem").first().click();
  await page.waitForTimeout(350);
  check("story drawer opens", await page.isVisible(".drawer"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  check("drawer closes on Escape", !(await page.isVisible(".drawer")));

  await page.goto(`${BASE}#/markets`, { waitUntil: "load" });
  await page.waitForTimeout(900);
  const headline = await page.locator(".stat").count();
  check("markets leads with a headline strip", headline >= 6, `${headline} readings`);
  check("equity indices are rebased, not mixed on one axis",
    (await page.getByText(/rebased/i).count()) > 0);
  const attribution = await page.locator(".panel", { hasText: /attribution/i }).innerText();
  check("redistributed series name their copyright holder",
    /S&P Dow Jones|CBOE|ICE|Nasdaq/i.test(attribution), attribution.split("\n")[2] || "");

  await page.locator("button", { hasText: /^Trace it$/ }).first().click();
  await page.waitForTimeout(1200);
  const nodeDrawer = await page.locator(".drawer").innerText();
  check("node drawer carries the live reading", /currently/i.test(nodeDrawer));
  check("the reading is attributed and dated",
    /FRED|Treasury|World Bank|Bank of Canada/i.test(nodeDrawer) && /20\d\d/.test(nodeDrawer));
  check("the drawer still explains the transmission",
    /what moves it/i.test(nodeDrawer) && /what it moves/i.test(nodeDrawer));
  await page.keyboard.press("Escape");

  await page.goto(`${BASE}#/economy`, { waitUntil: "load" });
  await page.waitForTimeout(900);
  check("inflation is drawn against the 2% target",
    (await page.getByText(/2% target/).count()) > 0);
  check("year-over-year series are labelled as such",
    (await page.getByText(/year over year/i).count()) > 0);
  const macroRows = await page.locator(".panel", { hasText: /macro variables tracked/i })
    .locator(".rowitem").count();
  check("every tracked macro variable is reachable", macroRows > 6, `${macroRows} variables`);

  await page.goto(`${BASE}#/simulator`, { waitUntil: "load" });
  await page.waitForTimeout(600);
  const before = await page.locator(".statgrid").first().innerText();
  await page.getByText("AI compute demand doubles").click();
  await page.waitForTimeout(450);
  check("simulator preset changes the result",
    (await page.locator(".statgrid").first().innerText()) !== before);
  const effects = await page.locator(".g-side > div:nth-child(2) .rowitem__title").allInnerTexts();
  check("the AI chain propagates", effects.some((t) => /Accelerator|Data Centre|Electricity|Grid/i.test(t)),
    effects.slice(0, 3).join(" | "));

  await page.goto(`${BASE}#/graph`, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  check("graph renders", (await page.locator(".graph__node").count()) > 4);
  await page.locator(".graph__node").nth(3).click();
  await page.waitForTimeout(600);
  check("graph re-centres on click", (await page.evaluate(() => location.hash)).includes("focus="));
  await page.getByText("Connect two variables").click();
  await page.waitForTimeout(400);
  const chain = await page.locator(".view .callout").first().innerText().catch(() => "");
  check("path finding returns a route", chain.includes("→"));

  await page.goto(`${BASE}#/learn?start=quiz`, { waitUntil: "load" });
  await page.waitForTimeout(700);
  await page.locator(".rowitem").first().click();
  await page.waitForTimeout(350);
  check("quiz reveals its explanation", await page.isVisible(".callout"));
  const xpBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("pios.v1.profile")).learning.xp);
  await page.getByRole("button", { name: /Next question|See results/ }).click();
  await page.waitForTimeout(350);
  await page.locator(".rowitem").first().click();
  await page.waitForTimeout(300);
  const xpAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("pios.v1.profile")).learning.xp);
  check("quiz awards XP and persists it", xpAfter > xpBefore, `${xpBefore} → ${xpAfter}`);

  await page.goto(`${BASE}#/learn?start=challenge`, { waitUntil: "load" });
  await page.waitForTimeout(600);
  await page.locator("textarea").fill(
    "I expect inflation, the policy rate, bond yields, mortgage rates, housing, consumer spending, "
    + "GDP, the dollar, credit spreads, equities, gasoline, electricity, the grid, semiconductors, "
    + "data centres, utilities, airlines, banks and unemployment to move.");
  await page.getByRole("button", { name: /Assess my reasoning/ }).click();
  await page.waitForTimeout(600);
  check("challenge assesses a free-text answer",
    (await page.getByText("Assessment", { exact: true }).count()) > 0);

  await page.goto(`${BASE}#/knowledge/yield-curve`, { waitUntil: "load" });
  await page.waitForTimeout(600);
  const beginner = await page.locator(".prose").first().innerText();
  await page.getByRole("button", { name: "Expert" }).first().click();
  await page.waitForTimeout(250);
  check("explain switches depth", (await page.locator(".prose").first().innerText()) !== beginner);

  await page.goto(`${BASE}#/companies`, { waitUntil: "load" });
  await page.waitForTimeout(800);
  const companyRows = await page.locator("tbody tr").count();
  check("company screen lists filers", companyRows > 15, `${companyRows} companies`);
  check("valuation gap is stated, not approximated",
    (await page.getByText(/There is no price here/).count()) > 0);
  await page.locator("th", { hasText: "FCF margin" }).click();
  await page.waitForTimeout(300);
  check("screen columns sort", (await page.evaluate(() => location.hash)).includes("sort=fcf"));

  await page.goto(`${BASE}#/companies/NVDA`, { waitUntil: "load" });
  await page.waitForTimeout(800);
  check("company page shows reported history", (await page.getByText(/reported years/).count()) > 0);
  check("company page shows its research frame", (await page.getByText(/research frame/i).count()) > 0);

  await page.goto(`${BASE}#/debates`, { waitUntil: "load" });
  await page.waitForTimeout(700);
  check("contrarian derives what is missed",
    (await page.locator(".panel", { hasText: /what most people are missing/i }).locator(".rowitem").count()) > 0);
  await page.goto(`${BASE}#/debates/ai-capex`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  check("a debate states both sides and a falsifier",
    (await page.getByText(/what would settle it/i).count()) > 0);

  await page.goto(`${BASE}#/curriculum`, { waitUntil: "load" });
  await page.waitForTimeout(600);
  check("curriculum lists every track",
    (await page.locator(".panel", { hasText: /where to start|continue/i }).locator(".rowitem").count()) === 7);
  await page.goto(`${BASE}#/curriculum/money`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  check("a track states what you should be able to do",
    (await page.getByText(/you should be able to/i).count()) > 0);

  await page.goto(`${BASE}#/ask`, { waitUntil: "load" });
  await page.waitForTimeout(700);
  for (const [question, expected] of [
    ["What happens if oil rises?", /assumptions/i],
    ["How does AI capital expenditure affect copper?", /route 1/i],
    ["Who is exposed to electricity demand?", /exposed to/i],
    ["What am I missing?", /already priced/i],
    ["zzzz nonsense query", /nothing here matches/i],
  ]) {
    await page.locator("input[type=text]").first().fill(question);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(600);
    check(`ask: ${question.slice(0, 40)}`, expected.test(await page.locator(".view").innerText()));
  }

  page.on("dialog", (dialog) => {
    problems.push(`a native dialog was used: ${dialog.message()}`);
    dialog.dismiss();
  });

  await page.goto(`${BASE}#/forecasts`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /Record a forecast/ }).click();
  await page.waitForTimeout(250);
  check("forecast form opens", await page.isVisible("[role=dialog]"));
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await page.waitForTimeout(200);
  check("required fields are enforced", await page.isVisible("[data-error-for=claim]"));
  await page.locator("textarea").first().fill("The 2s10s spread stays positive through year end.");
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await page.waitForTimeout(400);
  check("forecast is recorded", (await page.getByText("2s10s spread stays positive").count()) > 0);

  await page.goto(`${BASE}#/research`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /New project/ }).click();
  await page.waitForTimeout(250);
  await page.locator("input").first().fill("AI infrastructure");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForTimeout(350);
  check("research project is created", (await page.getByText("AI infrastructure").count()) > 0);
  await page.locator(".iconbtn[aria-label='Delete project']").click();
  await page.waitForTimeout(250);
  check("destructive actions use a styled confirm", await page.isVisible("[role=alertdialog]"));
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  await page.goto(`${BASE}#/settings`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "light", exact: true }).click();
  await page.waitForTimeout(250);
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(500);
  check("theme choice survives a reload",
    (await page.evaluate(() => document.documentElement.dataset.theme)) === "light");

  await page.context().close();
}

await browser.close();

console.log(problems.length
  ? `\n${problems.length} problem(s):\n  ${problems.join("\n  ")}`
  : "\nAll checks passed.");
process.exit(problems.length ? 1 : 0);
