// Player rank. XP is derived from saved stats (never stored on its own), so it
// always agrees with your progress, whichever device it synced from.
const RANKS = [
  [0, "TRAINEE"],
  [300, "JUNIOR ADVISOR"],
  [900, "ADVISOR"],
  [2000, "SENIOR ADVISOR"],
  [3600, "WEALTH PLANNER"],
  [6000, "MASTER PLANNER"],
  [9000, "ARCADE LEGEND"],
];
function xpTotal() {
  const s = Store.state.stats;
  const stars = Object.values(Store.state.boss).reduce((a, b) => a + b, 0);
  return s.correct * 10 + s.cards * 3 + stars * 60 + (s.exams || 0) * 40 + ((s.bestExam || 0) >= 60 ? 400 : 0);
}
function rankOf(xp) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1][0]) i++;
  const floor = RANKS[i][0];
  const next = RANKS[i + 1] ? RANKS[i + 1][0] : null;
  return { i, level: i + 1, name: RANKS[i][1], floor, next, frac: next ? (xp - floor) / (next - floor) : 1 };
}
function rankChip() {
  const xp = xpTotal(), r = rankOf(xp);
  return `<span class="rank" title="${xp} XP${r.next ? " · " + (r.next - xp) + " to next rank" : ""}">
    <span class="rn">LV${r.level} ${esc(r.name)}</span>
    <span class="meter" style="--c:${COLORS.yellow}"><i style="width:${(r.frac * 100).toFixed(1)}%"></i></span></span>`;
}
