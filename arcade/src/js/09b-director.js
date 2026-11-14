// The Event Director: every few seconds something happens in the background of a
// scene (a train crosses, a helicopter sweeps its light, fireworks go up). Scenes
// register what can happen; the director decides when. Study comes first: while a
// question is on screen it slows down and holds the big events for the gaps
// between questions. Look only: nothing here touches the game's rules or clock.
class EventDirector {
  constructor(scene3d, o = {}) {
    this.s = scene3d;
    this.events = [];
    this.active = [];
    this.bag = [];
    this.log = []; // { id, at } of everything fired (the 60-second capture reads this)
    this.min = o.min || 3;
    this.max = o.max || 8;
    this.t = rand(1.5, 3);
  }
  // ev: { id, big, can(), start(run), update(dt, t, run) -> false when over, end(run), dur }
  add(ev) { this.events.push(ev); return this; }
  running(id) { return this.active.some((a) => a.ev.id === id); }
  update(dt, calm) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const a = this.active[i];
      a.t += dt;
      if (a.ev.update(dt, a.t, a) === false || a.t > (a.ev.dur || 30)) {
        if (a.ev.end) a.ev.end(a);
        this.active.splice(i, 1);
      }
    }
    // a question on screen, or Reduced effects: fewer events, and only quiet ones
    const quiet = calm || GFX.calm;
    this.t -= dt * (GFX.calm ? 0.4 : calm ? 0.8 : 1);
    if (this.t > 0) return;
    this.t = rand(this.min, this.max);
    const ev = this.pick(quiet);
    if (ev) this.fire(ev);
  }
  // A shuffled bag: every kind of event comes round before any repeats.
  pick(quiet) {
    const ok = (e) => (!quiet || !e.big) && !(GFX.calm && e.flashy) && !this.active.some((a) => a.ev === e) && (!e.can || e.can());
    for (let pass = 0; pass < 2; pass++) {
      if (!this.bag.length) this.bag = shuffle(this.events);
      const i = this.bag.findIndex(ok);
      if (i >= 0) return this.bag.splice(i, 1)[0];
      if (pass === 0 && this.bag.length < this.events.length) this.bag = shuffle(this.events);
    }
    return null;
  }
  fire(ev, arg) {
    const run = { ev, t: 0, arg };
    if (ev.start(run) === false) return null;
    this.active.push(run);
    this.log.push({ id: ev.id, at: +this.s.t.toFixed(2) });
    return run;
  }
  // Fire a named event now (answer feedback), unless it is already running.
  force(id, arg) {
    const ev = this.events.find((e) => e.id === id);
    return ev && !this.active.some((a) => a.ev === ev) ? this.fire(ev, arg) : null;
  }
}
