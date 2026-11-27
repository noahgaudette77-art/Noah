# Clicks and cuts: index.html (tools/audio-check.js, 2026-11-25)

## Loops: every take twice round

| loop | take | length s | spike at the join | level across it (dB under its 5th percentile) | |
|---|---:|---:|---:|---:|---|
| engine_ship | 1 | 4.00 | 27.51 | -1.0 | **FAIL** |
| engine_ship | 2 | 4.00 | 23.28 | -7.2 | **FAIL** |
| engine_ship | 3 | 4.00 | 25.79 | -1.2 | **FAIL** |
| engine_car | 1 | 4.00 | 1.78 | -2.5 | **FAIL** |
| engine_car | 2 | 4.00 | 0.41 | -2.0 | ok |
| engine_car | 3 | 4.00 | 3.32 | -0.5 | **FAIL** |
| alarm | 1 | 2.25 | 16.72 | 0.0 | **FAIL** |
| alarm | 2 | 2.25 | 0.44 | -0.3 | ok |
| alarm | 3 | 2.25 | 0.38 | 0.0 | ok |
| hub_hum | 1 | 8.00 | 0.17 | -2.4 | ok |
| hub_hum | 2 | 8.00 | 0.13 | -1.5 | ok |
| hub_hum | 3 | 8.00 | 0.22 | -1.3 | ok |
| boost_flame | 1 | 3.00 | 3.85 | -1.6 | **FAIL** |
| boost_flame | 2 | 3.00 | 30.98 | -0.9 | **FAIL** |
| boost_flame | 3 | 3.00 | 7.60 | -1.3 | **FAIL** |
| charge_hum | 1 | 3.00 | 59.14 | -2.6 | **FAIL** |
| charge_hum | 2 | 3.00 | 52.46 | -0.5 | **FAIL** |
| charge_hum | 3 | 3.00 | 10.78 | -5.2 | **FAIL** |

## Takes: every effect and announcer line, played once

369 takes. A spike at the start: 4; cut off while still sounding (the 20 ms before the last 30 ms within 12 dB of the loudest): 15. Let go over their last stretch (a release): 0.

| take | length s | start spike | end (dB under its loudest) | release s | |
|---|---:|---:|---:|---:|---|
| charge_up 3 | 0.68 | 0.04 | -9.3 | 0.00 | **FAIL** |
| charge_up 4 | 0.68 | 0.01 | -2.1 | 0.00 | **FAIL** |
| warning 2 | 0.60 | 0.07 | -11.7 | 0.00 | **FAIL** |
| lock_on 3 | 0.48 | 0.02 | -11.2 | 0.00 | **FAIL** |
| slowmo_in 1 | 1.08 | 1.30 | -47.7 | 0.00 | **FAIL** |
| slowmo_in 3 | 1.08 | 1.68 | -59.5 | 0.00 | **FAIL** |
| heart_lost 3 | 0.80 | 0.82 | 0.0 | 0.00 | **FAIL** |
| sting_correct 3 | 0.80 | 0.02 | -6.2 | 0.00 | **FAIL** |
| sting_wrong 2 | 0.68 | 0.04 | -1.3 | 0.00 | **FAIL** |
| shell 1 | 0.36 | 0.00 | -5.7 | 0.00 | **FAIL** |
| shell 3 | 0.35 | 0.00 | -10.9 | 0.00 | **FAIL** |
| shell 4 | 0.44 | 0.01 | -2.5 | 0.00 | **FAIL** |
| beam_fire 1 | 1.60 | 0.06 | -0.0 | 0.00 | **FAIL** |
| slam 1 | 1.28 | 1.17 | -71.5 | 0.00 | **FAIL** |
| slam 2 | 1.28 | 1.16 | -70.3 | 0.00 | **FAIL** |
| roar_4 1 | 2.40 | 0.04 | -0.4 | 0.00 | **FAIL** |
| roar_4 3 | 2.37 | 0.00 | -3.5 | 0.00 | **FAIL** |
| roar_10 1 | 2.40 | 0.02 | -0.4 | 0.00 | **FAIL** |
| roar_10 3 | 2.40 | 0.03 | -3.7 | 0.00 | **FAIL** |

## Music: every track's seam

| track | loop end s | spike at the seam | its bend against the music (dB) | |
|---|---:|---:|---:|---|
| title | 59.767779 | 2.59 | -28.9 | **FAIL** |
| title-b | 77.758879 | 1.21 | -35.1 | **FAIL** |
| blaster | 87.108579 | 0.59 | -14.8 | ok |
| blaster-b | 87.108579 | 0.08 | -31.0 | ok |
| racer | 83.768879 | 0.08 | -29.6 | ok |
| racer-b | 83.768879 | 0.37 | -13.6 | ok |
| boss | 89.580679 | 0.04 | -33.4 | ok |
| boss-b | 80.692579 | 0.07 | -30.8 | ok |
| finalboss | 86.383679 | 0.24 | -23.4 | ok |
| finalboss-b | 94.952079 | 0.92 | -30.5 | ok |
| hub | 80.709479 | 0.56 | -18.5 | ok |
| hub-b | 80.709479 | 0.16 | -31.0 | ok |
| exam | 89.120979 | 0.34 | -28.7 | ok |
| exam-b | 76.489479 | 1.10 | -20.1 | **FAIL** |
| memory | 84.699979 | 0.45 | -22.7 | ok |
| memory-b | 84.689479 | 0.06 | -44.5 | ok |
| calm | 82.973979 | 0.92 | -35.0 | ok |
| calm-b | 82.973979 | 0.12 | -29.8 | ok |

**34 failed.**
