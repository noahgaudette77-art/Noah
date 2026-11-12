// The quiet life of the Final Exam's hall. Look only. (The boss that stands in it is in
// 24c-examboss.js.) Every motion here is slow and steady: no events, no flashes.

// The hall's slow life: paper lanterns rising past the windows, moonbeams that sway a
// little, an aurora over the night sky (see examNightMaterial). All of it continuous.
class ExamAmbience {
  constructor(game, beams) {
    const g = (this.g = game);
    this.beams = beams;
    this.lanterns = Array.from({ length: 9 }, (_, i) => {
      const s = glowSprite(neon(i % 3 ? 0xffb86a : 0xff8fd0, 1.3), 1.5, 0.9);
      s.userData = { x: EXAM_WINDOWS[(i * 2 + 1) % EXAM_WINDOWS.length] + rand(-1.4, 1.4), y: rand(0, 30), v: rand(0.25, 0.5), ph: rand(6.28) };
      s.position.z = EXAM_WALL_Z - 4 - (i % 3) * 2;
      s.layers.set(1);
      g.scene.add(s);
      return s;
    });
    g.decor(...this.lanterns);
    this.base = new THREE.Vector3(-0.3, -0.62, 0.72);
    this._d = new THREE.Vector3();
    this._up = new THREE.Vector3(0, -1, 0);
  }
  update(dt, t) {
    this.lanterns.forEach((s) => {
      const u = s.userData;
      u.y += u.v * dt;
      if (u.y > 32) { u.y = -1; u.x = pick(EXAM_WINDOWS) + rand(-1.4, 1.4); }
      s.position.x = u.x + Math.sin(t * 0.3 + u.ph) * 0.6;
      s.position.y = u.y;
      s.material.opacity = 0.55 + 0.25 * Math.sin(t * 1.3 + u.ph);
    });
    this.beams.forEach((b, i) => {
      this._d.copy(this.base); this._d.x += 0.05 * Math.sin(t * 0.11 + i * 1.7);
      b.quaternion.setFromUnitVectors(this._up, this._d.normalize());
      b.material.uniforms.uI.value = 0.075 * (1 + 0.22 * Math.sin(t * 0.23 + i * 2.1));
    });
  }
}
