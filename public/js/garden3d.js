// ─────────────────────────────────────────────
//  3D ASCII GARDEN
//
//  A tiny point renderer: every surface (ground, stems, leaves, petals, wings)
//  is a cloud of points with a normal. Each frame the points are projected
//  through an orbiting perspective camera into a character grid with a depth
//  buffer; lighting picks the brightness, the surface picks the glyph. Fills
//  use the same live 0/1 bit stream as the 2D garden.
//
//    const g = new Garden3D(canvas, { follow: false });
//    g.toggleFollow();   // camera chases the white butterfly
// ─────────────────────────────────────────────
(function () {
  // ── Palette: base colours × 4 brightness levels ──
  const BASE = ['#3f6b3f', '#6f9f6f', '#4f8a4f', '#e6c34a', '#ff8a8a', '#f4f4f4', '#cfcfcf', '#8a8a9a',
    '#e6d27a', '#8ac6ff', '#c49aff', '#7fe0b0', '#ffb070', '#6a5214', '#d7e6ff'];
  const C = { ground: 0, stem: 1, leaf: 2, gold: 3, pink: 4, white: 5, body: 6, star: 7, pollen: 8, blue: 9, violet: 10, mint: 11, orange: 12, dark: 13, glass: 14 };
  const LEVELS = [0.3, 0.5, 0.75, 1];
  const PAL = [];
  for (const h of BASE) {
    const n = parseInt(h.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    for (const l of LEVELS) PAL.push(`rgb(${(r * l) | 0},${(g * l) | 0},${(b * l) | 0})`);
  }
  const CH = ['.', ',', "'", '`', ':', ';', '|', '0', '1', '@', 'o', '8', '=', '-', '*', '+', '/', '\\', '°'];
  const K = Object.fromEntries(CH.map((c, i) => [c, i]));
  const BIT = -1;                          // glyph slot meaning "use this point's live bit"
  const GRASS = [K['.'], K[','], K["'"], K['`'], K[';']];

  const L = norm([0.45, 1, 0.35]);       // light direction
  function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ── Static scene: a growing list of points (x y z nx ny nz colour glyph swayAmp phase fogless) ──
  const F = 11;
  function Cloud() { this.d = []; }
  Cloud.prototype.add = function (x, y, z, nx, ny, nz, col, ch, sway = 0, ph = 0, fogless = 0) {
    this.d.push(x, y, z, nx, ny, nz, col, ch, sway, ph, fogless);
  };

  function buildScene() {
    const s = new Cloud(), heads = [];
    // Ground: a jittered disc of grass glyphs
    const R = 5.2;
    for (let i = 0; i < 9000; i++) {
      const r = R * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2;
      s.add(r * Math.cos(a), 0, r * Math.sin(a), 0, 1, 0, C.ground, GRASS[(Math.random() * GRASS.length) | 0]);
    }
    // Short grass tufts
    for (let i = 0; i < 700; i++) {
      const r = R * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2, x = r * Math.cos(a), z = r * Math.sin(a), h = rand(0.05, 0.16);
      for (let k = 1; k <= 3; k++) s.add(x, (h * k) / 3, z, 0.3, 0.5, 0.3, C.stem, K[k === 3 ? "'" : '|'], (h * k) / 3, a);
    }
    // Stars on a dome
    for (let i = 0; i < 260; i++) {
      const a = Math.random() * Math.PI * 2, e = rand(0.12, 1.3), r = 40;
      s.add(r * Math.cos(a) * Math.cos(e), r * Math.sin(e), r * Math.sin(a) * Math.cos(e), 0, -1, 0, C.star, Math.random() < 0.2 ? K['+'] : K['.'], 0, 0, 1);
    }
    // Flowers
    const PETALS = [C.pink, C.blue, C.violet, C.gold, C.mint, C.orange];
    const placed = [];
    let tries = 0;
    while (placed.length < 22 && tries++ < 600) {
      const r = 4.2 * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2;
      const x = r * Math.cos(a), z = r * Math.sin(a);
      if (placed.some((p) => Math.hypot(p[0] - x, p[1] - z) < 0.7)) continue;
      placed.push([x, z]);
      const h = rand(0.7, 1.5), ph = Math.random() * 6.28, col = PETALS[placed.length % PETALS.length];
      const kind = placed.length % 3;     // 0 daisy (flat), 1 cup, 2 star
      // Stem with a gentle bend
      const bend = rand(-0.12, 0.12);
      for (let t = 0; t <= 1; t += 0.025) {
        const y = t * h, ox = Math.sin(t * Math.PI) * bend;
        s.add(x + ox, y, z, 0.6, 0.2, 0.6, C.stem, t > 0.5 && Math.random() < 0.3 ? K[':'] : K['|'], y, ph);
      }
      // Two leaves
      for (let l = 0; l < 2; l++) {
        const ly = h * rand(0.25, 0.55), la = Math.random() * Math.PI * 2, len = rand(0.22, 0.34);
        const dx = Math.cos(la), dz = Math.sin(la);
        for (let u = 0; u <= 1; u += 0.05) for (let w = -1; w <= 1; w += 0.25) {
          const width = Math.sin(u * Math.PI) * 0.07;
          const px = x + dx * u * len - dz * w * width, pz = z + dz * u * len + dx * w * width, py = ly + u * len * 0.45;
          s.add(px, py, pz, -dx * 0.4, 0.9, -dz * 0.4, C.leaf, Math.abs(w) > 0.8 || u > 0.92 ? K[':'] : BIT, py, ph);
        }
      }
      // Head: petals around a gold centre, tilted up into a shallow cup
      const hr = kind === 1 ? 0.22 : 0.32, tilt = kind === 1 ? 0.9 : 0.25;
      const n = kind === 2 ? 5 : 7;
      for (let rr = 0.04; rr <= hr; rr += 0.016) {
        for (let a2 = 0; a2 < Math.PI * 2; a2 += 0.09 / Math.max(rr, 0.05)) {
          const petal = kind === 1 ? 1 : 0.55 + 0.45 * Math.pow(Math.abs(Math.cos((n / 2) * a2)), kind === 2 ? 3 : 1);
          if (rr > hr * petal) continue;
          const cx = Math.cos(a2), cz = Math.sin(a2), lift = rr * tilt;
          const centre = rr < 0.055;
          const edge = rr > hr * petal - 0.022;
          s.add(x + bend * 0 + cx * rr, h + lift, z + cz * rr, -cx * tilt * 0.6, 1, -cz * tilt * 0.6,
            centre ? C.gold : col, centre ? (rr < 0.03 ? K['@'] : K.o) : edge ? K[':'] : BIT, h, ph);
        }
      }
      heads.push({ x, y: h, z, ph, col });
    }
    return { pts: new Float32Array(s.d), heads };
  }

  // ── Butterfly template (body frame: u forward, w outward from the body) ──
  function wingTemplate() {
    const pts = [];
    const fore = { cu: 0.07, cw: 0.21, a: 0.15, b: 0.2, rot: 0.5, spot: [0.12, 0.3, 0.045] };
    const hind = { cu: -0.09, cw: 0.15, a: 0.11, b: 0.13, rot: -0.4, spot: [-0.1, 0.2, 0.03] };
    for (let u = -0.26; u <= 0.3; u += 0.014) for (let w = 0.02; w <= 0.44; w += 0.014) {
      let best = null;
      for (const e of [fore, hind]) {
        const du = u - e.cu, dw = w - e.cw, cs = Math.cos(e.rot), sn = Math.sin(e.rot);
        const pu = du * cs - dw * sn, pw = du * sn + dw * cs;
        const d = (pu * pu) / (e.a * e.a) + (pw * pw) / (e.b * e.b);
        if (d < 1 && (!best || d < best.d)) best = { d, e };
      }
      if (!best) continue;
      const [su, sw, sr] = best.e.spot;
      const spot = Math.hypot(u - su, w - sw) < sr;
      pts.push(u, w, spot ? 2 : best.d > 0.78 ? 1 : 0);   // 0 fill, 1 edge, 2 spot
    }
    return new Float32Array(pts);
  }

  class Garden3D {
    constructor(canvas, opts = {}) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const sc = buildScene();
      this.pts = sc.pts; this.heads = sc.heads;
      this.nStatic = this.pts.length / F;
      this.bits = Uint8Array.from({ length: this.nStatic + 4000 }, () => (Math.random() < 0.5 ? 1 : 0));
      this.wing = wingTemplate();

      // Camera (orbit)
      this.yaw = 0.6; this.pitch = 0.3; this.dist = 6.2; this.tgt = [0, 0.7, 0];
      this.follow = !!opts.follow; this.idle = 0;

      // Butterflies: the white one is "ours"
      const cols = [[C.white, C.pink], [C.blue, C.white], [C.violet, C.gold], [C.orange, C.dark]];
      this.flyers = cols.map(([wingC, spotC], i) => ({
        wingC, spotC, scale: i === 0 ? 0.85 : rand(0.55, 0.72),
        p: [rand(-2, 2), rand(1.2, 2.2), rand(-2, 2)], v: [0, 0, 0], yaw: Math.random() * 6.28,
        phase: Math.random() * 6, glide: 0, perched: false, perchT: 0, target: (Math.random() * this.heads.length) | 0,
        wand: 0, w: [0, 0, 0], flap: 0.5, hopT: 0,
      }));
      // One bee, busy and direct
      this.bee = { p: [0, 1, 0], v: [0, 0, 0], target: 0, t: 0, yaw: 0 };
      // Pollen motes drifting up from the flowers
      this.motes = Array.from({ length: 70 }, () => this.newMote(true));

      this.resize();
      addEventListener('resize', () => this.resize());
      this.bindInput();
      this.last = performance.now();
      const loop = (now) => { requestAnimationFrame(loop); this.frame(Math.min(0.05, (now - this.last) / 1000), now / 1000); this.last = now; };
      requestAnimationFrame(loop);
    }

    newMote(any) {
      const h = this.heads[(Math.random() * this.heads.length) | 0];
      return { x: h.x + rand(-0.1, 0.1), y: h.y + (any ? rand(0, 1.5) : 0), z: h.z + rand(-0.1, 0.1), vy: rand(0.08, 0.22), life: rand(4, 9), age: any ? rand(0, 4) : 0, dx: rand(-0.05, 0.05), dz: rand(-0.05, 0.05) };
    }

    resize() {
      const r = this.canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
      this.W = r.width; this.H = r.height;
      this.canvas.width = r.width * d; this.canvas.height = r.height * d;
      this.ctx.setTransform(d, 0, 0, d, 0, 0);
      this.fs = r.width < 600 ? 9 : 12;
      this.cw = this.fs * 0.62; this.chH = this.fs * 1.08;
      this.COLS = Math.ceil(r.width / this.cw); this.ROWS = Math.ceil(r.height / this.chH);
      const n = this.COLS * this.ROWS;
      this.zb = new Float32Array(n); this.gl = new Int8Array(n); this.co = new Int16Array(n);
      this.order = new Int32Array(n); this.counts = new Int32Array(PAL.length);
    }

    bindInput() {
      const c = this.canvas;
      let drag = null;
      c.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; c.setPointerCapture(e.pointerId); this.idle = 0; });
      c.addEventListener('pointermove', (e) => {
        if (!drag) return;
        this.yaw -= (e.clientX - drag.x) * 0.006;
        this.pitch = clamp(this.pitch + (e.clientY - drag.y) * 0.004, 0.05, 1.2);
        drag = { x: e.clientX, y: e.clientY }; this.idle = 0;
      });
      const end = () => { drag = null; };
      c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
      c.addEventListener('wheel', (e) => { e.preventDefault(); this.dist = clamp(this.dist * Math.exp(e.deltaY * 0.001), 2.2, 12); this.idle = 0; }, { passive: false });
      this.dragging = () => !!drag;
    }

    toggleFollow() { this.follow = !this.follow; this.idle = 0; return this.follow; }

    // ── Natural flight: wander + steer + glides + perching (same rules as the 2D page) ──
    stepFlyer(b, dt, t) {
      const h = this.heads[b.target];
      const seat = [h.x, h.y + 0.05, h.z];
      const d = [seat[0] - b.p[0], seat[1] - b.p[1], seat[2] - b.p[2]], dl = Math.hypot(d[0], d[1], d[2]);
      b.hopT += dt;
      if (b.perched) {
        b.perchT += dt;
        b.p = seat;
        b.flap = 1.25 + 0.22 * Math.sin(t * 1.4 + b.phase);   // wings folded, slowly breathing
        if (b.perchT > b.dwell) {                           // move on: sometimes far, sometimes next door
          b.perched = false; b.hopT = 0;
          b.target = (Math.random() * this.heads.length) | 0;
          b.v = [Math.cos(b.yaw) * 0.4, 0.9, Math.sin(b.yaw) * 0.4];
        }
        return;
      }
      if (b.hopT > 12) { b.target = (Math.random() * this.heads.length) | 0; b.hopT = 0; }
      b.wand -= dt;
      if (b.wand <= 0) { b.wand = rand(0.15, 0.6); b.w = [rand(-1, 1) * 0.9, rand(-0.6, 0.9), rand(-1, 1) * 0.9]; }
      const arrive = Math.min(1, dl / 1.2), speed = 1.5;
      const wob = 0.25 + 0.75 * arrive;
      const st = Math.min(1, dt * (dl < 0.4 ? 6 : 2.2));
      for (let k = 0; k < 3; k++) {
        const want = (d[k] / (dl || 1)) * speed * arrive + b.w[k] * wob + (k === 1 && dl > 1 ? 0.25 : 0);
        b.v[k] += (want - b.v[k]) * st;
      }
      if (b.glide > 0) { b.glide -= dt; b.v[1] -= 0.6 * dt; }
      else if (dl > 1.2 && Math.random() < dt * 0.5) b.glide = rand(0.3, 0.7);
      for (let k = 0; k < 3; k++) b.p[k] += b.v[k] * dt;
      if (b.p[1] < 0.25) b.v[1] += 3 * dt;
      // Flap: fast beats, a lift on each downstroke, flat wings while gliding
      if (b.glide > 0) b.flap += (0.12 - b.flap) * Math.min(1, dt * 8);
      else { b.phase += dt * 2 * Math.PI * 6; b.flap = 0.35 + 0.8 * Math.sin(b.phase); b.p[1] += Math.max(0, Math.cos(b.phase)) * 0.012; }
      const hv = Math.hypot(b.v[0], b.v[2]);
      if (hv > 0.12) {                       // turn smoothly toward the direction of travel
        const da = ((Math.atan2(b.v[2], b.v[0]) - b.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        b.yaw += da * Math.min(1, dt * 6);
      }
      if (dl < 0.06) { b.perched = true; b.perchT = 0; b.glide = 0; b.dwell = rand(1.8, 4.5); }
    }

    stepBee(dt, t) {
      const e = this.bee, h = this.heads[e.target];
      const seat = [h.x, h.y + 0.1, h.z];
      const d = [seat[0] - e.p[0], seat[1] - e.p[1], seat[2] - e.p[2]], dl = Math.hypot(d[0], d[1], d[2]);
      e.t += dt;
      if (dl < 0.08 && e.t > 1.2) { e.target = (e.target + 1 + ((Math.random() * 2) | 0)) % Math.min(6, this.heads.length); e.t = 0; }
      const arrive = Math.min(1, dl / 0.5);
      for (let k = 0; k < 3; k++) e.v[k] += ((d[k] / (dl || 1)) * 2.2 * arrive - e.v[k]) * Math.min(1, dt * 5);
      for (let k = 0; k < 3; k++) e.p[k] += e.v[k] * dt;
      e.p[1] += Math.sin(t * 9) * 0.004;
      if (Math.hypot(e.v[0], e.v[2]) > 0.2) e.yaw = Math.atan2(e.v[2], e.v[0]);
    }

    frame(dt, t) {
      const { ctx, COLS, ROWS, zb, gl, co } = this;
      if (this.reduced) dt *= 0.5;
      // Flip a few bits: the live data stream
      for (let i = 0; i < 400; i++) this.bits[(Math.random() * this.bits.length) | 0] ^= 1;
      for (const b of this.flyers) this.stepFlyer(b, dt, t);
      this.stepBee(dt, t);
      for (const m of this.motes) {
        m.age += dt; m.y += m.vy * dt; m.x += Math.sin(t + m.dx * 50) * 0.002 + m.dx * dt; m.z += m.dz * dt;
        if (m.age > m.life) Object.assign(m, this.newMote(false));
      }

      // Camera: idle auto-orbit; follow mode eases toward the white butterfly
      this.idle += dt;
      if (!this.dragging() && this.idle > 2.5 && !this.reduced) this.yaw += dt * 0.09;
      const want = this.follow ? this.flyers[0].p : [0, 0.7, 0];
      for (let k = 0; k < 3; k++) this.tgt[k] += (want[k] - this.tgt[k]) * Math.min(1, dt * 2.5);
      const dist = this.follow ? Math.min(this.dist, 2.6) : this.dist;
      const cp = Math.cos(this.pitch);
      const cam = [this.tgt[0] + dist * Math.sin(this.yaw) * cp, this.tgt[1] + dist * Math.sin(this.pitch), this.tgt[2] + dist * Math.cos(this.yaw) * cp];
      const f = norm([this.tgt[0] - cam[0], this.tgt[1] - cam[1], this.tgt[2] - cam[2]]);
      const r = norm([-f[2], 0, f[0]]);                       // right = forward × up
      const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
      const FOC = this.H * 1.05, cwI = 1 / this.cw, chI = 1 / this.chH, hc = COLS / 2, hr = ROWS / 2;
      zb.fill(0);
      const bits = this.bits;

      // Project one point into the grid (depth test, lighting → brightness level)
      const put = (x, y, z, nx, ny, nz, col, ch, fogless, bitIdx) => {
        const dx = x - cam[0], dy = y - cam[1], dz = z - cam[2];
        const zc = dx * f[0] + dy * f[1] + dz * f[2];
        if (zc < 0.15) return;
        const sx = (hc + ((dx * r[0] + dy * r[1] + dz * r[2]) / zc) * FOC * cwI) | 0;
        const sy = (hr - ((dx * u[0] + dy * u[1] + dz * u[2]) / zc) * FOC * chI) | 0;
        if (sx < 0 || sy < 0 || sx >= COLS || sy >= ROWS) return;
        const i = sy * COLS + sx, iz = 1 / zc;
        if (iz <= zb[i]) return;
        zb[i] = iz;
        const lum = 0.35 + 0.65 * Math.abs(nx * L[0] + ny * L[1] + nz * L[2]);
        const fog = fogless ? 0.55 : clamp(1.3 - zc / 13, 0.15, 1);
        gl[i] = ch === BIT ? (bits[bitIdx % bits.length] ? K['1'] : K['0']) : ch;
        co[i] = col * 4 + Math.min(3, Math.max(0, (lum * fog * 4.2 - 0.4) | 0));
      };

      // Static scene with sway
      const P = this.pts;
      for (let n = 0, o = 0; n < this.nStatic; n++, o += F) {
        const sway = P[o + 8], sw = sway ? Math.sin(t * 1.3 + P[o + 9]) * 0.04 * sway : 0;
        put(P[o] + sw, P[o + 1], P[o + 2] + sw * 0.6, P[o + 3], P[o + 4], P[o + 5], P[o + 6], P[o + 7], P[o + 10], n);
      }
      // Pollen
      for (const m of this.motes) {
        const a = Math.sin((m.age / m.life) * Math.PI);
        if (a > 0.2) put(m.x, m.y, m.z, 0, 1, 0, C.pollen, a > 0.8 ? K['*'] : K['.'], 0, 0);
      }
      // Butterflies
      const W = this.wing;
      let bi = this.nStatic;
      for (const b of this.flyers) {
        const s = b.scale, cy = Math.cos(b.yaw), sy = Math.sin(b.yaw);
        const Fw = [cy, 0, sy], Sd = [-sy, 0, cy];            // forward, side (up is world up)
        const pitch = b.perched ? 0 : clamp(b.v[1] * 0.25, -0.4, 0.4);
        const Fv = [Fw[0] * Math.cos(pitch), Math.sin(pitch), Fw[2] * Math.cos(pitch)];
        const cf = Math.cos(b.flap), sf = Math.sin(b.flap);
        for (let side = -1; side <= 1; side += 2) {
          for (let k = 0; k < W.length; k += 3) {
            const wu = W[k] * s, ww = W[k + 1] * s, kind = W[k + 2];
            // wing point: along the body + outward, rotated up by the flap angle
            const ox = Sd[0] * side * cf * ww, oz = Sd[2] * side * cf * ww, oy = sf * ww;
            const nx = -Sd[0] * side * sf, ny = cf, nz = -Sd[2] * side * sf;
            put(b.p[0] + Fv[0] * wu + ox, b.p[1] + Fv[1] * wu + oy, b.p[2] + Fv[2] * wu + oz, nx, ny, nz,
              kind === 2 ? b.spotC : b.wingC, kind === 1 ? K[':'] : kind === 2 ? K['1'] : BIT, 0, bi + k);
          }
        }
        // Body, head and antennae
        for (let q = -0.2; q <= 0.17; q += 0.012) {
          put(b.p[0] + Fv[0] * q * s, b.p[1] + Fv[1] * q * s + 0.005, b.p[2] + Fv[2] * q * s, 0, 1, 0, C.body, q > 0.13 ? K['0'] : q > 0.02 ? K['8'] : K['='], 0, 0);
        }
        for (let side = -1; side <= 1; side += 2) for (let q = 0; q <= 1; q += 0.12) {
          const ax = b.p[0] + (Fv[0] * (0.17 + q * 0.14) + Sd[0] * side * q * 0.05) * s, ay = b.p[1] + q * 0.12 * s, az = b.p[2] + (Fv[2] * (0.17 + q * 0.14) + Sd[2] * side * q * 0.05) * s;
          put(ax, ay, az, 0, 1, 0, C.body, q > 0.85 ? K['°'] : K['/'], 0, 0);
        }
        bi += 700;
      }
      // Bee: striped body + a blur of wings
      {
        const e = this.bee, cy = Math.cos(e.yaw), sy = Math.sin(e.yaw);
        for (let q = -0.09; q <= 0.09; q += 0.012) for (let a = 0; a < 6.28; a += 0.5) {
          const rad = 0.045 * Math.sqrt(Math.max(0, 1 - (q / 0.1) ** 2));
          const sx2 = -sy * Math.cos(a) * rad, sz2 = cy * Math.cos(a) * rad, yy = Math.sin(a) * rad;
          const stripe = ((q + 0.1) / 0.03) | 0;
          put(e.p[0] + cy * q + sx2, e.p[1] + yy, e.p[2] + sy * q + sz2, -sy * Math.cos(a), Math.sin(a), cy * Math.cos(a),
            q > 0.07 ? C.gold : stripe % 2 ? C.gold : C.dark, q > 0.07 ? K['0'] : stripe % 2 ? BIT : K['='], 0, bi + (q * 1000) | 0);
        }
        const open = 0.4 + 0.6 * Math.abs(Math.sin(t * 40));
        for (let side = -1; side <= 1; side += 2) for (let w = 0.02; w < 0.12; w += 0.02) for (let q = -0.04; q < 0.04; q += 0.02) {
          put(e.p[0] + cy * q - sy * side * w * (1 - open * 0.5), e.p[1] + 0.04 + w * open, e.p[2] + sy * q + cy * side * w * (1 - open * 0.5), 0, 1, 0, C.glass, K[':'], 0, 0);
        }
      }

      // Draw: one fillStyle per colour (counting sort by colour)
      ctx.clearRect(0, 0, this.W, this.H);
      ctx.font = `700 ${this.fs}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textBaseline = 'top'; ctx.direction = 'ltr';
      const counts = this.counts; counts.fill(0);
      const n = COLS * ROWS;
      for (let i = 0; i < n; i++) if (zb[i] > 0) counts[co[i]]++;
      let acc = 0; const start = new Int32Array(PAL.length);
      for (let c = 0; c < PAL.length; c++) { start[c] = acc; acc += counts[c]; }
      const pos = start.slice();
      for (let i = 0; i < n; i++) if (zb[i] > 0) this.order[pos[co[i]]++] = i;
      for (let c = 0; c < PAL.length; c++) {
        if (!counts[c]) continue;
        ctx.fillStyle = PAL[c];
        for (let j = start[c], e = start[c] + counts[c]; j < e; j++) {
          const i = this.order[j];
          ctx.fillText(CH[gl[i]], (i % COLS) * this.cw, ((i / COLS) | 0) * this.chH);
        }
      }
    }
  }

  window.Garden3D = Garden3D;
})();
