import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Suspense, lazy, useEffect } from 'react';
import { Skeleton } from './components/ui';
import { Shell } from './components/Shell';
import { RoomCanvas } from './room/RoomCanvas';
import { ColdOpen } from './components/ColdOpen';
import { setRoom, zoneForPath } from './room/state';
import { match, useRoute } from './lib/router';
import DayScreen from './screens/DayScreen';
import ExerciseDetail from './screens/ExerciseDetail';
import History from './screens/History';
import Settings from './screens/Settings';
import Summary from './screens/Summary';
import Today from './screens/Today';
import Week from './screens/Week';
import Workout from './screens/Workout';

function screenFor(path: string) {
  if (path === '/') return <Today />;
  if (path === '/week') return <Week />;
  if (path === '/body') return <BodyPage />;
  if (path === '/history') return <History />;
  if (path === '/settings') return <Settings />;
  let m = match(path, '/exercise/:id');
  if (m) return <ExerciseDetail id={m.id} />;
  m = match(path, '/day/:date');
  if (m) return <DayScreen date={m.date} />;
  m = match(path, '/summary/:id');
  if (m) return <Summary id={m.id} />;
  return <Today />;
}

const Body = lazy(() => import('./screens/Body'));
const BodyPage = () => (
  <Suspense fallback={<div className="gutter mx-auto max-w-5xl space-y-5 pt-16"><Skeleton className="h-24 w-64" /><Skeleton className="h-80" /><Skeleton className="h-72" /></div>}><Body /></Suspense>
);

const FULLSCREEN = (p: string) => p === '/workout' || p.startsWith('/summary');

export default function App() {
  const path = useRoute();
  useEffect(() => { setRoom({ ...zoneForPath(path), override: null, still: false }); }, [path]);
  useEffect(() => {
    const titles: Record<string, string> = { '/': 'Today', '/week': 'Week', '/body': 'Progress', '/history': 'History', '/settings': 'Settings', '/workout': 'Session' };
    document.title = `${titles[path] ?? (path.startsWith('/summary') ? 'Session complete' : 'Tempo')} · Tempo`;
  }, [path]);

  const page = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={path}
        initial={{ opacity: 0, y: 12, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.32, ease: [0.2, 0.9, 0.25, 1] } }}
        exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.16 } }}
      >
        {path === '/workout' ? <Workout /> : screenFor(path)}
      </motion.div>
    </AnimatePresence>
  );
  return (
    <MotionConfig reducedMotion="user">
      <RoomCanvas />
      <div className="grain" aria-hidden="true" />
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <filter id="chalk-rough"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" /><feDisplacementMap in="SourceGraphic" scale="2.4" /></filter>
      </svg>
      <ColdOpen />
      {FULLSCREEN(path) ? <div className="relative z-10 min-h-screen">{page}</div> : <Shell path={path}>{page}</Shell>}
    </MotionConfig>
  );
}
