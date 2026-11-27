// One icon set: Phosphor (bold weight). Names stay stable across the app.
import {
  ArrowCounterClockwise, ArrowUp, Barbell, Bicycle, CalendarBlank, CaretDown, CaretLeft, CaretRight, Check,
  ClockCounterClockwise, Crosshair, DeviceMobile, DownloadSimple, Export, Fire, FlagCheckered, GearSix, HandSwipeRight,
  Info, Lightning, Link, Minus, Moon, Path, Pause, PersonSimple, PersonSimpleWalk, Play, Plus, SkipForward,
  SpeakerHigh, SpeakerSlash, Stack, SunHorizon, ThermometerHot, Timer, Trophy, UploadSimple, Vibrate, Warning,
  Waveform, X, type IconWeight,
} from '@phosphor-icons/react';
import type { SVGProps } from 'react';

const MAP = {
  play: Play, pause: Pause, replay: ArrowCounterClockwise, check: Check, chevR: CaretRight, chevL: CaretLeft, chevD: CaretDown,
  plus: Plus, minus: Minus, close: X, today: SunHorizon, week: CalendarBlank, body: Path, progress: Path, history: ClockCounterClockwise,
  settings: GearSix, timer: Timer, download: DownloadSimple, upload: UploadSimple, dumbbell: Barbell, walk: PersonSimpleWalk,
  bike: Bicycle, heat: ThermometerHot, moon: Moon, bolt: Lightning, info: Info, alert: Warning, spine: PersonSimple,
  target: Crosshair, sound: SpeakerHigh, mute: SpeakerSlash, skip: SkipForward, up: ArrowUp, flag: FlagCheckered,
  install: DeviceMobile, link: Link, layers: Stack, flame: Fire, trophy: Trophy, share: Export, ticks: Waveform,
  vibrate: Vibrate, swipe: HandSwipeRight,
} as const;

export type IconName = keyof typeof MAP;

export function Icon({ name, size = 22, weight = 'bold', className, style, ...rest }:
  { name: IconName; size?: number; weight?: IconWeight; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, 'ref'>) {
  const C = MAP[name];
  // strokeWidth is accepted for call-site compatibility; Phosphor weights replace it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { strokeWidth: _sw, ...svg } = rest as typeof rest & { strokeWidth?: number };
  return <C size={size} weight={weight} className={className} style={style} aria-hidden="true" focusable="false" {...(svg as object)} />;
}
