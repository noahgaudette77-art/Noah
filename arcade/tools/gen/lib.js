/**
 * Asset generation helpers for INR Arcade: Tripo, fal.ai, ElevenLabs, Blockade Labs.
 *
 * Keys are read from the environment (TRIPO_API_KEY, FAL_KEY, ELEVENLABS_API_KEY,
 * BLOCKADE_API_KEY) and are never printed, logged or written to disk. Every call
 * that costs something appends one line to tools/gen/ledger.jsonl (provider, what
 * was asked for, the settings, the cost, where the result went), which is what
 * ASSETS.md's spend log is built from.
 *
 * Raw candidates are written under OUT (the session's scratch directory by default:
 * they are large and only the picks are kept in the repo).
 */
const fs = require("fs");
const path = require("path");

const LEDGER = path.join(__dirname, "ledger.jsonl");
const OUT = process.env.GEN_OUT || path.join(__dirname, "out");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const need = (k) => { const v = process.env[k]; if (!v) throw new Error(k + " is not set"); return v; };
// Anything that looks like a key is masked before it can reach a log.
const scrub = (s) => { let t = String(s); for (const k of ["TRIPO_API_KEY", "FAL_KEY", "ELEVENLABS_API_KEY", "BLOCKADE_API_KEY"]) { const v = process.env[k]; if (v && v.length > 6) t = t.split(v).join("[" + k + "]"); } return t; };
const log = (...a) => console.log(scrub(a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" ")));

function ledger(entry) {
  fs.appendFileSync(LEDGER, scrub(JSON.stringify(Object.assign({ ts: new Date().toISOString() }, entry))) + "\n");
}
function readLedger() {
  if (!fs.existsSync(LEDGER)) return [];
  return fs.readFileSync(LEDGER, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

async function http(url, opt = {}, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, Object.assign({ signal: AbortSignal.timeout(opt.timeout || 120000) }, opt));
      if (r.status === 429 || r.status >= 500) { last = new Error("HTTP " + r.status + " " + scrub((await r.text()).slice(0, 300))); await sleep(2000 * (i + 1) * (i + 1)); continue; }
      return r;
    } catch (e) { last = e; await sleep(1500 * (i + 1) * (i + 1)); }
  }
  throw last;
}
async function download(url, file, tries = 5) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(600000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(file, buf);
      return buf.length;
    } catch (e) { last = e; await sleep(2000 * (i + 1)); }
  }
  throw new Error("download failed: " + scrub(last && last.message));
}

// ------------------------------------------------------------------ fal.ai
const FAL_PRICE = { // USD, from https://api.fal.ai/v1/models/pricing (checked 2026-11-15)
  "fal-ai/hyper3d/rodin/v2.5": 0.4, "fal-ai/hyper3d/rodin/v2.5/text-to-3d": 0.4, "fal-ai/hyper3d/rodin/v2.5/fast": 0.1,
  "bytedance/seedream/v5.5/text-to-image": 0.03, "bytedance/seedream/v5.5/edit": 0.03, "fal-ai/nano-banana-pro": 0.15, "fal-ai/nano-banana-pro/edit": 0.15,
};
async function falBalance() {
  const r = await http("https://rest.alpha.fal.ai/billing/user_balance", { headers: { Authorization: "Key " + need("FAL_KEY") } });
  return Number(await r.text());
}
// A local file on fal's storage, as a URL both providers can read (for a view that was made here, not generated).
async function falUpload(file) {
  const H = { Authorization: "Key " + need("FAL_KEY"), "Content-Type": "application/json" };
  const type = { ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".glb": "model/gltf-binary" }[path.extname(file).toLowerCase()] || "application/octet-stream";
  const init = await (await http("https://rest.alpha.fal.ai/storage/upload/initiate", { method: "POST", headers: H, body: JSON.stringify({ file_name: path.basename(file), content_type: type }) })).json();
  if (!init.upload_url || !init.file_url) throw new Error("fal upload failed: " + scrub(JSON.stringify(init).slice(0, 300)));
  const put = await http(init.upload_url, { method: "PUT", headers: { "Content-Type": type }, body: fs.readFileSync(file), timeout: 600000 });
  if (!put.ok) throw new Error("fal upload failed: HTTP " + put.status);
  return init.file_url;
}
async function falRun(endpoint, input, meta = {}) {
  const H = { Authorization: "Key " + need("FAL_KEY"), "Content-Type": "application/json" };
  const sub = await (await http("https://queue.fal.run/" + endpoint, { method: "POST", headers: H, body: JSON.stringify(input) })).json();
  if (!sub.request_id) throw new Error("fal submit failed: " + scrub(JSON.stringify(sub).slice(0, 400)));
  const t0 = Date.now();
  let st;
  for (;;) {
    await sleep(meta.poll || 4000);
    st = await (await http(sub.status_url, { headers: H })).json();
    if (st.status === "COMPLETED") break;
    if (st.status && !["IN_QUEUE", "IN_PROGRESS"].includes(st.status)) throw new Error("fal status " + st.status);
    if (Date.now() - t0 > (meta.timeout || 1800000)) throw new Error("fal timed out: " + endpoint);
  }
  const res = await http(sub.response_url, { headers: H });
  const out = await res.json();
  if (!res.ok || out.detail) {
    ledger({ provider: "fal", endpoint, name: meta.name, request_id: sub.request_id, input, cost: 0, unit: "USD", failed: scrub(JSON.stringify(out.detail || out).slice(0, 300)) });
    throw new Error("fal failed: " + scrub(JSON.stringify(out.detail || out).slice(0, 400)));
  }
  let cost = meta.cost;
  if (cost === undefined) {
    cost = FAL_PRICE[endpoint] || 0;
    if (/rodin\/v2\.5/.test(endpoint) && input.addons && (input.addons.high_pack || input.addons === "HighPack")) cost += 0.8;
    if (/text-to-image|nano-banana|edit/.test(endpoint)) cost *= input.num_images || 1;
  }
  ledger({ provider: "fal", endpoint, name: meta.name, request_id: sub.request_id, input, cost, unit: "USD", secs: Math.round((Date.now() - t0) / 1000) });
  return out;
}

// ------------------------------------------------------------------ Tripo (v3 API)
const TRIPO = "https://openapi.tripo3d.ai/v3";
async function tripoBalance() {
  const j = await (await http(TRIPO + "/account/balance", { headers: { Authorization: "Bearer " + need("TRIPO_API_KEY") } })).json();
  return j.data;
}
async function tripoUpload(file) {
  const fd = new FormData();
  fd.append("file", new Blob([fs.readFileSync(file)]), path.basename(file));
  const j = await (await http(TRIPO + "/files", { method: "POST", headers: { Authorization: "Bearer " + need("TRIPO_API_KEY") }, body: fd, timeout: 600000 })).json();
  if (j.code !== 0) throw new Error("tripo upload failed: " + scrub(JSON.stringify(j).slice(0, 300)));
  return j.data.file_token;
}
async function tripoQuery(id) {
  const j = await (await http(TRIPO + "/tasks/" + id, { headers: { Authorization: "Bearer " + need("TRIPO_API_KEY") } })).json();
  if (j.code !== 0) throw new Error("tripo query failed: " + scrub(JSON.stringify(j).slice(0, 300)));
  return j.data;
}
// POST one task and wait for it. `route` is e.g. "/generation/image-to-model".
async function tripoTask(route, body, meta = {}) {
  const H = { Authorization: "Bearer " + need("TRIPO_API_KEY"), "Content-Type": "application/json" };
  let j;
  // The account runs ten tasks of a kind at once (code 2000): wait for a slot instead of failing.
  for (let waited = 0; ; waited += 20) {
    const r = await fetch(TRIPO + route, { method: "POST", headers: H, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) }).catch((e) => ({ status: 599, json: async () => ({ code: -1, message: e.message }) }));
    j = await r.json().catch(() => ({ code: -1 }));
    if ((r.status === 429 || r.status >= 500) && waited < 3600) { await sleep(20000); continue; }
    break;
  }
  if (j.code !== 0 || !j.data || !j.data.task_id) {
    ledger({ provider: "tripo", route, name: meta.name, input: body, cost: 0, unit: "credits", failed: scrub(JSON.stringify(j).slice(0, 300)) });
    throw new Error("tripo create failed (" + route + "): " + scrub(JSON.stringify(j).slice(0, 400)));
  }
  const id = j.data.task_id, t0 = Date.now();
  let t;
  for (;;) {
    await sleep(meta.poll || 5000);
    try { t = await tripoQuery(id); } catch (e) { if (Date.now() - t0 > 120000) log("  tripo poll error", e.message); continue; }
    if (t.status === "success") break;
    if (["failed", "cancelled", "banned", "expired"].includes(t.status)) {
      ledger({ provider: "tripo", route, name: meta.name, task_id: id, input: body, cost: 0, unit: "credits", failed: t.status + " " + (t.error_message || t.error_code || "") });
      throw new Error("tripo task " + t.status + ": " + (t.error_message || t.error_code || id));
    }
    if (Date.now() - t0 > (meta.timeout || 2400000)) throw new Error("tripo timed out: " + id);
  }
  ledger({ provider: "tripo", route, name: meta.name, task_id: id, input: body, cost: t.credits_consumed === undefined ? null : t.credits_consumed, unit: "credits", secs: Math.round((Date.now() - t0) / 1000), output: t.output });
  return Object.assign({ task_id: id, credits: t.credits_consumed }, t.output || {});
}

// ------------------------------------------------------------------ ElevenLabs
const EL = "https://api.elevenlabs.io";
async function elevenUsage() {
  const j = await (await http(EL + "/v1/user/subscription", { headers: { "xi-api-key": need("ELEVENLABS_API_KEY") } })).json();
  return { used: j.character_count, limit: j.character_limit, tier: j.tier };
}
async function elevenPost(route, body, file, meta = {}) {
  const r = await http(EL + route, { method: "POST", headers: { "xi-api-key": need("ELEVENLABS_API_KEY"), "Content-Type": "application/json" }, body: JSON.stringify(body), timeout: meta.timeout || 600000 }, 3);
  if (!r.ok) {
    const txt = scrub((await r.text()).slice(0, 400));
    ledger({ provider: "elevenlabs", route, name: meta.name, input: body, cost: 0, unit: "credits", failed: "HTTP " + r.status + " " + txt });
    throw new Error("elevenlabs " + route + " HTTP " + r.status + ": " + txt);
  }
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  const hdr = r.headers.get("character-cost");
  ledger({ provider: "elevenlabs", route, name: meta.name, input: body, cost: hdr === null ? null : Number(hdr), unit: "credits", file: path.relative(OUT, file), bytes: buf.length });
  return { file, bytes: buf.length, cost: hdr === null ? null : Number(hdr) };
}
const elevenSfx = (text, file, o = {}) => elevenPost("/v1/sound-generation?output_format=" + (o.format || "mp3_44100_192"), Object.assign({ text, model_id: o.model || "eleven_text_to_sound_v2", prompt_influence: o.influence === undefined ? 0.4 : o.influence }, o.duration ? { duration_seconds: o.duration } : {}, o.loop ? { loop: true } : {}), file, { name: o.name });
const elevenTts = (voice, text, file, o = {}) => elevenPost("/v1/text-to-speech/" + voice + "?output_format=" + (o.format || "mp3_44100_192"), Object.assign({ text, model_id: o.model || "eleven_v3" }, o.settings ? { voice_settings: o.settings } : {}, o.seed ? { seed: o.seed } : {}), file, { name: o.name });
const elevenMusic = (prompt, ms, file, o = {}) => elevenPost("/v1/music?output_format=" + (o.format || "mp3_44100_192"), Object.assign({ prompt, music_length_ms: ms, model_id: o.model || "music_v2_5", force_instrumental: true }, o.mode ? { generation_mode: o.mode } : {}), file, { name: o.name, timeout: 1200000 });

// ------------------------------------------------------------------ Blockade Labs
const BL = "https://backend.blockadelabs.com/api/v1";
async function skybox(body, file, meta = {}) {
  const H = { "x-api-key": need("BLOCKADE_API_KEY"), "Content-Type": "application/json" };
  const r = await http(BL + "/skybox", { method: "POST", headers: H, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok || !j.id) {
    ledger({ provider: "blockade", name: meta.name, input: body, cost: 0, unit: "credits", failed: "HTTP " + r.status + " " + scrub(JSON.stringify(j).slice(0, 300)) });
    throw new Error("blockade create failed: HTTP " + r.status + " " + scrub(JSON.stringify(j).slice(0, 300)));
  }
  const t0 = Date.now();
  let q;
  for (;;) {
    await sleep(5000);
    const s = await (await http(BL + "/imagine/requests/" + j.id, { headers: H })).json();
    q = s.request || s;
    if (q.status === "complete") break;
    if (["abort", "error"].includes(q.status)) {
      ledger({ provider: "blockade", name: meta.name, id: j.id, input: body, cost: 0, unit: "credits", failed: q.status + " " + (q.error_message || "") });
      throw new Error("blockade " + q.status + ": " + (q.error_message || j.id));
    }
    if (Date.now() - t0 > 900000) throw new Error("blockade timed out: " + j.id);
  }
  const bytes = await download(q.file_url, file);
  if (q.depth_map_url) await download(q.depth_map_url, file.replace(/\.\w+$/, ".depth.jpg")).catch(() => {});
  ledger({ provider: "blockade", name: meta.name, id: j.id, obfuscated_id: q.obfuscated_id, style: q.skybox_style_name, model: q.model, input: body, cost: q.credit_cost === undefined ? 1 : q.credit_cost, unit: "credits", file: path.relative(OUT, file), bytes, seed: q.seed, secs: Math.round((Date.now() - t0) / 1000) });
  return { id: j.id, file, bytes, seed: q.seed, request: q };
}

// Run jobs with a cap on how many are in flight; failures are returned, not thrown.
async function pool(jobs, n) {
  const out = new Array(jobs.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, jobs.length) }, async () => {
    for (;;) { const k = i++; if (k >= jobs.length) return; try { out[k] = { ok: true, value: await jobs[k]() }; } catch (e) { out[k] = { ok: false, error: scrub(e.message) }; log("  job " + k + " failed:", e.message); } }
  }));
  return out;
}

module.exports = { OUT, LEDGER, sleep, log, scrub, ledger, readLedger, http, download, pool, falRun, falUpload, falBalance, tripoTask, tripoQuery, tripoUpload, tripoBalance, elevenUsage, elevenSfx, elevenTts, elevenMusic, elevenPost, skybox };
