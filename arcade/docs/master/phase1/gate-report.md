# Harness run phase1

Commit `96cc40f`, 2026-11-23T19:26:41.028Z, chromium. **No fault**; 37 changes to look at.

## Logic

- content and scripts since `ee413e3`: untouched
- disk: ok (29 s): no console errors IDENTICAL to baseline arcade/backup/index.before-visual-upgrade.html (reading "THE EXAMINATOR" as "THE PROCTOR", "PERIL PR
- served: ok (74 s): no console errors IDENTICAL to baseline arcade/backup/index.before-visual-upgrade.html (reading "THE EXAMINATOR" as "THE PROCTOR", "PERIL PR
- sequence: ok (157 s): memory: playing ALL 13 STEPS OK, no errors

## Costs, phone (chromium; frame ms are this machine's software drawing: compare only)

| screen | tier | size | draws | triangles | lights | Mpx | passes | textures MB | targets MB | script ms | frame ms | baseline draws / tris / MB / script ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| title@0.35 | PHONE | 880x1912 | 33 | 146093 | 4 | 6.16 | 9 | 284 | 38.5 | 2.13 | 1466.7 | 33 / 146093 / 322.5 / 2 |
| title@1 | PHONE | 880x1912 | 35 | 184698 | 4 | 6.16 | 9 | 284 | 38.5 | 3.55 | 1766.3 | 35 / 184698 / 322.5 / 1.7 |
| hub | PHONE | 880x1912 | 44 | 100054 | 4 | 6.16 | 9 | 183.2 | 40.8 | 2.87 | 1153.4 | 44 / 100054 / 224 / 2.47 |
| blaster | PHONE | 880x1912 | 49 | 154022 | 5 | 6.16 | 9 | 306.5 | 56.5 | 7.02 | 868.4 | 49 / 154022 / 363 / 4.05 |
| racer | PHONE | 880x1912 | 60 | 112444 | 5 | 6.16 | 9 | 245.3 | 52 | 5.62 | 1950 | 58 / 99742 / 297.3 / 2.55 |
| boss | PHONE | 880x1912 | 58 | 92541 | 5 | 6.16 | 9 | 209.1 | 40.8 | 3.55 | 1267.4 | 57 / 91124 / 249.9 / 3.75 |
| memory | PHONE | 880x1912 | 53 | 97720 | 4 | 6.16 | 9 | 73.5 | 40.8 | 2.13 | 1097.5 | 53 / 97720 / 114.3 / 4.4 |
| exam | PHONE | 880x1912 | 78 | 35198 | 5 | 6.16 | 9 | 103.8 | 43 | 3.35 | 1854.1 | 83 / 36632 / 146.8 / 3.4 |
| guide | PHONE | 880x1912 | 49 | 31718 | 3 | 6.16 | 9 | 64.6 | 38.5 | 2.26 | 827.2 | 49 / 31718 / 103.1 / 3.42 |

## Costs, mac (chromium; frame ms are this machine's software drawing: compare only)

| screen | tier | size | draws | triangles | lights | Mpx | passes | textures MB | targets MB | script ms | frame ms | baseline draws / tris / MB / script ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| title@0.35 | MAC | 2940x1660 | 63 | 292968 | 4 | 37.57 | 22 | 431.8 | 223.4 | 2.4 | 5657 | 63 / 292968 / 655.2 / 2 |
| title@1 | MAC | 2940x1660 | 48 | 184698 | 4 | 37.57 | 22 | 431.8 | 223.4 | 1.9 | 6834 | 48 / 184698 / 655.2 / 2.5 |
| hub | MAC | 2940x1660 | 87 | 312986 | 4 | 39.32 | 23 | 339.9 | 232.4 | 3.3 | 4554.1 | 87 / 312986 / 572.3 / 8.5 |
| blaster | MAC | 2940x1660 | 66 | 159838 | 5 | 37.57 | 22 | 545.8 | 241.4 | 2.8 | 2419.8 | 66 / 159838 / 787.2 / 3.2 |
| racer | MAC | 2940x1660 | 91 | 184280 | 5 | 39.63 | 24 | 532.3 | 243.6 | 3 | 3914.4 | 91 / 184328 / 775.9 / 3.5 |
| boss | MAC | 2940x1660 | 61 | 50184 | 5 | 39.32 | 23 | 461.8 | 232.4 | 7 | 3089 | 61 / 50184 / 694.2 / 4.2 |
| memory | MAC | 2940x1660 | 90 | 183104 | 4 | 39.32 | 23 | 262.2 | 232.4 | 3.9 | 3671.1 | 90 / 183104 / 494.6 / 4.4 |
| exam | MAC | 2940x1660 | 88 | 32123 | 5 | 37.57 | 22 | 279 | 227.9 | 6.1 | 4307 | 88 / 32123 / 506.9 / 2.9 |
| guide | MAC | 2940x1660 | 63 | 31718 | 3 | 37.87 | 23 | 242.2 | 223.4 | 2.1 | 3273.6 | 63 / 31718 / 465.6 / 1.8 |

## Stills, phone

| still | RMSE against the baseline | text overlaps (new) |
|---|---|---|
| 01-title-glide-early | 0.0237 | 0 |
| 02-title-glide-middle | 0.0213 | 0 |
| 03-title-end | 0.0677 | 0 |
| 04-title-cell-closeup | 0.0816 | 0 |
| 04b-cell-defeated | 0.0825 | 0 |
| 04c-cell-alarm | 0.0869 | 0 |
| 04d-cell-proctor | 0.0387 | 0 |
| 05-hub | 0.0253 | 0 |
| 06-chapter-select | 0.0031 | 0 |
| 07-blaster | 0.2223 | 0 |
| 08-blaster-explanation | 0.1622 | 0 |
| 09-racer | 0.2515 | 0 |
| 10-boss | 0.2013 | 0 |
| 11-memory-front | 0.0916 | 0 |
| 12-memory-back | 0.1006 | 0 |
| 13-exam | 0.2535 | 0 |
| 14-guide | 0.0254 | 0 |
| 15-guide-chapter | 0.0045 | 0 |
| 16-results | 0.0024 | 0 |
| 17-stats | 0.0027 | 0 |
| 18-setup | 0.0014 | 0 |

## Stills, mac

| still | RMSE against the baseline | text overlaps (new) |
|---|---|---|
| 01-title-glide-early | 0.03 | 0 |
| 02-title-glide-middle | 0.0456 | 0 |
| 03-title-end | 0.058 | 0 |
| 04-title-cell-closeup | 0.0535 | 0 |
| 04b-cell-defeated | 0.0406 | 0 |
| 04c-cell-alarm | 0.0493 | 0 |
| 04d-cell-proctor | 0.0309 | 0 |
| 05-hub | 0.0354 | 0 |
| 06-chapter-select | 0.0034 | 0 |
| 07-blaster | 0.1131 | 0 |
| 08-blaster-explanation | 0.155 | 0 |
| 09-racer | 0.2168 | 0 |
| 10-boss | 0.1684 | 0 |
| 11-memory-front | 0.0655 | 0 |
| 12-memory-back | 0.0857 | 0 |
| 13-exam | 0.2122 | 0 |
| 14-guide | 0.0166 | 0 |
| 15-guide-chapter | 0.0043 | 0 |
| 16-results | 0.0026 | 0 |
| 17-stats | 0.0027 | 0 |
| 18-setup | 0.0021 | 0 |

## To look at

- phone 01-title-glide-early: the picture changed (RMSE 0.0237)
- phone 02-title-glide-middle: the picture changed (RMSE 0.0213)
- phone 03-title-end: the picture changed (RMSE 0.0677)
- phone 04-title-cell-closeup: the picture changed (RMSE 0.0816)
- phone 04b-cell-defeated: the picture changed (RMSE 0.0825)
- phone 04c-cell-alarm: the picture changed (RMSE 0.0869)
- phone 04d-cell-proctor: the picture changed (RMSE 0.0387)
- phone 05-hub: the picture changed (RMSE 0.0253)
- phone 07-blaster: the picture changed (RMSE 0.2223)
- phone 08-blaster-explanation: the picture changed (RMSE 0.1622)
- phone 09-racer: the picture changed (RMSE 0.2515)
- phone 10-boss: the picture changed (RMSE 0.2013)
- phone 11-memory-front: the picture changed (RMSE 0.0916)
- phone 12-memory-back: the picture changed (RMSE 0.1006)
- phone 13-exam: the picture changed (RMSE 0.2535)
- phone 14-guide: the picture changed (RMSE 0.0254)
- mac 01-title-glide-early: the picture changed (RMSE 0.03)
- mac 02-title-glide-middle: the picture changed (RMSE 0.0456)
- mac 03-title-end: the picture changed (RMSE 0.058)
- mac 04-title-cell-closeup: the picture changed (RMSE 0.0535)
- mac 04b-cell-defeated: the picture changed (RMSE 0.0406)
- mac 04c-cell-alarm: the picture changed (RMSE 0.0493)
- mac 04d-cell-proctor: the picture changed (RMSE 0.0309)
- mac 05-hub: the picture changed (RMSE 0.0354)
- mac 07-blaster: the picture changed (RMSE 0.1131)
- mac 08-blaster-explanation: the picture changed (RMSE 0.155)
- mac 09-racer: the picture changed (RMSE 0.2168)
- mac 10-boss: the picture changed (RMSE 0.1684)
- mac 11-memory-front: the picture changed (RMSE 0.0655)
- mac 12-memory-back: the picture changed (RMSE 0.0857)
- mac 13-exam: the picture changed (RMSE 0.2122)
- phone title@1: script ms 1.7 → 3.55 (+109%)
- phone blaster: script ms 4.05 → 7.02 (+73%)
- phone racer: triangles 99742 → 112444 (+13%)
- phone racer: script ms 2.55 → 5.62 (+120%)
- mac boss: script ms 4.2 → 7 (+67%)
- mac exam: script ms 2.9 → 6.1 (+110%)
