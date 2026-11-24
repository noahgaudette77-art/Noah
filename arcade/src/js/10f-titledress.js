// The containment hall as a maximum-security block, on a computer (the master overhaul, Phase 5, 2026-11-24: on a
// Mac the cells' close-ups showed bare dark walls round each cell). The walls between the windows and the pillars,
// and the stretches at the door and at the vault, are dressed as a prison block's: conduits along both walls on their
// brackets, a guard rail along the glass, in every bay a block plate (its letter and its game), a junction box with
// its lamps, a vent grille (some breathing steam) or a security door with its keypad and its warning screen, a caged
// warning lamp; hazard paint round the pillars' feet; under the beams the block's sign and, over three of them, a
// searchlight patrolling the floor; red beacons turning by the cells in alarm.
//
// Cheap: everything still is drawn with what the cells already draw (their steel, their lights, their plates and
// screens: no draw added, no shader); the signs are rows added to the cells' picture. What moves (the searchlights'
// beams and pools, the beacons' beams and domes) is one draw, moved by its own shader (nothing sent from the script a
// frame), left out of the floor's reflection, and not drawn at the lower tiers (GFX.extras off). Nothing here draws
// on the game's Math.random: what varies varies by a hash of its place, and the ids three.js draws for what it makes
// come from a stream of the dressing's own (dressOwnRandom). A phone builds none of it (Assets.phone: the hall as it
// was, lean).

const DRESS = { W: 7.8, H: 8.8, pipeY: [6.56, 6.8], railD: 0.42 };
const dressHash = (n) => { const s = Math.sin(n * 91.3458 + 17.17) * 47453.5453; return s - Math.floor(s); };
// fn run on a private stream of random numbers: three.js draws four for the id of every shape, material and object it
// makes (some thirteen hundred here), and the game's own stream, which the capture tool and the regression seed, must
// not move with the dressing (the tip on the title, and all that is drawn after the hall, would change)
function dressOwnRandom(fn) {
  const R = Math.random;
  let s = 0x2f6b9e1d;
  Math.random = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = R; }
}

// The sign rows (each a painter for cellAtlas: one row of its picture, 1024 x 128): a block's plate on the left half
// (its letter on a square of its colour, CELL BLOCK and its game), its warning screen on the right (amber, or red
// and blinking while one of its cells is in alarm); then the door's and the vault's
function dressRows(blocks) {
  const F = (px) => `${px}px "Press Start 2P", "Courier New", monospace`, css = (n) => "#" + new THREE.Color(n).getHexString();
  const plate = (x, y, RH, col, letter, small, name) => {
    const g = x.createLinearGradient(0, y, 0, y + RH);
    g.addColorStop(0, "#272b35"); g.addColorStop(1, "#121419");
    x.fillStyle = g; x.fillRect(0, y, 512, RH);
    x.strokeStyle = "#4a505e"; x.lineWidth = 4; x.strokeRect(4, y + 4, 504, RH - 8);
    x.fillStyle = col; x.fillRect(16, y + 16, 96, 96);
    x.fillStyle = "#0b0616"; x.font = F(letter.length > 1 ? 34 : 60); x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(letter, 64 + 2, y + 66);
    x.textAlign = "left"; x.textBaseline = "top";
    x.fillStyle = "#9aa3b8"; x.font = F(16); x.fillText(small, 130, y + 24);
    let fs = 24; x.font = F(fs);
    while (x.measureText(name).width > 360 && fs > 12) { fs -= 2; x.font = F(fs); }
    x.fillStyle = "#f4f1ff"; x.fillText(name, 130, y + 62 + (24 - fs) / 2);
    for (const bx of [10, 496]) for (const by of [10, 112]) { x.fillStyle = "#6b7282"; x.beginPath(); x.arc(bx + 3, y + by + 3, 4, 0, 7); x.fill(); }
  };
  const screen = (x, y, RH, red, l1, l2) => {
    const ink = red ? "#ff3a4c" : "#ffb13a";
    x.fillStyle = red ? "#1a0306" : "#140a02"; x.fillRect(512, y, 512, RH);
    x.strokeStyle = ink; x.globalAlpha = 0.45; x.lineWidth = 3; x.strokeRect(520, y + 8, 496, RH - 16); x.globalAlpha = 1;
    // hazard chevrons at both ends, then the words between them
    x.fillStyle = ink;
    for (const cx of [540, 1004]) for (let k = 0; k < 3; k++) { const yy = y + 30 + k * 26; x.beginPath(); x.moveTo(cx - 10, yy); x.lineTo(cx, yy + 10); x.lineTo(cx + 10, yy); x.lineTo(cx + 10, yy + 8); x.lineTo(cx, yy + 18); x.lineTo(cx - 10, yy + 8); x.closePath(); x.fill(); }
    x.textAlign = "center"; x.textBaseline = "top";
    let fs = 26; x.font = F(fs);
    while (x.measureText(l1).width > 420 && fs > 12) { fs -= 2; x.font = F(fs); }
    x.fillText(l1, 768, y + 30 + (26 - fs) / 2);
    x.font = F(13); x.globalAlpha = 0.85; x.fillText(l2, 768, y + 80); x.globalAlpha = 1;
    x.textAlign = "left";
  };
  const rows = blocks.map((b) => (x, y, W, RH) => {
    x.save();
    plate(x, y, RH, css(b.col), b.letter, "CELL BLOCK " + b.letter, b.name);
    screen(x, y, RH, b.alarm, b.alarm ? "CONTAINMENT BREACH" : "MAXIMUM SECURITY", b.alarm ? "BLOCK " + b.letter + " · STASIS FAILING" : "AUTHORIZED PERSONNEL ONLY");
    x.restore();
  });
  // the door's (the hall's own plate; its count of inmates) and the vault's
  rows.push((x, y, W, RH) => { x.save(); plate(x, y, RH, "#a65fff", "IN", "CONTAINMENT HALL", "INTAKE"); screen(x, y, RH, false, "12 HELD · 0 ESCAPED", "ALL INMATES ACCOUNTED FOR"); x.restore(); });
  rows.push((x, y, W, RH) => { x.save(); plate(x, y, RH, "#ffc93d", "V", "RESTRICTED", "VAULT ACCESS"); screen(x, y, RH, false, "SECURITY CHECKPOINT", "BADGE REQUIRED BEYOND THIS POINT"); x.restore(); });
  return rows;
}

// The moving light: searchlights (a beam from a ball turret under a beam across the hall to a pool of light wandering
// over the floor of the next block), and beacons (two beams turning round a dome). Each vertex carries its light's
// place and path; the shader finds where the light points this moment from the time alone.
function dressPatrolMaterial(calm) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), { uTime: { value: 0 }, uK: { value: 1 }, uCalm: { value: calm ? 1 : 0 } }),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    // aSpot: the lamp (xyz) and how bright (w); aPath: a searchlight's patch (middle x, z; reach across, along), or a
    // beacon's turn (speed, phase, beam length); aLook: a searchlight's pace and phase, its spread (tan), and which
    // (0 a searchlight, 1 a beacon); aKind: 0 a beam, 1 its pool on the floor, 2 its lens, 3 a beacon's dome
    vertexShader: `attribute vec4 aSpot; attribute vec4 aPath; attribute vec4 aLook; attribute vec3 aCol; attribute float aKind;
      uniform float uTime; uniform float uCalm;
      varying vec3 vCol; varying float vKind; varying float vD; varying vec3 vN; varying vec3 vV; varying vec2 vQ; varying float vDepth; varying float vFlash;
      void main(){
        vec3 L = aSpot.xyz, T;
        float beacon = step(0.5, aLook.w), t = uTime * mix(1.0, 0.25, uCalm);
        if (beacon < 0.5) T = vec3(aPath.x + aPath.z * sin(t * aLook.x + aLook.y), 0.03, aPath.y + aPath.w * sin(t * aLook.x * 0.61 + aLook.y * 1.7));
        else { float a = uTime * aPath.x * (1.0 - uCalm) + aPath.y; T = L + vec3(cos(a), -0.12, sin(a)) * aPath.z; }
        vec3 D = T - L; float len = max(length(D), 0.01); D /= len;
        vec3 U = normalize(cross(D, abs(D.y) > 0.95 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0))), V = cross(U, D);
        vec3 w = L; vD = 0.0; vN = vec3(0.0, 1.0, 0.0); vQ = vec2(0.0); vFlash = 0.0;
        if (aKind < 0.5) { // the beam: from the lens out, widening (a beacon's held still with reduced effects)
          float d = position.y, r = 0.1 + d * len * aLook.z;
          vN = U * position.x + V * position.z;
          w = L + D * (0.12 + d * (len - 0.12)) + vN * r * (1.0 - uCalm * beacon);
          vD = d;
        } else if (aKind < 1.5) { // its pool on the floor, drawn out along the beam where it falls at a slant
          vec3 Hd = normalize(vec3(D.x, 0.0, D.z) + vec3(1e-4, 0.0, 0.0)), Hp = vec3(-Hd.z, 0.0, Hd.x);
          float R = 0.15 + len * aLook.z;
          w = T + Hd * position.x * R / max(-D.y, 0.4) + Hp * position.z * R;
          vQ = position.xz;
        } else if (aKind < 2.5) { // its lens, facing where it points (just outside its turret)
          w = L + D * 0.17 + (U * position.x + V * position.z) * 0.1;
          vQ = position.xz;
        } else { // a beacon's dome: bright as a beam turns toward the lens
          w = L + position * 0.085;
          vec2 c = normalize((cameraPosition - L).xz + vec2(1e-4, 0.0));
          vFlash = pow(abs(dot(normalize(D.xz + vec2(1e-4, 0.0)), c)), 10.0) * (1.0 - uCalm);
        }
        vCol = aCol * aSpot.w; vKind = aKind; vV = cameraPosition - w;
        vec4 mv = viewMatrix * vec4(w, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `${GLSL_FOG_PARS} uniform float uK; varying vec3 vCol; varying float vKind; varying float vD; varying vec3 vN; varying vec3 vV; varying vec2 vQ; varying float vDepth; varying float vFlash;
      void main(){
        float a;
        if (vKind < 0.5) { float f = abs(dot(normalize(vN), normalize(vV))); a = f * f * (0.25 + 0.75 * pow(max(1.0 - vD, 0.0), 1.6)) * smoothstep(0.0, 0.06, vD) * 0.12; } // (in the haze all the way down, brightest at the lens)
        else if (vKind < 1.5) { float r = length(vQ); a = (1.0 - smoothstep(0.5, 1.0, r)) * 0.42 + pow(max(1.0 - r * 1.7, 0.0), 2.0) * 0.45; } // (a disc of light with a soft rim and a hot middle)
        else if (vKind < 2.5) { a = (1.0 - smoothstep(0.65, 1.0, length(vQ))) * 2.6; }
        else a = 0.55 + 3.2 * vFlash;
        gl_FragColor = vec4(vCol * a * uK * (1.0 - smoothstep(uFogNear, uFogFar, vDepth)), 1.0);
      }`,
  });
}

// Everything the computer's hall adds, made into the cells' batches (B: steel, glow, at, the cells' states, the
// colours). Returns the sign rows (for the cells' picture), the signs themselves (a batch for the plates' draw, in
// rows counted from the cells'), the steam's extra puffs (where a vent breathes) and the moving light (a mesh).
function hallDress(hall, B) {
  const { steel, glow, at, states, C } = B, W = DRESS.W, worlds = HALL_WORLDS, calm = hall.calm;
  const box = new THREE.BoxGeometry(1, 1, 1), plane = new THREE.PlaneGeometry(1, 1), ball = new THREE.SphereGeometry(0.16, 12, 8), disc = new THREE.CylinderGeometry(1, 1, 1, 12), dome = new THREE.SphereGeometry(1, 10, 6);
  const pipes = new Map(), pipe = (r) => { if (!pipes.has(r)) pipes.set(r, new THREE.CylinderGeometry(r, r, 1, 8, 1, true)); return pipes.get(r); };
  const g = (pat, col) => ({ color: col || C.GUN, aPat: pat });
  const lit = (col, kind, alarm, ph) => ({ aCol: col, aState: [alarm ? 1 : 0, 0, 0, ph], aKind: kind });
  // (a point d metres off a wall, into the hall; a plane on a wall faces the aisle)
  const X = (sd, d) => sd * (W - d), face = (sd) => -sd * Math.PI / 2;
  // the blocks: each world's letter, its game, its colour, and whether a cell of it is in alarm
  const blocks = worlds.map((Wd, wi) => ({ letter: "ABCDEF"[wi], name: { blaster: "RISK BLASTER", racer: "NEST EGG RUN", boss: "BOSS RUSH", memory: "MEMORY BANK", guide: "STRATEGY GUIDE", exam: "FINAL EXAM" }[Wd.id] || Wd.id.toUpperCase(), col: Wd.col, alarm: states.some((s, i) => hall.cells[i].wi === wi && s.alarm) }));
  const rows = dressRows(blocks), R0 = states.length, ROWS = R0 + rows.length, rowOf = (k) => ROWS - 1 - (R0 + k); // (the cells' rows first; a row counted from the picture's foot, as the plates' shader reads it)
  const signs = new KitBatch({ aRow: 1, aState: 4 });
  // a sign: a part of a row's picture (px across 0-1024, py down 0-128) on a plane placed by m
  const sign = (m, k, px0, px1, py0, py1, blink, ph) => {
    const n0 = signs.uvm.length;
    signs.add(plane, m, { aRow: rowOf(k), aState: [blink ? 1 : 0, 0, 0, ph] });
    for (let i = n0; i < signs.uvm.length; i += 2) { const u = signs.uvm[i], v = signs.uvm[i + 1]; signs.uvm[i] = (px0 + u * (px1 - px0)) / 1024; signs.uvm[i + 1] = 1 - (py0 + (1 - v) * (py1 - py0)) / 128; }
  };
  const puffs = [];
  // ---- along both walls: two conduits above the windows on their brackets; a guard rail along each window's glass
  const pillarZ = [];
  for (let i = 0; i <= worlds.length; i++) pillarZ.push(HALL.z0 + HALL.step / 2 - i * HALL.step);
  const inPillar = (z, m) => pillarZ.some((p) => Math.abs(z - p) < 0.5 + m);
  const Z1 = 9, Z2 = HALL.endZ, len = Z1 - Z2, zc = (Z1 + Z2) / 2;
  for (const sd of [-1, 1]) {
    steel.add(pipe(0.075), at(X(sd, 0.12), DRESS.pipeY[0], zc, 1, len, 1, 0, Math.PI / 2), g(0, C.PIPE), 0.47, len, true);
    steel.add(pipe(0.05), at(X(sd, 0.1), DRESS.pipeY[1], zc, 1, len, 1, 0, Math.PI / 2), g(0, C.BAR), 0.31, len, true);
    for (let z = Z1 - 0.7; z > Z2 + 0.4; z -= 1.5) if (!inPillar(z, 0.1)) steel.add(box, at(X(sd, 0.11), 6.68, z, 0.22, 0.42, 0.06), g(0, C.BAR), 0.22, 0.42);
    worlds.forEach((Wd, wi) => {
      const zm = HALL.z0 - wi * HALL.step, L = 5.0, x = X(sd, DRESS.railD);
      steel.add(pipe(0.032), at(x, 1.05, zm, 1, L, 1, 0, Math.PI / 2), g(0, C.BRIGHT), 0.2, L, true);
      steel.add(pipe(0.022), at(x, 0.6, zm, 1, L, 1, 0, Math.PI / 2), g(0, C.BAR), 0.14, L, true);
      for (const dz of [-L / 2, 0, L / 2]) {
        steel.add(pipe(0.03), at(x, 0.54, zm + dz, 1, 1.08, 1), g(0, C.BAR), 0.19, 1.08, true);
        steel.add(pipe(0.034), at(x, 0.2, zm + dz, 1, 0.34, 1), g(1, C.WHITE), 0.21, 0.34, true); // (its foot in hazard paint)
        steel.add(box, at(x, 0.012, zm + dz, 0.13, 0.024, 0.13), g(0, C.DARK));
      }
    });
  }
  // ---- each bay of wall between a window and a pillar: a block plate, a junction box with its lamps, its conduits
  // down to it, a vent (or in one bay a block, a security door), a caged warning lamp
  const bay = (sd, zs, q, k, wi, door, n, steam) => {
    const h = dressHash(n), red = blocks[wi] ? blocks[wi].alarm : false, col = new THREE.Color(blocks[wi] ? blocks[wi].col : 0xa65fff).toArray(), ph = h;
    // the block's plate, at a glance's height
    sign(at(X(sd, 0.025), door ? 3.02 : 2.7, zs + (door ? 0 : q * 0.15), 1.7, 0.425, 1, face(sd)), k, door ? 512 : 0, door ? 1024 : 512, 0, 128, door && red, ph);
    if (door) {
      // a security door: its frame in hazard paint, the leaf with its panels and a barred window, its lock and keypad
      const zd = zs;
      steel.add(box, at(X(sd, 0.07), 2.63, zd, 0.14, 0.16, 1.64), g(1, C.WHITE), 1.64, 0.16);
      for (const s of [-1, 1]) steel.add(box, at(X(sd, 0.07), 1.27, zd + s * 0.74, 0.14, 2.54, 0.16), g(1, C.WHITE), 0.16, 2.54);
      steel.add(box, at(X(sd, 0.035), 1.27, zd, 0.07, 2.54, 1.32), g(0, C.GUN), 1.32, 2.54);
      for (const py of [0.62, 1.42]) steel.add(box, at(X(sd, 0.072), py, zd, 0.01, 0.62, 1.0), g(3, C.BAR), 1.0, 0.62);
      glow.add(box, at(X(sd, 0.06), 2.08, zd, 0.02, 0.34, 0.46), lit(col.map((c) => c * 0.22), 0, red, ph));
      for (const s of [-0.12, 0, 0.12]) steel.add(box, at(X(sd, 0.085), 2.08, zd + s, 0.03, 0.36, 0.025), g(0, C.BRIGHT));
      steel.add(box, at(X(sd, 0.1), 1.18, zd - q * 0.46, 0.08, 0.06, 0.24), g(0, C.BRIGHT));
      steel.add(box, at(X(sd, 0.05), 1.38, zd + q * 0.98, 0.1, 0.26, 0.16), g(0, C.BAR));
      glow.add(box, at(X(sd, 0.105), 1.44, zd + q * 0.98, 0.012, 0.05, 0.05), lit([0, 0, 0], 3, false, ph));
      glow.add(box, at(X(sd, 0.105), 1.32, zd + q * 0.98, 0.012, 0.1, 0.1), lit([0.12, 0.9, 0.45], 0, false, ph));
      // its warning lamp over it
      steel.add(box, at(X(sd, 0.08), 3.48, zd, 0.16, 0.12, 0.3), g(0, C.BAR));
      glow.add(box, at(X(sd, 0.17), 3.47, zd, 0.04, 0.09, 0.24), red ? lit([1, 0.12, 0.14], 0, true, ph) : lit([0, 0, 0], 1, false, ph));
    } else {
      // a vent grille low on the wall in its frame (one a block breathes steam, a side and then the other)
      const zv = zs - q * 0.35, wv = 1.3, hv = 0.95, yv = 1.55;
      steel.add(box, at(X(sd, 0.05), yv, zv, 0.06, hv, wv), g(2, C.WHITE), wv, hv);
      for (const s of [-1, 1]) { steel.add(box, at(X(sd, 0.08), yv + s * (hv / 2 + 0.035), zv, 0.1, 0.07, wv + 0.14), g(0, C.BAR), wv, 0.07); steel.add(box, at(X(sd, 0.08), yv, zv + s * (wv / 2 + 0.035), 0.1, hv, 0.07), g(0, C.BAR), 0.07, hv); }
      if (steam) for (let p = 0; p < 4; p++) puffs.push([X(sd, 0.35 + 0.1 * p), yv + 0.3, zv + (p - 1.5) * 0.25, (p / 4 + h * 3.7) % 1]);
      // a caged warning lamp, high
      const zl = zs + q * 0.55;
      steel.add(box, at(X(sd, 0.08), 5.55, zl, 0.16, 0.22, 0.22), g(0, C.BAR));
      glow.add(box, at(X(sd, 0.18), 5.55, zl, 0.05, 0.15, 0.15), red ? lit([1, 0.12, 0.14], 0, true, ph) : h < 0.5 ? lit([0, 0, 0], 1, false, ph) : lit([1.0, 0.42, 0.06], 0, false, ph));
      for (const s of [-0.055, 0.055]) steel.add(box, at(X(sd, 0.22), 5.55, zl + s, 0.02, 0.2, 0.015), g(0, C.BRIGHT));
      steel.add(box, at(X(sd, 0.22), 5.55, zl, 0.02, 0.015, 0.18), g(0, C.BRIGHT));
    }
    // the junction box and the conduits down to it from the run above the windows
    const zj = zs + q * (door ? -0.95 : -0.6), yj = 4.35;
    steel.add(box, at(X(sd, 0.11), yj, zj, 0.2, 0.8, 0.6), g(0, C.GUN), 0.6, 0.8);
    steel.add(box, at(X(sd, 0.115), yj + 0.34, zj, 0.2, 0.09, 0.61), g(1, C.WHITE), 0.61, 0.09);
    steel.add(box, at(X(sd, 0.212), yj - 0.04, zj, 0.01, 0.56, 0.012), g(3, C.BAR));
    for (const [dz, r, d] of [[-0.14, 0.042, 0.1], [0.12, 0.03, 0.08]]) { const y0 = yj + 0.4, y1 = DRESS.pipeY[0]; steel.add(pipe(r), at(X(sd, d), (y0 + y1) / 2, zj + dz, 1, y1 - y0, 1), g(0, C.PIPE), 2 * Math.PI * r, y1 - y0, true); }
    for (let k2 = 0; k2 < 3; k2++) glow.add(box, at(X(sd, 0.216), yj + 0.14, zj - 0.12 + k2 * 0.12, 0.012, 0.045, 0.045), k2 === 0 ? lit([0, 0, 0], 3, false, (ph + k2 * 0.37) % 1) : lit(k2 === 1 ? [0.12, 0.9, 0.45] : col, 0, red && k2 === 2, (ph + k2 * 0.37) % 1));
  };
  worlds.forEach((Wd, wi) => {
    const zw = HALL.z0 - wi * HALL.step;
    for (const sd of [-1, 1]) for (const q of [1, -1]) {
      const n = wi * 4 + (sd > 0 ? 2 : 0) + (q > 0 ? 0 : 1);
      const door = sd === (wi % 2 ? 1 : -1) && q === ((wi >> 1) % 2 ? -1 : 1);
      bay(sd, zw + q * 3.97, q, wi, wi, door, n, !door && sd === (wi % 2 ? -1 : 1) && q === -1);
    }
  });
  // the door's stretch and the vault's: a door each side, their own plates
  for (const sd of [-1, 1]) {
    bay(sd, 4.75, 1, worlds.length, -1, true, 90 + sd); bay(sd, HALL.endZ + 2.75, -1, worlds.length + 1, -1, true, 95 + sd);
    sign(at(X(sd, 0.025), 2.7, 2.35, 1.7, 0.425, 1, face(sd)), worlds.length, 0, 512, 0, 128, false, 0); // (INTAKE)
    sign(at(X(sd, 0.025), 2.7, HALL.endZ + 4.55, 1.7, 0.425, 1, face(sd)), worlds.length + 1, 0, 512, 0, 128, false, 0); // (VAULT ACCESS)
  }
  // ---- the pillars: hazard paint round their feet
  for (const z of pillarZ) for (const sd of [-1, 1]) steel.add(box, at(X(sd, 0.5), 0.15, z, 1.06, 0.3, 1.06), g(1, C.WHITE), 1.06, 0.3);
  // ---- under each beam across the hall, the block ahead named (facing the door; not the last: the logo stands there)
  for (let i = 0; i < worlds.length; i++) {
    const z = pillarZ[i] + 0.41;
    for (const sd of [-1, 1]) {
      const x = sd * 4.6;
      for (const s of [-0.7, 0.7]) steel.add(pipe(0.02), at(x + s, 7.86, z, 1, 0.28, 1), g(0, C.BAR), 0.13, 0.28, true);
      steel.add(box, at(x, 7.5, z - 0.03, 1.86, 0.5, 0.05), g(0, C.DARK));
      sign(at(x, 7.5, z, 1.78, 0.445, 1), i, 0, 512, 0, 128, false, 0);
    }
  }
  // ---- the moving light: three searchlights hung under the beams (one side, then the other), each patrolling the floor
  // of the block ahead; and red beacons turning on the pillars either side of a block in alarm
  const P = { pos: [], aSpot: [], aPath: [], aLook: [], aCol: [], aKind: [] };
  const vtx = (p, spot, path, look, col, kind) => { P.pos.push(...p); P.aSpot.push(...spot); P.aPath.push(...path); P.aLook.push(...look); P.aCol.push(...col); P.aKind.push(kind); };
  const cone = (spot, path, look, col) => { const N = 14; for (let i = 0; i < N; i++) { const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2, c0 = [Math.cos(a0), 0, Math.sin(a0)], c1 = [Math.cos(a1), 0, Math.sin(a1)]; for (const [c, d] of [[c0, 0], [c1, 0], [c1, 1], [c0, 0], [c1, 1], [c0, 1]]) vtx([c[0], d, c[2]], spot, path, look, col, 0); } };
  const quad = (spot, path, look, col, kind) => { for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]) vtx([u, 0, v], spot, path, look, col, kind); };
  const WHITE = [0.72, 0.86, 1.0];
  [[1, -1], [3, 1], [5, -1]].forEach(([i, sd], j) => {
    const L = [sd * 5.75, 7.62, pillarZ[i] + 0.1];
    steel.add(pipe(0.03), at(L[0], 7.86, L[2], 1, 0.3, 1), g(0, C.BAR), 0.19, 0.3, true);
    steel.add(ball, at(L[0], L[1], L[2]), g(0, C.GUN), 1, 1, true);
    steel.add(disc, at(L[0], 7.975, L[2], 0.2, 0.05, 0.2), g(0, C.BAR), 1, 0.05);
    const spot = [...L, 1], path = [sd * -0.4, pillarZ[i] - 5.2, 2.1, 3.0], look = [0.33 + 0.05 * j, j * 2.1, 0.13, 0];
    cone(spot, path, look, WHITE); quad(spot, path, look, WHITE, 1); quad(spot, path, look, WHITE, 2);
  });
  const alarmed = blocks.map((b) => b.alarm);
  pillarZ.forEach((z, i) => {
    if (!alarmed[i - 1] && !alarmed[i]) return; // (the pillars either side of a block in alarm)
    for (const sd of [-1, 1]) {
      const L = [X(sd, 1.1), 7.36, z];
      steel.add(box, at(X(sd, 1.07), 7.25, z, 0.26, 0.06, 0.22), g(0, C.BAR));
      steel.add(disc, at(L[0], 7.3, z, 0.105, 0.07, 0.105), g(0, C.DARK), 1, 0.07);
      const ph = (i * 1.9 + (sd > 0 ? 1.1 : 0)) % 6.283, RED = [1.0, 0.08, 0.1];
      for (const b of [0, Math.PI]) cone([...L, 1.3], [2.6, ph + b, 2.4, 0], [0, 0, 0.16, 1], RED);
      // its dome (a sphere's corners, all of one light)
      const sg = dome.toNonIndexed(), sp = sg.attributes.position.array;
      for (let k = 0; k < sp.length; k += 3) vtx([sp[k], Math.max(sp[k + 1], -0.2), sp[k + 2]], [...L, 1], [2.6, ph, 2.4, 0], [0, 0, 0.16, 1], RED, 3);
      sg.dispose();
    }
  });
  let patrol = null;
  if (P.aKind.length) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(P.pos, 3));
    for (const [k, n] of [["aSpot", 4], ["aPath", 4], ["aLook", 4], ["aCol", 3], ["aKind", 1]]) geo.setAttribute(k, new THREE.Float32BufferAttribute(P[k], n));
    patrol = new THREE.Mesh(geo, dressPatrolMaterial(calm));
    patrol.frustumCulled = false; patrol.renderOrder = 5; patrol.name = "patrol-lights";
  }
  box.dispose(); plane.dispose(); ball.dispose(); disc.dispose(); dome.dispose(); for (const p of pipes.values()) p.dispose();
  return { rows, signs, puffs, patrol, rowsTotal: ROWS };
}
