# Clicks and cuts: index.html (tools/audio-check.js, 2026-11-25)

## Loops: every take twice round

| loop | take | length s | spike at the join | level across it (dB under its 5th percentile) | |
|---|---:|---:|---:|---:|---|
| engine_ship | 1 | 3.35 | 0.32 | -2.6 | ok |
| engine_ship | 2 | 3.35 | 0.25 | 0.0 | ok |
| engine_ship | 3 | 3.35 | 0.49 | 0.0 | ok |
| engine_car | 1 | 3.35 | 0.13 | -3.0 | ok |
| engine_car | 2 | 3.35 | 0.04 | -1.5 | ok |
| engine_car | 3 | 3.35 | 0.11 | -4.3 | ok |
| alarm | 1 | 2.24 | 0.50 | 0.0 | ok |
| alarm | 2 | 2.24 | 0.19 | -0.6 | ok |
| alarm | 3 | 2.24 | 0.38 | 0.0 | ok |
| hub_hum | 1 | 8.00 | 0.17 | -2.4 | ok |
| hub_hum | 2 | 8.00 | 0.13 | -1.5 | ok |
| hub_hum | 3 | 8.00 | 0.22 | -1.3 | ok |
| boost_flame | 1 | 2.40 | 0.14 | -1.1 | ok |
| boost_flame | 2 | 2.40 | 0.13 | -0.3 | ok |
| boost_flame | 3 | 2.40 | 0.22 | 0.0 | ok |
| charge_hum | 1 | 2.45 | 0.21 | 0.0 | ok |
| charge_hum | 2 | 2.45 | 0.36 | 0.0 | ok |
| charge_hum | 3 | 2.45 | 0.51 | -2.7 | ok |

## Takes: every effect and announcer line, played once

369 takes. A spike at the start: 0; cut off while still sounding (the 20 ms before the last 30 ms within 12 dB of the loudest): 0. Let go over their last stretch (a release): 21.

| take | length s | start spike | end (dB under its loudest) | release s | |
|---|---:|---:|---:|---:|---|
| impact_reject 2 | 0.57 | 0.00 | -32.7 | 0.14 | ok |
| charge_up 1 | 0.59 | 0.00 | -40.6 | 0.15 | ok |
| charge_up 3 | 0.68 | 0.00 | -28.4 | 0.15 | ok |
| charge_up 4 | 0.68 | 0.00 | -20.8 | 0.15 | ok |
| charge_long 1 | 1.60 | 0.00 | -44.6 | 0.15 | ok |
| warning 2 | 0.60 | 0.01 | -30.7 | 0.15 | ok |
| lock_on 2 | 0.48 | 0.00 | -48.3 | 0.12 | ok |
| lock_on 3 | 0.48 | 0.00 | -27.6 | 0.12 | ok |
| heart_lost 3 | 0.80 | 0.07 | -18.3 | 0.15 | ok |
| sting_correct 3 | 0.80 | 0.00 | -25.0 | 0.15 | ok |
| sting_wrong 2 | 0.68 | 0.00 | -20.2 | 0.15 | ok |
| powerup 2 | 1.00 | 0.00 | -31.4 | 0.15 | ok |
| shell 1 | 0.36 | 0.00 | -19.5 | 0.09 | ok |
| shell 3 | 0.35 | 0.00 | -24.2 | 0.09 | ok |
| shell 4 | 0.44 | 0.00 | -18.0 | 0.11 | ok |
| beam_fire 1 | 1.60 | 0.01 | -18.4 | 0.15 | ok |
| roar_4 1 | 2.40 | 0.00 | -18.7 | 0.15 | ok |
| roar_4 2 | 2.35 | 0.00 | -33.0 | 0.15 | ok |
| roar_4 3 | 2.37 | 0.00 | -22.4 | 0.15 | ok |
| roar_10 1 | 2.40 | 0.00 | -19.4 | 0.15 | ok |
| roar_10 3 | 2.40 | 0.00 | -22.0 | 0.15 | ok |

## Music: every track's seam

| track | loop end s | spike at the seam | its bend against the music (dB) | |
|---|---:|---:|---:|---|
| title | 59.767802 | 0.26 | -48.9 | ok |
| title-b | 77.758868 | 0.31 | -46.8 | ok |
| blaster | 87.108596 | 0.44 | -17.3 | ok |
| blaster-b | 87.108596 | 0.09 | -29.5 | ok |
| racer | 83.768891 | 0.08 | -29.7 | ok |
| racer-b | 83.768891 | 0.09 | -25.6 | ok |
| boss | 89.580614 | 0.02 | -42.3 | ok |
| boss-b | 80.692541 | 0.06 | -31.8 | ok |
| finalboss | 86.383630 | 0.22 | -24.2 | ok |
| finalboss-b | 94.952020 | 0.43 | -37.1 | ok |
| hub | 80.709480 | 0.27 | -24.7 | ok |
| hub-b | 80.709480 | 0.11 | -34.5 | ok |
| exam | 89.120999 | 0.13 | -36.9 | ok |
| exam-b | 76.489435 | 0.07 | -44.7 | ok |
| memory | 84.699956 | 0.31 | -26.0 | ok |
| memory-b | 84.689457 | 0.06 | -44.5 | ok |
| calm | 82.973925 | 0.21 | -49.0 | ok |
| calm-b | 82.973925 | 0.05 | -42.6 | ok |

**Every join, start, end and seam passes.**
