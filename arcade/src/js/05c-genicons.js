// Icons and portraits drawn from the 3D models (assets/ui: one strip of seven icons, one of twelve boss busts), for
// the page itself. Served, once a strip has loaded, it stands in for the pixel icon or the drawn bust wherever the
// page shows a coin, a star, a life, a shield, a streak, a medal, a trophy or a boss; from disk, or before it has
// arrived, the page draws exactly what it always drew. Each icon is an <svg> showing one cell of the strip, so every
// rule that sizes, shadows or animates an icon applies to it unchanged.
const GEN_ICONS = ["coin", "star", "heart", "shield", "bolt", "medal", "trophy"]; // (the order of assets/ui/icons.webp)
const GEN_BOSSES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "all"]; // (assets/ui/bosses.webp)
// the colours that mean "not earned" or "spent" where the page asks for an icon
const GEN_ICON_OFF = ["#7868cc", "#8d82c8", "#3d2c80"];
function genIconReady() { return Assets.on && !!Assets.ui("icons"); }
// One icon from the strip: kind is one of GEN_ICONS; off draws it dark (a star not earned, a trophy still to win).
// (An earned cup is gilt: the model's cup is chrome, which beside the gold coins read as a grey one. Phase 2, 2026-11-24)
function genIcon(kind, off = false, cls = "") {
  const img = Assets.ui("icons"), i = GEN_ICONS.indexOf(kind);
  if (!img || i < 0) return "";
  if (kind === "trophy" && !off) cls = cls ? cls + " cup" : "cup";
  return `<svg class="gico${off ? " off" : ""}${cls ? " " + cls : ""}" viewBox="${i * 160} 0 160 160" aria-hidden="true"><image href="${img.src}" width="1120" height="160"/></svg>`;
}
// The page's own icons that have a model: icon("star") and the rest come from the strip once it has loaded. An earned
// star is burnished gold (the strip's star is gold and chrome, which at a few pixels read as bronze).
icon.gen = (name, color) => {
  if (GEN_ICONS.indexOf(name) < 0 || !genIconReady()) return "";
  const off = GEN_ICON_OFF.indexOf(String(color).toLowerCase()) >= 0;
  return genIcon(name, off, name === "star" && !off ? "gold" : "");
};
// The stat tiles: one style throughout. With the strip in hand a tile shows one of the seven, large enough to read (a
// streak is a bolt, a rank on the board or a best mark a trophy, XP and a peak are coins), or no emblem at all: never
// a pixel glyph beside a model's picture.
const GEN_TILES = { "BEST STREAK": "bolt", "HIGH SCORE RANK": "trophy", PEAK: "coin", "BOSS STARS": "star", STARS: "star", "BOSS HP LEFT": "heart", MASTERY: "shield",
  ACCURACY: "medal", "QUESTIONS MASTERED": "medal", "CARDS BANKED": "coin", "XP EARNED": "coin", "BEST EXAM": "trophy", "BEST SCORE": "trophy", SCORE: "trophy", CORRECT: "star", WAVE: "bolt", REMEMBERED: "coin" };
icon.tile = (k) => (!genIconReady() ? "" : GEN_TILES[k] ? genIcon(GEN_TILES[k], false, GEN_TILES[k] === "star" ? "gold" : "") : `<i class="tk0" aria-hidden="true"></i>`);
if (Assets.on && typeof document !== "undefined") document.documentElement.classList.add("assets-on"); // (what is styled only when served)
// A screen drawn before the portrait strip arrived gets its busts when it does.
Assets.onImage = (name) => {
  if (name !== "bosses") return;
  document.querySelectorAll("canvas[data-boss-key]").forEach((cv) => genBossPortrait(cv, cv.dataset.bossColor, cv.dataset.bossKey));
};
// A boss bust from its strip, drawn into a canvas over a field of the boss's colour (see drawBossPortrait). Returns
// false when the strip is not in hand.
function genBossPortrait(canvas, color, key) {
  const img = Assets.on && Assets.ui("bosses"), i = GEN_BOSSES.indexOf(String(key));
  if (!img || i < 0) return false;
  const S = 128;
  canvas.width = canvas.height = S;
  const x = canvas.getContext("2d");
  const g = x.createRadialGradient(S / 2, S * 0.42, S * 0.05, S / 2, S * 0.5, S * 0.72);
  g.addColorStop(0, color);
  g.addColorStop(0.55, "#1a0d46");
  g.addColorStop(1, "#07021a");
  x.fillStyle = g;
  x.globalAlpha = 1;
  x.fillRect(0, 0, S, S);
  x.globalAlpha = 0.55; // (the field is the boss's light, not a flat card behind it)
  x.fillStyle = "#07021a";
  x.fillRect(0, 0, S, S);
  x.globalAlpha = 1;
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = "high";
  x.drawImage(img, i * 192, 0, 192, 192, -4, 0, S + 8, S + 8);
  canvas.classList.add("gen");
  return true;
}
