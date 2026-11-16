# Phase 4 (hub, title, menus, Memory Bank, Final Exam, Strategy Guide): running note

Branch: the worktree of `claude/quirky-ride-9frte0` at 5d42917. Order of work: A hub, B title, C icons and
portraits, D Final Exam, E Memory Bank, F Strategy Guide.

## Done
- Sets in `tools/manifest.js`: the hub loads its models (one cabinet, six toppers, trophy, medal, coin), one hall
  panorama (`hub-hall`, light and reflections only) and the two UI strips; its sound is a separate set
  (`hubsound`) that is never waited for. Memory Bank, Final Exam and Strategy Guide load their own props.
- `Assets`: `loadImage`/`ui(name)` for the UI strips (kind `ui:` in a set), `prefetch(set)` (bytes only).

## Next
- A: the six cabinets from `prop-cabinet` (screen, marquee, neon, topper), focus, trophy stand, sound.

## Asked of the lead
- A three-tier trophy stand for the hall (one model), 2026-11-16.
