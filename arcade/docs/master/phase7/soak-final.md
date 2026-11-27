# The soak (tools/scenarios/soak.js, 2026-11-25): 30 minutes of play, 3 rounds, the Mac tier

| moment | heap MB | textures | geometries | programs | page elements | draw calls | a frame updated, ms | a frame drawn here, ms |
|---|---|---|---|---|---|---|---|---|
| title | 11.44 → 34.15 → 33.61 | 36 → 140 → 84 | 36 → 37 → 37 | 34 → 281 → 270 | 56 → 56 → 56 | 40 → 56 → 45 | 0.78 → 0.51 → 0.88 | 5947 → 8005 → 6427 |
| after blaster | 22.81 → 29.78 → 32.15 | 97 → 120 → 120 | 85 → 85 → 85 | 133 → 283 → 274 | 156 → 156 → 156 | 85 → 85 → 85 | 0.35 → 0.23 → 0.31 | 5590 → 5440 → 5470 |
| after racer | 23.86 → 28.58 → 30.92 | 106 → 120 → 120 | 85 → 85 → 85 | 174 → 283 → 274 | 156 → 156 → 156 | 85 → 85 → 85 | 0.26 → 0.35 → 0.2 | 5427 → 4946 → 5019 |
| after boss | 27.87 → 28.61 → 30.54 | 113 → 120 → 120 | 85 → 85 → 85 | 213 → 283 → 274 | 156 → 156 → 156 | 85 → 85 → 85 | 0.19 → 0.26 → 0.29 | 5095 → 4922 → 5248 |
| after memory | 27.19 → 27.28 → 29.23 | 115 → 120 → 120 | 85 → 85 → 85 | 236 → 283 → 274 | 156 → 156 → 156 | 85 → 85 → 85 | 0.28 → 0.3 → 0.39 | 4815 → 5239 → 4830 |
| after exam | 27.86 → 27.29 → 29.24 | 118 → 120 → 120 | 85 → 85 → 85 | 271 → 283 → 274 | 156 → 156 → 156 | 85 → 85 → 85 | 0.17 → 0.28 → 0.2 | 5223 → 5015 → 4951 |
| round end | 27.81 → 27.18 → 29.12 | 120 → 120 → 120 | 85 → 85 → 85 | 271 → 283 → 274 | 156 → 156 → 156 | 85 → 85 → 85 | 0.31 → 0.25 → 0.17 | 5523 → 2926 → 2089 |

From round 2 to round 3, at the same moments, the most any grew: heap 2.37 MB, textures 0, geometries 0, programs -9, page elements 0, timers waiting 0. A frame (the median of the moments): 0.28 then 0.29 ms updated, 5015 then 5019 ms drawn here. 374 answers given.
