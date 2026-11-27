import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { navigate } from '../lib/router';
import { useStore } from '../logic/store';
import { Wordmark } from './Brand';
import { Icon, type IconName } from './Icon';

const TABS: { path: string; label: string; icon: IconName }[] = [
  { path: '/', label: 'Today', icon: 'today' },
  { path: '/week', label: 'Week', icon: 'week' },
  { path: '/body', label: 'Progress', icon: 'progress' },
  { path: '/history', label: 'History', icon: 'history' },
];

export function tabFor(path: string) {
  if (path.startsWith('/day')) return '/week';
  if (path.startsWith('/exercise')) return '/';
  if (path.startsWith('/summary')) return '/history';
  return TABS.find((t) => t.path === path)?.path ?? (path === '/settings' ? '/settings' : '/');
}

export function Shell({ path, children }: { path: string; children: ReactNode }) {
  const active = tabFor(path);
  const live = useStore((s) => s.active);
  // Today already shows the running session as its main card, so the bar would duplicate it there.
  const showBar = !!live && active !== '/' && !path.startsWith('/workout');
  const go = (p: string) => (e: React.MouseEvent) => { e.preventDefault(); navigate(p); };
  return (
    <div className="relative min-h-screen lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-[6px] focus:bg-chalk focus:px-4 focus:py-2 focus:text-void">Skip to content</a>
      <nav aria-label="Main" className="sticky top-0 z-30 hidden h-screen w-[248px] shrink-0 flex-col px-5 py-8 lg:flex">
        <a href="#/" onClick={go('/')} className="mb-12 px-2"><Wordmark /></a>
        <ul className="flex flex-col gap-1">
          {[...TABS, { path: '/settings', label: 'Settings', icon: 'settings' as IconName }].map((t) => (
            <li key={t.path}>
              <a href={`#${t.path}`} onClick={go(t.path)} aria-current={active === t.path ? 'page' : undefined}
                className={`relative flex h-12 items-center gap-3 rounded-[6px] px-3.5 font-semibold transition-colors ${active === t.path ? 'text-chalk' : 'text-smoke hover:text-ash'}`}>
                {active === t.path && <motion.span layoutId="rail" className="absolute inset-0 rounded-[6px] lit-raised" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                <Icon name={t.icon} className="relative" weight={active === t.path ? 'fill' : 'bold'} />
                <span className="relative">{t.label}</span>
              </a>
            </li>
          ))}
        </ul>
        {live && (
          <a href="#/workout" onClick={go('/workout')} className="ember-btn mt-auto flex h-14 items-center gap-3 rounded-[6px] px-4 font-semibold">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-ink opacity-40" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ember-ink" /></span>
            Back to session
          </a>
        )}
      </nav>
      <div className="relative z-10 min-w-0 flex-1">
        <main id="main" className={`${showBar ? 'pb-[calc(164px+var(--safe-b))]' : 'pb-[calc(104px+var(--safe-b))]'} lg:pb-16`}>{children}</main>
      </div>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 pb-[var(--safe-b)] lg:hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void via-void/90 to-transparent" />
        {showBar && (
          <a href="#/workout" onClick={go('/workout')} className="lamp-btn relative mx-4 mb-2 flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-semibold">
            <Icon name="play" size={16} weight="fill" /> Back to session
          </a>
        )}
        <ul className="rubber relative mx-3 mb-2 grid grid-cols-4 rounded-[8px] p-1">
          {TABS.map((t) => (
            <li key={t.path}>
              <a href={`#${t.path}`} onClick={go(t.path)} aria-current={active === t.path ? 'page' : undefined} className="relative flex h-[60px] flex-col items-center justify-center gap-1 rounded-[6px]">
                {active === t.path && <motion.span layoutId="tab" className="lamp-pool absolute inset-0 rounded-[6px]" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                <Icon name={t.icon} className={`relative ${active === t.path ? 'text-amber' : 'text-smoke'}`} weight={active === t.path ? 'fill' : 'bold'} />
                <span className={`relative ${active === t.path ? 'stencil text-[14px] text-chalk' : 'text-[11px] font-semibold tracking-wide text-smoke'}`}>{t.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function PageHeader({ eyebrow, title, right, back, children }: { eyebrow?: ReactNode; title: ReactNode; right?: ReactNode; back?: string; children?: ReactNode }) {
  return (
    <header className="gutter mx-auto max-w-5xl pb-6 pt-[calc(20px+var(--safe-t))] lg:pt-14">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          {back && (
            <a href={`#${back}`} onClick={(e) => { e.preventDefault(); history.length > 1 ? history.back() : navigate(back); }} className="-ml-2 mb-4 inline-flex h-11 items-center gap-1.5 rounded-[6px] pr-3 text-sm font-semibold text-ash hover:text-chalk">
              <Icon name="chevL" size={18} /> Back
            </a>
          )}
          {eyebrow && <p className="label mb-3">{eyebrow}</p>}
          <h1 className="display text-[56px] sm:text-[80px]">{title}</h1>
        </div>
        {right}
      </div>
      {children}
    </header>
  );
}
