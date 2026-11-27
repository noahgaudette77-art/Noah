// Captures the browser's install prompt so Settings can offer an Install button.
type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: BIP | null = null;
const subs = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as BIP; subs.forEach((f) => f()); });
  window.addEventListener('appinstalled', () => { deferred = null; subs.forEach((f) => f()); });
}
export const canInstall = () => !!deferred;
export const onInstallChange = (f: () => void) => { subs.add(f); return () => subs.delete(f); };
export async function install() { if (!deferred) return; await deferred.prompt(); deferred = null; subs.forEach((f) => f()); }
export const isStandalone = () => typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches;
