# Harness run baseline

Commit `89cfb56`, 2026-11-23T16:47:31.804Z, chromium. **No fault**; 0 changes to look at.

## Logic

- content and scripts since `ee413e3`: untouched
- disk: ok (36 s): no console errors IDENTICAL to baseline arcade/backup/index.before-visual-upgrade.html (reading "THE EXAMINATOR" as "THE PROCTOR", "PERIL PR
- served: ok (80 s): no console errors IDENTICAL to baseline arcade/backup/index.before-visual-upgrade.html (reading "THE EXAMINATOR" as "THE PROCTOR", "PERIL PR
- sequence: ok (186 s): memory: playing ALL 13 STEPS OK, no errors

## Costs, phone (chromium; frame ms are this machine's software drawing: compare only)

| screen | tier | size | draws | triangles | lights | Mpx | passes | textures MB | targets MB | script ms | frame ms | baseline draws / tris / MB / script ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| title@0.35 | PHONE | 880x1912 | 33 | 146093 | 4 | 6.16 | 9 | 284 | 38.5 | 2 | 1423.8 | - |
| title@1 | PHONE | 880x1912 | 35 | 184698 | 4 | 6.16 | 9 | 284 | 38.5 | 1.7 | 1751.1 | - |
| hub | PHONE | 880x1912 | 44 | 100054 | 4 | 6.16 | 9 | 183.2 | 40.8 | 2.47 | 1124.7 | - |
| blaster | PHONE | 880x1912 | 49 | 154022 | 5 | 6.16 | 9 | 306.5 | 56.5 | 4.05 | 883.6 | - |
| racer | PHONE | 880x1912 | 58 | 99742 | 5 | 6.16 | 9 | 245.3 | 52 | 2.55 | 1817.9 | - |
| boss | PHONE | 880x1912 | 57 | 91124 | 5 | 6.16 | 9 | 209.1 | 40.8 | 3.75 | 1295.7 | - |
| memory | PHONE | 880x1912 | 53 | 97720 | 4 | 6.16 | 9 | 73.5 | 40.8 | 4.4 | 1050.6 | - |
| exam | PHONE | 880x1912 | 83 | 36632 | 5 | 6.16 | 9 | 103.8 | 43 | 3.4 | 1924.6 | - |
| guide | PHONE | 880x1912 | 49 | 31718 | 3 | 6.16 | 9 | 64.6 | 38.5 | 3.42 | 760.9 | - |

## Costs, mac (chromium; frame ms are this machine's software drawing: compare only)

| screen | tier | size | draws | triangles | lights | Mpx | passes | textures MB | targets MB | script ms | frame ms | baseline draws / tris / MB / script ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| title@0.35 | MAC | 2940x1660 | 63 | 292968 | 4 | 37.57 | 22 | 431.8 | 223.4 | 2 | 4921.1 | - |
| title@1 | MAC | 2940x1660 | 48 | 184698 | 4 | 37.57 | 22 | 431.8 | 223.4 | 2.5 | 6343.3 | - |
| hub | MAC | 2940x1660 | 87 | 312986 | 4 | 39.32 | 23 | 339.9 | 232.4 | 8.5 | 4455.6 | - |
| blaster | MAC | 2940x1660 | 66 | 159838 | 5 | 37.57 | 22 | 545.8 | 241.4 | 3.2 | 2587.4 | - |
| racer | MAC | 2940x1660 | 91 | 184328 | 5 | 39.63 | 24 | 532.3 | 243.6 | 3.5 | 3620.6 | - |
| boss | MAC | 2940x1660 | 61 | 50184 | 5 | 39.32 | 23 | 461.8 | 232.4 | 4.2 | 2884.7 | - |
| memory | MAC | 2940x1660 | 90 | 183104 | 4 | 39.32 | 23 | 262.2 | 232.4 | 4.4 | 3027.9 | - |
| exam | MAC | 2940x1660 | 88 | 32123 | 5 | 37.57 | 22 | 279 | 227.9 | 2.9 | 3843.5 | - |
| guide | MAC | 2940x1660 | 63 | 31718 | 3 | 37.87 | 23 | 242.2 | 223.4 | 1.8 | 2633.6 | - |

## Stills, phone

| still | RMSE against the baseline | text overlaps (new) |
|---|---|---|
| 01-title-glide-early | - | 0 |
| 02-title-glide-middle | - | 0 |
| 03-title-end | - | 2 (2 new: INR / INR; ARCADE / ARCADE) |
| 04-title-cell-closeup | - | 0 |
| 04b-cell-defeated | - | 0 |
| 04c-cell-alarm | - | 0 |
| 04d-cell-proctor | - | 0 |
| 05-hub | - | 0 |
| 06-chapter-select | - | 0 |
| 07-blaster | - | 0 |
| 08-blaster-explanation | - | 7 (7 new: Assuris, the Facility Associ / Consumer knowledge, fairness; Assuris, the Facility Associ / Consumer protection comes fr) |
| 09-racer | - | 0 |
| 10-boss | - | 0 |
| 11-memory-front | - | 0 |
| 12-memory-back | - | 0 |
| 13-exam | - | 0 |
| 14-guide | - | 0 |
| 15-guide-chapter | - | 0 |
| 16-results | - | 1 (1 new: READ STAGE 4 NOTES / CHANGE STAGE) |
| 17-stats | - | 0 |
| 18-setup | - | 0 |

## Stills, mac

| still | RMSE against the baseline | text overlaps (new) |
|---|---|---|
| 01-title-glide-early | - | 0 |
| 02-title-glide-middle | - | 0 |
| 03-title-end | - | 2 (2 new: INR / INR; ARCADE / ARCADE) |
| 04-title-cell-closeup | - | 0 |
| 04b-cell-defeated | - | 0 |
| 04c-cell-alarm | - | 0 |
| 04d-cell-proctor | - | 0 |
| 05-hub | - | 0 |
| 06-chapter-select | - | 0 |
| 07-blaster | - | 0 |
| 08-blaster-explanation | - | 3 (3 new: Salaries paid by the insurer / General agencies receive ove; B / General agencies receive ove) |
| 09-racer | - | 0 |
| 10-boss | - | 0 |
| 11-memory-front | - | 0 |
| 12-memory-back | - | 0 |
| 13-exam | - | 0 |
| 14-guide | - | 0 |
| 15-guide-chapter | - | 0 |
| 16-results | - | 0 |
| 17-stats | - | 0 |
| 18-setup | - | 0 |
