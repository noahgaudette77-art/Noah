import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/Shell';
import { Button, Card, Sheet, Toggle } from '../components/ui';
import { META } from '../data/program';
import { todayISO } from '../logic/dates';
import { type AppState, emptyState, mergeStates, parseState } from '../logic/storage';
import { getState, replaceState, setState, useStore } from '../logic/store';
import { canInstall, install, isStandalone, onInstallChange } from '../lib/install';

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const counts = { sessions: useStore((s) => s.sessions.length), body: useStore((s) => s.body.length) };
  const [pending, setPending] = useState<AppState | null>(null);
  const [error, setError] = useState('');
  const [reset, setReset] = useState(false);
  const [msg, setMsg] = useState('');
  const [installable, setInstallable] = useState(canInstall());
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { const off = onInstallChange(() => setInstallable(canInstall())); return () => { off(); }; }, []);

  const set = (k: keyof AppState['settings']) => (v: boolean) => setState((s) => ({ ...s, settings: { ...s.settings, [k]: v } }));
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tempo-backup-${todayISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setMsg('Backup downloaded.');
  };
  const onFile = async (f?: File) => {
    setError('');
    if (!f) return;
    try { setPending(parseState(JSON.parse(await f.text()))); } catch (e) { setError(e instanceof Error ? e.message : 'Could not read that file.'); }
    if (file.current) file.current.value = '';
  };
  return (
    <div>
      <PageHeader eyebrow="Tempo" title="Settings" back="/" />
      <div className="mx-auto max-w-3xl space-y-5 px-4 sm:px-8">
        <Card className="divide-y divide-white/5 px-5 py-2">
          <Toggle icon="sound" checked={settings.sound} onChange={set('sound')} label="Sounds" detail="Rest-over chime, set logged, new best" />
          <Toggle icon="ticks" checked={settings.ticks} onChange={set('ticks')} label="Tempo ticks" detail="Soft ticks that pace each rep and the 3-2-1" />
          <Toggle icon="vibrate" checked={settings.haptics} onChange={set('haptics')} label="Vibration" detail="Pulses on tempo changes and logged sets (Android)" />
        </Card>
        <Card className="p-6">
          <p className="label">Your data</p>
          <p className="mt-2 text-ash">Stored only on this device: {counts.sessions} sessions, {counts.body} body entries. Export a backup now and then.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Button icon="download" onClick={exportJson}>Export JSON</Button>
            <Button icon="upload" onClick={() => file.current?.click()}>Import JSON</Button>
            <input ref={file} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          {msg && <p className="mt-3 text-sm text-chalk" role="status">{msg}</p>}
          {error && <p className="mt-3 text-sm text-caution" role="alert">{error}</p>}
        </Card>
        <Card className="p-6">
          <p className="label">Install</p>
          <p className="mt-2 text-ash">{isStandalone() ? 'Installed. Works fully offline.' : 'Add Tempo to your home screen. It works offline in the gym.'}</p>
          {installable ? <Button variant="primary" icon="install" className="mt-4" onClick={install}>Install app</Button>
            : !isStandalone() && <p className="mt-2 text-sm text-smoke">iPhone: Share, then Add to Home Screen. Android: menu, then Install app.</p>}
        </Card>
        <Card className="p-5 text-sm text-ash">
          <p className="label mb-2">Program</p>
          <p>Starts {META.startDate} · {META.weeks} weeks · dumbbells to {META.maxDumbbell} lb in {META.increment} lb steps · incline walk {META.incline.gradePct}% at {META.incline.mph} mph · 3 s lowering on every lift, stop 1 to 2 reps short of failure.</p>
        </Card>
        <Button variant="danger" icon="alert" className="w-full" onClick={() => setReset(true)}>Erase all data</Button>
      </div>

      <Sheet open={!!pending} onClose={() => setPending(null)} title="Import backup">
        {pending && (
          <>
            <p className="text-ash">This file has {pending.sessions.length} sessions and {pending.body.length} body entries.</p>
            <div className="mt-5 grid gap-3">
              <Button variant="primary" onClick={() => { replaceState(mergeStates(getState(), pending)); setPending(null); setMsg('Backup merged.'); }}>Merge with my data</Button>
              <Button variant="secondary" onClick={() => { replaceState({ ...pending, settings: getState().settings }); setPending(null); setMsg('Data replaced from backup.'); }}>Replace my data</Button>
            </div>
          </>
        )}
      </Sheet>
      <Sheet open={reset} onClose={() => setReset(false)} title="Erase everything?">
        <p className="text-ash">Deletes every session, body entry and habit on this device. Export first if you want a copy.</p>
        <div className="mt-5 flex gap-3">
          <Button className="flex-1" onClick={() => setReset(false)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={() => { replaceState(emptyState()); setReset(false); setMsg('All data erased.'); }}><Icon name="close" size={18} />Erase</Button>
        </div>
      </Sheet>
    </div>
  );
}
