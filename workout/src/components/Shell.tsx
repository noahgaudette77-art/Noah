import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { navigate } from '../lib/router';
import { useStore } from '../logic/store';
import { Wordmark } from './Brand';
import { Icon, type IconName } from './Icon';

const TABS: { path: string; label: string; icon: IconName }[] = [
  { path: '/', label: 'Today', icon: 'today' },
  { path: '/week', label: 'Week', icon: 'week' },
  { path: '/body', label: 'Body', icon: 'body' },
  { path: '/history', label: 'History', icon: 'history' },
];

export function tabFor(path: string) {
  if (path.startsWith('/day') || path.startsWith('/exercise')) return '/week';
  return TABS.find((t) => t.path === path)?.path ?? (path === '/settings' ? '/settings' : '/');
}

export function Shell({ path, children }: { path: string; children: ReactNode }) {
  const active = tabFor(path);
  const live = useStore((s) => s.active);
  const go = (p: string) => (e: React.MouseEvent) => { e.preventDefault(); navigate(p); };
  return (
    <div className="min-h-screen lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-xl focus:bg-volt focus:px-4 focus:py-2 focus:text-volt-ink">Skip to content</a>
      {/* desktop rail */}
      <nav aria-label="Main" className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/5 bg-ink-950 px-5 py-7 lg:flex">
        <a href="#/" onClick={go('/')} className="mb-10 px-2"><Wordmark /></a>
        <ul className="flex flex-col gap-1">
          {[...TABS, { path: '/settings', label: 'Settings', icon: 'settings' as IconName }].map((t) => (
            <li key={t.path}>
              <a
                href={`#${t.path}`} onClick={go(t.path)} aria-current={active === t.path ? 'page' : undefined}
                className={`relative flex h-12 items-center gap-3 rounded-xl px-3 font-semibold transition-colors ${active === t.path ? 'text-bone' : 'text-bone-3 hover:text-bone'}`}
              >
                {active === t.path && <motion.span layoutId="rail" className="absolute inset-0 rounded-xl bg-white/[0.06]" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                <Icon name={t.icon} className={`relative ${active === t.path ? 'text-volt' : ''}`} />
                <span className="relative">{t.label}</span>
              </a>
            </li>
          ))}
        </ul>
        {live && (
          <a href="#/workout" onClick={go('/workout')} className="mt-auto flex items-center gap-3 rounded-2xl bg-volt px-4 py-3 font-semibold text-volt-ink">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-volt-ink opacity-40" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-volt-ink" /></span>
            Resume session
          </a>
        )}
      </nav>
      <div className="min-w-0 flex-1">
        <main id="main" className="pb-[calc(96px+var(--safe-b))] lg:pb-16">{children}</main>
      </div>
      {/* phone tab bar */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-ink-950/90 pb-[var(--safe-b)] backdrop-blur-xl lg:hidden">
        {live && (
          <a href="#/workout" onClick={go('/workout')} className="mx-4 -mt-[30px] mb-2 flex h-11 items-center justify-center gap-2 rounded-full bg-volt text-sm font-semibold text-volt-ink shadow-[0_8px_30px_rgba(215,255,60,0.25)]">
            <Icon name="play" size={16} /> Resume session
          </a>
        )}
        <ul className="grid grid-cols-4">
          {TABS.map((t) => (
            <li key={t.path}>
              <a href={`#${t.path}`} onClick={go(t.path)} aria-current={active === t.path ? 'page' : undefined} className="relative flex h-[68px] flex-col items-center justify-center gap-1">
                {active === t.path && <motion.span layoutId="tab" className="absolute top-0 h-[3px] w-10 rounded-full bg-volt" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                <Icon name={t.icon} className={active === t.path ? 'text-volt' : 'text-bone-3'} />
                <span className={`text-[11px] font-semibold tracking-wide ${active === t.path ? 'text-bone' : 'text-bone-3'}`}>{t.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function PageHeader({ eyebrow, title, right, back }: { eyebrow?: ReactNode; title: ReactNode; right?: ReactNode; back?: string }) {
  return (
    <header className="mx-auto flex max-w-5xl items-end justify-between gap-4 px-4 pb-6 pt-[calc(20px+var(--safe-t))] sm:px-8 lg:pt-12">
      <div className="min-w-0">
        {back && (
          <a href={`#${back}`} onClick={(e) => { e.preventDefault(); history.length > 1 ? history.back() : navigate(back); }} className="-ml-2 mb-3 inline-flex h-11 items-center gap-1 rounded-xl pr-3 text-sm font-semibold text-bone-2 hover:text-bone">
            <Icon name="chevL" size={20} /> Back
          </a>
        )}
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="display text-[44px] sm:text-6xl">{title}</h1>
      </div>
      {right}
    </header>
  );
}
