// Custom stroke icon set (24px grid, 1.75 stroke). No emoji anywhere in the app.
import type { SVGProps } from 'react';

const P: Record<string, JSX.Element> = {
  play: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" />,
  pause: <><rect x="6.5" y="5.5" width="3.8" height="13" rx="1" fill="currentColor" stroke="none" /><rect x="13.7" y="5.5" width="3.8" height="13" rx="1" fill="currentColor" stroke="none" /></>,
  replay: <><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4.5 4.5v4h4" /></>,
  check: <path d="M5 12.5l4.2 4.2L19 7" />,
  chevR: <path d="M9.5 5.5L16 12l-6.5 6.5" />,
  chevL: <path d="M14.5 5.5L8 12l6.5 6.5" />,
  chevD: <path d="M5.5 9.5L12 16l6.5-6.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  today: <><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></>,
  week: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M7.5 14h2M11 14h2M14.5 14h2" /></>,
  body: <><path d="M5 20l1.6-11.2A2 2 0 0 1 8.6 7h6.8a2 2 0 0 1 2 1.8L19 20z" /><path d="M9.5 7a2.5 2.5 0 0 1 5 0" /><path d="M12 11.5l1.8 2.2" /></>,
  history: <><path d="M4 6h16M4 12h10M4 18h13" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5" /></>,
  timer: <><circle cx="12" cy="13.5" r="7" /><path d="M12 13.5V10M9.5 3h5" /></>,
  download: <><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" /><path d="M5 19.5h14" /></>,
  upload: <><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5" /><path d="M5 19.5h14" /></>,
  dumbbell: <><path d="M3 9.5v5M6 7v10M18 7v10M21 9.5v5M6 12h12" /></>,
  walk: <><circle cx="13" cy="4.5" r="1.8" /><path d="M10 21l2.2-6.2L10 11.5l3.5-3 2 3.5 3 1.2" /><path d="M12.2 14.8l3 2.2 1 4" /><path d="M10 11.5l-3 2.5" /></>,
  bike: <><circle cx="6" cy="16" r="3.5" /><circle cx="18" cy="16" r="3.5" /><path d="M6 16l4-7h5l3 7M10 9l3 7h-3" /><path d="M14 6.5h2.5" /></>,
  heat: <><path d="M8 20c-2-3 2-5 0-8s1-5 1-5" /><path d="M13 20c-2-3 2-5 0-8s1-5 1-5" /><path d="M18 20c-2-3 2-5 0-8s1-5 1-5" /></>,
  moon: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5 7.5 7.5 0 1 0 19 14.5z" />,
  bolt: <path d="M13 3L5.5 13.5H12L11 21l7.5-10.5H12z" />,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.8v.2" /></>,
  alert: <><path d="M12 4l9 15.5H3z" /><path d="M12 10v4.5M12 17.2v.2" /></>,
  spine: <><path d="M12 3v18" /><path d="M9 5.5h6M8.5 9h7M8.5 12.5h7M9 16h6M10 19.5h4" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r=".6" fill="currentColor" /></>,
  sound: <><path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></>,
  mute: <><path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z" /><path d="M16 9.5l5 5M21 9.5l-5 5" /></>,
  skip: <><path d="M6 6l8 6-8 6z" /><path d="M17.5 6v12" /></>,
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  flag: <><path d="M5.5 21V4" /><path d="M5.5 4.5h11l-2 4 2 4h-11" /></>,
  install: <><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M12 7v7M9.2 11.5L12 14.3l2.8-2.8" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.5 7" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7L12.5 17" /></>,
  layers: <><path d="M12 3.5l8.5 4.5L12 12.5 3.5 8z" /><path d="M3.5 12L12 16.5l8.5-4.5M3.5 16L12 20.5l8.5-4.5" /></>,
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 22, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}
    >
      {P[name]}
    </svg>
  );
}
