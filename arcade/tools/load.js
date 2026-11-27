#!/usr/bin/env node
/**
 * Other programs on the machine, for a soak "with other apps open" (the Mac's richer tier, 2026-11-25: the owner's
 * MacBook shares its 16 GB with Safari, other apps and the system). Here they are stand-ins, never the apps
 * themselves:
 *   memory   MEM_GB gigabytes held and touched every few seconds (another app's working set: it stays resident)
 *   cpu      CPU busy loops, each busy BUSY of every 100 ms (another app working)
 *   browser  a second browser drawing a WebGL scene of its own without pause (another tab or app on the GPU's share)
 * It runs until stopped (SIGTERM or SIGINT) or for SECONDS, and prints a line a minute: what it holds, how busy.
 *
 *   MEM_GB=4 CPU=1 BUSY=60 node arcade/tools/load.js
 */
const { Worker } = require("worker_threads");
const MEM_GB = +(process.env.MEM_GB || 4), CPU = +(process.env.CPU || 1), BUSY = +(process.env.BUSY || 60), SECONDS = +(process.env.SECONDS || 0), BROWSER = process.env.BROWSER !== "0";
const held = [];
for (let i = 0; i < Math.round(MEM_GB * 16); i++) { const b = Buffer.alloc(64 * 1048576, i & 255); held.push(b); } // (64 MB at a time, every page written)
const touch = setInterval(() => { for (const b of held) for (let o = 0; o < b.length; o += 4096) b[o] ^= 1; }, 5000);
const workers = [];
for (let i = 0; i < CPU; i++) {
  workers.push(new Worker(`const { parentPort } = require("worker_threads"); let x = 0;
    setInterval(() => { const t = Date.now() + ${BUSY}; while (Date.now() < t) x = (x * 1103515245 + 12345) % 2147483647; }, 100);`, { eval: true }));
}
let browser = null;
(async () => {
  if (!BROWSER) return;
  const { chromium } = require("playwright");
  browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
  await page.setContent(`<canvas id=c width=800 height=500></canvas><script>
    const gl = document.getElementById("c").getContext("webgl2");
    const vs = "#version 300 es\\nin vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";
    const fs = "#version 300 es\\nprecision highp float; uniform float t; out vec4 o; void main(){ vec2 q = gl_FragCoord.xy / 300.0; float v = 0.0; for (int i = 0; i < 24; i++) v += sin(q.x * float(i) + t) * cos(q.y * float(i) - t); o = vec4(0.5 + 0.5 * sin(v), 0.4, 0.6, 1.0); }";
    const sh = (k, s) => { const x = gl.createShader(k); gl.shaderSource(x, s); gl.compileShader(x); return x; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const u = gl.getUniformLocation(pr, "t"); window.frames = 0;
    (function f(){ gl.uniform1f(u, performance.now() / 1000); gl.drawArrays(gl.TRIANGLES, 0, 3); window.frames++; requestAnimationFrame(f); })();
  </script>`);
  setInterval(async () => { try { const n = await page.evaluate(() => window.frames); console.log(new Date().toISOString().slice(11, 19), `load: ${held.length * 64} MB held, ${CPU} busy loop(s) at ${BUSY}%, the second browser at frame ${n}`); } catch (e) { /* closing */ } }, 60000);
})().catch((e) => console.error("second browser:", e.message));
const stop = async () => { clearInterval(touch); workers.forEach((w) => w.terminate()); if (browser) await browser.close().catch(() => {}); process.exit(0); };
process.on("SIGTERM", stop); process.on("SIGINT", stop);
if (SECONDS) setTimeout(stop, SECONDS * 1000);
console.log(`load: ${held.length * 64} MB held, ${CPU} busy loop(s) at ${BUSY}%, a second browser ${BROWSER ? "drawing" : "off"}`);
