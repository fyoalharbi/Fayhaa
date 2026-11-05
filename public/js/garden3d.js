// ─────────────────────────────────────────────
//  3D ASCII MEADOW WALK
//
//  An endless night walk along a footpath that people wore into a hilly
//  meadow: it winds, narrows and widens, dips with the ground, and grass
//  creeps over its edges. Wildflowers grow in loose clumps, tall grass
//  leans over the path, rocks sit at its edge, lone trees stand on the hills.
//
//  Rendering, chosen so nothing turns to mush at a distance:
//   • The hills are a height field drawn column by column (front to back with
//     a per-column horizon), shaded by their slope against the moon.
//   • Flowers, grass, rocks, trees and butterflies are drawn with level of
//     detail: real 3D up close, small clean glyph icons further away.
//
//    const g = new Garden3D(canvas);
//    g.setWalking(true | false);   drag to look around, scroll to walk
// ─────────────────────────────────────────────
(function () {
  // ── Palette: named colours × brightness levels ──
  const BASE = {
    grass: '#4f8444', grass2: '#689a4e', dry: '#93945a', dirt: '#c4a47c', dirt2: '#e6d0a8', pebble: '#b8b2a6',
    rock: '#8c8a86', bark: '#6a5444', canopy: '#3f7a46', canopy2: '#5a9a55', stem: '#6fa56f', leaf: '#4f9152',
    star: '#9a9aaa', moon: '#ece8d4', white: '#f6f6f6', gold: '#ffd24a', yellow: '#f2e05a', red: '#ff4f4f', orange: '#ffa060',
    pink: '#ff8fb0', blush: '#ffc8d6', violet: '#b48cff', blue: '#8ac6ff', body: '#d4d4d4', dark: '#5a4614',
    glass: '#d7e6ff', firefly: '#d4ff7a', haze: '#3a4150',
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
  const CH = ['.', ',', "'", '`', ':', ';', '|', '0', '1', '@', 'o', '8', '=', '-', '*', '+', '/', '\\', '°', '#', '%', '&', '~', '^', 'v', '"', '(', ')', '_', 'O'];
  const K = Object.fromEntries(CH.map((c, i) => [c, i]));
  const PETAL_RAMP = ['.', ':', 'o', '*', '#', '@'].map((c) => K[c]);
  const LEAF_RAMP = ['.', ',', ':', '-', '='].map((c) => K[c]);
  const GRASS_NEAR = ["'", '"', ',', '`', ';', "'"].map((c) => K[c]);
  const GRASS_FAR = ['.', ',', "'", ':'].map((c) => K[c]);
  const DIRT = ['=', '-', '=', '~', '-', ':'].map((c) => K[c]);   // packed dirt: dense, so the path reads as a surface

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rampOf = (ramp, lum) => ramp[clamp((lum * ramp.length) | 0, 0, ramp.length - 1)];
  const levelOf = (lum) => clamp((lum * NL) | 0, 0, NL - 1);
  function hash2(a, b) {
    let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function rng(seed) {
    let a = seed | 0;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

  // ── The land ──
  // The footpath wanders like one walked into being: several slow bends, never straight
  const pathXe = (z) => 1.5 * Math.sin(z * 0.15) + 0.8 * Math.sin(z * 0.057 + 1.3) + 0.25 * Math.sin(z * 0.43 + 0.4);
  const pathWe = (z) => 0.3 + 0.08 * Math.sin(z * 0.83) + 0.05 * Math.sin(z * 2.3 + 1);   // half width, uneven
  // Per-frame lookup tables (the renderer asks for these a few hundred thousand times a frame)
  const TAB = { z0: 0, n: 0, step: 0.05, x: new Float32Array(1600), w: new Float32Array(1600) };
  function fillTables(zTop) {
    TAB.z0 = zTop; TAB.n = TAB.x.length;
    for (let i = 0; i < TAB.n; i++) { const z = zTop - i * TAB.step; TAB.x[i] = pathXe(z); TAB.w[i] = pathWe(z); }
  }
  const tabIdx = (z) => { const f = (TAB.z0 - z) / TAB.step; return f >= 0 && f < TAB.n - 1 ? f : -1; };
  const pathX = (z) => { const f = tabIdx(z); if (f < 0) return pathXe(z); const i = f | 0, k = f - i; return TAB.x[i] + (TAB.x[i + 1] - TAB.x[i]) * k; };
  const pathW = (z) => { const f = tabIdx(z); if (f < 0) return pathWe(z); const i = f | 0; return TAB.w[i]; };
  // Rolling hills: the path keeps to the low ground, the meadow rises away from it
  function height(x, z) {
    const d = x - pathX(z), ad = Math.abs(d);
    // The path climbs and dips over long rises…
    const along = 1.3 * Math.sin(z * 0.045 + 0.7) + 0.5 * Math.sin(z * 0.11 + 2);
    // …the meadow climbs away from it on both sides…
    const side = (1 - Math.exp(-(d * d) / 16)) * (2.3 + 1.1 * Math.sin(z * 0.06 + (d > 0 ? 2.5 : 0)) + 0.7 * Math.sin(x * 0.13 + 1));
    // …and far ridges close the view
    const ridge = 3.4 * clamp((ad - 9) / 10, 0, 1) * (0.6 + 0.4 * Math.sin(x * 0.05 + z * 0.03));
    const bumps = 0.18 * Math.sin(x * 0.9 + z * 0.4) * Math.sin(z * 0.7 - x * 0.3) * clamp((ad - 0.8) / 1.5, 0, 1);
    const worn = -0.035 * Math.exp(-(d * d) / (pathW(z) * pathW(z) * 1.6));
    return along + side + ridge + bumps + worn;
  }
  function onPath(x, z) {                    // ragged edges: grass creeps in
    const d = Math.abs(x - pathX(z)), w = pathW(z) + (hash2(Math.floor(x * 9), Math.floor(z * 9)) - 0.5) * 0.12;
    return d < w ? d / w : -1;
  }
  const MOON = norm([-0.4, 0.38, -0.83]);
  const LMOON = norm([-0.78, 0.55, 0.2]);       // moonlight from the left: slopes read as relief

  // ── Flower templates (local points; y = a·height + b·size) ──
  const PART = { stem: 0, leaf: 1, petal: 2, centre: 3 };
  function template(kind) {
    const p = [];
    const add = (x, z, a, b, part, nx, ny, nz, edge = 0) => p.push(x, z, a, b, part, nx, ny, nz, edge);
    for (let t = 0; t <= 1.001; t += 0.03) { add(0.007, 0, t, 0, PART.stem, 1, 0.2, 0); add(-0.007, 0, t, 0, PART.stem, -1, 0.2, 0); }
    for (let l = 0; l < 2; l++) {
      const la = l * Math.PI + 0.6, dx = Math.cos(la), dz = Math.sin(la), at = 0.18 + l * 0.16;
      for (let u = 0.05; u <= 1; u += 0.07) for (let w = -1; w <= 1.001; w += 0.4) {
        const width = Math.pow(Math.sin(u * Math.PI), 0.8) * 0.045, len = 0.22;
        add(dx * u * len - dz * w * width, dz * u * len + dx * w * width, at, u * len * 0.5 - u * u * len * 0.35, PART.leaf, -dx * 0.5, 0.85, -dz * 0.5, Math.abs(w) > 0.9 ? 1 : 0);
      }
    }
    if (kind === 'spike') {
      for (let a = 0.5; a <= 1.04; a += 0.025) {
        const rr = 0.045 * (1.1 - (a - 0.5) * 1.5);
        for (let q = 0; q < 6; q++) { const qa = q * 1.05 + a * 9; add(Math.cos(qa) * rr, Math.sin(qa) * rr, a, 0, PART.petal, Math.cos(qa), 0.3, Math.sin(qa), q % 3 === 0 ? 1 : 0); }
      }
      return new Float32Array(p);
    }
    const spec = kind === 'daisy' ? { n: 12, len: 0.12, w: 0.02, up: 0.12, droop: 0.06, r0: 0.025 }
      : kind === 'poppy' ? { n: 5, len: 0.1, w: 0.06, up: 0.8, droop: 0.01, r0: 0.012 }
      : { n: 8, len: 0.12, w: 0.036, up: 0.35, droop: 0.02, r0: 0.022 };
    for (let j = 0; j < spec.n; j++) {
      const a = (j / spec.n) * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx;
      for (let t = 0; t <= 1.001; t += 0.1) {
        const radial = spec.r0 + t * spec.len * Math.cos(spec.up), vert = t * spec.len * Math.sin(spec.up) - spec.droop * t * t;
        const slope = Math.atan2(spec.len * Math.sin(spec.up) - 2 * spec.droop * t, spec.len * Math.cos(spec.up));
        const width = spec.w * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.04 + 0.04)), 0.65);
        for (let w = -1; w <= 1.001; w += 0.5) {
          add(dx * radial + px * w * width, dz * radial + pz * w * width, 1, vert, PART.petal, -dx * Math.sin(slope), Math.cos(slope), -dz * Math.sin(slope), Math.abs(w) > 0.9 || t > 0.95 ? 1 : 0);
        }
      }
    }
    for (let e = 0; e <= Math.PI / 2; e += 0.45) for (let a = 0; a < Math.PI * 2; a += 0.7) {
      const rr = 0.025 * Math.cos(e);
      add(Math.cos(a) * rr, Math.sin(a) * rr, 1, 0.015 * Math.sin(e) + 0.004, PART.centre, Math.cos(a), Math.sin(e) + 0.3, Math.sin(a));
    }
    return new Float32Array(p);
  }
  const TEMPLATES = { daisy: template('daisy'), poppy: template('poppy'), cosmos: template('cosmos'), spike: template('spike') };
  const ICONS = {
    daisy: [['\\', '|', '/'], ['-', 'o', '-'], ['/', '|', '\\']],
    cosmos: [['.', '*', '.'], ['*', '@', '*'], ['.', '*', '.']],
    poppy: [['\\', '_', '/'], ['(', '@', ')']],
  };
  // Wildflowers come in loose clumps of one kind and colour
  const WILD = [
    { kind: 'daisy', cols: ['white', 'white', 'yellow'], h: [0.16, 0.28], size: 0.8 },
    { kind: 'poppy', cols: ['red', 'red', 'orange'], h: [0.28, 0.45], size: 0.9 },
    { kind: 'cosmos', cols: ['pink', 'blush', 'violet', 'white'], h: [0.34, 0.55], size: 1 },
    { kind: 'spike', cols: ['violet', 'blue', 'blush'], h: [0.45, 0.75], size: 1 },
    { kind: 'daisy', cols: ['gold', 'yellow'], h: [0.1, 0.18], size: 0.55 },       // buttercups
  ];
  const SEG = 1;
  const gauss = (r) => (r() + r() + r() - 1.5) * 0.8;
  function segment(n) {
    const r = rng(n * 7919 + 13), out = { flowers: [], tufts: [], rocks: [], trees: [] };
    const zA = -n * SEG;
    const clumps = 2 + ((r() * 3) | 0);
    for (let c = 0; c < clumps; c++) {
      const z = zA - r() * SEG, side = r() < 0.5 ? -1 : 1;
      const off = side * (pathW(z) + 0.2 + Math.pow(r(), 1.5) * 6), cx = pathX(z) + off;
      const w = WILD[(r() * WILD.length) | 0], col = C[w.cols[(r() * w.cols.length) | 0]];
      const count = 3 + ((r() * 7) | 0), spread = 0.2 + r() * 0.45;
      for (let i = 0; i < count; i++) {
        const x = cx + gauss(r) * spread, fz = z + gauss(r) * spread;
        if (onPath(x, fz) >= 0 || Math.abs(x - pathX(fz)) < pathW(fz) + 0.1) continue;
        out.flowers.push({ x, z: fz, y0: height(x, fz), h: w.h[0] + r() * (w.h[1] - w.h[0]), size: w.size * (0.85 + r() * 0.3), kind: w.kind, col, yaw: r() * 6.28, ph: r() * 6.28 });
      }
    }
    // Tall grass: thickest right at the path's edge, where feet don't reach
    for (let i = 0; i < 14; i++) {
      const z = zA - r() * SEG, side = r() < 0.5 ? -1 : 1, off = side * (pathW(z) + 0.02 + Math.pow(r(), 2.2) * 3.5), x = pathX(z) + off;
      out.tufts.push({ x, z, y0: height(x, z), h: 0.12 + r() * 0.22, lean: (r() - 0.5) * 0.12, ph: r() * 6.28, col: r() < 0.25 ? C.dry : r() < 0.5 ? C.grass2 : C.grass });
    }
    if (r() < 0.3) {
      const z = zA - r() * SEG, side = r() < 0.5 ? -1 : 1, x = pathX(z) + side * (pathW(z) + 0.1 + r() * 0.9);
      out.rocks.push({ x, z, y0: height(x, z), s: 0.07 + r() * 0.14 });
    }
    if (r() < 0.06) {
      const z = zA - r() * SEG, side = r() < 0.5 ? -1 : 1, x = pathX(z) + side * (3.5 + r() * 9);
      out.trees.push({ x, z, y0: height(x, z), h: 1.6 + r() * 1.2, cr: 0.7 + r() * 0.6 });
    }
    return out;
  }

  // Butterfly wing template
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

  const EYE = 0.72, FAR = 42;

  class Garden3D {
    constructor(canvas) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.walking = !this.reduced;
      this.camZ = 0; this.camY = height(pathX(0), 0) + EYE; this.yaw = 0;
      this.lookYaw = 0; this.lookPitch = 0; this.idle = 0; this.pauseT = 0;
      this.segs = new Map();
      this.bits = Uint8Array.from({ length: 8192 }, () => (Math.random() < 0.5 ? 1 : 0));
      const wingCols = [['white', 'red'], ['blue', 'white'], ['violet', 'gold'], ['orange', 'dark'], ['yellow', 'dark']];
      this.flyers = wingCols.map(([w, s], i) => ({
        wingC: C[w], spotC: C[s], scale: i === 0 ? 0.5 : 0.36 + Math.random() * 0.1,
        p: [pathX(-3 - i * 2) + Math.random() - 0.5, 1.2, -3 - i * 2.2], v: [0, 0, 0], yaw: -Math.PI / 2,
        phase: Math.random() * 6, glide: 0, perched: false, perchT: 0, dwell: 2, target: null, wand: 0, w: [0, 0, 0], flap: 0.5, hopT: 0,
      }));
      this.bee = { p: [0.9, 0.8, -3], v: [0, 0, 0], target: null, t: 0, yaw: 0 };
      this.flies = Array.from({ length: 40 }, () => this.newFly(true));
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
      const z = this.camZ - (any ? Math.random() * 14 : 5 + Math.random() * 9), x = pathX(z) + (Math.random() - 0.5) * 6;
      return { p: [x, height(x, z) + 0.2 + Math.random() * 0.7, z], ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 0.8 };
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
        this.lookYaw = clamp(this.lookYaw + (e.clientX - drag.x) * 0.004, -1.6, 1.6);
        this.lookPitch = clamp(this.lookPitch - (e.clientY - drag.y) * 0.003, -0.45, 0.4);
        drag = { x: e.clientX, y: e.clientY }; this.idle = 0;
      });
      const end = () => { drag = null; };
      c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
      c.addEventListener('wheel', (e) => { e.preventDefault(); this.camZ -= e.deltaY * 0.004; this.pauseT = 2.5; this.idle = 0; }, { passive: false });
      this.dragging = () => !!drag;
    }

    scene() {
      const n0 = Math.floor(-(this.camZ + 3) / SEG), n1 = Math.floor(-(this.camZ - 30) / SEG);
      for (const k of this.segs.keys()) if (k < n0 - 2 || k > n1 + 2) this.segs.delete(k);
      const out = { flowers: [], tufts: [], rocks: [], trees: [] };
      for (let n = n0; n <= n1; n++) {
        if (!this.segs.has(n)) this.segs.set(n, segment(n));
        const s = this.segs.get(n);
        for (const k in out) for (const v of s[k]) out[k].push(v);
      }
      // Trees on the hills can be seen from further away
      for (let n = n1 + 1; n <= n1 + 16; n++) {
        if (!this.segs.has(n)) this.segs.set(n, segment(n));
        for (const v of this.segs.get(n).trees) out.trees.push(v);
      }
      return out;
    }

    pickFlower(list, near, far) {
      const c = list.filter((p) => p.z < this.camZ - near && p.z > this.camZ - far && p.kind !== 'spike' && Math.abs(p.x - pathX(p.z)) < 3);
      return c.length ? c[(Math.random() * c.length) | 0] : null;
    }
    stepFlyer(b, dt, t, list) {
      if (b.p[2] > this.camZ + 2.5) { const z = this.camZ - 10 - Math.random() * 4; b.p = [pathX(z) + Math.random() * 2 - 1, height(pathX(z), z) + 1.2, z]; b.perched = false; b.target = null; }
      if (!b.target || b.target.z > this.camZ + 0.5) b.target = this.pickFlower(list, 1.5, 9);
      if (!b.target) return;
      const h = b.target, sway = Math.sin(t * 1.3 + h.ph) * 0.02;
      const seat = [h.x + sway, h.y0 + h.h + 0.04 * h.size, h.z];
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
      const arrive = Math.min(1, dl), wob = 0.25 + 0.75 * arrive, st = Math.min(1, dt * (dl < 0.35 ? 6 : 2.2));
      for (let k = 0; k < 3; k++) b.v[k] += ((d[k] / (dl || 1)) * 1.2 * arrive + b.w[k] * wob + (k === 1 && dl > 0.8 ? 0.2 : 0) - b.v[k]) * st;
      if (b.glide > 0) { b.glide -= dt; b.v[1] -= 0.5 * dt; } else if (dl > 1 && Math.random() < dt * 0.5) b.glide = 0.3 + Math.random() * 0.4;
      for (let k = 0; k < 3; k++) b.p[k] += b.v[k] * dt;
      b.p[1] = Math.max(height(b.p[0], b.p[2]) + 0.15, b.p[1]);
      if (b.glide > 0) b.flap += (0.12 - b.flap) * Math.min(1, dt * 8);
      else { b.phase += dt * 2 * Math.PI * 6; b.flap = 0.35 + 0.8 * Math.sin(b.phase); b.p[1] += Math.max(0, Math.cos(b.phase)) * 0.008; }
      if (Math.hypot(b.v[0], b.v[2]) > 0.1) { const da = ((Math.atan2(b.v[2], b.v[0]) - b.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; b.yaw += da * Math.min(1, dt * 6); }
      if (dl < 0.05) { b.perched = true; b.perchT = 0; b.glide = 0; b.dwell = 1.8 + Math.random() * 2.5; }
    }
    stepBee(dt, t, list) {
      const e = this.bee;
      const near = (p) => p.z < this.camZ - 1.2 && p.z > this.camZ - 5 && Math.abs(p.x - pathX(p.z)) < 1.8;
      if (!e.target || e.target.z > this.camZ - 0.8 || e.p[2] > this.camZ + 1) {
        e.target = list.find(near) || null;
        if (e.p[2] > this.camZ + 1) { const z = this.camZ - 6; e.p = [pathX(z) + 1, height(pathX(z) + 1, z) + 0.6, z]; }
      }
      if (!e.target) return;
      const h = e.target, seat = [h.x, h.y0 + h.h + 0.07, h.z];
      const d = [seat[0] - e.p[0], seat[1] - e.p[1], seat[2] - e.p[2]], dl = Math.hypot(d[0], d[1], d[2]);
      e.t += dt;
      if (dl < 0.06 && e.t > 1) {
        e.t = 0;
        const c = list.filter((p) => near(p) && Math.abs(p.x - h.x) < 0.8 && p !== h);
        if (c.length) e.target = c[(Math.random() * c.length) | 0];
      }
      const arrive = Math.min(1, dl / 0.4);
      for (let k = 0; k < 3; k++) { e.v[k] += ((d[k] / (dl || 1)) * 1.8 * arrive - e.v[k]) * Math.min(1, dt * 5); e.p[k] += e.v[k] * dt; }
      e.p[1] += Math.sin(t * 9) * 0.003;
      if (Math.hypot(e.v[0], e.v[2]) > 0.15) e.yaw = Math.atan2(e.v[2], e.v[0]);
    }

    frame(dt, t) {
      const { COLS, ROWS, zb, gl, co } = this;
      // ── Walk the path: follow its bends, rise and fall with the ground ──
      this.pauseT -= dt; this.idle += dt;
      if (this.walking && this.pauseT <= 0) this.camZ -= dt * 0.36;
      if (!this.dragging() && this.idle > 2.5) { this.lookYaw *= 1 - Math.min(1, dt * 0.7); this.lookPitch *= 1 - Math.min(1, dt * 0.7); }
      fillTables(this.camZ + 10);
      const cz = this.camZ, cx = pathX(cz) + 0.06 * Math.sin(t * 0.21);
      const wantY = height(cx, cz) + EYE + (this.walking && !this.reduced && this.pauseT <= 0 ? Math.sin(t * 3.6) * 0.008 : 0);
      this.camY += (wantY - this.camY) * Math.min(1, dt * 4);
      const ahead = 2.2, ax0 = pathX(cz - ahead) - cx;
      const wantYaw = Math.atan2(ax0, ahead);
      this.yaw += (wantYaw - this.yaw) * Math.min(1, dt * 1.5);
      const yaw = this.yaw + this.lookYaw;
      // Slope ahead tilts the view a little, like a walker looking up a rise
      const slope = (height(pathX(cz - 1.5), cz - 1.5) - height(cx, cz)) / 1.5;
      const pitch = -0.1 + this.lookPitch + clamp(slope * 0.5, -0.15, 0.15);
      const cam = [cx, this.camY, cz];
      const fx = Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = Math.sin(yaw);
      const FOC = Math.min(this.H, this.W * 1.2), ax = this.cw / FOC, ay = this.chH / FOC, hc = COLS / 2;
      const hr = ROWS / 2 - pitch / ay;           // pitch shifts the horizon
      const fogOf = (z) => clamp(1.15 - z / 30, 0.1, 1);
      for (let i = 0; i < 300; i++) this.bits[(Math.random() * 8192) | 0] ^= 1;
      zb.fill(0); gl.fill(-1);

      // ── 1. Hills: one ray per column, front to back, keeping a per-column horizon ──
      for (let sx = 0; sx < COLS; sx++) {
        const a = (sx + 0.5 - hc) * ax, dxw = fx + rx * a, dzw = fz + rz * a;
        let ybuf = ROWS, z = 0.25, lastH = null;
        while (z < FAR && ybuf > 0) {
          const x = cam[0] + dxw * z, wz = cam[2] + dzw * z, h = height(x, wz);
          const syf = hr - (h - cam[1]) / z / ay, sy = Math.max(0, Math.floor(syf));
          if (sy < ybuf) {
            // Shade by slope against the moon
            const e = 0.12, hxp = height(x + e, wz), hzp = height(x, wz + e);
            const n = norm([-(hxp - h) / e, 1, -(hzp - h) / e]);
            const diff = Math.max(0, n[0] * LMOON[0] + n[1] * LMOON[1] + n[2] * LMOON[2]);
            const fog = fogOf(z), pp = onPath(x, wz);
            for (let yy = sy; yy < ybuf; yy++) {
              const i = yy * COLS + sx;
              zb[i] = 1 / z;
              const hh = hash2(Math.floor(x * (z < 5 ? 16 : z < 12 ? 8 : 4)) + yy * 31, Math.floor(wz * (z < 5 ? 16 : z < 12 ? 8 : 4)));
              let glyph, col, lum;
              if (pp >= 0) {
                // The worn path: packed dirt, lighter in the middle where it's walked most, a few pebbles
                const centre = 1 - pp;
                col = centre > 0.45 ? C.dirt2 : C.dirt;
                glyph = hh < 0.05 && z < 8 ? K.o : DIRT[(hh * DIRT.length) | 0];
                if (hh < 0.05 && z < 8) col = C.pebble;
                lum = (0.78 + 0.25 * diff + 0.2 * centre) * fog;
                if (z > 9) glyph = centre > 0.3 ? K['='] : K['-'];     // far away, keep the ribbon solid
              } else {
                const g = hh;
                // Meadow grass: every cell drawn, brightness from the slope, so the hills read as shapes
                glyph = z < 6 ? GRASS_NEAR[(g * GRASS_NEAR.length) | 0] : diff > 0.75 ? K[':'] : GRASS_FAR[(g * GRASS_FAR.length) | 0];
                col = g < 0.12 ? C.dry : g < 0.45 ? C.grass2 : C.grass;
                lum = (0.3 + 0.8 * diff) * fog * (0.85 + 0.3 * g);
              }
              gl[i] = glyph;
              if (glyph >= 0) co[i] = col * NL + levelOf(lum);
            }
            ybuf = sy;
          }
          lastH = h;
          z += 0.06 + z * 0.026;
        }
        // Sky above the hills: stars, the moon, a faint haze on the horizon
        for (let yy = 0; yy < ybuf; yy++) {
          const i = yy * COLS + sx, el = (hr - yy - 0.5) * ay, az = yaw + Math.atan(a);
          const dir = norm([Math.sin(az), el, -Math.cos(az)]);
          const md = dir[0] * MOON[0] + dir[1] * MOON[1] + dir[2] * MOON[2];
          if (md > 0.9985) {
            const crater = hash2(Math.floor(dir[0] * 300), Math.floor(dir[1] * 300)) < 0.18;
            gl[i] = md > 0.99975 ? (crater ? K.o : K['@']) : md > 0.9992 ? K['#'] : K[':']; co[i] = C.moon * NL + levelOf(0.9);
          } else if (el > 0.01) {
            const hh = hash2(Math.floor(az * 120), Math.floor(el * 120));
            if (hh < 0.02) { gl[i] = hh < 0.003 ? K['+'] : K['.']; co[i] = C.star * NL + levelOf(0.35 + hh * 30); }
            else if (el < 0.05 && hh < 0.25) { gl[i] = K['-']; co[i] = C.haze * NL + levelOf(0.6 - el * 8); }
          }
        }
      }

      // ── 2. Things, depth-tested against the hills ──
      const proj = (x, y, z) => {
        const qx = x - cam[0], qz = z - cam[2], zc = qx * fx + qz * fz;
        if (zc < 0.12) return null;
        return [hc + (qx * rx + qz * rz) / zc / ax, hr - (y - cam[1]) / zc / ay, zc];
      };
      const putCell = (sx, sy, zc, col, glyph, lum) => {
        sx |= 0; sy |= 0;
        if (sx < 0 || sy < 0 || sx >= COLS || sy >= ROWS) return;
        const i = sy * COLS + sx, iz = 1 / zc;
        if (iz <= zb[i]) return;
        zb[i] = iz; gl[i] = glyph; co[i] = col * NL + levelOf(lum * fogOf(zc));
      };
      const put = (x, y, z, col, glyph, lum) => { const p = proj(x, y, z); if (p) putCell(p[0], p[1], p[2], col, glyph, lum); };
      const line = (a, b, col, glyph, lum, dz = 0) => {
        const n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))));
        for (let s = 0; s <= n; s++) { const k = s / n; putCell(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k - dz, col, glyph, lum); }
      };
      const shade = (nx, ny, nz) => 0.45 + 0.5 * Math.abs(nx * LMOON[0] + ny * LMOON[1] + nz * LMOON[2]);
      const cpu = (zc) => 1 / (zc * ax);         // cells per unit at this depth
      const S = this.scene();

      // Lone trees: trunk + a rounded canopy, shaded from the moon side
      for (const tr of S.trees) {
        const top = proj(tr.x, tr.y0 + tr.h, tr.z), base = proj(tr.x, tr.y0, tr.z);
        if (!top || !base || top[0] < -40 || top[0] > COLS + 40) continue;
        line(base, proj(tr.x, tr.y0 + tr.h * 0.6, tr.z), C.bark, K['|'], 0.6);
        const rcx = tr.cr * cpu(top[2]), rcy = tr.cr * 0.85 * cpu(top[2]) * (ax / ay);
        const cyy = top[1] + rcy * 0.3;
        for (let yy = Math.floor(cyy - rcy); yy <= cyy + rcy; yy++) for (let xx = Math.floor(top[0] - rcx); xx <= top[0] + rcx; xx++) {
          const ux = (xx - top[0]) / rcx, uy = (yy - cyy) / rcy, d = ux * ux + uy * uy;
          const ragged = 0.82 + 0.18 * hash2(xx * 3 + (tr.z | 0), yy * 7);
          if (d > ragged) continue;
          const hh = hash2(xx + ((tr.x * 50) | 0), yy * 13), lit = clamp(0.5 - ux * 0.35 - uy * 0.35, 0, 1);
          putCell(xx, yy, top[2] + d * tr.cr, hh > 0.7 ? C.canopy2 : C.canopy, d > ragged - 0.1 ? K[':'] : hh < 0.5 ? K['%'] : hh < 0.8 ? K['#'] : K['&'], 0.35 + 0.55 * lit);
        }
      }
      // Rocks at the path's edge
      for (const rk of S.rocks) {
        const c = proj(rk.x, rk.y0 + rk.s * 0.5, rk.z);
        if (!c) continue;
        const rcx = rk.s * cpu(c[2]), rcy = rk.s * 0.6 * cpu(c[2]) * (ax / ay);
        if (rcx < 0.6) { putCell(c[0], c[1], c[2], C.rock, K.o, 0.7); continue; }
        for (let yy = Math.floor(c[1] - rcy); yy <= c[1] + rcy * 0.6; yy++) for (let xx = Math.floor(c[0] - rcx); xx <= c[0] + rcx; xx++) {
          const ux = (xx - c[0]) / rcx, uy = (yy - c[1]) / rcy, d = ux * ux + uy * uy;
          if (d > 1) continue;
          putCell(xx, yy, c[2] - 0.01, C.rock, d > 0.7 ? K[':'] : uy < -0.2 ? K['#'] : K['%'], 0.45 + 0.4 * clamp(0.5 - ux * 0.4 - uy * 0.5, 0, 1));
        }
      }
      // Tall grass leaning over the path's edges (near only: the hills carry the texture further out)
      for (const g of S.tufts) {
        const b = proj(g.x, g.y0, g.z);
        if (!b || b[2] > 5) continue;
        const sw = Math.sin(t * 1.6 + g.ph) * 0.03;
        for (let k = -1; k <= 1; k++) {
          const tip = proj(g.x + g.lean + k * 0.05 + sw, g.y0 + g.h * (1 - Math.abs(k) * 0.25), g.z + k * 0.02);
          if (!tip) continue;
          const glyph = tip[0] - b[0] > 0.6 ? K['/'] : tip[0] - b[0] < -0.6 ? K['\\'] : K['|'];
          line([b[0] + k * 0.4, b[1], b[2]], tip, g.col, glyph, 0.75, 0.02);
        }
      }
      // Wildflowers with level of detail
      for (const p of S.flowers) {
        const sway = Math.sin(t * 1.3 + p.ph) * 0.02;
        const hp = proj(p.x + sway, p.y0 + p.h, p.z);
        if (!hp || hp[0] < -6 || hp[0] > COLS + 6 || hp[1] < -6 || hp[1] > ROWS + 6) continue;
        const rc = 0.12 * p.size * cpu(hp[2]);
        const light = 0.85;
        if (rc >= 3.5) {
          const T = TEMPLATES[p.kind], cs = Math.cos(p.yaw), sn = Math.sin(p.yaw);
          for (let k = 0; k < T.length; k += 9) {
            const ox = T[k] * p.size, oz = T[k + 1] * p.size, ly = T[k + 2] * p.h + T[k + 3] * p.size, part = T[k + 4];
            const x = p.x + ox * cs - oz * sn + sway * (ly / p.h), z = p.z + ox * sn + oz * cs;
            const L = shade(T[k + 5] * cs - T[k + 7] * sn, T[k + 6], T[k + 5] * sn + T[k + 7] * cs);
            let col, g;
            if (part === PART.stem) { col = C.stem; g = K['|']; }
            else if (part === PART.leaf) { col = C.leaf; g = T[k + 8] ? K[':'] : rampOf(LEAF_RAMP, L * 0.9); }
            else if (part === PART.centre) { col = p.kind === 'poppy' ? C.dark : C.gold; g = L > 0.7 ? K['@'] : K.o; }
            else { col = p.col; g = T[k + 8] ? K[':'] : rampOf(PETAL_RAMP, L); }
            put(x, p.y0 + ly, z, col, g, L);
          }
          continue;
        }
        const bp = proj(p.x, p.y0, p.z);
        if (bp && rc >= 0.5) line([hp[0], hp[1] + 1, hp[2]], bp, C.stem, K['|'], 0.6, -0.01);
        if (p.kind === 'spike') {
          const sp = proj(p.x + sway, p.y0 + p.h * 0.5, p.z);
          const top = Math.floor(hp[1]), bot = sp ? Math.ceil(sp[1]) : top + 1;
          for (let sy = top; sy <= bot; sy++) putCell(hp[0], sy, hp[2], p.col, (sy - top) % 2 ? K[':'] : K['*'], light * (1 - 0.25 * ((sy - top) / (bot - top + 1))));
        } else if (rc >= 1) {
          ICONS[p.kind].forEach((row, ri) => row.forEach((ch, ci) => {
            if (ch === '.') return;
            const centre = ri === 1 && ci === 1;
            putCell(hp[0] + ci - 1, hp[1] + ri - 1, hp[2], centre ? (p.kind === 'poppy' ? C.dark : C.gold) : p.col, K[ch], light);
          }));
        } else putCell(hp[0], hp[1], hp[2], p.col, p.kind === 'poppy' ? K.o : rc > 0.55 ? K['*'] : K['.'], light);
      }

      // Fireflies
      for (const q of this.flies) {
        if (q.p[2] > this.camZ + 1) Object.assign(q, this.newFly(false));
        q.p[0] += Math.sin(t * 0.4 * q.sp + q.ph) * 0.003; q.p[1] += Math.sin(t * 0.9 + q.ph) * 0.0015;
        const glow = Math.sin(t * 2.1 * q.sp + q.ph);
        if (glow > 0.25) put(q.p[0], q.p[1], q.p[2], C.firefly, glow > 0.8 ? K['*'] : K['+'], 0.6 + glow * 0.5);
      }

      // Butterflies and the bee
      for (const b of this.flyers) this.stepFlyer(b, dt, t, S.flowers);
      this.stepBee(dt, t, S.flowers);
      for (const b of this.flyers) {
        const bp = proj(b.p[0], b.p[1], b.p[2]); if (!bp) continue;
        const rc = 0.3 * b.scale * cpu(bp[2]);
        if (rc < 2.5) { putCell(bp[0], bp[1], bp[2] - 0.02, b.wingC, b.flap > 0.6 ? K.v : K['-'], 1); continue; }
        const s = b.scale, cy = Math.cos(b.yaw), sy = Math.sin(b.yaw), Sd = [-sy, 0, cy];
        const pt = b.perched ? 0 : clamp(b.v[1] * 0.25, -0.4, 0.4), Fv = [cy * Math.cos(pt), Math.sin(pt), sy * Math.cos(pt)];
        const cf = Math.cos(b.flap), sf = Math.sin(b.flap), bitsOn = rc > 6;
        for (let side = -1; side <= 1; side += 2) for (let k = 0; k < WING.length; k += 3) {
          const wu = WING[k] * s, ww = WING[k + 1] * s, kind = WING[k + 2];
          const x = b.p[0] + Fv[0] * wu + Sd[0] * side * cf * ww, y = b.p[1] + Fv[1] * wu + sf * ww, z = b.p[2] + Fv[2] * wu + Sd[2] * side * cf * ww;
          const L = shade(-Sd[0] * side * sf, cf, -Sd[2] * side * sf) * 1.1;
          put(x, y, z, kind === 2 ? b.spotC : b.wingC, kind === 1 ? K[':'] : kind === 2 ? K['1'] : bitsOn ? (this.bits[k & 8191] ? K['1'] : K['0']) : rampOf(PETAL_RAMP, L), L);
        }
        for (let q = -0.2; q <= 0.17; q += 0.015) put(b.p[0] + Fv[0] * q * s, b.p[1] + Fv[1] * q * s + 0.004, b.p[2] + Fv[2] * q * s, C.body, q > 0.13 ? K['0'] : q > 0.02 ? K['8'] : K['='], 1);
      }
      {
        const e = this.bee, bp = proj(e.p[0], e.p[1], e.p[2]);
        if (bp) {
          const rc = 0.06 * cpu(bp[2]);
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
