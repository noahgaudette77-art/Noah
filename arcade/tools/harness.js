#!/usr/bin/env node
/**
 * The master overhaul's regression harness (2026-11-23): is the build still sound? Run after every phase (see
 * MASTER_PLAN.md), from the repository's root or anywhere:
 *
 *   node arcade/tools/harness.js [--quick] [--only logic,stills,costs] [--screens hub,boss] [--name <run>] [--make-baseline] [--engine chromium|webkit]
 *
 * logic   the study content and the scripts untouched since the overhaul's base (git diff, committed or not); the
 *         rules' regression from disk and served (each must print IDENTICAL; the served one not with --quick); the
 *         screen sequence (ALL 13 STEPS OK)
 * stills  every screen (tools/scenarios/polish.js) on a phone's screen (440 x 956) and a Mac's window (1470 x 830),
 *         drawn at one page pixel to a pixel (the same frames every run: the capture tool's virtual clock), each
 *         compared with the baseline's (RMSE of the picture: over 0.02 is listed as changed, for a look, not a fault);
 *         any text overlapping other text (a new overlap is a fault)
 * costs   every screen on the PHONE and MAC tiers (tools/cost-report.js): against each tier's budget (draw calls,
 *         triangles, lights, what is held on the graphics chip: a fault when broken) and against the baseline (over 10%
 *         more draw calls, triangles or memory, or 30% more script time a frame, listed for a look)
 * --quick: the phone only, no served regression. --make-baseline: this run becomes docs/master/baseline/.
 * The report: docs/master/runs/<name>/report.md and report.json; the exit code is 1 when a fault was found.
 */
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");
const ARCADE = path.join(__dirname, ".."), ROOT = path.join(ARCADE, "..");
const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf("--" + k); return i < 0 ? d : args[i + 1]; };
const QUICK = args.includes("--quick"), MAKE_BASE = args.includes("--make-baseline"), ENGINE = flag("engine", "chromium");
const ONLY = (flag("only", "logic,stills,costs") || "").split(","), SCREENS = flag("screens", ""); // (--screens hub,boss: only those screens' stills and costs)
const BASE_COMMIT = "ee413e3"; // (the overhaul's start: the content and the scripts are compared with it)
const NAME = flag("name", new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")), OUT = path.join(ARCADE, "docs/master/runs", NAME), BASE_DIR = path.join(ARCADE, "docs/master/baseline");
const DEVICES = QUICK ? ["phone"] : ["phone", "mac"];
// each tier's budget, a screen at a time (the shared standards: a phone near 100 draw calls or fewer, memory in check)
const BUDGET = {
  phone: { draws: 100, tris: 350000, lights: 5, memMB: 450 },
  mac: { draws: 160, tris: 500000, lights: 6, memMB: 900 },
};
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a);
const run = (cmd, argv, o = {}) => {
  const t0 = Date.now(), r = spawnSync(cmd, argv, { cwd: o.cwd || ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: (o.min || 45) * 60000, env: Object.assign({}, process.env, o.env || {}) });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || ""), secs: Math.round((Date.now() - t0) / 1000) };
};
const report = { name: NAME, when: new Date().toISOString(), commit: run("git", ["rev-parse", "--short", "HEAD"]).out.trim(), quick: QUICK, engine: ENGINE, faults: [], looks: [], logic: {}, stills: {}, costs: {} };
const fault = (s) => { report.faults.push(s); log("  FAULT: " + s); };
const look = (s) => { report.looks.push(s); };

// ---- the study logic and content
if (ONLY.includes("logic")) {
  log("== logic");
  const committed = run("git", ["diff", "--name-only", BASE_COMMIT, "--", "arcade/content", "scripts"]).out.trim();
  const loose = run("git", ["status", "--porcelain", "--", "arcade/content", "scripts"]).out.trim();
  report.logic.contentDiff = (committed + "\n" + loose).trim();
  if (report.logic.contentDiff) fault("arcade/content or scripts changed since " + BASE_COMMIT + ": " + report.logic.contentDiff.split("\n").join(", "));
  else log("  content and scripts: untouched since " + BASE_COMMIT);
  const checks = [["disk", "node", ["scripts/arcade-regression.js", "--compare", "arcade/backup/regression-baseline.json"], /IDENTICAL/], ["sequence", "node", ["scripts/arcade-sequence.js"], /ALL 13 STEPS OK/]];
  if (!QUICK) checks.splice(1, 0, ["served", "node", ["arcade/tools/regress-http.js"], /IDENTICAL/]);
  for (const [k, cmd, argv, ok] of checks) {
    const r = run(cmd, argv, { min: 60 }), pass = r.code === 0 && ok.test(r.out) && !/console errors?:\s*[1-9]|ERRORS:|FAILED/.test(r.out.split("\n").slice(-6).join("\n"));
    report.logic[k] = { pass, secs: r.secs, tail: r.out.trim().split("\n").slice(-2).map((l) => l.slice(0, 160)) };
    log(`  ${k}: ${pass ? "ok" : "FAILED"} (${r.secs} s)`);
    if (!pass) fault(`${k}: ` + report.logic[k].tail.join(" / "));
  }
}

// ---- every screen's still, compared with the baseline's; text overlapping text
const rmse = (a, b) => { const r = spawnSync("compare", ["-metric", "RMSE", a, b, "null:"], { encoding: "utf8" }); const m = /\(([\d.e-]+)\)/.exec(r.stderr || ""); return m ? +(+m[1]).toFixed(4) : null; };
if (ONLY.includes("stills")) {
  log("== stills");
  const wk = ENGINE === "webkit" ? ["--engine", "webkit"] : [];
  for (const dev of DEVICES) {
    const dir = path.join(OUT, "stills", dev), size = dev === "phone" ? ["--phone", "--size", "440x956", "--insets", "62,34"] : ["--size", "1470x830"];
    fs.mkdirSync(dir, { recursive: true });
    const r = run("node", ["arcade/tools/capture.js", "arcade/tools/scenarios/polish.js", ...size, "--dpr", "1", ...wk, "--out", dir], { min: 90, env: SCREENS ? { PART: SCREENS } : {} });
    const errs = /ERRORS:([\s\S]*)$/.exec(r.out);
    if (r.code !== 0 || errs) fault(`stills (${dev}): ` + (errs ? errs[1].trim().split("\n").slice(0, 3).join(" | ") : r.out.trim().split("\n").slice(-2).join(" | ")));
    const ov = fs.existsSync(path.join(dir, "overlaps.json")) ? JSON.parse(fs.readFileSync(path.join(dir, "overlaps.json"), "utf8")) : {};
    const baseOv = fs.existsSync(path.join(BASE_DIR, "stills", dev, "overlaps.json")) ? JSON.parse(fs.readFileSync(path.join(BASE_DIR, "stills", dev, "overlaps.json"), "utf8")) : {};
    const rows = [];
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".jpg")).sort()) {
      const name = f.replace(/\.jpg$/, ""), base = path.join(BASE_DIR, "stills", dev, f), d = fs.existsSync(base) ? rmse(path.join(dir, f), base) : null;
      const now = ov[name] || [], before = baseOv[name] || [], fresh = now.filter((x) => !before.includes(x));
      rows.push({ name, rmse: d, overlaps: now.length, newOverlaps: fresh });
      if (d !== null && d > 0.02) look(`${dev} ${name}: the picture changed (RMSE ${d})`);
      if (fresh.length && fs.existsSync(path.join(BASE_DIR, "stills", dev, "overlaps.json"))) fault(`${dev} ${name}: text newly overlaps: ${fresh.slice(0, 3).join("; ")}`);
    }
    report.stills[dev] = { secs: r.secs, rows };
    log(`  ${dev}: ${rows.length} stills (${r.secs} s), ${rows.filter((x) => x.rmse > 0.02).length} changed, ${rows.reduce((s, x) => s + x.overlaps, 0)} text overlaps`);
  }
}

// ---- every screen's cost on each tier, against its budget and the baseline
if (ONLY.includes("costs")) {
  log("== costs");
  for (const dev of DEVICES) {
    const json = path.join(OUT, `costs-${dev}.json`), r = run("node", ["arcade/tools/cost-report.js", "--device", dev, "--engine", ENGINE, "--json", json, ...(SCREENS ? ["--only", SCREENS] : [])], { min: 120 });
    if (!fs.existsSync(json)) { fault(`costs (${dev}): no report: ` + r.out.trim().split("\n").slice(-2).join(" | ")); continue; }
    const rows = JSON.parse(fs.readFileSync(json, "utf8")), basePath = path.join(BASE_DIR, `costs-${dev}.json`), base = fs.existsSync(basePath) ? Object.fromEntries(JSON.parse(fs.readFileSync(basePath, "utf8"))) : {};
    const B = BUDGET[dev], out = [];
    for (const [name, m] of rows) {
      if (m.error) { fault(`${dev} ${name}: ${m.error}`); continue; }
      const mem = +(m.texMB + m.rtMB).toFixed(1), b = base[name], over = [];
      if (m.draws > B.draws) over.push(`draws ${m.draws} > ${B.draws}`);
      if (m.tris > B.tris) over.push(`triangles ${m.tris} > ${B.tris}`);
      if (m.lights > B.lights) over.push(`lights ${m.lights} > ${B.lights}`);
      if (mem > B.memMB) over.push(`memory ${mem} MB > ${B.memMB}`);
      if (over.length) fault(`${dev} ${name}: over budget: ${over.join(", ")}`);
      if (b) {
        const up = (k, v, w, tol) => { if (w > 0 && v > w * (1 + tol)) look(`${dev} ${name}: ${k} ${w} → ${v} (+${Math.round((v / w - 1) * 100)}%)`); };
        up("draws", m.draws, b.draws, 0.1); up("triangles", m.tris, b.tris, 0.1); up("memory MB", mem, +(b.texMB + b.rtMB).toFixed(1), 0.1); up("script ms", m.cpu, b.cpu, 0.3);
      }
      if (m.errors && m.errors.length) fault(`${dev} ${name}: page errors: ${m.errors.join(" | ").slice(0, 200)}`);
      out.push({ name, tier: m.tier, size: m.size, draws: m.draws, tris: m.tris, lights: m.lights, mpx: m.mpx, passes: m.passes, texMB: m.texMB, rtMB: m.rtMB, cpu: m.cpu, ms: m.ms, base: b ? { draws: b.draws, tris: b.tris, mem: +(b.texMB + b.rtMB).toFixed(1), cpu: b.cpu, ms: b.ms } : null });
    }
    report.costs[dev] = { secs: r.secs, rows: out };
    log(`  ${dev}: ${out.length} screens measured (${r.secs} s)`);
  }
}

// ---- the report
const md = [];
md.push(`# Harness run ${NAME}`, "", `Commit \`${report.commit}\`, ${report.when}, ${ENGINE}${QUICK ? ", quick" : ""}. **${report.faults.length ? "FAULTS: " + report.faults.length : "No fault"}**; ${report.looks.length} changes to look at.`, "");
if (report.faults.length) md.push("## Faults", "", ...report.faults.map((f) => "- " + f), "");
if (report.logic.contentDiff !== undefined) md.push("## Logic", "", `- content and scripts since \`${BASE_COMMIT}\`: ${report.logic.contentDiff ? "CHANGED" : "untouched"}`, ...["disk", "served", "sequence"].filter((k) => report.logic[k]).map((k) => `- ${k}: ${report.logic[k].pass ? "ok" : "FAILED"} (${report.logic[k].secs} s): ${report.logic[k].tail.join(" ").slice(0, 140)}`), "");
for (const dev of Object.keys(report.costs)) {
  md.push(`## Costs, ${dev} (${ENGINE}; frame ms are this machine's software drawing: compare only)`, "", "| screen | tier | size | draws | triangles | lights | Mpx | passes | textures MB | targets MB | script ms | frame ms | baseline draws / tris / MB / script ms |", "|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of report.costs[dev].rows) md.push(`| ${r.name} | ${r.tier} | ${r.size} | ${r.draws} | ${r.tris} | ${r.lights} | ${r.mpx} | ${r.passes} | ${r.texMB} | ${r.rtMB} | ${r.cpu} | ${r.ms} | ${r.base ? [r.base.draws, r.base.tris, r.base.mem, r.base.cpu].join(" / ") : "-"} |`);
  md.push("");
}
for (const dev of Object.keys(report.stills)) {
  md.push(`## Stills, ${dev}`, "", "| still | RMSE against the baseline | text overlaps (new) |", "|---|---|---|");
  for (const r of report.stills[dev].rows) md.push(`| ${r.name} | ${r.rmse === null ? "-" : r.rmse} | ${r.overlaps}${r.newOverlaps.length ? " (" + r.newOverlaps.length + " new: " + r.newOverlaps.slice(0, 2).join("; ") + ")" : ""} |`);
  md.push("");
}
if (report.looks.length) md.push("## To look at", "", ...report.looks.map((f) => "- " + f), "");
fs.writeFileSync(path.join(OUT, "report.md"), md.join("\n"));
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));
if (MAKE_BASE) {
  fs.mkdirSync(BASE_DIR, { recursive: true });
  for (const dev of DEVICES) {
    const from = path.join(OUT, "stills", dev), to = path.join(BASE_DIR, "stills", dev);
    if (fs.existsSync(from)) { fs.mkdirSync(to, { recursive: true }); for (const f of fs.readdirSync(from)) fs.copyFileSync(path.join(from, f), path.join(to, f)); }
    const c = path.join(OUT, `costs-${dev}.json`);
    if (fs.existsSync(c)) fs.copyFileSync(c, path.join(BASE_DIR, `costs-${dev}.json`));
  }
  fs.copyFileSync(path.join(OUT, "report.md"), path.join(BASE_DIR, "report.md"));
  log("== the baseline is now " + path.relative(ROOT, BASE_DIR));
}
log(`== ${report.faults.length ? "FAULTS: " + report.faults.length : "no fault"}; ${report.looks.length} to look at; report: ${path.relative(ROOT, path.join(OUT, "report.md"))}`);
process.exit(report.faults.length ? 1 : 0);
