#!/usr/bin/env node
/**
 * Checks the arcade's chapter content files against the schema the game expects,
 * and reports quality warnings (balance, coverage, banned option patterns).
 *
 *   node scripts/validate-arcade.js                    → every arcade/content/*.json
 *   node scripts/validate-arcade.js arcade/content/ch04.json
 *
 * Exits 1 when any file has errors. Warnings never fail the run.
 */
const fs = require("fs");
const path = require("path");

const CONTENT = path.join(__dirname, "..", "arcade", "content");
// Pages per chapter in the course text (used for the coverage report).
const PAGES = { 1: 10, 2: 30, 3: 21, 4: 37, 5: 24, 6: 61, 7: 31, 8: 24, 9: 42, 10: 32, 11: 26 };

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(CONTENT).filter((f) => /^ch\d\d[a-z]?\.json$/.test(f)).sort().map((f) => path.join(CONTENT, f));

let failed = false;

for (const file of files) {
  const errors = [];
  const warns = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warns.push(m);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.log(`\n✗ ${path.basename(file)}: invalid JSON — ${e.message}`);
    failed = true;
    continue;
  }

  const ch = data.chapter;
  const part = data.part || ""; // "a" / "b" for a chapter written in two halves
  const pad = String(ch).padStart(2, "0");
  if (!Number.isInteger(ch) || ch < 1 || ch > 11) err("chapter must be an integer 1–11");
  if (typeof data.title !== "string" || !data.title.trim()) err("title is required");
  for (const key of ["objectives", "guide", "tips", "flashcards", "questions"]) {
    if (!Array.isArray(data[key])) err(`${key} must be an array`);
  }
  if (errors.length) {
    report(file, errors, warns, null);
    continue;
  }

  const str = (v) => typeof v === "string" && v.trim().length > 0;
  const pageRe = /^(\d{1,2})•(\d{1,2})$/;
  const pagesSeen = new Set();
  const checkPage = (where, p) => {
    if (!str(p)) return err(`${where}: page is required (e.g. "${ch}•7")`);
    const m = p.match(pageRe);
    if (!m) return err(`${where}: page "${p}" must look like "${ch}•7" (bullet •, no spaces)`);
    if (+m[1] !== ch) err(`${where}: page "${p}" is not in chapter ${ch}`);
    if (+m[2] > (PAGES[ch] || 99)) err(`${where}: page "${p}" is past the end of the chapter`);
    pagesSeen.add(+m[2]);
  };

  // objectives / tips
  data.objectives.forEach((o, i) => { if (!str(o)) err(`objectives[${i}] must be a non-empty string`); });
  data.tips.forEach((t, i) => {
    if (!str(t)) err(`tips[${i}] must be a non-empty string`);
    else if (t.length > 170) warn(`tips[${i}] is ${t.length} chars (aim for ≤ 170)`);
  });

  // guide
  data.guide.forEach((g, i) => {
    const w = `guide[${i}]`;
    if (!str(g.heading)) err(`${w}.heading is required`);
    if (g.page !== undefined) checkPage(w, g.page);
    if (!Array.isArray(g.points) || !g.points.length) return err(`${w}.points must be a non-empty array`);
    g.points.forEach((p, j) => {
      if (!str(p)) err(`${w}.points[${j}] must be a non-empty string`);
      else if (p.length > 280) warn(`${w}.points[${j}] is ${p.length} chars (aim for ≤ 280)`);
    });
  });

  // ids
  const ids = new Set();
  const idRe = (k) => new RegExp(`^c${pad}${part}-${k}\\d{3}$`);
  const checkId = (where, id, k) => {
    if (!str(id) || !idRe(k).test(id)) err(`${where}: id "${id}" must look like c${pad}${part}-${k}001`);
    else if (ids.has(id)) err(`${where}: duplicate id ${id}`);
    else ids.add(id);
  };

  // flashcards
  const fronts = new Set();
  data.flashcards.forEach((f, i) => {
    const w = `flashcards[${i}] ${f.id || ""}`;
    checkId(w, f.id, "f");
    if (!str(f.topic)) err(`${w}: topic is required`);
    checkPage(w, f.page);
    if (!str(f.front)) err(`${w}: front is required`);
    if (!str(f.back)) err(`${w}: back is required`);
    if (str(f.front) && f.front.length > 110) warn(`${w}: front is ${f.front.length} chars (aim for ≤ 110)`);
    if (str(f.back) && f.back.length > 320) warn(`${w}: back is ${f.back.length} chars (aim for ≤ 320)`);
    const key = (f.front || "").toLowerCase().trim();
    if (fronts.has(key)) err(`${w}: duplicate front "${f.front}"`);
    fronts.add(key);
  });

  // questions
  const stems = new Set();
  let tf = 0, longestCorrect = 0, mcq = 0;
  const diff = { 1: 0, 2: 0, 3: 0 };
  data.questions.forEach((q, i) => {
    const w = `questions[${i}] ${q.id || ""}`;
    checkId(w, q.id, "q");
    if (!["mcq", "tf"].includes(q.type)) err(`${w}: type must be "mcq" or "tf"`);
    if (![1, 2, 3].includes(q.difficulty)) err(`${w}: difficulty must be 1, 2 or 3`);
    else diff[q.difficulty]++;
    if (!str(q.topic)) err(`${w}: topic is required`);
    checkPage(w, q.page);
    if (!str(q.q)) err(`${w}: q (the question text) is required`);
    else if (q.q.length > 520) warn(`${w}: question is ${q.q.length} chars (aim for ≤ 520)`);
    if (!str(q.explain)) err(`${w}: explain is required`);
    else if (q.explain.length > 520) warn(`${w}: explain is ${q.explain.length} chars (aim for ≤ 520)`);
    if (!Array.isArray(q.options)) return err(`${w}: options must be an array`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) err(`${w}: answer must be an index into options`);
    const stemKey = (q.q || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (stems.has(stemKey)) err(`${w}: duplicate question text`);
    stems.add(stemKey);

    if (q.type === "tf") {
      tf++;
      if (q.options.length !== 2 || q.options[0] !== "True" || q.options[1] !== "False") err(`${w}: tf options must be exactly ["True","False"]`);
      return;
    }
    mcq++;
    if (q.options.length !== 4) err(`${w}: mcq needs exactly 4 options`);
    const seen = new Set();
    q.options.forEach((o, j) => {
      if (!str(o)) return err(`${w}: options[${j}] must be a non-empty string`);
      if (o.length > 170) warn(`${w}: options[${j}] is ${o.length} chars (aim for ≤ 170)`);
      if (/\bof the (above|following)\b/i.test(o)) err(`${w}: options[${j}] uses "of the above" — options are shuffled, so they must stand alone`);
      if (/\b(option|answer|choice)s? [a-d]\b/i.test(o) || /\b[A-D] (and|or|&) [A-D]\b/.test(o)) err(`${w}: options[${j}] refers to another option by letter`);
      const k = o.toLowerCase().trim();
      if (seen.has(k)) err(`${w}: duplicate option "${o}"`);
      seen.add(k);
    });
    if (Number.isInteger(q.answer) && q.options[q.answer]) {
      const len = q.options.map((o) => (o || "").length);
      const c = len[q.answer];
      if (len.every((l, j) => j === q.answer || c > l * 1.25)) longestCorrect++;
    }
  });

  const n = data.questions.length;
  const stats = { questions: n, mcq, tf, flashcards: data.flashcards.length, guide: data.guide.length, tips: data.tips.length, difficulty: diff };
  if (n) {
    if (tf / n > 0.25) warn(`${Math.round((tf / n) * 100)}% true/false — keep it between 8% and 25%`);
    if (n >= 10 && tf / n < 0.08) warn(`only ${tf} true/false questions — aim for 8%–25%`);
    if (mcq && longestCorrect / mcq > 0.3) warn(`the correct option is clearly the longest in ${longestCorrect}/${mcq} MCQs — balance option lengths so length is not a giveaway`);
    if (n >= 10 && diff[3] / n < 0.18) warn(`only ${diff[3]} difficulty-3 questions — aim for at least ~20% (these feed the boss fights)`);
  }
  // coverage: content pages (from 3 up to the start of the self-test) with nothing pointing at them
  if (PAGES[ch] && !part) {
    const last = PAGES[ch] - 4;
    const missing = [];
    for (let p = 3; p <= last; p++) if (!pagesSeen.has(p)) missing.push(`${ch}•${p}`);
    if (missing.length) warn(`no question/flashcard/guide entry cites these pages: ${missing.join(", ")} — check they hold nothing testable`);
  }
  report(file, errors, warns, stats);
}

function report(file, errors, warns, stats) {
  const name = path.basename(file);
  if (errors.length) failed = true;
  console.log(`\n${errors.length ? "✗" : "✓"} ${name}${stats ? "  " + JSON.stringify(stats) : ""}`);
  errors.slice(0, 60).forEach((e) => console.log("  ERROR " + e));
  if (errors.length > 60) console.log(`  … and ${errors.length - 60} more errors`);
  warns.forEach((w) => console.log("  warn  " + w));
}

process.exit(failed ? 1 : 0);
