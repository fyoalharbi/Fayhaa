// ─────────────────────────────────────────────
//  3D ASCII COTTAGE GARDEN (orbit view)
//
//  One cottage-garden plot at golden hour, circled by an orbiting camera:
//  an old flagstone path (moss and flowering thyme in the joints, fallen rose
//  petals) curving to a bird bath; borders of catmint, alyssum, pinks, phlox,
//  daisies and rose bushes; hollyhocks, foxgloves, delphiniums and lavender
//  at the back, alliums and tulips between them; a wooden rose arch. A low
//  sun lights every plant from one side and casts soft shadows across the
//  path. Butterflies and a bee work the flowers.
//
//  How it is drawn (on the GPU via WebGL when available: the CPU fills a
//  grid of glyph + colour per cell; a shader draws the letters):
//   • Ground and path are ray-cast per character cell.
//   • Plants, the arch and the bird bath are impostors: shapes filled
//     in screen space with textures fixed to the object, plus blossoms fixed
//     in 3D, so everything stays put as you orbit and shrinks cleanly.
//
//    const g = new Garden3D(canvas);
//    g.setSpinning(true | false);   drag to orbit, scroll to zoom
// ─────────────────────────────────────────────
(function () {
  const BASE = {
    stone: '#cfc8ba', stone2: '#bda98f', stone3: '#a3a9ae', sun: '#f6dcae', moss: '#6a9a48', thyme: '#d8b8ee',
    ground: '#365c2c', grass: '#4e7f3a', leafD: '#2b5a2c', leaf: '#45833b', leafL: '#74b056', leafS: '#a6cf74', stem: '#5f9a4f',
    treeD: '#22472a', tree: '#335f33', treeL: '#5e8f48', bark: '#6b5444',
    wall: '#e6e0d2', wallS: '#9d978b', roof: '#4e403c', window: '#ffd98a', frame: '#f4f0e6', wood: '#8a6a4c',
    water: '#9cc8e4', bath: '#cdc6ba',
    pink: '#ff8fbd', rose: '#ff6f9e', roseD: '#c83c6a', magenta: '#e0549c', blush: '#ffc6d8', white: '#faf8f0', cream: '#f4e4be',
    lavender: '#b49cf4', blue: '#7f9cff', violet: '#9a6ad8', red: '#ff4b4b', coral: '#ff806a', yellow: '#ffe066', eye: '#5a2040',
    body: '#ffffff', dark: '#3a2c08', glass: '#e7f0ff', gold: '#ffd24a', wing: '#ffffff', wingY: '#fff27a', wingB: '#9fd8ff', trail: '#fff6c8', mote: '#ffe9a8',
  };
  const NAMES = Object.keys(BASE);
  const C = Object.fromEntries(NAMES.map((n, i) => [n, i]));
  const LEVELS = [0.16, 0.3, 0.45, 0.6, 0.76, 0.9, 1];
  const NL = LEVELS.length;
  const PAL = [];
  for (const n of NAMES) {
    const v = parseInt(BASE[n].slice(1), 16), r = v >> 16, g = (v >> 8) & 255, b = v & 255;
    for (const l of LEVELS) PAL.push(`rgb(${(r * l) | 0},${(g * l) | 0},${(b * l) | 0})`);
  }
  const CH = ['.', ',', "'", '`', ':', ';', '|', '0', '1', '@', 'o', '8', '=', '-', '*', '+', '/', '\\', '°', '#', '%', '&', '~', '^', 'v', '"', '(', ')', '_', 'O', 'U', 'W', 'V', 'w', 'c', 'Y', '{', '}', '<', '>', 'x', '[', ']'];
  const K = Object.fromEntries(CH.map((c, i) => [c, i]));

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const levelOf = (lum) => clamp((lum * NL) | 0, 0, NL - 1);
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  function hash2(a, b) {
    let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function rng(seed) {
    let a = seed | 0;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // ── The plot ──
  const Z0 = 4.6, Z1 = -2.6;                               // the path runs from the front to the bird bath
  const pathXe = (z) => 0.55 * Math.sin(z * 0.42) + 0.15 * Math.sin(z * 1.1 + 1);
  const pathWe = (z) => 0.48 + 0.06 * Math.sin(z * 0.8) + 0.03 * Math.sin(z * 2.1 + 2);
  const LUT_Z0 = 9, LUT_STEP = 0.02, LUT_N = 1000;          // covers z from 9 down to −11
  const LUT_X = new Float32Array(LUT_N), LUT_W = new Float32Array(LUT_N);
  for (let i = 0; i < LUT_N; i++) { LUT_X[i] = pathXe(LUT_Z0 - i * LUT_STEP); LUT_W[i] = pathWe(LUT_Z0 - i * LUT_STEP); }
  const pathX = (z) => { const i = ((LUT_Z0 - z) / LUT_STEP) | 0; return i >= 0 && i < LUT_N ? LUT_X[i] : pathXe(z); };
  const pathW = (z) => { const i = ((LUT_Z0 - z) / LUT_STEP) | 0; return i >= 0 && i < LUT_N ? LUT_W[i] : pathWe(z); };
  const BATH = [pathX(Z1 - 0.7), Z1 - 0.7];                // bird bath in a small round paved circle
  const PLOT_R = 6.4, CENTER = [0, 0.55, -0.4], ARCH_Z = 1.1;
  const SUN = norm([-0.62, 0.5, -0.6]);                     // low evening sun, behind and to the left
  const stoneAt = (x, z) => {
    const s = 0.34, gx = Math.floor(x / s), gz = Math.floor(z / s);
    let f1 = 9, f2 = 9, id = 0, px0 = 0, pz0 = 0;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const cx = gx + i, cz = gz + j;
      const px = (cx + 0.15 + 0.7 * hash2(cx, cz)) * s, pz = (cz + 0.15 + 0.7 * hash2(cz + 71, cx - 13)) * s;
      const d = (x - px) * (x - px) + (z - pz) * (z - pz);
      if (d < f1) { f2 = f1; f1 = d; id = hash2(cx * 3 + 1, cz * 7 + 2); px0 = px; pz0 = pz; } else if (d < f2) f2 = d;
    }
    ST.edge = Math.sqrt(f2) - Math.sqrt(f1); ST.id = id; ST.ex = x - px0; ST.ez = z - pz0;
  };
  const ST = { edge: 0, id: 0, ex: 0, ez: 0 };
  const onPath = (x, z) => {
    const bx = x - BATH[0], bz = z - BATH[1];
    if (bx * bx + bz * bz < 1.1) return true;
    return z < Z0 && z > Z1 - 0.6 && Math.abs(x - pathX(z)) < pathW(z) + (hash2(Math.floor(x * 6), Math.floor(z * 6)) - 0.5) * 0.12;
  };

  // ── Planting ──
  const EDGE = [
    { bloom: ['lavender', 'blue'], leaf: 'leafL', rx: [0.28, 0.38], ry: [0.2, 0.3], density: 70, size: [0.022, 0.03], style: 'spikelet' },  // catmint
    { bloom: ['white', 'cream'], leaf: 'leaf', rx: [0.24, 0.34], ry: [0.12, 0.18], density: 90, size: [0.018, 0.024], style: 'dot' },       // alyssum
    { bloom: ['pink', 'blush', 'magenta'], leaf: 'leafS', rx: [0.22, 0.32], ry: [0.14, 0.2], density: 55, size: [0.026, 0.034], style: 'star' }, // pinks
    { bloom: ['violet', 'lavender'], leaf: 'leaf', rx: [0.3, 0.42], ry: [0.2, 0.3], density: 45, size: [0.03, 0.038], style: 'cup' },        // cranesbill
  ];
  const MID = [
    { bloom: ['pink', 'blush', 'white', 'magenta'], leaf: 'leaf', rx: [0.42, 0.58], ry: [0.5, 0.7], density: 55, size: [0.04, 0.052], style: 'star' },  // phlox
    { bloom: ['rose', 'pink', 'coral', 'cream', 'blush'], leaf: 'leafD', rx: [0.45, 0.62], ry: [0.55, 0.8], density: 14, size: [0.075, 0.1], style: 'rose' },
    { bloom: ['white'], leaf: 'leafL', rx: [0.36, 0.5], ry: [0.42, 0.6], density: 40, size: [0.04, 0.05], style: 'daisy' },
  ];
  const TALL = [
    { name: 'hollyhock', bloom: ['pink', 'white', 'magenta', 'blush', 'red'], h: [1.6, 2.2], r: 0.08, shape: 'cup' },
    { name: 'foxglove', bloom: ['magenta', 'pink', 'white'], h: [1.0, 1.45], r: 0.045, shape: 'bell' },
    { name: 'delphinium', bloom: ['blue', 'violet', 'lavender'], h: [1.2, 1.7], r: 0.04, shape: 'star' },
    { name: 'lavender', bloom: ['lavender', 'violet'], h: [0.55, 0.75], r: 0.022, shape: 'dot' },
    { name: 'allium', bloom: ['violet', 'lavender'], h: [0.95, 1.25], r: 0.11, shape: 'globe' },
  ];
  const TULIP = { bloom: ['red', 'pink', 'yellow', 'white', 'coral'], h: [0.32, 0.48], r: 0.05 };
  const pick = (r, a) => a[(r() * a.length) | 0];
  const span = (r, [a, b]) => a + r() * (b - a);
  function mound(r, x, z, sp, colName) {
    const rx = span(r, sp.rx), ry = span(r, sp.ry), n = Math.round(sp.density * rx * 2), blooms = [];
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, e = Math.acos(1 - r() * (sp.style === 'rose' ? 0.95 : 0.85));
      const bud = sp.style === 'rose' && r() < 0.25;
      blooms.push(Math.sin(e) * Math.cos(a) * rx, Math.cos(e) * ry, Math.sin(e) * Math.sin(a) * rx * 0.85, span(r, sp.size) * (bud ? 0.45 : 1),
        C[sp.bloom.length > 2 && r() < 0.15 ? pick(r, sp.bloom) : colName], bud ? 1 : 0, r() * 6.28);
    }
    return { x, z, rx, ry, leaf: C[sp.leaf], col: C[colName], style: sp.style, blooms: new Float32Array(blooms), seed: (r() * 1e6) | 0 };
  }
  function plant() {
    const r = rng(20251105), mounds = [], spikes = [], trees = [], petals = [];
    const free = (x, z, rad, list) => !list.some((m) => Math.hypot(m.x - x, m.z - z) < rad + (m.rx || 0) * 0.6);
    for (const side of [-1, 1]) {
      // Edge: low mounds that lean over the stones
      let k = 0;
      for (let z = Z0 - 0.3; z > Z1 - 0.2; z -= 0.5 + r() * 0.25, k++) {
        const sp = EDGE[(Math.floor((z + 9) / 1.8) + (side > 0 ? 2 : 0)) % EDGE.length];
        mounds.push(mound(r, pathX(z) + side * (pathW(z) + span(r, [0.08, 0.26])), z, sp, pick(r, sp.bloom)));
      }
      // Middle: phlox, daisies, rose bushes
      for (let z = Z0 - 0.6; z > Z1 - 0.6; z -= 0.72 + r() * 0.3) {
        const sp = r() < 0.35 ? MID[1] : r() < 0.5 ? MID[2] : MID[0];
        const x = pathX(z) + side * (pathW(z) + span(r, [0.75, 1.25]));
        if (Math.abs(z - ARCH_Z) < 0.35 && Math.abs(x - pathX(ARCH_Z)) < 1.2) continue;
        const m = mound(r, x, z, sp, pick(r, sp.bloom));
        mounds.push(m);
        if (sp.style === 'rose') for (let i = 0; i < 6; i++) {           // petals dropped on the path
          const pz = z + (r() - 0.5) * 0.8, px = pathX(pz) + side * pathW(pz) * (0.3 + r() * 0.6);
          petals.push(px, pz, m.col);
        }
      }
      // Tulips in small groups between the edge and the middle row
      for (let z = Z0 - 0.5; z > Z1; z -= 1.1 + r() * 0.6) {
        const col = C[pick(r, TULIP.bloom)], cx = pathX(z) + side * (pathW(z) + span(r, [0.45, 0.7]));
        for (let i = 0; i < 4; i++) spikes.push({ x: cx + (r() - 0.5) * 0.35, z: z + (r() - 0.5) * 0.35, h: span(r, TULIP.h), col, shape: 'tulip', florets: [0, TULIP.r, r() * 6.28, 0], ph: r() * 6.28 });
      }
      // Back: clumps of tall spikes, each with a leafy rosette, and big mounds between
      for (let z = Z0 - 1; z > Z1 - 0.8; z -= 1.0 + r() * 0.5) {
        const tall = pick(r, TALL), col = C[pick(r, tall.bloom)], cx = pathX(z) + side * (pathW(z) + span(r, [1.7, 2.4]));
        const n = tall.name === 'lavender' ? 5 : tall.name === 'allium' ? 4 : 3;
        for (let i = 0; i < n; i++) {
          const florets = [], h = span(r, tall.h), x = cx + (r() - 0.5) * 0.5, zz = z + (r() - 0.5) * 0.5;
          const step = tall.r * (tall.shape === 'cup' ? 1.7 : tall.shape === 'dot' ? 1.6 : 1.35);
          if (tall.shape === 'globe') florets.push(h, tall.r, 0, 0);       // one round head on a bare stem
          else for (let y = h * (tall.name === 'lavender' ? 0.6 : 0.45); y < h; y += step) {
            const kk = (y - h * 0.45) / (h * 0.55);
            florets.push(y, tall.r * (1 - kk * 0.5), r() * 6.28, r() < 0.12 && tall.shape !== 'dot' ? 1 : 0);
          }
          spikes.push({ x, z: zz, h, col: C[pick(r, tall.bloom)] === col || r() < 0.7 ? col : C[pick(r, tall.bloom)], shape: tall.shape, florets, ph: r() * 6.28 });
          if (tall.name !== 'lavender' && tall.name !== 'allium') mounds.push({ x, z: zz, rx: 0.2, ry: 0.16, leaf: C.leaf, col: C.leaf, style: 'none', blooms: new Float32Array(0), seed: (r() * 1e6) | 0 });
        }
      }
      for (let z = Z0 - 0.4; z > Z1 - 1.5; z -= 1.4 + r()) {
        const x = pathX(z) + side * (pathW(z) + span(r, [2.6, 3.6]));
        mounds.push(mound(r, x, z, r() < 0.4 ? MID[1] : MID[0], pick(r, ['pink', 'white', 'rose', 'blush', 'cream'])));
      }
    }
    return { mounds, spikes, trees, petals: new Float32Array(petals) };
  }

  // Soft shadow map on the ground, cast away from the low sun (static scene: built once)
  const SM_RES = 0.08, SM_N = 200, SM_O = -SM_N * SM_RES / 2;
  function shadowMap(P) {
    const m = new Float32Array(SM_N * SM_N).fill(1);
    const shx = -SUN[0] / SUN[1], shz = -SUN[2] / SUN[1];
    const blob = (x, z, rad, h, dark) => {
      for (let s = 0; s <= 1; s += 0.25) {
        const cx = x + shx * h * s * 0.9, cz = z + shz * h * s * 0.9, rr = rad * (1 - s * 0.25);
        const i0 = Math.floor((cx - rr - SM_O) / SM_RES), i1 = Math.ceil((cx + rr - SM_O) / SM_RES);
        const j0 = Math.floor((cz - rr - SM_O) / SM_RES), j1 = Math.ceil((cz + rr - SM_O) / SM_RES);
        for (let i = Math.max(0, i0); i <= Math.min(SM_N - 1, i1); i++) for (let j = Math.max(0, j0); j <= Math.min(SM_N - 1, j1); j++) {
          const d = Math.hypot(SM_O + i * SM_RES - cx, SM_O + j * SM_RES - cz) / rr;
          if (d < 1) { const v = 1 - dark * (1 - d * d); const k = j * SM_N + i; if (v < m[k]) m[k] = v; }
        }
      }
    };
    for (const o of P.mounds) blob(o.x, o.z, o.rx * 1.05, o.ry, 0.45);
    for (const s of P.spikes) blob(s.x, s.z, 0.12, s.h, 0.3);
    const ax = pathX(ARCH_Z), aw = pathW(ARCH_Z) + 0.3;
    for (let a = 0; a <= Math.PI; a += 0.2) blob(ax + Math.cos(a) * aw, ARCH_Z, 0.18, 1.7 + Math.sin(a) * 0.5, 0.35);
    return m;
  }
  const shadeAt = (SM, x, z) => {
    const i = Math.floor((x - SM_O) / SM_RES), j = Math.floor((z - SM_O) / SM_RES);
    return i >= 0 && j >= 0 && i < SM_N && j < SM_N ? SM[j * SM_N + i] : 1;
  };

  // Butterfly wing template: fill, edge band, spots, veins
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
      const [su, sw, sr] = best.e.spot, th = Math.atan2(u, w), kv = (th * 5) / Math.PI;
      const kind = Math.hypot(u - su, w - sw) < sr ? 2 : best.d > 0.8 ? 1 : best.d > 0.58 ? 4 : Math.abs(kv - Math.round(kv)) < 0.09 && w > 0.06 ? 3 : 0;
      pts.push(u, w, kind);                  // 0 fill · 1 edge · 2 spot · 3 vein · 4 outer band
    }
    return new Float32Array(pts);
  })();

  class Garden3D {
    constructor(canvas) {
      this.canvas = canvas;
      this.glr = this.initGL();
      if (!this.glr) this.ctx = canvas.getContext('2d');
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.spinning = !this.reduced;
      // Portrait phones look down from higher and closer, so the garden fills the tall screen
      const tall = canvas.clientWidth < canvas.clientHeight * 0.8;
      this.yaw = 0.55; this.pitch = tall ? 0.7 : 0.36; this.dist = tall ? 7.2 : 8.4; this.idle = 0;
      const P = plant();
      this.mounds = P.mounds; this.spikes = P.spikes; this.petals = P.petals;
      this.SM = shadowMap(P);
      this.flowerTops = this.mounds.filter((m) => m.style !== 'none' && Math.hypot(m.x, m.z - CENTER[2]) < 4);
      this.bits = Uint8Array.from({ length: 4096 }, () => (Math.random() < 0.5 ? 1 : 0));
      const wingCols = [['wing', 'red', 'dark'], ['wingY', 'dark', 'dark'], ['wingB', 'dark', 'blue']];
      this.flyers = wingCols.map(([w, s, band], i) => ({
        wingC: C[w], spotC: C[s], bandC: C[band], scale: i === 0 ? 0.62 : 0.52,
        p: [Math.random() * 2 - 1, 1.2, Z0 - 2 - i * 2], v: [0, 0, 0], yaw: -Math.PI / 2, trail: [],
        phase: Math.random() * 6, glide: 0, perched: false, perchT: 0, dwell: 2, target: null, wand: 0, w: [0, 0, 0], flap: 0.5, hopT: 0,
      }));
      this.bee = { p: [1, 0.7, 0], v: [0, 0, 0], target: null, t: 0, yaw: 0, trail: [] };
      this.motes = Array.from({ length: 60 }, () => ({ p: [(Math.random() - 0.5) * 8, 0.2 + Math.random() * 2.6, CENTER[2] + (Math.random() - 0.5) * 8], ph: Math.random() * 6.28, sp: 0.4 + Math.random() }));
      this.resize();
      addEventListener('resize', () => this.resize());
      if (document.fonts) document.fonts.ready.then(() => this.resize());
      this.bindInput();
      this.last = performance.now();
      this.quality = 0; this.slow = 0;
      this.minGap = 1000 / 61; this.avg = 8;
      const loop = (now) => {
        requestAnimationFrame(loop);
        if (now - this.last < this.minGap) return;
        const t0 = performance.now();
        this.frame(Math.min(0.05, (now - this.last) / 1000), now / 1000);
        this.last = now;
        this.avg = this.avg * 0.95 + (performance.now() - t0) * 0.05;
        if (this.avg > 13 && this.minGap < 30) { this.minGap = 1000 / 31; this.avg = 8; }                // 30 fps
        else if (this.avg > 20 && this.quality < 3) { this.quality++; this.avg = 8; this.resize(); }      // fewer cells
      };
      requestAnimationFrame(loop);
    }

    setSpinning(on) { this.spinning = on; return on; }

    resize() {
      const r = this.canvas.getBoundingClientRect();
      const d = this.glr ? Math.min(devicePixelRatio || 1, 2) : 1;
      this.W = r.width; this.H = r.height; this.dpr = d;
      this.canvas.width = Math.round(r.width * d); this.canvas.height = Math.round(r.height * d);
      this.fs = (r.width < 600 ? 9 : 10) + (this.quality || 0);
      this.cw = this.fs * 0.6; this.chH = this.fs * 1.08;
      this.COLS = Math.ceil(r.width / this.cw); this.ROWS = Math.ceil(r.height / this.chH);
      if (this.glr) this.glAtlas(); else this.buildAtlas();
      const n = this.COLS * this.ROWS;
      this.zb = new Float32Array(n); this.gl = new Int8Array(n); this.co = new Int16Array(n);
    }

    // ── WebGL renderer: the fragment shader looks up which glyph and colour its cell
    // holds and samples the glyph from a white-on-clear atlas ──
    initGL() {
      let g;
      try { g = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false }); } catch (e) { g = null; }
      if (!g) return null;
      const sh = (type, src) => { const o = g.createShader(type); g.shaderSource(o, src); g.compileShader(o); return g.getShaderParameter(o, g.COMPILE_STATUS) ? o : null; };
      const vs = sh(g.VERTEX_SHADER, 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }');
      const fs = sh(g.FRAGMENT_SHADER, `precision mediump float;
        uniform sampler2D grid, atlas, pal;
        uniform vec2 gridSize, cell, atlasSize, glyphPx;
        uniform float palN, canvasH;
        void main() {
          vec2 fc = vec2(gl_FragCoord.x, canvasH - gl_FragCoord.y);
          vec2 c = floor(fc / cell);
          if (c.x >= gridSize.x || c.y >= gridSize.y) discard;
          vec4 t = texture2D(grid, (c + 0.5) / gridSize);
          float glyph = floor(t.r * 255.0 + 0.5);
          if (glyph > 254.0) discard;
          float ci = floor(t.g * 255.0 + 0.5) + floor(t.b * 255.0 + 0.5) * 256.0;
          vec2 lp = fc - c * cell;
          float a = texture2D(atlas, (vec2(glyph * glyphPx.x, 0.0) + lp) / atlasSize).a;
          if (a < 0.03) discard;
          vec3 col = texture2D(pal, vec2((ci + 0.5) / palN, 0.5)).rgb;
          gl_FragColor = vec4(col * a, a);
        }`);
      if (!vs || !fs) return null;
      const prog = g.createProgram();
      g.attachShader(prog, vs); g.attachShader(prog, fs); g.linkProgram(prog);
      if (!g.getProgramParameter(prog, g.LINK_STATUS)) return null;
      g.useProgram(prog);
      const buf = g.createBuffer();
      g.bindBuffer(g.ARRAY_BUFFER, buf);
      g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), g.STATIC_DRAW);
      const loc = g.getAttribLocation(prog, 'p');
      g.enableVertexAttribArray(loc); g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
      const tex = (unit) => {
        const t = g.createTexture(); g.activeTexture(g.TEXTURE0 + unit); g.bindTexture(g.TEXTURE_2D, t);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
        return t;
      };
      const R = { g, prog, tGrid: tex(0), tAtlas: tex(1), tPal: tex(2), u: {} };
      for (const n of ['grid', 'atlas', 'pal', 'gridSize', 'cell', 'atlasSize', 'glyphPx', 'palN', 'canvasH']) R.u[n] = g.getUniformLocation(prog, n);
      g.uniform1i(R.u.grid, 0); g.uniform1i(R.u.atlas, 1); g.uniform1i(R.u.pal, 2);
      const pal = new Uint8Array(PAL.length * 4);
      PAL.forEach((s, i) => { const m = s.match(/\d+/g); pal.set([+m[0], +m[1], +m[2], 255], i * 4); });
      g.activeTexture(g.TEXTURE2); g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, PAL.length, 1, 0, g.RGBA, g.UNSIGNED_BYTE, pal);
      g.uniform1f(R.u.palN, PAL.length);
      g.enable(g.BLEND); g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
      return R;
    }
    glAtlas() {
      const R = this.glr, g = R.g, d = this.dpr;
      const gw = Math.ceil(this.cw * d) + 1, gh = Math.ceil(this.chH * d) + 1;
      const c = document.createElement('canvas');
      c.width = gw * CH.length; c.height = gh;
      const x = c.getContext('2d');
      x.font = `700 ${this.fs * d}px "JetBrains Mono", ui-monospace, monospace`;
      x.textBaseline = 'top'; x.direction = 'ltr'; x.fillStyle = '#fff';
      CH.forEach((ch, gi) => x.fillText(ch, gi * gw, 0));
      g.activeTexture(g.TEXTURE1); g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, c);
      g.viewport(0, 0, this.canvas.width, this.canvas.height);
      g.uniform2f(R.u.cell, this.cw * d, this.chH * d);
      g.uniform2f(R.u.atlasSize, c.width, c.height);
      g.uniform2f(R.u.glyphPx, gw, gh);
      g.uniform1f(R.u.canvasH, this.canvas.height);
      this.COLS = Math.floor(this.W / this.cw); this.ROWS = Math.floor(this.H / this.chH);
      g.uniform2f(R.u.gridSize, this.COLS, this.ROWS);
      R.data = new Uint8Array(this.COLS * this.ROWS * 4);
    }
    // CPU fallback: glyphs in every colour as sparse pixel lists, blitted into one image
    buildAtlas() {
      const gw = Math.ceil(this.cw) + 1, gh = Math.ceil(this.chH) + 1;
      const c = document.createElement('canvas');
      c.width = gw * CH.length; c.height = gh * PAL.length;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.font = `700 ${this.fs}px "JetBrains Mono", ui-monospace, monospace`;
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
      this.atlas = { slots, img, buf: new Uint32Array(img.data.buffer), W };
      this.ROWS = Math.min(this.ROWS, Math.floor((H - gh) / this.chH));
      this.COLS = Math.min(this.COLS, Math.floor((W - gw) / this.cw));
    }

    bindInput() {
      const c = this.canvas;
      let drag = null;
      c.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; c.setPointerCapture(e.pointerId); this.idle = 0; });
      c.addEventListener('pointermove', (e) => {
        if (!drag) return;
        this.yaw -= (e.clientX - drag.x) * 0.006;
        this.pitch = clamp(this.pitch + (e.clientY - drag.y) * 0.004, 0.1, 1.1);
        drag = { x: e.clientX, y: e.clientY }; this.idle = 0;
      });
      const end = () => { drag = null; };
      c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
      c.addEventListener('wheel', (e) => { e.preventDefault(); this.dist = clamp(this.dist * Math.exp(e.deltaY * 0.001), 2.5, 14); this.idle = 0; }, { passive: false });
      this.dragging = () => !!drag;
    }

    // ── Butterflies and the bee ──
    pickFlower(near) {
      const c = this.flowerTops.filter((m) => !near || Math.hypot(m.x - near.x, m.z - near.z) < 2.5);
      return c[(Math.random() * c.length) | 0];
    }
    stepFlyer(b, dt, t) {
      if (!b.target) b.target = this.pickFlower();
      const h = b.target, seat = [h.x, h.ry + 0.02, h.z];
      const d = [seat[0] - b.p[0], seat[1] - b.p[1], seat[2] - b.p[2]], dl = Math.hypot(d[0], d[1], d[2]);
      b.hopT += dt;
      if (b.perched) {
        b.perchT += dt; b.p = seat.slice(); b.flap = 1.25 + 0.22 * Math.sin(t * 1.4 + b.phase);
        if (b.perchT > b.dwell) { b.perched = false; b.hopT = 0; b.target = this.pickFlower(Math.random() < 0.7 ? h : null); b.v = [Math.cos(b.yaw) * 0.3, 0.8, Math.sin(b.yaw) * 0.3]; }
        return;
      }
      if (b.hopT > 10) { b.target = this.pickFlower(); b.hopT = 0; }
      b.wand -= dt;
      if (b.wand <= 0) { b.wand = 0.15 + Math.random() * 0.45; b.w = [(Math.random() * 2 - 1) * 0.7, (Math.random() * 2 - 1) * 0.5 + 0.1, (Math.random() * 2 - 1) * 0.7]; }
      const arrive = Math.min(1, dl), wob = 0.25 + 0.75 * arrive, st = Math.min(1, dt * (dl < 0.35 ? 6 : 2.2));
      for (let k = 0; k < 3; k++) b.v[k] += ((d[k] / (dl || 1)) * 1.1 * arrive + b.w[k] * wob + (k === 1 && dl > 0.8 ? 0.25 : 0) - b.v[k]) * st;
      if (b.glide > 0) { b.glide -= dt; b.v[1] -= 0.5 * dt; } else if (dl > 1 && Math.random() < dt * 0.5) b.glide = 0.3 + Math.random() * 0.4;
      for (let k = 0; k < 3; k++) b.p[k] += b.v[k] * dt;
      b.p[1] = Math.max(0.3, b.p[1]);
      if (b.glide > 0) b.flap += (0.12 - b.flap) * Math.min(1, dt * 8);
      else { b.phase += dt * 2 * Math.PI * 6; b.flap = 0.35 + 0.8 * Math.sin(b.phase); b.p[1] += Math.max(0, Math.cos(b.phase)) * 0.008; }
      if (Math.hypot(b.v[0], b.v[2]) > 0.1) { const da = ((Math.atan2(b.v[2], b.v[0]) - b.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; b.yaw += da * Math.min(1, dt * 6); }
      if (dl < 0.05) { b.perched = true; b.perchT = 0; b.glide = 0; b.dwell = 1.8 + Math.random() * 2.5; }
    }
    stepBee(dt, t) {
      const e = this.bee;
      if (!e.target) e.target = this.flowerTops[0];
      const h = e.target, seat = [h.x + Math.sin(t * 2) * h.rx * 0.4, h.ry + 0.08, h.z];
      const d = [seat[0] - e.p[0], seat[1] - e.p[1], seat[2] - e.p[2]], dl = Math.hypot(d[0], d[1], d[2]);
      e.t += dt;
      if (dl < 0.1 && e.t > 1.4) {
        e.t = 0;
        const c = this.flowerTops.filter((m) => m !== h && Math.hypot(m.x - h.x, m.z - h.z) < 1.4);
        if (c.length) e.target = c[(Math.random() * c.length) | 0];
      }
      const arrive = Math.min(1, dl / 0.4);
      for (let k = 0; k < 3; k++) { e.v[k] += ((d[k] / (dl || 1)) * 1.6 * arrive - e.v[k]) * Math.min(1, dt * 5); e.p[k] += e.v[k] * dt; }
      e.p[1] += Math.sin(t * 9) * 0.003;
      if (Math.hypot(e.v[0], e.v[2]) > 0.15) e.yaw = Math.atan2(e.v[2], e.v[0]);
    }

    frame(dt, t) {
      const { COLS, ROWS, zb, gl, co, SM } = this;
      // ── Orbit camera ──
      this.idle += dt;
      if (this.spinning && !this.dragging() && this.idle > 2) this.yaw += dt * 0.06;
      const cp = Math.cos(this.pitch);
      const cam = [CENTER[0] + this.dist * Math.sin(this.yaw) * cp, CENTER[1] + this.dist * Math.sin(this.pitch), CENTER[2] + this.dist * Math.cos(this.yaw) * cp];
      const f = norm([CENTER[0] - cam[0], CENTER[1] - cam[1], CENTER[2] - cam[2]]);
      const r = norm([-f[2], 0, f[0]]);
      const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
      const FOC = Math.min(this.H, this.W * 1.75) * (this.W < this.H ? 0.95 : 1.1), ax = this.cw / FOC, ay = this.chH / FOC, hc = COLS / 2, hr = ROWS / 2;
      const fogOf = (z) => clamp(1.25 - z / 26, 0.35, 1);
      // Where the sun is on screen: plants are lit on that side
      const sunX = SUN[0] * r[0] + SUN[1] * r[1] + SUN[2] * r[2], sunY = SUN[0] * u[0] + SUN[1] * u[1] + SUN[2] * u[2];
      const litAt = (uu, vv, base, k) => clamp(base + k * (uu * sunX - vv * sunY * 0.9), 0.15, 1);
      zb.fill(0); gl.fill(-1);

      // ── 1. Ray-cast: ground and path ──
      for (let sy = 0; sy < ROWS; sy++) {
        const b = (hr - sy - 0.5) * ay;
        for (let sx = 0; sx < COLS; sx++) {
          const a = (sx + 0.5 - hc) * ax;
          const dx = f[0] + r[0] * a + u[0] * b, dy = f[1] + r[1] * a + u[1] * b, dz = f[2] + r[2] * a + u[2] * b;
          const i = sy * COLS + sx;
          let tHit = 1e9, glyph = -1, col = 0, lum = 0;
          // Ground
          if (dy < -1e-4) {
            const tg = -cam[1] / dy;
            if (tg < tHit) {
              const x = cam[0] + dx * tg, z = cam[2] + dz * tg;
              const qx = x - CENTER[0], qz = (z - CENTER[2]) * 0.9, rr2 = qx * qx + qz * qz, RR = PLOT_R + 1.6;
              if (rr2 < RR * RR) {
                const rr = Math.sqrt(rr2);
                tHit = tg;
                const sh = shadeAt(SM, x, z), far = clamp((PLOT_R + 1.6 - rr) / 2, 0.15, 1);
                if (onPath(x, z)) {
                  stoneAt(x, z);
                  const edge = ST.edge, id = ST.id, ex = ST.ex, ez = ST.ez;
                  if (edge < 0.035) {
                    const th = hash2(Math.floor(x * 40), Math.floor(z * 40));
                    if (th < 0.14) { glyph = K['*']; col = C.thyme; lum = 0.85; }        // thyme flowering in the joints
                    else { glyph = th < 0.55 ? K[','] : K['.']; col = C.moss; lum = 0.6; }
                  } else {
                    // Each stone shaded on its own, a sun-catching edge, a little wear
                    const rim = edge < 0.075, facing = -(ex * SUN[0] + ez * SUN[2]) > 0;
                    col = sh > 0.85 && id > 0.55 ? C.sun : id < 0.38 ? C.stone : id < 0.72 ? C.stone2 : C.stone3;
                    lum = (0.68 + 0.26 * id) * (rim ? (facing ? 1.15 : 0.8) : 1);
                    const tex = hash2(Math.floor(x * 30), Math.floor(z * 30));
                    glyph = rim ? K[':'] : tex < 0.05 ? K['.'] : lum > 0.8 ? K['='] : K['-'];
                  }
                } else {
                  // Grass and ground cover between the beds
                  const hh = hash2(Math.floor(x * 11), Math.floor(z * 11));
                  if (hh < 0.34) {
                    glyph = hh < 0.17 ? K[','] : K["'"]; col = hh < 0.12 ? C.grass : C.ground;
                    lum = 0.55 + 0.3 * hh;
                  } else glyph = -2;
                }
                lum *= (0.35 + 0.65 * sh) * far;
              }
            }
          }
          if (tHit < 1e8) {
            zb[i] = 1 / tHit;
            if (glyph >= 0) { gl[i] = glyph; co[i] = col * NL + levelOf(lum * fogOf(tHit)); }
          }
        }
      }

      // ── 2. Impostors, depth-tested ──
      const proj = (x, y, z) => {
        const qx = x - cam[0], qy = y - cam[1], qz = z - cam[2];
        const zc = qx * f[0] + qy * f[1] + qz * f[2];
        if (zc < 0.15) return null;
        return [hc + (qx * r[0] + qy * r[1] + qz * r[2]) / zc / ax, hr - (qx * u[0] + qy * u[1] + qz * u[2]) / zc / ay, zc];
      };
      const putCell = (sx, sy, zc, col, glyph, lum, fog = true) => {
        sx |= 0; sy |= 0;
        if (sx < 0 || sy < 0 || sx >= COLS || sy >= ROWS) return;
        const i = sy * COLS + sx, iz = 1 / zc;
        if (iz <= zb[i]) return;
        zb[i] = iz; gl[i] = glyph; co[i] = col * NL + levelOf(fog ? lum * fogOf(zc) : lum);
      };
      const put = (x, y, z, col, glyph, lum) => { const p = proj(x, y, z); if (p) putCell(p[0], p[1], p[2], col, glyph, lum); };
      const line = (A, B, col, glyph, lum) => {
        if (!A || !B) return;
        const n = Math.max(1, Math.ceil(Math.max(Math.abs(B[0] - A[0]), Math.abs(B[1] - A[1]))));
        for (let s = 0; s <= n; s++) { const k = s / n; putCell(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k, col, glyph, lum); }
      };
      const cpu = (zc) => 1 / (zc * ax);
      const aspect = ax / ay;

      // Foliage cell: leaf tips at the rim (oriented), dense leaves inside, dark gaps
      let LC = 0, LG = 0, LL = 0;           // leafCell writes here (no per-cell allocations)
      const leafCell = (uu, vv, d, hq, lit, base) => {
        // Calm foliage: one dense glyph shaded by the light, leaf tips only on the rim
        if (d > 0.8 && hq < 0.3) LG = uu < -0.3 ? K['/'] : uu > 0.3 ? K['\\'] : K['^'];
        else LG = lit > 0.62 ? K['%'] : K['#'];
        LC = lit > 0.8 ? C.leafS : lit > 0.6 ? C.leafL : base;
        LL = hq > 0.95 ? lit * 0.6 : lit;
      };

      // Blossoms, by style
      const TWO_PI = Math.PI * 2;
      const blossom = (p, rad, col, lum, style, rot = 0) => {
        const rc = rad * cpu(p[2]);
        if (rc < 0.75) {
          const g = style === 'rose' ? K['@'] : style === 'dot' ? (rc > 0.35 ? K['°'] : K['.']) : style === 'cup' ? K.o : style === 'spikelet' ? K[':'] : style === 'tulip' ? K.U : K['*'];
          putCell(p[0], p[1], p[2], col, g, lum); return;
        }
        const ry = rc * aspect;
        for (let yy = Math.floor(p[1] - ry); yy <= p[1] + ry; yy++) for (let xx = Math.floor(p[0] - rc); xx <= p[0] + rc; xx++) {
          const uu = (xx + 0.5 - p[0]) / rc, vv = (yy + 0.5 - p[1]) / (ry || 1), d = uu * uu + vv * vv;
          if (d > 1) continue;
          const th = Math.atan2(vv, uu) + rot, dr = Math.sqrt(d);
          let g, c = col, L = lum * (1.05 - 0.25 * (vv + 0.3));
          if (style === 'rose') {
            // Spiralled petals: a dark heart, curled inner petals, open outer petals
            const sw = ((th / TWO_PI) * 2 + dr * 1.8) % 1;
            if (dr < 0.22) { g = K['@']; L *= 0.75; }
            else if (dr < 0.6) g = sw < 0.5 ? K.c : K.o;
            else if (dr < 0.86) g = uu < 0 ? K['('] : K[')'];
            else { g = K[':']; L *= 1.1; }
          } else if (style === 'star') {
            // Five-lobed florets with a pale eye (phlox, pinks)
            const lobe = 0.55 + 0.45 * Math.abs(Math.cos(2.5 * th));
            if (dr > lobe) continue;
            if (dr < 0.22) { g = K.o; c = C.eye; } else g = K['*'];
          } else if (style === 'daisy') {
            if (dr < 0.32) { g = K['@']; c = C.gold; }
            else {
              if (Math.abs(Math.sin(th * 6)) < 0.45) continue;
              const a8 = (((th % Math.PI) + Math.PI) % Math.PI) / Math.PI;
              g = a8 < 0.125 || a8 > 0.875 ? K['-'] : a8 < 0.375 ? K['\\'] : a8 < 0.625 ? K['|'] : K['/'];
            }
          } else if (style === 'cup') {
            // Open cups (hollyhock, cranesbill): dark centre, round petals, a rim
            if (dr < 0.24) { g = K['@']; c = C.eye; }
            else if (dr < 0.7) g = K.O;
            else g = uu < -0.3 ? K['('] : uu > 0.3 ? K[')'] : K[':'];
          } else if (style === 'tulip') {
            // A closed cup: rounded sides, three petal tips on top
            if (vv < -0.55) { if (Math.abs(uu) > 0.2 && Math.abs(uu) < 0.75) continue; g = K['^']; }
            else g = uu < -0.55 ? K['('] : uu > 0.55 ? K[')'] : vv > 0.6 ? K['_'] : K.U;
            L *= 1 - 0.2 * Math.max(0, uu * sunX);
          } else if (style === 'globe') {
            // Allium: a sphere of tiny star-florets, lit on the sun side
            g = hash2(xx * 7 + ((p[0] * 3) | 0), yy * 13) < 0.55 ? K['*'] : K['+'];
            L = clamp(lum * (0.75 + 0.35 * (uu * sunX - vv * sunY)), 0.2, 1.1);
          } else if (style === 'spikelet') g = dr < 0.5 ? K[':'] : K['.'];
          else g = dr < 0.5 ? K['°'] : K['.'];
          putCell(xx, yy, p[2] - rad * (1 - d), c, g, clamp(L, 0, 1.2));
        }
      };

      // Mounds: foliage, then blossoms
      for (const m of this.mounds) {
        const c = proj(m.x, m.ry * 0.5, m.z);
        if (!c) continue;
        const rcx = Math.min(70, m.rx * cpu(c[2])), ryc = Math.min(70, m.ry * 0.5 * cpu(c[2]) * aspect);
        if (rcx < 0.8) { putCell(c[0], c[1], c[2], m.style === 'none' ? m.leaf : m.col, K['*'], 0.85); continue; }
        const res = Math.max(0.025, Math.pow(2, Math.ceil(Math.log2(1 / cpu(c[2])))));
        // Clip to the screen, and test depth before doing any shading work
        const y0 = Math.max(0, Math.floor(c[1] - ryc)), y1 = Math.min(ROWS - 1, c[1] + ryc);
        const x0 = Math.max(0, Math.floor(c[0] - rcx)), x1 = Math.min(COLS - 1, c[0] + rcx);
        const iry = 1 / (ryc || 1), irx = 1 / rcx, dk = m.rx * 0.7;
        for (let yy = y0; yy <= y1; yy++) {
          const vv = (yy + 0.5 - c[1]) * iry, vq = Math.floor((vv * m.ry) / res) - m.seed, v2 = vv > 0 ? vv * vv * 0.6 : vv * vv;
          for (let xx = x0; xx <= x1; xx++) {
            const uu = (xx + 0.5 - c[0]) * irx, d = uu * uu + v2;
            if (d > 1) continue;
            const depth = c[2] - Math.sqrt(1 - d) * dk, i = yy * COLS + xx;
            if (1 / depth <= zb[i]) continue;
            const hq = hash2(Math.floor((uu * m.rx) / res) + m.seed, vq);
            if (d > 0.86 + 0.14 * hq) continue;
            leafCell(uu, vv, d, hq, litAt(uu, vv, 0.62, 0.34), m.leaf);
            zb[i] = 1 / depth; gl[i] = LG; co[i] = LC * NL + levelOf(LL * fogOf(depth));
          }
        }
        const B = m.blooms;
        for (let k = 0; k < B.length; k += 7) {
          const p = proj(m.x + B[k], B[k + 1], m.z + B[k + 2]);
          if (!p) continue;
          const lit = 0.78 + 0.28 * (B[k + 1] / m.ry), q = [p[0], p[1], p[2] - m.rx * 0.6 * (B[k + 1] / m.ry)];
          if (B[k + 5]) { blossom(q, B[k + 3], C.roseD, lit, 'cup'); continue; }       // rose buds
          blossom(q, B[k + 3], B[k + 4], lit, m.style, B[k + 6]);
        }
      }

      // Tall spikes: stem, florets (cups, spotted bells, stars, lavender beads), a tip
      for (const s of this.spikes) {
        const sw = Math.sin(t * 1.1 + s.ph) * 0.03;
        const base = proj(s.x, 0, s.z), top = proj(s.x + sw, s.h, s.z);
        if (!base || !top) continue;
        line(base, top, C.stem, K['|'], 0.55);
        const rcTip = 0.03 * cpu(top[2]);
        if (s.shape === 'cup' || s.shape === 'bell' || s.shape === 'star') putCell(top[0], top[1] - 1, top[2], C.leafL, rcTip > 0.5 ? K['^'] : K["'"], 0.7);
        for (let j = 0; j < s.florets.length; j += 4) {
          const y = s.shape === 'tulip' ? s.h : s.florets[j], rr = s.florets[j + 1], a = s.florets[j + 2], bud = s.florets[j + 3], k = y / s.h;
          const p = proj(s.x + sw * k + Math.cos(a) * rr * 0.5, y, s.z + Math.sin(a) * rr * 0.5);
          if (!p) continue;
          const rc = rr * cpu(p[2]), L = 0.98 - k * 0.15;
          if (bud) { putCell(p[0], p[1], p[2] - 0.02, C.leafL, K.o, 0.75); continue; }
          if (s.shape === 'bell') {
            if (rc < 0.9) { putCell(p[0], p[1], p[2] - 0.02, s.col, K.v, L); continue; }
            const w = Math.ceil(rc), hgt = Math.ceil(rc * aspect * 1.4);
            for (let yy = 0; yy <= hgt; yy++) for (let xx = -w; xx <= w; xx++) {
              const edgeX = Math.abs(xx) >= w - 0.5, mouth = yy === hgt;
              const spot = !edgeX && !mouth && hash2(xx + j * 7, yy + j) < 0.25;
              putCell(p[0] + xx, p[1] + yy - 1, p[2] - 0.02, spot ? C.eye : s.col, mouth ? K['_'] : edgeX ? (xx < 0 ? K['('] : K[')']) : spot ? K['.'] : K.U, L);
            }
          } else if (s.shape === 'dot') putCell(p[0], p[1], p[2] - 0.02, s.col, rc > 0.5 ? K['8'] : K[':'], L);
          else if (s.shape === 'tulip') blossom(p, rr, s.col, L, 'tulip');
          else if (s.shape === 'globe') blossom(p, rr, s.col, L, 'globe', a);
          else blossom(p, rr, s.col, L, s.shape, a);
        }
      }

      // The wooden rose arch: twin posts, cross-ties, an arc, leaves and roses
      {
        const pxa = pathX(ARCH_Z), R = pathW(ARCH_Z) + 0.28, top = 1.75, rr = rng(4242);
        for (const side of [-1, 1]) for (const dz of [-0.09, 0.09]) {
          line(proj(pxa + side * R, 0, ARCH_Z + dz), proj(pxa + side * R, top, ARCH_Z + dz), C.wood, K['|'], 0.6);
          for (let y = 0.25; y < top; y += 0.3) line(proj(pxa + side * R, y, ARCH_Z - 0.09), proj(pxa + side * R, y, ARCH_Z + 0.09), C.wood, K['='], 0.55);
        }
        for (const dz of [-0.09, 0.09]) for (let ang = 0; ang <= Math.PI; ang += 0.04) put(pxa + Math.cos(ang) * R, top + Math.sin(ang) * R * 0.75, ARCH_Z + dz, C.wood, K['='], 0.6);
        const pts = [];
        for (const side of [-1, 1]) for (let y = 0.1; y < top; y += 0.13) pts.push([pxa + side * R, y]);
        for (let ang = 0; ang <= Math.PI; ang += 0.12) pts.push([pxa + Math.cos(ang) * R, top + Math.sin(ang) * R * 0.75]);
        for (const [x, y] of pts) {
          const p = proj(x, y, ARCH_Z);
          if (!p) continue;
          const lr = 0.14 * cpu(p[2]), lry = lr * aspect;
          for (let yy = Math.floor(p[1] - lry); yy <= p[1] + lry; yy++) for (let xx = Math.floor(p[0] - lr); xx <= p[0] + lr; xx++) {
            const uu = (xx + 0.5 - p[0]) / (lr || 1), vv = (yy + 0.5 - p[1]) / (lry || 1), d = uu * uu + vv * vv;
            const hq = hash2(Math.floor(x * 30 + uu * 3), Math.floor(y * 30 + vv * 3));
            if (d > 0.75 + 0.25 * hq || hq > 0.88) continue;
            leafCell(uu, vv, d, hq, litAt(uu, vv, 0.6, 0.3), C.leafD);
            putCell(xx, yy, p[2] - 0.06 * (1 - d), LC, LG, LL);
          }
          const nb = (rr() * 2.4) | 0;
          for (let j = 0; j < nb; j++) {
            const bp = proj(x + (rr() - 0.5) * 0.22, y + (rr() - 0.5) * 0.2, ARCH_Z + (rr() - 0.5) * 0.24);
            if (bp) blossom(bp, 0.06 + rr() * 0.035, C[pick(rr, ['pink', 'rose', 'blush', 'white', 'cream'])], 0.98, 'rose', rr() * 6);
          }
        }
      }

      // Bird bath: pedestal, bowl, still water catching the sky
      {
        const [bx, bz] = BATH, top = 0.62;
        const bp = proj(bx, top, bz), b0 = proj(bx, 0, bz);
        if (bp && b0) {
          for (const off of [-0.06, 0, 0.06]) line(proj(bx + off, 0.05, bz), proj(bx + off * 0.6, top - 0.05, bz), C.bath, off ? K['|'] : K['#'], off ? 0.55 : 0.75);
          const rc = 0.36 * cpu(bp[2]), ry = rc * aspect * 0.45;
          for (let yy = Math.floor(bp[1] - ry); yy <= bp[1] + ry * 1.8; yy++) for (let xx = Math.floor(bp[0] - rc); xx <= bp[0] + rc; xx++) {
            const uu = (xx + 0.5 - bp[0]) / rc, vv = (yy + 0.5 - bp[1]) / (ry || 1);
            if (vv <= 0) {
              const d = uu * uu + vv * vv; if (d > 1) continue;
              putCell(xx, yy, bp[2] - 0.05, d > 0.7 ? C.bath : C.water, d > 0.7 ? K[':'] : hash2(xx * 3 + ((t * 2) | 0), yy) < 0.3 ? K['~'] : K['-'], d > 0.7 ? 0.85 : 0.9);
            } else {
              const w = 1 - (vv / 1.8) * 0.5; if (Math.abs(uu) > w) continue;
              putCell(xx, yy, bp[2], C.bath, Math.abs(uu) > w - 0.15 ? (uu < 0 ? K['\\'] : K['/']) : K['#'], litAt(uu, vv, 0.6, 0.3));
            }
          }
        }
      }

      // Fallen rose petals on the stones
      const PT = this.petals;
      for (let k = 0; k < PT.length; k += 3) put(PT[k], 0.012, PT[k + 1], PT[k + 2], hash2(k, 3) < 0.5 ? K['.'] : K[','], 0.85);

      // Dust drifting in the low sun
      for (const q of this.motes) {
        q.p[0] += Math.sin(t * 0.3 * q.sp + q.ph) * 0.002; q.p[1] += Math.sin(t * 0.5 + q.ph) * 0.0012;
        const glow = Math.sin(t * 1.1 * q.sp + q.ph);
        if (glow > 0.35) put(q.p[0], q.p[1], q.p[2], C.mote, glow > 0.85 ? K['*'] : K['.'], 0.55 + glow * 0.4);
      }

      // ── 3. Butterflies and the bee, drawn on top, with a faint trail ──
      for (const b of this.flyers) this.stepFlyer(b, dt, t);
      this.stepBee(dt, t);
      const trailOf = (obj, every) => {
        obj.trail.unshift([obj.p[0], obj.p[1], obj.p[2]]);
        if (obj.trail.length > 46) obj.trail.pop();
        for (let k = 4; k < obj.trail.length; k += every) {
          const q = obj.trail[k], p = proj(q[0], q[1], q[2]);
          if (p) putCell(p[0], p[1], p[2], C.trail, K['.'], 0.9 - k / 60, false);
        }
      };
      for (let i = 0; i < 120; i++) this.bits[(Math.random() * 4096) | 0] ^= 1;
      for (const b of this.flyers) {
        if (!b.perched) trailOf(b, 3); else b.trail.length = 0;
        const bp = proj(b.p[0], b.p[1], b.p[2]); if (!bp) continue;
        const rc = 0.3 * b.scale * cpu(bp[2]);
        if (rc < 2.2) {
          const g = b.flap > 0.6 ? K.V : b.flap > 0 ? K.W : K.w;
          putCell(bp[0], bp[1], bp[2] * 0.5, b.wingC, g, 1, false);
          if (rc > 1) { putCell(bp[0] - 1, bp[1], bp[2] * 0.5, b.wingC, K['('], 1, false); putCell(bp[0] + 1, bp[1], bp[2] * 0.5, b.wingC, K[')'], 1, false); }
          continue;
        }
        const s = b.scale, cyy = Math.cos(b.yaw), syy = Math.sin(b.yaw), Sd = [-syy, 0, cyy];
        const pt = b.perched ? 0 : clamp(b.v[1] * 0.25, -0.4, 0.4), Fv = [cyy * Math.cos(pt), Math.sin(pt), syy * Math.cos(pt)];
        const cf = Math.cos(b.flap), sf = Math.sin(b.flap);
        for (let side = -1; side <= 1; side += 2) for (let k = 0; k < WING.length; k += 3) {
          const wu = WING[k] * s, ww = WING[k + 1] * s, kind = WING[k + 2];
          const p = proj(b.p[0] + Fv[0] * wu + Sd[0] * side * cf * ww, b.p[1] + Fv[1] * wu + sf * ww, b.p[2] + Fv[2] * wu + Sd[2] * side * cf * ww);
          if (!p) continue;
          const col = kind === 2 ? b.spotC : kind === 4 || kind === 3 ? b.bandC : b.wingC;
          const g = kind === 1 ? K[':'] : kind === 2 ? K['1'] : kind === 3 ? K['|'] : kind === 4 ? K['#'] : this.bits[k & 4095] ? K['1'] : K['0'];
          putCell(p[0], p[1], p[2] * 0.7, col, g, kind === 4 || kind === 3 ? 0.55 : 0.85 + 0.15 * cf, false);
        }
        for (let q = -0.2; q <= 0.17; q += 0.02) {
          const p = proj(b.p[0] + Fv[0] * q * s, b.p[1] + Fv[1] * q * s + 0.004, b.p[2] + Fv[2] * q * s);
          if (p) putCell(p[0], p[1], p[2] * 0.69, C.body, q > 0.13 ? K['0'] : q > 0.02 ? K['8'] : K['='], 1, false);
        }
        for (const side of [-1, 1]) for (let q = 0; q <= 1; q += 0.2) {          // antennae
          const p = proj(b.p[0] + (Fv[0] * (0.17 + q * 0.12) + Sd[0] * side * q * 0.05) * s, b.p[1] + q * 0.1 * s, b.p[2] + (Fv[2] * (0.17 + q * 0.12) + Sd[2] * side * q * 0.05) * s);
          if (p) putCell(p[0], p[1], p[2] * 0.69, C.body, q > 0.9 ? K['°'] : K['/'], 0.9, false);
        }
      }
      {
        const e = this.bee; trailOf(e, 4);
        const bp = proj(e.p[0], e.p[1], e.p[2]);
        if (bp) {
          const rc = 0.09 * cpu(bp[2]);
          if (rc < 1.6) { putCell(bp[0] - 1, bp[1], bp[2] * 0.5, C.glass, K['('], 1, false); putCell(bp[0], bp[1], bp[2] * 0.5, C.gold, K['8'], 1, false); putCell(bp[0] + 1, bp[1], bp[2] * 0.5, C.glass, K[')'], 1, false); }
          else {
            const cyy = Math.cos(e.yaw), syy = Math.sin(e.yaw), S = 1.5;
            for (let q = -0.06; q <= 0.06; q += 0.008) for (let a = 0; a < 6.28; a += 0.5) {
              const rad = 0.032 * Math.sqrt(Math.max(0, 1 - (q / 0.07) ** 2)), stripe = ((q + 0.07) / 0.022) | 0;
              const p = proj(e.p[0] + (cyy * q - syy * Math.cos(a) * rad) * S, e.p[1] + Math.sin(a) * rad * S, e.p[2] + (syy * q + cyy * Math.cos(a) * rad) * S);
              if (p) putCell(p[0], p[1], p[2] * 0.7, q > 0.045 ? C.gold : stripe % 2 ? C.gold : C.dark, q > 0.045 ? K['0'] : stripe % 2 ? K['#'] : K['='], 1, false);
            }
            const open = 0.4 + 0.6 * Math.abs(Math.sin(t * 40));
            for (const side of [-1, 1]) for (let w = 0.015; w < 0.09; w += 0.012) {
              const p = proj(e.p[0] - syy * side * w * (1 - open * 0.5) * S, e.p[1] + (0.03 + w * open) * S, e.p[2] + cyy * side * w * (1 - open * 0.5) * S);
              if (p) putCell(p[0], p[1], p[2] * 0.7, C.glass, K[':'], 1, false);
            }
          }
        }
      }

      // ── 4. Draw ──
      if (this.glr) {
        const R = this.glr, g = R.g, D = R.data, n = COLS * ROWS;
        for (let i = 0, o = 0; i < n; i++, o += 4) {
          if (gl[i] < 0) { D[o] = 255; continue; }
          D[o] = gl[i]; D[o + 1] = co[i] & 255; D[o + 2] = co[i] >> 8;
        }
        g.activeTexture(g.TEXTURE0);
        g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, COLS, ROWS, 0, g.RGBA, g.UNSIGNED_BYTE, D);
        g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT);
        g.drawArrays(g.TRIANGLES, 0, 6);
        return;
      }
      const A = this.atlas, buf = A.buf, NG = CH.length, cw = this.cw, chh = this.chH, BW = A.W;
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
