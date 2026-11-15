#!/usr/bin/env node
/**
 * Skybox round (Blockade Labs, Model 3, 8K equirectangular): one sky per mode plus variants.
 *
 *   GEN_OUT=<dir> node tools/gen/skies.js [name-prefix ...]
 *
 * Panoramas land in OUT/sky/<name>.jpg and are indexed in OUT/sky/index.json. The games draw their own sun,
 * ground, city and arena, so these are skies only: no sun disc, no characters, no text.
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.js");

const NEG = "text, letters, words, numbers, watermark, logo, signature, people, characters, faces, frame, border, vignette";
// style ids: 82 Advanced (artistic), 93 Scifi Concept Art, 87 Digital Painting, 114 Sky Dome, 153 Dark Anime Glow, 148 Concept Render
const SKIES = {
  // ---- Risk Blaster: deep space, one per pair of regions
  "blaster-nebula": [93, "Deep outer space in every direction, no ground and no horizon line. A vast luminous nebula in neon magenta, violet and electric cyan with dark dust lanes, thousands of sharp stars, bright star clusters, one small distant ringed gas giant. Retro synthwave palette, high contrast, mostly black space with glowing clouds, crisp detail."],
  "blaster-belt": [93, "Deep outer space in every direction, no ground and no horizon line. Cold teal and cyan nebula veils with violet edges, a faint band of far-off drifting asteroids, dense fields of sharp stars, a pale blue star flaring in the distance. Retro synthwave palette, high contrast, mostly black space, crisp detail."],
  "blaster-graveyard": [93, "Deep outer space in every direction, no ground and no horizon line. Ominous dark crimson and amber nebula wisps over violet-black space, a dying red giant star far away, scattered stars, drifting dust. Retro synthwave palette, moody, high contrast, mostly black, crisp detail."],
  "blaster-gate": [93, "Deep outer space in every direction, no ground and no horizon line. A distant swirling wormhole vortex of cyan and magenta light with spiral arms of plasma, violet nebula haze around it, dense stars, a small banded planet far off. Retro synthwave palette, high contrast, mostly black space, crisp detail."],
  "blaster-nebula-b": [87, "Deep outer space in every direction, no ground and no horizon line. A vast luminous nebula in neon magenta, violet and electric cyan with dark dust lanes, thousands of sharp stars, bright star clusters, one small distant ringed gas giant. Retro synthwave palette, high contrast, mostly black space with glowing clouds, crisp detail."],
  // (the first five came back as alien landscapes with ground, ships and structures: not open space. These ask for
  // nothing but space, in the free-form styles, with the ground named in the negative text.)
  "blaster-deep-1": [82, "Equirectangular 360 panorama of open outer space, the view from a ship floating in the void: only stars and nebula in every direction, above and below. A vast luminous emission nebula in neon magenta and violet with electric cyan filaments and dark dust lanes, dense fields of sharp pinpoint stars, a few bright blue-white star clusters. Mostly deep black space. Retro synthwave palette, high contrast, astrophotography detail.", "ground, land, terrain, mountains, horizon, landscape, planet surface, desert, sea, clouds, sky gradient, spaceship, station, building, tower, city, sun"],
  "blaster-deep-2": [112, "Equirectangular 360 panorama of open outer space, the view from a ship floating in the void: only stars and nebula in every direction, above and below. A vast luminous emission nebula in neon magenta and violet with electric cyan filaments and dark dust lanes, dense fields of sharp pinpoint stars, a few bright blue-white star clusters. Mostly deep black space. High contrast, astrophotography detail.", "ground, land, terrain, mountains, horizon, landscape, planet surface, desert, sea, clouds, sky gradient, spaceship, station, building, tower, city, sun"],
  "blaster-deep-3": [82, "Equirectangular 360 panorama of open outer space: only stars and glowing gas in every direction, above and below, no surface anywhere. Cold teal and cyan nebula veils with violet edges drifting across black space, thousands of sharp stars, one distant pale blue star with a soft flare. Mostly deep black. Retro synthwave palette, high contrast, astrophotography detail.", "ground, land, terrain, mountains, horizon, landscape, planet surface, desert, sea, clouds, sky gradient, spaceship, station, building, tower, city"],
  "blaster-deep-4": [112, "Equirectangular 360 panorama of open outer space: only stars and glowing gas in every direction, above and below, no surface anywhere. Dark crimson and amber nebula wisps on violet-black space, a small distant red giant star, scattered sharp stars, faint dust. Ominous, mostly deep black, high contrast, astrophotography detail.", "ground, land, terrain, mountains, horizon, landscape, planet surface, desert, sea, clouds, sky gradient, spaceship, station, building, tower, city"],
  "blaster-deep-5": [82, "Equirectangular 360 panorama of open outer space: only stars and glowing gas in every direction, above and below, no surface anywhere. A far-off spiral vortex of cyan and magenta plasma like a wormhole, small in the distance, violet nebula haze around it, dense sharp stars, the band of a galaxy crossing the view. Mostly deep black. Retro synthwave palette, high contrast.", "ground, land, terrain, mountains, horizon, landscape, planet surface, desert, sea, clouds, sky gradient, spaceship, station, building, tower, city"],
  "blaster-deep-6": [153, "Open outer space in every direction, above and below, no surface anywhere: only stars and nebula. A vast glowing nebula in neon magenta, violet and electric cyan with dark dust lanes, dense sharp stars, bright star clusters. Mostly deep black space, high contrast.", "ground, land, terrain, mountains, horizon, landscape, planet surface, desert, sea, clouds, spaceship, station, building, tower, city"],
  // ---- Nest Egg Run: the sky follows the career (dawn, golden hour, dusk and stars); the game draws its own sun and road
  "racer-sunset": [114, "Synthwave sunset sky just after the sun has gone below the horizon, no sun disc: a band of molten gold and hot orange along a flat far horizon, rising through magenta to deep violet at the zenith, long thin clouds lit pink and gold from below, the first stars overhead, low dark mountain silhouettes far away, dark wet flat plain below. 1980s retro outrun aesthetic, vivid, clean gradients."],
  "racer-dawn": [114, "Synthwave dawn sky before sunrise, no sun disc: a soft band of rose and peach along a flat far horizon, rising through teal to deep indigo at the zenith, a few thin high clouds catching pink light, fading stars, low dark mountain silhouettes far away, dark wet flat plain below. 1980s retro outrun aesthetic, clean gradients."],
  "racer-night": [114, "Clear synthwave night sky: dense stars and a violet and cyan milky way arching overhead, a low glow of magenta along a flat far horizon, thin neon-tinted haze, low dark mountain silhouettes far away, dark wet flat plain below. 1980s retro outrun aesthetic, deep contrast, crisp stars."],
  "racer-sunset-b": [87, "Synthwave sunset sky just after the sun has gone below the horizon, no sun disc: a band of molten gold and hot orange along a flat far horizon, rising through magenta to deep violet at the zenith, long thin clouds lit pink and gold from below, the first stars overhead, low dark mountain silhouettes far away, dark flat plain below. 1980s retro outrun aesthetic, vivid."],
  // ---- Boss Rush: darker and more ominous; the arena tints it with each boss's colour
  "boss-storm": [82, "Ominous night sky seen from the floor of a colossal dark arena: an enormous slow storm vortex directly overhead, layers of black and deep violet cloud lit from within by magenta lightning, shafts of cold light breaking through, a thin ring of pale light at the far horizon, everything else dark. Dramatic, menacing, high contrast, painterly detail in the clouds, retro synthwave palette."],
  "boss-void": [93, "Ominous dark void sky: black storm clouds in a great spiral overhead with cracks of violet and crimson light, distant lightning, drifting embers, a faint cold glow along the far horizon, mostly darkness. Menacing, high contrast, retro synthwave palette, crisp detail."],
  "boss-storm-b": [146, "Ominous night sky seen from the floor of a colossal dark arena: an enormous slow storm vortex directly overhead, layers of black and deep violet cloud lit from within by magenta lightning, shafts of cold light breaking through, a thin ring of pale light at the far horizon, everything else dark. Dramatic, menacing, high contrast."],
  // ---- Hub: the arcade hall (its reflection in the cabinets and the floor)
  "hub-hall": [148, "Inside a vast retro 1980s video arcade hall at night, seen from the middle of the floor: dark patterned carpet, long rows of glowing arcade cabinets far away along every wall, neon tube signs in magenta and cyan with abstract shapes, mirrored ceiling panels with strip lights, light haze, tall windows at the far end showing a neon city skyline. No people. Rich reflections, moody, detailed."],
  "hub-hall-b": [82, "Inside a vast retro 1980s video arcade hall at night, seen from the middle of the floor: dark patterned carpet, long rows of glowing arcade cabinets far away along every wall, neon tube signs in magenta and cyan with abstract shapes, mirrored ceiling panels with strip lights, light haze, tall windows at the far end showing a neon city skyline. No people. Rich reflections, moody, detailed."],
  // ---- Title: the dusk sky behind the city
  "title-dusk": [114, "Synthwave dusk sky over a far flat horizon, no sun disc: glowing orange and magenta at the horizon, deep violet above, dramatic layered clouds lit pink from below, stars at the zenith, one great distant thundercloud glowing from within on one side, low dark mountain silhouettes, dark plain below. 1980s retro outrun aesthetic, vivid, cinematic."],
  "title-dusk-b": [87, "Synthwave dusk sky over a far flat horizon, no sun disc: glowing orange and magenta at the horizon, deep violet above, dramatic layered clouds lit pink from below, stars at the zenith, one great distant thundercloud glowing from within on one side, low dark mountain silhouettes, dark plain below. 1980s retro outrun aesthetic, vivid, cinematic."],
  // ---- the quieter rooms: Final Exam (a moonlit hall), Memory Bank (a vault), Strategy Guide (an archive)
  "exam-moon": [82, "Night sky seen through the broken vault of a vast dark stone hall: a huge pale moon behind drifting clouds, cold blue-violet moonlight, tall dark arches and columns receding into shadow all around, faint gold motes in the air. Solemn, ominous, high contrast."],
  "vault-gold": [148, "Inside a vast round bank vault of polished gold and dark steel: curved riveted walls with rows of safe-deposit doors, warm golden light from ring lamps overhead, a mirror-polished dark floor, soft haze. No people. Rich reflections, art deco, warm gold with violet shadows."],
  "guide-archive": [148, "Inside a vast vaulted library archive at night: tall dark wooden shelves on two tiers receding into the distance, hanging brass lamps with warm light, a great round stained-glass rose window glowing in jewel colours at the far end, dust in the light beams. No people. Quiet, warm amber with violet shadows."],
};

(async () => {
  const dir = path.join(L.OUT, "sky");
  fs.mkdirSync(dir, { recursive: true });
  const idxFile = path.join(dir, "index.json");
  const load = () => (fs.existsSync(idxFile) ? JSON.parse(fs.readFileSync(idxFile, "utf8")) : {});
  const only = process.argv.slice(2);
  const jobs = Object.entries(SKIES).filter(([k]) => !only.length || only.some((p) => k.startsWith(p))).filter(([k]) => !load()[k]).map(([name, [style, prompt, neg]]) => async () => {
    const out = await L.skybox({ skybox_style_id: style, prompt, negative_text: neg ? neg + ", text, letters, watermark, logo, people" : NEG, enhance_prompt: false }, path.join(dir, name + ".jpg"), { name: "sky " + name });
    const idx = load();
    idx[name] = { id: out.id, style, prompt, negative: NEG, seed: out.seed, file: "sky/" + name + ".jpg", bytes: out.bytes, style_name: out.request.skybox_style_name, model: out.request.model, credits: out.request.credit_cost };
    fs.writeFileSync(idxFile, JSON.stringify(idx, null, 1));
    L.log("done", name, (out.bytes / 1e6).toFixed(1) + " MB");
  });
  const res = await L.pool(jobs, 2);
  L.log("skies:", res.filter((r) => r.ok).length, "ok,", res.filter((r) => !r.ok).length, "failed");
})().catch((e) => { console.error("FAILED", L.scrub(e.message)); process.exit(1); });
