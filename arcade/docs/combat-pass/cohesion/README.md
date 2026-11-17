# Phase 5, the cohesion pass: captures and measurements

"Lighting, grade, bloom and sound levels as one game; full regression; load time and file size", and the last
generated models put to use. What was done, step by step, and every number behind it: `STATUS.md` in this folder.
All captures are of the page served over HTTP (every asset loaded), on a 390 x 844 screen at twice its pixels.

## The captures

| file | what it shows |
|---|---|
| `01-look-before.jpg` | every screen before the look was matched (B): Risk Blaster, Nest Egg Run and Boss Rush with a question up, the title, the hall; chapter select, results, Memory Bank, Final Exam, Strategy Guide |
| `02-look-after.jpg` | the same ten screens after |
| `03-look-changed.jpg` | the four screens whose grade changed, before and after, side by side (the hall, Memory Bank, Final Exam, Strategy Guide) |
| `04-traffic-day.jpg` | Nest Egg Run by day: the generated car, van and bus in the traffic, lit by the sky and mirrored in the road |
| `05-traffic-night.jpg` | the same at night: tail bars, nose lamps, sill lines, the copies' own paint and neon |
| `06-traffic-near-miss.jpg` | a near miss: a generated car passing the rig, frame by frame |
| `07-ships-open-space.jpg` | Risk Blaster as a run begins, before the demon has come: the freighter, the tug, a wing of fighters, the cruiser far off, the asteroid belt |
| `08-ships-open-space-strip.jpg` | the same, frame by frame |
| `09-ships-mid-fight.jpg` | mid-fight: the ships and rocks behind the demon, the answers and the fighter |
| `10-hub-after-D.jpg` | the hall after its set was cut to 3.55 MB: the row of cabinets, a topper close, the trophy stand |
| `11-calm-blaster.jpg`, `12-calm-racer.jpg`, `13-calm-boss.jpg`, `14-calm-hub.jpg` | the calm path (Setup > Reduced effects on, the browser asking for reduced motion): each game with a question up, and the hall |
| `15-tail-close.jpg`, `16-tail-closest.jpg` | F: the demon come close and at its closest over the fighter, its tail carried back and aside, clear of the canopy |
| `17-tunnel-way-out.jpg` | F: out of the tunnel, frame by frame: through its mouth the sky beyond and the road under it |

## The sound, measured (nobody can listen here)

EBU R128 loudness as the game plays each recording: through the cue's volume, the mix table (`Sound.MIX` in
`src/js/02-sound.js`) and its bus, before the master gain and the limiter; music on the calm bus (+2.3 dB at a full
streak). Made with `python3 arcade/tools/audio-levels.py --mix`.

| layer | before | after |
|---|---|---|
| music: each track's integrated loudness over its loop | -20.7 (Risk Blaster) to -25.8 LUFS (Memory Bank): 5.1 dB apart | -21.4 to -21.5 LUFS, all nine tracks |
| effects: each set's main events (75th percentile of its cues' loudest 400 ms) | core -14.7, combat -15.5, Nest Egg Run -12.8, Boss Rush's roars -12.7: +6.0 to +8.8 dB over the music | -14.7, -15.5, -14.5, -14.7: +6.0 to +7.0 dB over the music |
| announcer: its lines' loudest 400 ms | median -9.6; "Boss Rush!" -20.4 (its file cut off at 0.21 s) | median -9.5 (-12.6 to -7.3); "Boss Rush!" retaken, -8.8: about 12 dB over the music, 5 over the effects |
| the worst moment on any screen: its loudest blast, the loudest line and its music ducked under the line, all peaks in phase | +1.1 dBFS into the limiter, -1.5 dBFS out | +1.0 to +1.6 dBFS into the limiter, -1.5 to -1.6 dBFS out: nothing clips |

The gains: music Memory Bank x1.64, Risk Blaster x0.91, Final Exam x0.93, the rest within x0.97 to x1.06; effects
Nest Egg Run x0.82, Boss Rush's roars x0.80, core and combat x1; announcer x1. No file was re-encoded; the one bad file
(the cut-off "Boss Rush!") was retaken.

## Still weak, plainly

- Risk Blaster's passing ships and rocks are background by design: mid-fight they sit dark and soft (the lens holds the
  demon) in the gaps between the answers; they read best as a run begins (07, 08). The far rocks are still the
  built-in ones (96 of them would be too heavy as models).
- Risk Blaster's own set is the heaviest download (15.7 MB, 10.7 MB of it models and skies) and holds about 435 MB of
  textures on the graphics chip (three 4K skies, the fighter's and the demon's 2K maps): untouched here.
- The page itself is 6.3 MB (3.1 MB gzipped), half of it the built-in fallback models and pictures for a page opened
  from disk; the build script that inlines them is outside this pass.
- Nobody has listened: the mix is measured, not heard.
- Out of the tunnel the glare that clears over the new landscape is kept (it hides the change of scenery).

## How they are made

```bash
node arcade/tools/capture.js arcade/tools/scenarios/cohesion-look.js --out <dir> --dpr 2       # the look sheets
python3 arcade/tools/look-stats.py <dir>                                                         # the look, measured
node arcade/tools/capture.js arcade/tools/scenarios/cohesion-traffic.js --out <dir> --dpr 2    # traffic, ships, rocks
node arcade/tools/capture.js arcade/tools/scenarios/cohesion-calm.js --out <dir> --dpr 2 --reduced   # the calm path, flashes counted
python3 arcade/tools/audio-levels.py --mix                                                       # the mix
node arcade/tools/capture.js arcade/tools/scenarios/loads.js --out <dir> --dpr 1               # what a session downloads
node arcade/tools/capture.js arcade/tools/scenarios/gpu-mem.js --out <dir> --dpr 1             # what the graphics chip holds
```
