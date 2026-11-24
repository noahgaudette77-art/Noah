// Snaps in the games' characters (Phase 3, 2026-11-24): each game played with right and wrong answers, frame by frame
// at 60 Hz on the capture tool's clock (not drawn: a frame's picture does not change where things are), and the place
// in the world of every joint of every character written down each frame: the bones of every skinned mesh (Boss Rush's
// boss and wizard, the title's caged bosses), Risk Blaster's demon's joints and its fighter, Nest Egg Run's rig, the
// Final Exam's Proctor's joints. A snap is a move in one frame many times the moves of the frames round it (a cut between
// two poses, a clip dropped, a part put somewhere else); each character's worst moments are listed with the game's state
// then and whether the lens itself cut on that frame (a cut of the lens hides one of the characters').
//
//   node arcade/tools/capture.js arcade/tools/scenarios/pops.js --phone --size 220x478 --dpr 1 --out <dir> [--build f]
//
// GAMES=boss:5,boss:all,blaster,racer,exam,title (the default); FRAMES=n each game's play (default 1500; the exam 2100,
// to reach its ending); RATIO (default 4): a move this many times its neighbours' (the median of the four frames before
// and the four after) is listed, when it is also over 2% of the character's size in that frame. Prints the list and
// writes pops.json to --out. Test only: nothing here is the game.
const fs = require("fs"), path = require("path");
module.exports = async (cap) => {
  const GAMES = (process.env.GAMES || "boss:5,boss:all,blaster,racer,exam,title").split(",");
  const FRAMES = +(process.env.FRAMES || 1500), RATIO = +(process.env.RATIO || 4);
  const page = cap.page, out = [];
  const PATTERN = "RRWRRWRWRRWR";
  const frame = () => page.evaluate(() => window.__cap.frame);
  const state = () => page.evaluate(() => { const s = window.__arcade.Scenes.cur; if (!s) return { k: "none" }; if (s.quiz && s.quiz.sheet) return { k: "sheet" }; if (s.rounds && s.i !== undefined && s.state !== "over" && s.state !== "intro" && /exam/i.test(s.constructor.name)) return { k: "exam", i: s.i, n: s.rounds.length }; return { k: s.state || "?" }; });
  for (const spec of GAMES) {
    const [game, stage] = spec.split(":");
    if (game === "title") {
      await cap.eval(() => window.__arcade.go("title"));
      // (its bosses arrive as their files come in: the joints are counted once all twelve are in their cells)
      for (let i = 0; i < 900; i++) { await cap.fast(4); if (await cap.eval(() => { const s = window.__arcade.Scenes.cur; return !!(s && s.cells && s.cells.every((c) => c.boss && c.ready)); })) break; await page.waitForTimeout(100); }
    }
    else if (game === "exam") { await cap.eval(() => { window.__arcade.show.examSetup(); const b = document.querySelector("[data-act=len][data-v='20']"); if (b) b.click(); }); await cap.go("exam", "all"); }
    else await cap.go(game, stage || { blaster: "3", racer: "2", boss: "5" }[game]);
    // opened: until its first question is up (a game) or for two seconds (the title)
    for (let i = 0; i < 90; i++) {
      await cap.fast(10);
      const st = await state();
      if (st.k === "sheet") await cap.next();
      if (game === "title" ? i >= 12 : ["ask", "exam"].includes(st.k)) break;
    }
    // the characters, and a recorder that runs after each frame's update (the game's own frame is queued first)
    const info = await cap.eval(() => {
      const A = window.__arcade, s = A.Scenes.cur, sc = s.scene, list = [], groups = [], seen = new Set();
      const group = (name, vis, objs) => { objs = objs.filter((x) => x[1] && x[1].isObject3D); if (!objs.length) return; groups.push({ name, vis, i0: list.length, n: objs.length }); for (const [label, o] of objs) list.push({ label, o }); };
      const named = (o) => { const p = []; for (let q = o; q && q !== sc && p.length < 3; q = q.parent) if (q.name) p.push(q.name); return p.join("<") || o.type; };
      const inBoss = (o) => { const r = s.stage && s.stage.a && s.stage.a.root; for (let q = o; q; q = q.parent) if (q === r) return true; return false; };
      sc.traverse((o) => { if (o.isSkinnedMesh && o.skeleton && !seen.has(o.skeleton) && !inBoss(o)) { seen.add(o.skeleton); group("skin " + seen.size + " " + named(o), o, o.skeleton.bones.map((b, i) => [b.name || "bone" + i, b])); } });
      const st = s.stage, a = st && st.a;
      if (a && a.joint) { const bones = []; a.root.traverse((o) => { if (o.isBone) bones.push([o.name || "bone", o]); }); group("boss", a.root, bones.length ? bones : Object.keys(a.joint).map((n) => [n, a.joint[n]])); }
      if (s.enemy && s.enemy.J) group("demon", s.enemy.root || s.enemy.J.body, Object.keys(s.enemy.J).map((n) => [n, s.enemy.J[n]]));
      if (s.jet) group("fighter", s.jet.ship, [["ship", s.jet.ship], ["rig", s.jet.rig]].concat(s.jet.P ? Object.keys(s.jet.P).slice(0, 24).map((n) => [n, s.jet.P[n]]) : []));
      if (s.carKit) { const k = s.carKit, w = k.wheels || k.wheel || []; group("car", k.car, [["car", k.car], ["rig", k.rig]].concat((Array.isArray(w) ? w : []).map((x, i) => ["wheel" + i, x && (x.isObject3D ? x : x.h || x.o || x.mesh || x.grp)]))); }
      if (s.boss && s.boss.J) group("proctor", s.boss.root, Object.keys(s.boss.J).map((n) => [n, s.boss.J[n].grp]));
      const P = (window.__pops = { list, groups, pos: [], cpos: [], note: [], vis: [], st: [], cam: [], on: true, names: [] }), v = new THREE.Vector3(), q = new THREE.Quaternion(), fwd = new THREE.Vector3();
      const seenVis = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
      const rec = () => {
        if (!P.on || window.__arcade.Scenes.cur !== s) return;
        sc.updateMatrixWorld(true);
        const a = new Float32Array(list.length * 3), c = new Float32Array(list.length * 3), inv = s.camera.matrixWorldInverse.copy(s.camera.matrixWorld).invert();
        for (let i = 0; i < list.length; i++) { list[i].o.getWorldPosition(v); a[i * 3] = v.x; a[i * 3 + 1] = v.y; a[i * 3 + 2] = v.z; v.applyMatrix4(inv); c[i * 3] = v.x; c[i * 3 + 1] = v.y; c[i * 3 + 2] = v.z; }
        P.pos.push(a); P.cpos.push(c);
        const wz = s.stage && s.stage.wiz, ba = s.stage && s.stage.a;
        P.note.push((wz ? "wizard " + (wz.one ? wz.one.name + " " + wz.one.w.toFixed(2) : "-") + (wz.going.length ? " going " + wz.going.length : "") + " ready " + (wz.readyW || 0).toFixed(2) : "") + (ba ? " | boss " + (ba.play ? ba.play.name + " " + ba.play.t.toFixed(2) : "-") + (ba.atk && ba.atk.clip ? " atk " + ba.atk.clip + " " + ba.atk.t.toFixed(2) + " w" + ba.atk.w.toFixed(2) : "") : "") + (s.boss && s.boss.pose ? " | pose " + (Object.keys(window.__arcade.BOSS_POSE || {}).find((k) => window.__arcade.BOSS_POSE[k] === s.boss.pose) || "?") : ""));
        P.vis.push(groups.map((g) => (seenVis(g.vis) ? 1 : 0)));
        let k = P.names.indexOf(String(s.state)); if (k < 0) { P.names.push(String(s.state)); k = P.names.length - 1; }
        P.st.push(k);
        const cam = s.camera; cam.getWorldPosition(v); cam.getWorldQuaternion(q); fwd.set(0, 0, -1).applyQuaternion(q);
        P.cam.push([v.x, v.y, v.z, fwd.x, fwd.y, fwd.z]);
        requestAnimationFrame(rec);
      };
      requestAnimationFrame(rec);
      return { groups: groups.map((g) => g.name + " (" + g.n + ")"), tracks: list.length };
    });
    console.log(`${spec}: ${info.tracks} joints in ${info.groups.length} characters: ${info.groups.join(", ")}`);
    // the play
    const f1 = await frame(), max = game === "exam" ? Math.max(FRAMES, 2100) : FRAMES;
    let answered = 0, wait = 0, waitSheet = 0;
    while ((await frame()) - f1 < max) {
      await cap.fast(10);
      const st = await state();
      if (st.k === "ask" || st.k === "exam") {
        wait += 10;
        if (wait >= 60) {
          const kind = PATTERN[answered % PATTERN.length];
          if (st.k === "ask") await cap.answer(kind);
          else await cap.eval(([w, last]) => { const s = window.__arcade.Scenes.cur, r = s.rounds[s.i], ok = r.correct, n = (r.answers || r.options || r.choices || [0, 0, 0, 0]).length || 4; s.pick(w === "W" ? (ok + 1) % n : ok); if (last) s.submit(); else s.go(1); }, [game === "exam" && process.env.EXAM_FAIL ? "W" : kind, st.i >= st.n - 1]);
          answered++; wait = 0;
        }
      } else wait = 0;
      if (st.k === "sheet") { waitSheet += 10; if (waitSheet >= 90) { await cap.next(); waitSheet = 0; } }
      if (await page.evaluate(() => !window.__pops.on || !window.__arcade.Scenes.cur)) break;
      const gone = await page.evaluate(() => window.__pops.pos.length && window.__arcade.Scenes.cur && !window.__arcade.Scenes.cur.scene);
      if (gone) break;
    }
    // the snaps, worked out in the page (the places stay there)
    const res = await cap.eval((ratioMin) => {
      const P = window.__pops; P.on = false;
      const N = P.pos.length, res = [];
      for (let gi = 0; gi < P.groups.length; gi++) {
        const g = P.groups[gi], ev = new Map();
        // (its size: the largest extent of its joints in the first frame it is seen)
        let f0 = 0; while (f0 < N && !P.vis[f0][gi]) f0++;
        if (f0 >= N) { res.push({ name: g.name, seen: 0 }); continue; }
        const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
        for (let j = 0; j < g.n; j++) for (let c = 0; c < 3; c++) { const x = P.pos[f0][(g.i0 + j) * 3 + c]; lo[c] = Math.min(lo[c], x); hi[c] = Math.max(hi[c], x); }
        const size = Math.max(1e-3, hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
        let seen = 0;
        for (let i = 1; i < N; i++) if (P.vis[i][gi]) seen++;
        for (let j = 0; j < g.n; j++) {
          const k = (g.i0 + j) * 3, steps = (X) => { const st = new Float32Array(N); for (let i = 1; i < N; i++) st[i] = Math.hypot(X[i][k] - X[i - 1][k], X[i][k + 1] - X[i - 1][k + 1], X[i][k + 2] - X[i - 1][k + 2]); return st; };
          const step = steps(P.pos), cstep = steps(P.cpos);
          const sudden = (S, i) => { const m = S[i], around = [S[i - 4], S[i - 3], S[i - 2], S[i - 1], S[i + 1], S[i + 2], S[i + 3], S[i + 4]].sort((a, b) => a - b), med = (around[3] + around[4]) / 2; return { m, med, r: m / Math.max(med, 0.002 * size) }; };
          for (let i = 5; i < N - 4; i++) {
            if (!P.vis[i][gi] || !P.vis[i - 1][gi]) continue;
            if (step[i] < 0.02 * size || cstep[i] < 0.02 * size) continue;
            const W = sudden(step, i), C = sudden(cstep, i), m = W.m, med = W.med, r = Math.min(W.r, C.r);
            if (r < ratioMin) continue;
            const e = ev.get(i) || { f: i, ratio: 0, joints: 0, rel: 0 };
            e.joints++;
            if (r > e.ratio) { e.ratio = r; e.joint = P.list[g.i0 + j].label; e.rel = m / size; e.med = med / size; }
            ev.set(i, e);
          }
        }
        const top = [...ev.values()].sort((a, b) => b.ratio - a.ratio).slice(0, 6).map((e) => {
          const c0 = P.cam[e.f - 1], c1 = P.cam[e.f], dp = Math.hypot(c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]), da = Math.acos(Math.max(-1, Math.min(1, c0[3] * c1[3] + c0[4] * c1[4] + c0[5] * c1[5]))) * 57.3;
          return { frame: e.f, t: +(e.f / 60).toFixed(2), state: P.names[P.st[e.f]], note: (P.note[e.f - 1] || "") + " -> " + (P.note[e.f] || ""), joint: e.joint, joints: e.joints, ratio: +e.ratio.toFixed(1), movePct: +(e.rel * 100).toFixed(1), neighboursPct: +(e.med * 100).toFixed(2), lens: dp.toFixed(2) + " / " + da.toFixed(1) + "°" };
        });
        // its feet: how far a planted foot slides (a foot within 2% of its size of the lowest it goes, in two frames
        // running, moving across the floor): the whole run's slide, and its fastest frame, in % of its size
        const feet = [];
        for (let j = 0; j < g.n; j++) {
          if (!/foot|toe/i.test(P.list[g.i0 + j].label)) continue;
          const k = (g.i0 + j) * 3;
          let lo = 1e9; for (let i = 0; i < N; i++) if (P.vis[i][gi]) lo = Math.min(lo, P.pos[i][k + 1]);
          let planted = 0, slide = 0, fast = 0, fastAt = 0;
          for (let i = 1; i < N; i++) {
            if (!P.vis[i][gi] || !P.vis[i - 1][gi]) continue;
            if (P.pos[i][k + 1] > lo + 0.02 * size || P.pos[i - 1][k + 1] > lo + 0.02 * size) continue;
            planted++;
            const m = Math.hypot(P.pos[i][k] - P.pos[i - 1][k], P.pos[i][k + 2] - P.pos[i - 1][k + 2]);
            slide += m; if (m > fast) { fast = m; fastAt = i; }
          }
          feet.push({ joint: P.list[g.i0 + j].label, plantedS: +(planted / 60).toFixed(1), slidePctPerS: planted ? +((slide / size) * 100 / (planted / 60)).toFixed(2) : 0, fastPct: +((fast / size) * 100).toFixed(2), fastT: +(fastAt / 60).toFixed(2), fastState: P.names[P.st[fastAt]] });
        }
        res.push({ name: g.name, size: +size.toFixed(2), seen, events: ev.size, top, feet });
      }
      return { frames: N, res };
    }, RATIO);
    out.push({ game: spec, frames: res.frames, answered, characters: res.res });
    console.log(`  ${res.frames} frames, ${answered} answers`);
    for (const c of res.res) {
      if (!c.seen) { console.log(`  ${c.name}: never seen`); continue; }
      console.log(`  ${c.name} (size ${c.size}, seen ${c.seen} frames): ${c.events} snaps` + (c.top.length ? "" : " (none)"));
      for (const f of c.feet || []) console.log(`    foot ${f.joint}: planted ${f.plantedS} s, sliding ${f.slidePctPerS}% of its size a second while planted; its fastest ${f.fastPct}% in a frame @${f.fastT}s (${f.fastState})`);
      for (const e of c.top) console.log(`    @${e.t}s (frame ${e.frame}, ${e.state}): ${e.joint} ${e.movePct}% of its size in a frame, x${e.ratio} its neighbours (${e.neighboursPct}%), ${e.joints} joints at once; the lens ${e.lens}` + (e.note.length > 4 ? `\n      ${e.note}` : ""));
    }
    await cap.eval(() => { window.__pops = null; });
  }
  fs.writeFileSync(path.join(cap.out, "pops.json"), JSON.stringify(out, null, 1));
};
