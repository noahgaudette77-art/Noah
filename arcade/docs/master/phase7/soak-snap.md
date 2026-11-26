# The soak (tools/scenarios/soak.js, 2026-11-25): 12 minutes of play, 3 rounds, the Mac tier

| moment | heap MB | textures | geometries | programs | page elements | draw calls | a frame updated, ms | a frame drawn here, ms |
|---|---|---|---|---|---|---|---|---|
| title | 11.26 → 32.59 → 33.97 | 32 → 128 → 144 | 36 → 37 → 37 | 34 → 273 → 283 | 56 → 56 → 56 | 40 → 41 → 56 | 0.98 → 0.17 → 0.35 | 2157 → 1738 → 3206 |
| after blaster | 20.41 → 28.42 → 27.87 | 97 → 119 → 119 | 85 → 85 → 85 | 132 → 273 → 283 | 156 → 156 → 156 | 85 → 85 → 85 | 0.22 → 0.2 → 0.25 | 2580 → 1645 → 1717 |
| after racer | 21.36 → 27.06 → 26.43 | 105 → 119 → 119 | 85 → 85 → 85 | 173 → 273 → 283 | 156 → 156 → 156 | 85 → 85 → 85 | 0.28 → 0.23 → 0.21 | 1813 → 1598 → 1620 |
| after boss | 24.83 → 27.71 → 27.05 | 112 → 119 → 119 | 85 → 85 → 85 | 212 → 273 → 283 | 156 → 156 → 156 | 85 → 85 → 85 | 0.28 → 0.19 → 0.21 | 1779 → 1674 → 1670 |
| after memory | 25.71 → 27.93 → 27.21 | 114 → 119 → 119 | 85 → 85 → 85 | 235 → 273 → 283 | 156 → 156 → 156 | 85 → 85 → 85 | 0.23 → 0.19 → 0.22 | 1652 → 1849 → 1857 |
| after exam | 26.41 → 27.86 → 27.14 | 117 → 119 → 119 | 85 → 85 → 85 | 270 → 273 → 283 | 156 → 156 → 156 | 85 → 85 → 85 | 0.24 → 0.23 → 0.25 | 1610 → 1746 → 1586 |
| round end | 26.49 → 27.92 → 27.19 | 120 → 120 → 120 | 85 → 85 → 85 | 270 → 273 → 283 | 156 → 156 → 156 | 85 → 85 → 85 | 0.76 → 0.33 → 0.5 | 1781 → 2081 → 1295 |

From round 2 to round 3, at the same moments, the most any grew: heap 1.38 MB, textures 16, geometries 0, programs 10, page elements 0, timers waiting 0. A frame (the median of the moments): 0.2 then 0.25 ms updated, 1738 then 1670 ms drawn here. 133 answers given.
