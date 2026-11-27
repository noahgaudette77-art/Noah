// Starts `vite preview` on a port and resolves once it answers HTTP.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

export const { chromium } = createRequire(import.meta.url)('playwright');

export async function preview(port) {
  const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore', detached: true });
  const url = `http://localhost:${port}/`;
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(url); if (r.ok) break; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  return { url, stop: () => { try { process.kill(-server.pid); } catch { server.kill(); } } };
}
