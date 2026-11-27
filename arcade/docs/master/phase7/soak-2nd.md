# The soak (tools/scenarios/soak.js, 2026-11-25): 30 minutes of play, 3 rounds, the Mac tier

| moment | heap MB | textures | geometries | programs | page elements | draw calls | a frame updated, ms | a frame drawn here, ms |
|---|---|---|---|---|---|---|---|---|
| title | 11.27 → 34.33 → 35.09 | 34 → 140 → 84 | 36 → 37 → 37 | 34 → 281 → 270 | 56 → 56 → 56 | 39 → 56 → 45 | 0.73 → 0.41 → 0.63 | 5374 → 7638 → 5910 |
| after blaster | 22.83 → 30.72 → 32.47 | 97 → 120 → 120 | 85 → 85 → 85 | 132 → 283 → 274 | 156 → 156 → 156 | 85 → 85 → 85 | 0.33 → 0.18 → 0.18 | 5352 → 4859 → 4744 |
| after racer | 23.67 → 29.56 → 31.32 | 106 → 120 → 120 | 85 → 85 → 85 | 173 → 283 → 274 | 156 → 156 → 156 | 85 → 85 → 85 | 0.18 → 0.17 → 0.21 | 5323 → 4737 → 5015 |
| after boss | 27.85 → 29.98 → 31.27 | 113 → 120 → 120 | 85 → 85 → 85 | 212 → 283 → 274 | 156 → 156 → 156 | 85 → 85 → 85 | 0.33 → 0.22 → 0.22 | 4792 → 4904 → 4771 |
| after memory | 27.21 → 28.62 → 29.82 | 115 → 120 → 120 | 85 → 85 → 85 | 235 → 283 → 274 | 156 → 156 → 156 | 85 → 85 → 85 | 0.24 → 0.19 → 0.17 | 5233 → 4891 → 4779 |
| after exam | 28.27 → 28.69 → 29.9 | 118 → 120 → 120 | 85 → 85 → 85 | 270 → 283 → 274 | 156 → 156 → 156 | 85 → 85 → 85 | 0.34 → 0.25 → 0.17 | 5097 → 4800 → 4861 |
| round end | 28.14 → 28.56 → 29.76 | 120 → 120 → 120 | 85 → 85 → 85 | 270 → 283 → 274 | 156 → 156 → 156 | 85 → 85 → 85 | 0.27 → 0.28 → 0.16 | 5052 → 2772 → 2334 |

From round 2 to round 3, at the same moments, the most any grew: heap 1.76 MB, textures 0, geometries 0, programs -9, page elements 0, timers waiting 0. A frame (the median of the moments): 0.22 then 0.18 ms updated, 4859 then 4779 ms drawn here. 374 answers given.
