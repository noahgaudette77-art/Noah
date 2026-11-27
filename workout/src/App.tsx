import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useEffect } from 'react';
import { Shell } from './components/Shell';
import { match, useRoute } from './lib/router';
import { TOGGLE_EVENT } from './rig/DemoPlayer';
import Body from './screens/Body';
import DayScreen from './screens/DayScreen';
import ExerciseDetail from './screens/ExerciseDetail';
import History from './screens/History';
import Settings from './screens/Settings';
import Today from './screens/Today';
import Week from './screens/Week';
import Workout from './screens/Workout';

function screenFor(path: string) {
  if (path === '/') return <Today />;
  if (path === '/week') return <Week />;
  if (path === '/body') return <Body />;
  if (path === '/history') return <History />;
  if (path === '/settings') return <Settings />;
  let m = match(path, '/exercise/:id');
  if (m) return <ExerciseDetail id={m.id} />;
  m = match(path, '/day/:date');
  if (m) return <DayScreen date={m.date} />;
  return <Today />;
}

export default function App() {
  const path = useRoute();
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]')) return;
      if (e.key.toLowerCase() === 'k' && !e.metaKey && !e.ctrlKey && !e.altKey) window.dispatchEvent(new Event(TOGGLE_EVENT));
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  useEffect(() => {
    const titles: Record<string, string> = { '/': 'Today', '/week': 'Week', '/body': 'Body', '/history': 'History', '/settings': 'Settings', '/workout': 'Workout' };
    document.title = `${titles[path] ?? 'Tempo'} · Tempo`;
  }, [path]);

  const page = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={path}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] } }}
        exit={{ opacity: 0, y: -6, transition: { duration: 0.14 } }}
      >
        {path === '/workout' ? <Workout /> : screenFor(path)}
      </motion.div>
    </AnimatePresence>
  );
  return (
    <MotionConfig reducedMotion="user">
      {path === '/workout' ? page : <Shell path={path}>{page}</Shell>}
    </MotionConfig>
  );
}
