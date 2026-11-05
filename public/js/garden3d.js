// ─────────────────────────────────────────────
//  3D ASCII GARDEN WALK
//
//  An endless, straight garden path at night, laid out like a real border:
//  flagstones down the middle, low flowers at the edge, mid-height in the
//  middle, tall spikes at the back, a clipped hedge behind them and a dark
//  tree line beyond. Rose arches and lanterns repeat along the path.
//
//  Two kinds of rendering, so nothing turns to mush at a distance:
//   • Surfaces (path, beds, hedges, trees, sky) are ray-cast once per
//     character cell from procedural patterns: crisp at any distance.
//   • Things (flowers, arches, lanterns, butterflies) are 3D point sets with
//     level of detail: full geometry up close, a small glyph icon further
//     away, a single glyph in the distance.
//
//    const g = new Garden3D(canvas);
//    g.setWalking(true | false);   drag to look around, scroll to walk
// ─────────────────────────────────────────────
(function () {
  // ── Palette: named colours × brightness levels ──
  const BASE = {
    stone: '#d6cab2', stoneW: '#f2d3a0', joint: '#2a2622', edging: '#a0644e', soil: '#5a4630', moss: '#3d6040',
    hedge: '#2f6b3b', hedge2: '#43874c', trees: '#20382a', stem: '#6fa56f', leaf: '#4f9152', star: '#9a9aaa', moon: '#ece8d4',
    lamp: '#ffd98a', glow: '#ffb45a', post: '#6a645c', white: '#f6f6f6', pink: '#ff8fb0', rose: '#ff5f7a', blush: '#ffc8d6',
    violet: '#b48cff', lavender: '#9d7ff0', blue: '#8ac6ff', gold: '#ffd24a', orange: '#ffa060', body: '#d4d4d4',
    dark: '#5a4614', glass: '#d7e6ff', firefly: '#d4ff7a', arch: '#8a7a68',
  };
  const NAMES = Object.keys(BASE);
  const C = Object.fromEntries(NAMES.map((n, i) => [n, i]));
  const LEVELS = [0.14, 0.26, 0.4, 0.56, 0.75, 1];
  const NL = LEVELS.length;
  const PAL = [];
  for (const n of NAMES) {
    const v = parseInt(BASE[n].slice(1), 16), r = v >> 16, g = (v >> 8) & 255, b = v & 255;
    for (const l of LEVELS) PAL.push(`rgb(${(r * l) | 0},${(g * l) | 0},${(b * l) | 0})`);
  }
  const CH = ['.', ',', "'", '`', ':', ';', '|', '0', '1', '@', 'o', '8', '=', '-', '*', '+', '/', '\\', '°', '#', '%', '&', '~', '^', 'v', 'Y', '(', ')', '_', 'O'];
  const K = Object.fromEntries(CH.map((c, i) => [c, i]));
  const PETAL_RAMP = ['.', ':', 'o', '*', '#', '@'].map((c) => K[c]);   // dark → bright
  const LEAF_RAMP = ['.', ',', ':', '-', '='].map((c) => K[c]);

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rampOf = (ramp, lum) => ramp[clamp((lum * ramp.length) | 0, 0, ramp.length - 1)];
  const levelOf = (lum) => clamp((lum * NL) | 0, 0, NL - 1);
  function hash2(a, b) {
    let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function rng(seed) {                      // mulberry32: same segment → same plants
    let a = seed | 0;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

  // ── Layout (x across the path, z along it; the walk heads toward −z) ──
  const PATH = 0.6, EDGE = 0.7, HEDGE = 2.45, TREES = 6.5, EYE = 0.78, SEG = 1;
  const ARCH_EVERY = 8, LAMP_EVERY = 4;
  const hedgeTop = (z) => 1.02 + 0.05 * Math.sin(z * 3.1) + 0.035 * Math.sin(z * 7.3);
  const treeTop = (z) => 2.3 + 0.8 * Math.abs(Math.sin(z * 0.53)) + 0.45 * Math.sin(z * 1.7 + 1) + 0.2 * Math.sin(z * 4.1);
  const MOON = norm([-0.35, 0.42, -0.84]);
  const LMOON = norm([-0.3, 0.8, 0.5]);
  const lampAt = (k) => ({ x: k & 1 ? PATH + 0.16 : -(PATH + 0.16), y: 0.95, z: -LAMP_EVERY * k - 2 });

  // Warm light from the nearest lanterns
  function lampLight(x, y, z) {
    const k0 = Math.round((-z - 2) / LAMP_EVERY);
    let I = 0;
    for (let k = k0 - 1; k <= k0 + 1; k++) {
      const l = lampAt(k), dx = x - l.x, dy = y - l.y, dz = z - l.z;
      I += 1.25 / (1 + 2.6 * (dx * dx + dy * dy * 0.7 + dz * dz));
    }
    return I;
  }

  // ── Flower templates: local points, built once per kind ──
  // Each point: x z (offsets, × size), a b (y = a·height + b·size), part, nx ny nz, edge
  const PART = { stem: 0, leaf: 1, petal: 2, centre: 3 };
  function template(kind) {
    const p = [];
    const add = (x, z, a, b, part, nx, ny, nz, edge = 0) => p.push(x, z, a, b, part, nx, ny, nz, edge);
    for (let t = 0; t <= 1.001; t += 0.025) { add(0.008, 0, t, 0, PART.stem, 1, 0.2, 0); add(-0.008, 0, t, 0, PART.stem, -1, 0.2, 0); }
    // Two leaves
    for (let l = 0; l < 2; l++) {
      const la = l * Math.PI + 0.6, dx = Math.cos(la), dz = Math.sin(la), at = kind === 'spike' ? 0.18 + l * 0.12 : 0.22 + l * 0.18;
      for (let u = 0.05; u <= 1; u += 0.06) for (let w = -1; w <= 1.001; w += 0.34) {
        const width = Math.pow(Math.sin(u * Math.PI), 0.8) * 0.06, len = 0.3;
        add(dx * u * len - dz * w * width, dz * u * len + dx * w * width, at, u * len * 0.5 - u * u * len * 0.35, PART.leaf, -dx * 0.5, 0.85, -dz * 0.5, Math.abs(w) > 0.9 ? 1 : 0);
      }
    }
    if (kind === 'spike') {
      // A raceme of small florets climbing the top of the stem (lavender / foxglove)
      for (let a = 0.5; a <= 1.04; a += 0.022) {
        const rr = 0.055 * (1.1 - (a - 0.5) * 1.5);
        for (let q = 0; q < 6; q++) {
          const qa = q * 1.05 + a * 9;
          add(Math.cos(qa) * rr, Math.sin(qa) * rr, a, 0, PART.petal, Math.cos(qa), 0.3, Math.sin(qa), q % 3 === 0 ? 1 : 0);
        }
      }
      return new Float32Array(p);
    }
    const spec = kind === 'daisy' ? { n: 12, len: 0.15, w: 0.024, up: 0.12, droop: 0.08, r0: 0.03 }
      : kind === 'tulip' ? { n: 6, len: 0.12, w: 0.055, up: 1.2, droop: -0.02, r0: 0.015 }
      : { n: 8, len: 0.14, w: 0.042, up: 0.4, droop: 0.02, r0: 0.026 };
    for (let j = 0; j < spec.n; j++) {
      const a = (j / spec.n) * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx;
      for (let t = 0; t <= 1.001; t += 0.09) {
        const radial = spec.r0 + t * spec.len * Math.cos(spec.up), vert = t * spec.len * Math.sin(spec.up) - spec.droop * t * t;
        const slope = Math.atan2(spec.len * Math.sin(spec.up) - 2 * spec.droop * t, spec.len * Math.cos(spec.up));
        const width = spec.w * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.04 + 0.04)), 0.65) * (kind === 'tulip' ? 0.7 + 0.5 * t : 1);
        for (let w = -1; w <= 1.001; w += 0.5) {
          add(dx * radial + px * w * width, dz * radial + pz * w * width, 1, vert, PART.petal,
            -dx * Math.sin(slope), Math.cos(slope), -dz * Math.sin(slope), Math.abs(w) > 0.9 || t > 0.95 ? 1 : 0);
        }
      }
    }
    for (let e = 0; e <= Math.PI / 2; e += 0.4) for (let a = 0; a < Math.PI * 2; a += 0.6) {
      const rr = 0.03 * Math.cos(e);
      add(Math.cos(a) * rr, Math.sin(a) * rr, 1, 0.018 * Math.sin(e) + 0.005, PART.centre, Math.cos(a), Math.sin(e) + 0.3, Math.sin(a));
    }
    return new Float32Array(p);
  }
  const TEMPLATES = { daisy: template('daisy'), tulip: template('tulip'), cosmos: template('cosmos'), spike: template('spike') };
  const ICONS = {                 // mid-distance icons: 3 columns around the head ('.' = nothing)
    daisy: [['\\', '|', '/'], ['-', 'o', '-'], ['/', '|', '\\']],
    cosmos: [['.', '*', '.'], ['*', '@', '*'], ['.', '*', '.']],
    tulip: [['\\', '^', '/'], ['(', '#', ')']],
  };

  // Rows of the border: where they sit, how tall, what grows there
  const ROWS = [
    { x0: 0.82, x1: 1.08, per: 2.2, h: [0.2, 0.32], size: 0.85, kinds: ['daisy', 'daisy', 'cosmos'], cols: ['white', 'gold', 'blush', 'white', 'pink'] },
    { x0: 1.22, x1: 1.62, per: 1.6, h: [0.42, 0.62], size: 1.15, kinds: ['tulip', 'cosmos', 'tulip'], cols: ['rose', 'pink', 'orange', 'white', 'violet', 'rose'] },
    { x0: 1.78, x1: 2.25, per: 1.7, h: [0.78, 1.0], size: 1.2, kinds: ['spike'], cols: ['lavender', 'violet', 'blue', 'blush', 'lavender'] },
  ];
  // Plants for one 1-unit segment of path, always the same for the same segment
  function segment(n) {
    const r = rng(n * 7919 + 13), out = [];
    for (const side of [-1, 1]) {
      ROWS.forEach((row, ri) => {
        const count = Math.floor(row.per + r());
        // Drifts: the same kind and colour for three or four segments at a time
        const drift = Math.floor((n + ri * 2 + (side > 0 ? 1 : 0)) / 3.5);
        const dr = rng(drift * 131 + ri * 17 + (side > 0 ? 7 : 0));
        const kind = row.kinds[(dr() * row.kinds.length) | 0], col = C[row.cols[(dr() * row.cols.length) | 0]];
        for (let i = 0; i < count; i++) {
          const z = -(n + (i + 0.2 + r() * 0.6) / count) * SEG;
          const x = side * (row.x0 + r() * (row.x1 - row.x0));
          out.push({ x, z, h: row.h[0] + r() * (row.h[1] - row.h[0]), size: row.size * (0.85 + r() * 0.3), kind, col, yaw: r() * 6.28, ph: r() * 6.28 });
        }
      });
    }
    return out;
  }

  // ── Butterfly wing template (u forward, w outward) ──
  const WING = (() => {
    const pts = [];
    const fore = { cu: 0.07, cw: 0.21, a: 0.15, b: 0.2, rot: 0.5, spot: [0.12, 0.3, 0.045] };
    const hind = { cu: -0.09, cw: 0.15, a: 0.11, b: 0.13, rot: -0.4, spot: [-0.1, 0.2, 0.03] };
    for (let u = -0.26; u <= 0.3; u += 0.016) for (let w = 0.02; w <= 0.44; w += 0.016) {
      let best = null;
      for (const e of [fore, hind]) {
        const du = u - e.cu, dw = w - e.cw, cs = Math.cos(e.rot), sn = Math.sin(e.rot);
        const pu = du * cs - dw * sn, pw = du * sn + dw * cs, d = (pu * pu) / (e.a * e.a) + (pw * pw) / (e.b * e.b);
        if (d < 1 && (!best || d < best.d)) best = { d, e };
      }
      if (!best) continue;
      const [su, sw, sr] = best.e.spot;
      pts.push(u, w, Math.hypot(u - su, w - sw) < sr ? 2 : best.d > 0.75 ? 1 : 0);
    }
    return new Float32Array(pts);
  })();

  class Garden3D {
    constructor(canvas) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.walking = !this.reduced;
      this.camZ = 0; this.lookYaw = 0; this.lookPitch = 0; this.idle = 0; this.pauseT = 0;
      this.segs = new Map();
      this.bits = Uint8Array.from({ length: 8192 }, () => (Math.random() < 0.5 ? 1 : 0));
      const wingCols = [['white', 'rose'], ['blue', 'white'], ['violet', 'gold'], ['orange', 'dark'], ['gold', 'dark']];
      this.flyers = wingCols.map(([w, s], i) => ({
        wingC: C[w], spotC: C[s], scale: i === 0 ? 0.55 : 0.4 + Math.random() * 0.12,
        p: [Math.random() * 2 - 1, 1 + Math.random() * 0.5, -3 - i * 2.2], v: [0, 0, 0], yaw: -Math.PI / 2,
        phase: Math.random() * 6, glide: 0, perched: false, perchT: 0, dwell: 2, target: null, wand: 0, w: [0, 0, 0], flap: 0.5, hopT: 0,
      }));
      this.bee = { p: [0.9, 0.5, -3], v: [0, 0, 0], target: null, t: 0, yaw: 0 };
      this.flies = Array.from({ length: 34 }, () => this.newFly(true));
      this.resize();
      addEventListener('resize', () => this.resize());
      if (document.fonts) document.fonts.ready.then(() => this.resize());
      this.bindInput();
      this.last = performance.now();
      const loop = (now) => { requestAnimationFrame(loop); this.frame(Math.min(0.05, (now - this.last) / 1000), now / 1000); this.last = now; };
      requestAnimationFrame(loop);
    }

    setWalking(on) { this.walking = on; return on; }

    newFly(any) {
      const side = Math.random() < 0.5 ? -1 : 1;
      return { p: [side * (0.9 + Math.random() * 1.4), 0.2 + Math.random() * 0.8, this.camZ - (any ? Math.random() * 14 : 6 + Math.random() * 8)], ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 0.8 };
    }

    resize() {
      const r = this.canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
      this.W = r.width; this.H = r.height;
      this.canvas.width = r.width * d; this.canvas.height = r.height * d;
      this.fs = r.width < 600 ? 7 : 8;
      this.cw = this.fs * 0.6; this.chH = this.fs * 1.05;
      this.COLS = Math.ceil(r.width / this.cw); this.ROWS = Math.ceil(r.height / this.chH);
      this.buildAtlas(d);
      const n = this.COLS * this.ROWS;
      this.zb = new Float32Array(n); this.gl = new Int8Array(n); this.co = new Int16Array(n);
    }

    // Glyphs in every colour, rendered once, kept as sparse pixel lists for fast blitting
    buildAtlas(d) {
      const gw = Math.ceil(this.cw * d) + 1, gh = Math.ceil(this.chH * d) + 1;
      const c = document.createElement('canvas');
      c.width = gw * CH.length; c.height = gh * PAL.length;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.font = `700 ${this.fs * d}px "JetBrains Mono", ui-monospace, monospace`;
      x.textBaseline = 'top'; x.direction = 'ltr';
      PAL.forEach((col, ci) => { x.fillStyle = col; CH.forEach((ch, gi) => x.fillText(ch, gi * gw, ci * gh)); });
      const px = new Uint32Array(x.getImageData(0, 0, c.width, c.height).data.buffer);
      const W = this.canvas.width, H = this.canvas.height, slots = [];
      for (let ci = 0; ci < PAL.length; ci++) for (let gi = 0; gi < CH.length; gi++) {
        const list = [];
        for (let yy = 0; yy < gh; yy++) for (let xx = 0; xx < gw; xx++) {
          const v = px[(ci * gh + yy) * c.width + gi * gw + xx];
          if (v >>> 24) list.push(yy * W + xx, v);
        }
        slots.push(list.length ? Int32Array.from(list) : null);
      }
      const img = this.ctx.createImageData(W, H);
      this.atlas = { slots, img, buf: new Uint32Array(img.data.buffer), W, d };
      this.ROWS = Math.min(this.ROWS, Math.floor((H - gh) / (this.chH * d)));
      this.COLS = Math.min(this.COLS, Math.floor((W - gw) / (this.cw * d)));
    }

    bindInput() {
      const c = this.canvas;
      let drag = null;
      c.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; c.setPointerCapture(e.pointerId); this.idle = 0; });
      c.addEventListener('pointermove', (e) => {
        if (!drag) return;
        this.lookYaw = clamp(this.lookYaw + (e.clientX - drag.x) * 0.004, -1.4, 1.4);
        this.lookPitch = clamp(this.lookPitch - (e.clientY - drag.y) * 0.003, -0.55, 0.5);
        drag = { x: e.clientX, y: e.clientY }; this.idle = 0;
      });
      const end = () => { drag = null; };
      c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
      c.addEventListener('wheel', (e) => { e.preventDefault(); this.camZ -= e.deltaY * 0.004; this.pauseT = 2.5; this.idle = 0; }, { passive: false });
      this.dragging = () => !!drag;
    }

    // Plants near the camera (generated on demand, forgotten once far behind)
    plants() {
      const n0 = Math.floor(-(this.camZ + 2) / SEG), n1 = Math.floor(-(this.camZ - 24) / SEG);
      for (const k of this.segs.keys()) if (k < n0 - 2 || k > n1 + 2) this.segs.delete(k);
      const out = [];
      for (let n = n0; n <= n1; n++) {
        if (!this.segs.has(n)) this.segs.set(n, segment(n));
        for (const p of this.segs.get(n)) out.push(p);
      }
      return out;
    }

    // ── Natural flight, retargeting to flowers ahead of the walker ──
    pickFlower(list, near, far) {
      const c = list.filter((p) => p.z < this.camZ - near && p.z > this.camZ - far && p.kind !== 'spike');
      return c.length ? c[(Math.random() * c.length) | 0] : null;
    }
    stepFlyer(b, dt, t, list) {
      if (b.p[2] > this.camZ + 2.5) { b.p = [Math.random() * 2 - 1, 1.2, this.camZ - 10 - Math.random() * 4]; b.perched = false; b.target = null; }
      if (!b.target || b.target.z > this.camZ + 0.5) b.target = this.pickFlower(list, 1.5, 9);
      if (!b.target) return;
      const h = b.target, sway = Math.sin(t * 1.3 + h.ph) * 0.025;
      const seat = [h.x + sway, h.h + 0.05 * h.size, h.z];
      const d = [seat[0] - b.p[0], seat[1] - b.p[1], seat[2] - b.p[2]], dl = Math.hypot(d[0], d[1], d[2]);
      b.hopT += dt;
      if (b.perched) {
        b.perchT += dt; b.p = seat;
        b.flap = 1.25 + 0.22 * Math.sin(t * 1.4 + b.phase);
        if (b.perchT > b.dwell) { b.perched = false; b.hopT = 0; b.target = this.pickFlower(list, 1, 8); b.v = [Math.cos(b.yaw) * 0.3, 0.8, Math.sin(b.yaw) * 0.3]; }
        return;
      }
      if (b.hopT > 10) { b.target = this.pickFlower(list, 1, 8); b.hopT = 0; }
      b.wand -= dt;
      if (b.wand <= 0) { b.wand = 0.15 + Math.random() * 0.45; b.w = [(Math.random() * 2 - 1) * 0.7, (Math.random() * 2 - 1) * 0.5 + 0.1, (Math.random() * 2 - 1) * 0.7]; }
      const arrive = Math.min(1, dl / 1), speed = 1.2, wob = 0.25 + 0.75 * arrive, st = Math.min(1, dt * (dl < 0.35 ? 6 : 2.2));
      for (let k = 0; k < 3; k++) b.v[k] += ((d[k] / (dl || 1)) * speed * arrive + b.w[k] * wob + (k === 1 && dl > 0.8 ? 0.2 : 0) - b.v[k]) * st;
      if (b.glide > 0) { b.glide -= dt; b.v[1] -= 0.5 * dt; } else if (dl > 1 && Math.random() < dt * 0.5) b.glide = 0.3 + Math.random() * 0.4;
      for (let k = 0; k < 3; k++) b.p[k] += b.v[k] * dt;
      b.p[1] = Math.max(0.2, b.p[1]);
      b.p[0] = clamp(b.p[0], -HEDGE + 0.2, HEDGE - 0.2);
      if (b.glide > 0) b.flap += (0.12 - b.flap) * Math.min(1, dt * 8);
      else { b.phase += dt * 2 * Math.PI * 6; b.flap = 0.35 + 0.8 * Math.sin(b.phase); b.p[1] += Math.max(0, Math.cos(b.phase)) * 0.008; }
      if (Math.hypot(b.v[0], b.v[2]) > 0.1) { const da = ((Math.atan2(b.v[2], b.v[0]) - b.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; b.yaw += da * Math.min(1, dt * 6); }
      if (dl < 0.05) { b.perched = true; b.perchT = 0; b.glide = 0; b.dwell = 1.8 + Math.random() * 2.5; }
    }
    stepBee(dt, t, list) {
      const e = this.bee;
      if (!e.target || e.target.z > this.camZ - 0.8 || e.p[2] > this.camZ + 1) {
        e.target = list.filter((p) => p.z < this.camZ - 1.2 && p.z > this.camZ - 5 && Math.abs(p.x) < 1.7)[0] || null;
        if (e.p[2] > this.camZ + 1) e.p = [1, 0.6, this.camZ - 6];
      }
      if (!e.target) return;
      const h = e.target, seat = [h.x, h.h + 0.08, h.z];
      const d = [seat[0] - e.p[0], seat[1] - e.p[1], seat[2] - e.p[2]], dl = Math.hypot(d[0], d[1], d[2]);
      e.t += dt;
      if (dl < 0.06 && e.t > 1) {
        e.t = 0;
        const c = list.filter((p) => p.z < this.camZ - 1.2 && p.z > this.camZ - 6 && Math.abs(p.x - h.x) < 0.7 && p !== h);
        if (c.length) e.target = c[(Math.random() * c.length) | 0];
      }
      const arrive = Math.min(1, dl / 0.4);
      for (let k = 0; k < 3; k++) { e.v[k] += ((d[k] / (dl || 1)) * 1.8 * arrive - e.v[k]) * Math.min(1, dt * 5); e.p[k] += e.v[k] * dt; }
      e.p[1] += Math.sin(t * 9) * 0.003;
      if (Math.hypot(e.v[0], e.v[2]) > 0.15) e.yaw = Math.atan2(e.v[2], e.v[0]);
    }

    frame(dt, t) {
      const { COLS, ROWS, zb, gl, co } = this;
      // Walk
      this.pauseT -= dt; this.idle += dt;
      if (this.walking && this.pauseT <= 0) this.camZ -= dt * 0.34;
      if (!this.dragging() && this.idle > 2.5) { this.lookYaw *= 1 - Math.min(1, dt * 0.7); this.lookPitch *= 1 - Math.min(1, dt * 0.7); }
      const bob = this.walking && !this.reduced && this.pauseT <= 0 ? Math.sin(t * 3.6) * 0.007 : 0;
      const cam = [Math.sin(t * 0.21) * 0.06, EYE + bob, this.camZ];
      const yaw = this.lookYaw + Math.sin(t * 0.17) * 0.04, pitch = -0.1 + this.lookPitch, cp = Math.cos(pitch);
      const f = [Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
      const r = norm([-f[2], 0, f[0]]);
      const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
      const FOC = Math.min(this.H, this.W * 1.2), ax = this.cw / FOC, ay = this.chH / FOC, hc = COLS / 2, hr = ROWS / 2;
      const fogOf = (z) => clamp(1.2 - z / 21, 0.08, 1);
      for (let i = 0; i < 300; i++) this.bits[(Math.random() * 8192) | 0] ^= 1;

      // ── 1. Ray-cast the surfaces, one ray per character cell ──
      for (let sy = 0; sy < ROWS; sy++) {
        const b = (hr - sy - 0.5) * ay;
        for (let sx = 0; sx < COLS; sx++) {
          const a = (sx + 0.5 - hc) * ax;
          const dx = f[0] + r[0] * a + u[0] * b, dy = f[1] + r[1] * a + u[1] * b, dz = f[2] + r[2] * a + u[2] * b;
          const i = sy * COLS + sx;
          let tHit = 1e9, glyph = -1, col = 0, lum = 0;
          // Floor
          if (dy < -1e-4) {
            const tg = -cam[1] / dy;
            const x = cam[0] + dx * tg, z = cam[2] + dz * tg, axx = Math.abs(x);
            if (axx < HEDGE) {
              tHit = tg;
              const lamp = lampLight(x, 0, z), L = 0.58 + lamp;
              if (axx < PATH) {
                // Flagstones in staggered rows; joints only while they are big enough to see
                const row = Math.floor(z / 0.5), off = row & 1 ? 0.3 : 0, cx = Math.floor((x + PATH + off) / 0.6);
                const fu = z / 0.5 - row, fv = (x + PATH + off) / 0.6 - cx;
                const joint = tg < 9 && (fu < 0.08 || fv < 0.05);
                if (joint) { glyph = K['.']; col = C.joint; lum = 0.5; }
                else {
                  lum = (0.72 + 0.28 * hash2(row, cx)) * L; col = lamp > 0.42 ? C.stoneW : C.stone;
                  glyph = lum > 0.62 ? K['='] : lum > 0.38 ? K['-'] : K['.'];
                }
              } else if (axx < EDGE) {
                const bz = Math.floor(z / 0.22);
                glyph = z / 0.22 - bz < 0.12 && tg < 8 ? K['.'] : K['#']; col = C.edging; lum = (0.55 + 0.2 * hash2(bz, x > 0 ? 1 : 2)) * L;
              } else {
                // Soil and moss in the beds: a stable, world-fixed texture
                const q = tg < 6 ? 14 : tg < 12 ? 7 : 3.5, hh = hash2(Math.floor(x * q), Math.floor(z * q));
                if (hh < 0.45) { glyph = hh < 0.12 ? K[','] : K['.']; col = hh < 0.06 ? C.moss : C.soil; lum = (0.45 + hh) * L; }
                else glyph = -2;          // bare soil: hides what is behind, draws nothing
              }
            }
          }
          // Hedges on both sides, the tree line beyond
          if (Math.abs(dx) > 1e-4) {
            const side = dx > 0 ? 1 : -1, tw = (side * HEDGE - cam[0]) / dx;
            if (tw > 0 && tw < tHit) {
              const y = cam[1] + dy * tw, z = cam[2] + dz * tw;
              if (y >= 0 && y <= hedgeTop(z)) {
                tHit = tw;
                const q = tw < 5 ? 18 : tw < 10 ? 9 : 4.5, hh = hash2(Math.floor(z * q) + side * 9999, Math.floor(y * q));
                const top = hedgeTop(z) - y < 0.05;
                // Clipped hedge: calm, mostly one glyph, a few highlights, lighter toward the top
                glyph = top ? K['~'] : hh < 0.68 ? K['#'] : hh < 0.9 ? K['%'] : K['&'];
                col = hh > 0.82 ? C.hedge2 : C.hedge;
                lum = (0.3 + 0.12 * hh + 0.22 * (y / 1.05)) * (0.75 + lampLight(side * HEDGE, y, z) * 0.9);
              } else {
                const tt = (side * TREES - cam[0]) / dx;
                if (tt > 0) {
                  const yt = cam[1] + dy * tt, zt = cam[2] + dz * tt;
                  if (yt >= 0 && yt <= treeTop(zt) && tt < tHit) {
                    tHit = tt;
                    const hh = hash2(Math.floor(zt * 6) + side * 777, Math.floor(yt * 6));
                    glyph = hh < 0.4 ? K['%'] : hh < 0.7 ? K['#'] : K['&']; col = C.trees; lum = 0.32 + 0.3 * hh;
                  }
                }
              }
            }
          }
          if (glyph === -1 && tHit > 1e8) {
            // Sky: stars and the moon, fixed to the direction (they don't move as you walk)
            const len = Math.hypot(dx, dy, dz), nx = dx / len, ny = dy / len, nz = dz / len;
            const md = nx * MOON[0] + ny * MOON[1] + nz * MOON[2];
            if (md > 0.9985) {
              const crater = hash2(Math.floor(nx * 300), Math.floor(ny * 300)) < 0.18;
              glyph = md > 0.99975 ? (crater ? K.o : K['@']) : md > 0.9992 ? K['#'] : K[':']; col = C.moon; lum = 0.9;
            } else if (ny > 0.02) {
              const az = Math.atan2(nx, -nz), hh = hash2(Math.floor(az * 120), Math.floor(Math.asin(ny) * 120));
              if (hh < 0.018) { glyph = hh < 0.003 ? K['+'] : K['.']; col = C.star; lum = 0.35 + hh * 30; }
            }
            zb[i] = 0;
          } else zb[i] = tHit < 1e8 ? 1 / tHit : 0;
          if (glyph >= 0) { gl[i] = glyph; co[i] = col * NL + levelOf(lum * (tHit < 1e8 ? fogOf(tHit) : 1)); }
          else gl[i] = -1;
        }
      }

      // ── 2. Things, depth-tested against the surfaces ──
      const put = (x, y, z, col, glyph, lum) => {
        const qx = x - cam[0], qy = y - cam[1], qz = z - cam[2];
        const zc = qx * f[0] + qy * f[1] + qz * f[2];
        if (zc < 0.12) return;
        const sx = (hc + (qx * r[0] + qy * r[1] + qz * r[2]) / zc / ax) | 0;
        const sy = (hr - (qx * u[0] + qy * u[1] + qz * u[2]) / zc / ay) | 0;
        if (sx < 0 || sy < 0 || sx >= COLS || sy >= ROWS) return;
        const i = sy * COLS + sx, iz = 1 / zc;
        if (iz <= zb[i]) return;
        zb[i] = iz; gl[i] = glyph; co[i] = col * NL + levelOf(lum * fogOf(zc));
      };
      const proj = (x, y, z) => {
        const qx = x - cam[0], qy = y - cam[1], qz = z - cam[2];
        const zc = qx * f[0] + qy * f[1] + qz * f[2];
        if (zc < 0.12) return null;
        return [hc + (qx * r[0] + qy * r[1] + qz * r[2]) / zc / ax, hr - (qx * u[0] + qy * u[1] + qz * u[2]) / zc / ay, zc];
      };
      const putCell = (sx, sy, zc, col, glyph, lum) => {
        sx |= 0; sy |= 0;
        if (sx < 0 || sy < 0 || sx >= COLS || sy >= ROWS) return;
        const i = sy * COLS + sx, iz = 1 / zc;
        if (iz <= zb[i]) return;
        zb[i] = iz; gl[i] = glyph; co[i] = col * NL + levelOf(lum * fogOf(zc));
      };
      const shade = (nx, ny, nz, x, y, z) => 0.48 + 0.4 * Math.abs(nx * LMOON[0] + ny * LMOON[1] + nz * LMOON[2]) + lampLight(x, y, z) * 0.8;
      const cellsPerUnit = (zc) => 1 / (zc * ax);

      // Flowers, with level of detail
      const list = this.plants();
      for (const p of list) {
        const sway = Math.sin(t * 1.3 + p.ph) * 0.025;
        const hp = proj(p.x + sway, p.h, p.z);
        if (!hp || hp[0] < -6 || hp[0] > COLS + 6 || hp[1] < -6 || hp[1] > ROWS + 6) continue;
        const rc = 0.14 * p.size * cellsPerUnit(hp[2]);            // head radius in cells
        const light = shade(0, 1, 0.4, p.x, p.h, p.z);
        if (rc >= 3) {
          // Near: full 3D geometry
          const T = TEMPLATES[p.kind], cs = Math.cos(p.yaw), sn = Math.sin(p.yaw);
          for (let k = 0; k < T.length; k += 9) {
            const ox = T[k] * p.size, oz = T[k + 1] * p.size, y = T[k + 2] * p.h + T[k + 3] * p.size, part = T[k + 4];
            const x = p.x + ox * cs - oz * sn + sway * (y / p.h), z = p.z + ox * sn + oz * cs;
            const nx = T[k + 5] * cs - T[k + 7] * sn, nz = T[k + 5] * sn + T[k + 7] * cs, L = shade(nx, T[k + 6], nz, x, y, z);
            let col, g;
            if (part === PART.stem) { col = C.stem; g = K['|']; }
            else if (part === PART.leaf) { col = C.leaf; g = T[k + 8] ? K[':'] : rampOf(LEAF_RAMP, L * 0.9); }
            else if (part === PART.centre) { col = C.gold; g = L > 0.7 ? K['@'] : K.o; }
            else { col = p.col; g = T[k + 8] ? K[':'] : rampOf(PETAL_RAMP, L); }
            put(x, y, z, col, g, L);
          }
          continue;
        }
        // Mid / far: the stem as one clean stroke, the head as a small icon or a single glyph
        const bp = proj(p.x, 0, p.z);
        if (bp) {
          const y0 = Math.ceil(hp[1] + (rc >= 1 ? 1 : 0.5)), y1 = bp[1];
          for (let sy = y0; sy <= y1; sy++) putCell(hp[0] + (bp[0] - hp[0]) * ((sy - hp[1]) / (y1 - hp[1] || 1)), sy, hp[2] + 0.01, C.stem, K['|'], light * 0.8);
        }
        if (p.kind === 'spike') {
          const sp = proj(p.x + sway, p.h * 0.5, p.z);
          const top = Math.floor(hp[1]), bot = sp ? Math.ceil(sp[1]) : top + 1;
          for (let sy = top; sy <= bot; sy++) putCell(hp[0], sy, hp[2], p.col, (sy - top) % 2 ? K[':'] : K['*'], light * (1 - 0.25 * ((sy - top) / (bot - top + 1))));
        } else if (rc >= 1) {
          ICONS[p.kind].forEach((row, ri) => row.forEach((ch, ci) => {
            if (ch === '.') return;
            const centre = ri === 1 && ci === 1 && p.kind !== 'tulip';
            putCell(hp[0] + ci - 1, hp[1] + ri - 1, hp[2], centre ? C.gold : p.col, K[ch], light);
          }));
        } else {
          putCell(hp[0], hp[1], hp[2], p.col, p.kind === 'tulip' ? K.v : rc > 0.55 ? K['*'] : K['+'], light);
        }
      }

      // Rose arches over the path: posts, an arc, roses climbing it (about one point per cell)
      const a0 = Math.floor(-(this.camZ + 1) / ARCH_EVERY), a1 = Math.floor(-(this.camZ - 24) / ARCH_EVERY);
      for (let k = a0; k <= a1; k++) {
        const za = -ARCH_EVERY * k - 4.5, R = PATH + 0.12, top = 1.6;
        const zc = cam[2] - za; if (zc < -0.5) continue;
        const step = Math.max(0.008, Math.abs(zc) * ax * 0.7);
        for (const dzs of [-0.05, 0.05]) {
          for (const side of [-1, 1]) for (let y = 0; y <= top; y += step) put(side * R, y, za + dzs, C.arch, K['#'], shade(side, 0, 0, side * R, y, za + dzs) * 0.9);
          for (let a = 0; a <= Math.PI; a += step / R) {
            const x = Math.cos(a) * R, y = top + Math.sin(a) * R * 0.7;
            put(x, y, za + dzs, C.arch, a > 1.2 && a < 1.9 ? K['='] : K['#'], shade(0, 1, 0, x, y, za) * 0.9);
          }
        }
        const rr = rng(k * 31 + 5);
        for (let j = 0; j < 26; j++) {
          const s = rr(), onArc = s > 0.45, side = rr() < 0.5 ? -1 : 1;
          let x, y;
          if (onArc) { const a = ((s - 0.45) / 0.55) * Math.PI; x = Math.cos(a) * R; y = top + Math.sin(a) * R * 0.7; }
          else { x = side * R; y = 0.3 + (s / 0.45) * (top - 0.3); }
          const z = za + (rr() - 0.5) * 0.16, c = [C.rose, C.pink, C.blush][(rr() * 3) | 0];
          const hp = proj(x, y, z); if (!hp) continue;
          const rc = 0.06 * cellsPerUnit(hp[2]), L = shade(0, 1, 0.3, x, y, z);
          if (rc < 1.2) { putCell(hp[0], hp[1], hp[2] - 0.02, c, K['@'], L); continue; }
          for (let e = 0; e < 6.28; e += 0.5) for (const rad of [0.02, 0.045]) put(x + Math.cos(e) * rad, y + Math.sin(e) * rad, z - 0.03, c, rad < 0.03 ? K['@'] : K.o, L);
          for (const [lx, ly] of [[-0.06, -0.04], [0.06, -0.05]]) put(x + lx, y + ly, z - 0.02, C.leaf, K['-'], L * 0.8);
        }
      }

      // Lanterns: a post, a glowing lamp, a soft halo and a few moths
      const l0 = Math.floor((-(this.camZ + 1) - 2) / LAMP_EVERY), l1 = Math.floor((-(this.camZ - 24) - 2) / LAMP_EVERY);
      for (let k = l0; k <= l1; k++) {
        const l = lampAt(k);
        if (l.z > cam[2] + 0.3) continue;
        const step = Math.max(0.01, Math.abs(cam[2] - l.z) * ax * 0.7);
        for (let y = 0; y <= l.y - 0.06; y += step) put(l.x, y, l.z, C.post, K['|'], 0.75);
        const hp = proj(l.x, l.y, l.z); if (!hp) continue;
        const rc = 0.07 * cellsPerUnit(hp[2]);
        putCell(hp[0], hp[1], hp[2] - 0.01, C.lamp, K['@'], 1.2);
        if (rc > 1.5) { putCell(hp[0], hp[1] - 1, hp[2] - 0.01, C.post, K['^'], 0.8); putCell(hp[0] - 1, hp[1], hp[2], C.lamp, K['('], 1); putCell(hp[0] + 1, hp[1], hp[2], C.lamp, K[')'], 1); }
        const halo = Math.min(5, 0.22 * cellsPerUnit(hp[2]));
        for (let dyc = -Math.ceil(halo); dyc <= halo; dyc++) for (let dxc = -Math.ceil(halo * 1.6); dxc <= halo * 1.6; dxc++) {
          const dd = Math.hypot(dxc / 1.6, dyc) / (halo || 1);
          if (dd > 1 || dd < 0.35 || hash2(dxc * 7 + k, dyc * 13) > 0.32) continue;
          putCell(hp[0] + dxc, hp[1] + dyc, hp[2] + 0.4, C.glow, K['.'], 0.9 * (1 - dd));
        }
        for (let m = 0; m < 3; m++) {
          const ma = t * (2.2 + m * 0.7) + m * 2 + k;
          put(l.x + Math.cos(ma) * 0.12, l.y + Math.sin(ma * 1.3) * 0.08, l.z + Math.sin(ma) * 0.12, C.lamp, K['.'], 0.9);
        }
      }

      // Fireflies over the beds
      for (const q of this.flies) {
        if (q.p[2] > this.camZ + 1) Object.assign(q, this.newFly(false));
        q.p[0] += Math.sin(t * 0.4 * q.sp + q.ph) * 0.003; q.p[1] = clamp(q.p[1] + Math.sin(t * 0.9 + q.ph) * 0.0015, 0.12, 1.1);
        const glow = Math.sin(t * 2.1 * q.sp + q.ph);
        if (glow > 0.25) put(q.p[0], q.p[1], q.p[2], C.firefly, glow > 0.8 ? K['*'] : K['+'], 0.6 + glow * 0.5);
      }

      // Butterflies and the bee
      for (const b of this.flyers) this.stepFlyer(b, dt, t, list);
      this.stepBee(dt, t, list);
      for (const b of this.flyers) {
        const bp = proj(b.p[0], b.p[1], b.p[2]); if (!bp) continue;
        const rc = 0.3 * b.scale * cellsPerUnit(bp[2]);
        if (rc < 2.5) { putCell(bp[0], bp[1], bp[2] - 0.02, b.wingC, b.flap > 0.6 ? K.v : K['-'], 1); continue; }
        const s = b.scale, cy = Math.cos(b.yaw), sy = Math.sin(b.yaw), Sd = [-sy, 0, cy];
        const pitch = b.perched ? 0 : clamp(b.v[1] * 0.25, -0.4, 0.4), Fv = [cy * Math.cos(pitch), Math.sin(pitch), sy * Math.cos(pitch)];
        const cf = Math.cos(b.flap), sf = Math.sin(b.flap), bitsOn = rc > 6;
        for (let side = -1; side <= 1; side += 2) for (let k = 0; k < WING.length; k += 3) {
          const wu = WING[k] * s, ww = WING[k + 1] * s, kind = WING[k + 2];
          const x = b.p[0] + Fv[0] * wu + Sd[0] * side * cf * ww, y = b.p[1] + Fv[1] * wu + sf * ww, z = b.p[2] + Fv[2] * wu + Sd[2] * side * cf * ww;
          const L = shade(-Sd[0] * side * sf, cf, -Sd[2] * side * sf, x, y, z) * 1.1;
          put(x, y, z, kind === 2 ? b.spotC : b.wingC, kind === 1 ? K[':'] : kind === 2 ? K['1'] : bitsOn ? (this.bits[k & 8191] ? K['1'] : K['0']) : rampOf(PETAL_RAMP, L), L);
        }
        for (let q = -0.2; q <= 0.17; q += 0.015) put(b.p[0] + Fv[0] * q * s, b.p[1] + Fv[1] * q * s + 0.004, b.p[2] + Fv[2] * q * s, C.body, q > 0.13 ? K['0'] : q > 0.02 ? K['8'] : K['='], 1);
      }
      {
        const e = this.bee, bp = proj(e.p[0], e.p[1], e.p[2]);
        if (bp) {
          const rc = 0.06 * cellsPerUnit(bp[2]);
          if (rc < 1.5) putCell(bp[0], bp[1], bp[2] - 0.02, C.gold, K['8'], 1);
          else {
            const cy = Math.cos(e.yaw), sy = Math.sin(e.yaw);
            for (let q = -0.06; q <= 0.06; q += 0.01) for (let a = 0; a < 6.28; a += 0.6) {
              const rad = 0.032 * Math.sqrt(Math.max(0, 1 - (q / 0.07) ** 2)), stripe = ((q + 0.07) / 0.022) | 0;
              put(e.p[0] + cy * q - sy * Math.cos(a) * rad, e.p[1] + Math.sin(a) * rad, e.p[2] + sy * q + cy * Math.cos(a) * rad,
                q > 0.045 ? C.gold : stripe % 2 ? C.gold : C.dark, q > 0.045 ? K['0'] : stripe % 2 ? K['#'] : K['='], 1);
            }
            const open = 0.4 + 0.6 * Math.abs(Math.sin(t * 40));
            for (const side of [-1, 1]) for (let w = 0.015; w < 0.08; w += 0.015) put(e.p[0] - sy * side * w * (1 - open * 0.5), e.p[1] + 0.03 + w * open, e.p[2] + cy * side * w * (1 - open * 0.5), C.glass, K[':'], 0.9);
          }
        }
      }

      // ── 3. Blit ──
      const A = this.atlas, buf = A.buf, NG = CH.length, cw = this.cw * A.d, chh = this.chH * A.d, BW = A.W;
      buf.fill(0);
      const n = COLS * ROWS;
      for (let i = 0; i < n; i++) {
        if (gl[i] < 0) continue;
        const g = A.slots[co[i] * NG + gl[i]];
        if (!g) continue;
        const base = Math.round(((i / COLS) | 0) * chh) * BW + Math.round((i % COLS) * cw);
        for (let k = 0; k < g.length; k += 2) buf[base + g[k]] = g[k + 1];
      }
      this.ctx.putImageData(A.img, 0, 0);
    }
  }

  window.Garden3D = Garden3D;
})();
