# The soak (tools/scenarios/soak.js, 2026-11-25): 30 minutes of play, 3 rounds, the Mac tier

| moment | heap MB | textures | geometries | programs | page elements | draw calls | a frame updated, ms | a frame drawn here, ms |
|---|---|---|---|---|---|---|---|---|
| title | 11.41 → 34.3 → 34.52 | 36 → 144 → 94 | 36 → 41 → 45 | 34 → 281 → 270 | 56 → 56 → 56 | 39 → 56 → 45 | 0.68 → 0.48 → 0.72 | 5779 → 7149 → 6420 |
| after blaster | 22.76 → 30.8 → 32.52 | 97 → 126 → 130 | 89 → 93 → 96 | 132 → 283 → 274 | 156 → 156 → 156 | 85 → 85 → 85 | 0.21 → 0.38 → 0.21 | 5214 → 4973 → 6157 |
| after racer | 23.61 → 29.76 → 31.29 | 106 → 126 → 130 | 89 → 93 → 96 | 173 → 283 → 274 | 156 → 156 → 156 | 85 → 85 → 85 | 0.25 → 0.3 → 0.31 | 5268 → 5715 → 5723 |
| after boss | 27.94 → 30.02 → 31.01 | 117 → 130 → 134 | 89 → 93 → 96 | 212 → 283 → 274 | 156 → 156 → 156 | 85 → 85 → 85 | 0.28 → 0.18 → 0.35 | 4747 → 5236 → 6016 |
| after memory | 27.3 → 28.66 → 29.63 | 119 → 130 → 134 | 89 → 93 → 96 | 235 → 283 → 274 | 156 → 156 → 156 | 85 → 85 → 85 | 0.24 → 0.28 → 0.33 | 4718 → 5331 → 5781 |
| after exam | 28.36 → 28.73 → 29.7 | 122 → 130 → 134 | 89 → 93 → 96 | 270 → 283 → 274 | 156 → 156 → 156 | 85 → 85 → 85 | 0.24 → 0.24 → 0.23 | 4797 → 5563 → 6033 |
| round end | 28.31 → 28.58 → 29.56 | 124 → 130 → 134 | 89 → 93 → 96 | 270 → 283 → 274 | 156 → 156 → 156 | 85 → 85 → 85 | 0.21 → 0.28 → 0.38 | 5063 → 2881 → 2436 |

From round 2 to round 3, at the same moments, the most any grew: heap 1.72 MB, textures 4, geometries 4, programs -9, page elements 0, timers waiting 0. A frame (the median of the moments): 0.28 then 0.33 ms updated, 5331 then 6016 ms drawn here. 374 answers given.
