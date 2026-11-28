import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/Shell';
import { Button, Card, Sheet, Toggle } from '../components/ui';
import { META } from '../data/program';
import { todayISO } from '../logic/dates';
import { type AppState, emptyState, mergeStates, parseState } from '../logic/storage';
import { getState, replaceState, setState, useStore } from '../logic/store';
import { canInstall, install, isStandalone, onInstallChange } from '../lib/install';
import { setVolume, unlockAudio, cue } from '../lib/audio';
import { mwLive, useQuota } from '../lib/mw';

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

  const set = (k: keyof AppState['settings']) => (v: boolean | number | string) => setState((s) => ({ ...s, settings: { ...s.settings, [k]: v } }));
  const quota = useQuota();
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
          <p className="label pb-1 pt-3">Look</p>
          <Toggle icon="eye" checked={settings.clean} onChange={set('clean')} label="Clean mode" detail="No grain, worn paper or texture. Same layout, plain surfaces, a darker backdrop." />
          <Toggle icon="film" checked={settings.rawVideo} onChange={set('rawVideo')} label="Raw demo footage" detail="Turn off the light vintage grade on exercise videos" />
          <div className="py-3">
            <p className="font-semibold">Battery saver</p>
            <p className="text-sm text-smoke">Stops the 3D plates and dumbbell from turning. Auto follows Low Power Mode.</p>
            <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Battery saver">
              {(['auto', 'on', 'off'] as const).map((v) => (
                <button key={v} type="button" role="radio" aria-checked={settings.battery === v} onClick={() => set('battery')(v)}
                  className={`h-12 rounded-[6px] font-semibold capitalize ${settings.battery === v ? 'bg-chalk text-void' : 'lit-raised text-ash'}`}>{v}</button>
              ))}
            </div>
          </div>
          <Toggle icon="download" checked={settings.dataSaver} onChange={set('dataSaver')} label="Data saver" detail="Smaller images on a slow connection" />
        </Card>
        <Card className="divide-y divide-white/5 px-5 py-2">
          <p className="label pb-1 pt-3">Sound</p>
          <Toggle icon="sound" checked={settings.audio} onChange={(v) => { unlockAudio(); set('audio')(v); if (v) setTimeout(() => cue('stamp'), 60); }} label="Sound" detail="Off by default. Stamps, plates, the coach and the room." />
          <label className={`block py-3 ${settings.audio ? '' : 'opacity-50'}`}>
            <span className="flex items-center justify-between font-semibold">Volume <span className="tnum text-ash">{Math.round(settings.volume * 100)}%</span></span>
            <input type="range" min={0} max={1} step={0.05} value={settings.volume} disabled={!settings.audio}
              onChange={(e) => { const v = Number(e.target.value); set('volume')(v); setVolume(v); }}
              className="mt-3 h-11 w-full accent-[var(--amber)]" aria-label="Volume" />
          </label>
          <Toggle icon="voice" checked={settings.voice} onChange={set('voice')} label="Coach voice" detail="Lower, press, last rep, rest, three-two-one" />
          <Toggle icon="ticks" checked={settings.ticks} onChange={set('ticks')} label="Stopwatch ticks" detail="A tick for each second of the lowering" />
          <Toggle icon="timer" checked={settings.flips} onChange={set('flips')} label="Flip clicks" detail="The split-flap rest clock clicks each second" />
          <Toggle icon="room" checked={settings.ambience} onChange={set('ambience')} label="Room tone" detail="The basement hum, very low" />
          <Toggle icon="vibrate" checked={settings.haptics} onChange={set('haptics')} label="Vibration" detail="Pulses on tempo changes and logged sets (Android; iPhone browsers have no vibration)" />
        </Card>
        <Card className="p-6">
          <p className="label">Exercise demos</p>
          {mwLive() ? (
            <>
              <p className="mt-2 text-ash">Calls used this month</p>
              <p className="display mt-1 text-[44px] leading-none">{quota ? quota.used : '–'}<span className="text-smoke"> / {quota?.limit ?? 1000}</span></p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-amber" style={{ width: `${Math.min(100, ((quota?.used ?? 0) / (quota?.limit ?? 1000)) * 100)}%` }} /></div>
              <p className="mt-3 text-sm text-smoke">At {quota?.cap ?? 900} the demos switch to form cards until the 1st, so the plan's 1,000 calls are never exceeded. A demo loads only when its exercise is on screen.</p>
            </>
          ) : <p className="mt-2 text-ash">The demo service is not switched on yet, so each exercise shows its form card. See workout/server/mw-worker/DEPLOY.md.</p>}
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
          <p className="label mb-2">Credits &amp; legal</p>
          <p>Exercise data and videos provided by MuscleWiki.com. Demo videos stream from <a className="underline underline-offset-4" href="https://musclewiki.com" target="_blank" rel="noreferrer">musclewiki.com</a> and are never stored by this app.</p>
          <p className="mt-2">Textures and lighting from Poly Haven (CC0). Fonts: Big Shoulders, Special Elite, Instrument Sans (SIL Open Font License). The illustrated athlete, the room, the props and the sounds are original, made for Tempo.</p>
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
