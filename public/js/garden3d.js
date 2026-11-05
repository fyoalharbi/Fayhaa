// ─────────────────────────────────────────────
//  3D ASCII COTTAGE GARDEN WALK
//
//  An endless walk down an old flagstone path through a cottage garden in
//  warm evening light: irregular stones with moss in the joints, flowers
//  spilling over both edges, mounds of phlox and catmint, rose bushes, tall
//  hollyhocks, foxgloves and delphiniums at the back, rose arches overhead,
//  and a deep wall of trees behind it all.
//
//  How it is drawn, so nothing turns to mush at a distance:
//   • The path and the tree wall are ray-cast per character cell (Voronoi
//     flagstones, dappled light), crisp at every distance.
//   • Plants are soft rounded impostors: a leafy ellipse in screen space with
//     blossoms fixed in 3D on its surface, so they stay put as you walk and
//     simply get smaller (down to a single coloured glyph) with distance.
//
//    const g = new Garden3D(canvas);
//    g.setWalking(true | false);   drag to look around, scroll to walk
// ─────────────────────────────────────────────
(function () {
  // ── Palette ──
  const BASE = {
    stone: '#c9c2b4', stone2: '#b7a690', stone3: '#9fa5aa', sun: '#f4dcae', moss: '#5f8f45', joint: '#3d5a32',
    ground: '#2f5228', leafD: '#2c5a2c', leaf: '#43803a', leafL: '#6aa64e', stem: '#5f9a4f',
    trees: '#2a4f2c', trees2: '#3c6e38', treesL: '#6f9e54', light: '#f6e8b8',
    pink: '#ff8fbd', rose: '#ff6f9e', magenta: '#e0549c', blush: '#ffc6d8', white: '#f8f6ee', cream: '#f4e4be',
    lavender: '#b49cf4', blue: '#7f9cff', violet: '#9a6ad8', red: '#ff4b4b', coral: '#ff806a', yellow: '#ffe066',
    body: '#e0e0e0', dark: '#5a4614', glass: '#e7f0ff', gold: '#ffd24a',
  };
  const NAMES = Object.keys(BASE);
  const C = Object.fromEntries(NAMES.map((n, i) => [n, i]));
  const LEVELS = [0.16, 0.3, 0.46, 0.64, 0.82, 1];
  const NL = LEVELS.length;
  const PAL = [];
  for (const n of NAMES) {
    const v = parseInt(BASE[n].slice(1), 16), r = v >> 16, g = (v >> 8) & 255, b = v & 255;
    for (const l of LEVELS) PAL.push(`rgb(${(r * l) | 0},${(g * l) | 0},${(b * l) | 0})`);
  }
  const CH = ['.', ',', "'", '`', ':', ';', '|', '0', '1', '@', 'o', '8', '=', '-', '*', '+', '/', '\\', '°', '#', '%', '&', '~', '^', 'v', '"', '(', ')', '_', 'O', 'U'];
  const K = Object.fromEntries(CH.map((c, i) => [c, i]));
  const LEAF_G = ['%', '&', '#', '*', ',', ';', '%'].map((c) => K[c]);
  const PETAL_RAMP = ['.', ':', 'o', '*', '@'].map((c) => K[c]);

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
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

  // ── Layout ──
  const pathXe = (z) => 0.7 * Math.sin(z * 0.19) + 0.35 * Math.sin(z * 0.083 + 1.1);   // a gentle, unhurried curve
  const pathWe = (z) => 0.5 + 0.07 * Math.sin(z * 0.7) + 0.04 * Math.sin(z * 1.9 + 2);   // half width
  const treeTopE = (z) => 3.4 + 0.9 * Math.sin(z * 0.31) + 0.6 * Math.sin(z * 0.83 + 1) + 0.3 * Math.sin(z * 2.1);
  const TREES = 5.2;
  // Per-frame lookup tables: the ray-caster asks for these tens of thousands of times a frame
  const TAB = { z0: 0, step: 0.04, n: 1400, x: new Float32Array(1400), w: new Float32Array(1400), top: new Float32Array(1400) };
  function fillTables(zTop) {
    TAB.z0 = zTop;
    for (let i = 0; i < TAB.n; i++) { const z = zTop - i * TAB.step; TAB.x[i] = pathXe(z); TAB.w[i] = pathWe(z); TAB.top[i] = treeTopE(z); }
  }
  const look = (arr, fn) => (z) => { const f = (TAB.z0 - z) / TAB.step; if (f < 0 || f >= TAB.n - 1) return fn(z); const i = f | 0; return arr[i] + (arr[i + 1] - arr[i]) * (f - i); };
  const pathX = look(TAB.x, pathXe), pathW = look(TAB.w, pathWe), treeTop = look(TAB.top, treeTopE);
  const dapple = (x, z) => Math.sin(x * 2.3 + z * 1.1) * Math.sin(z * 1.6 - x * 0.8 + 1.2) + 0.5 * Math.sin(x * 5.1 - z * 3.7);
  const EYE = 0.92, SEG = 1, ARCH_EVERY = 9;

  // Irregular flagstones: Voronoi cells over the path
  function stoneAt(x, z) {
    const s = 0.34, gx = Math.floor(x / s), gz = Math.floor(z / s);
    let f1 = 9, f2 = 9, id = 0;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const cx = gx + i, cz = gz + j;
      const px = (cx + 0.15 + 0.7 * hash2(cx, cz)) * s, pz = (cz + 0.15 + 0.7 * hash2(cz + 71, cx - 13)) * s;
      const d = (x - px) * (x - px) + (z - pz) * (z - pz);
      if (d < f1) { f2 = f1; f1 = d; id = hash2(cx * 3 + 1, cz * 7 + 2); } else if (d < f2) f2 = d;
    }
    return [Math.sqrt(f2) - Math.sqrt(f1), id];
  }

  // ── Planting (one 1-unit segment at a time, always the same for the same segment) ──
  const EDGE = [   // low mounds that spill over the path
    { name: 'catmint', bloom: ['lavender', 'blue'], leaf: 'leafL', rx: [0.28, 0.42], ry: [0.2, 0.32], density: 70, size: [0.022, 0.032] },
    { name: 'alyssum', bloom: ['white', 'cream'], leaf: 'leaf', rx: [0.24, 0.36], ry: [0.12, 0.2], density: 90, size: [0.02, 0.028] },
    { name: 'pinks', bloom: ['pink', 'blush', 'magenta'], leaf: 'leafL', rx: [0.22, 0.34], ry: [0.14, 0.22], density: 60, size: [0.024, 0.034] },
    { name: 'cranesbill', bloom: ['violet', 'lavender'], leaf: 'leaf', rx: [0.3, 0.44], ry: [0.2, 0.3], density: 45, size: [0.026, 0.036] },
  ];
  const MID = [
    { name: 'phlox', bloom: ['pink', 'blush', 'white', 'magenta'], leaf: 'leaf', rx: [0.4, 0.62], ry: [0.45, 0.7], density: 85, size: [0.028, 0.04] },
    { name: 'rose', bloom: ['rose', 'pink', 'coral', 'red', 'cream', 'blush'], leaf: 'leafD', rx: [0.45, 0.7], ry: [0.5, 0.8], density: 16, size: [0.06, 0.09], rose: true },
    { name: 'daisy', bloom: ['white', 'cream'], leaf: 'leafL', rx: [0.35, 0.55], ry: [0.4, 0.6], density: 50, size: [0.03, 0.04] },
  ];
  const TALL = [
    { name: 'hollyhock', bloom: ['pink', 'white', 'magenta', 'blush', 'red'], h: [1.6, 2.3], r: 0.07, shape: 'O' },
    { name: 'foxglove', bloom: ['magenta', 'pink', 'white', 'blush'], h: [1.1, 1.5], r: 0.038, shape: 'U' },
    { name: 'delphinium', bloom: ['blue', 'violet', 'lavender'], h: [1.2, 1.7], r: 0.034, shape: '*' },
  ];
  const pick = (r, a) => a[(r() * a.length) | 0];
  const span = (r, [a, b]) => a + r() * (b - a);
  function mound(r, x, z, sp, colName) {
    const rx = span(r, sp.rx), ry = span(r, sp.ry), n = Math.round(sp.density * rx * 2), blooms = [];
    for (let i = 0; i < n; i++) {
      // Blossoms on the upper part of the dome, more of them toward the top
      const a = r() * Math.PI * 2, e = Math.acos(1 - r() * (sp.rose ? 0.95 : 0.85));
      const ox = Math.sin(e) * Math.cos(a) * rx, oz = Math.sin(e) * Math.sin(a) * rx * 0.85, oy = Math.cos(e) * ry;
      const c = sp.bloom.length > 2 && r() < 0.18 ? pick(r, sp.bloom) : colName;
      blooms.push(ox, oy, oz, span(r, sp.size), C[c]);
    }
    return { x, z, rx, ry, leaf: C[sp.leaf], col: C[colName], rose: !!sp.rose, blooms: new Float32Array(blooms), seed: (r() * 1e6) | 0 };
  }
  function segment(n) {
    const r = rng(n * 7919 + 13), out = { mounds: [], spikes: [] };
    for (const side of [-1, 1]) {
      // Drifts: neighbouring segments share a plant and a colour
      const drift = (k) => rng(Math.floor((n + k * 3 + (side > 0 ? 2 : 0)) / 2.5) * 977 + k * 31 + (side > 0 ? 5 : 0));
      const de = drift(1), dm = drift(2), dt = drift(3);
      const edge = pick(de, EDGE), edgeCol = pick(de, edge.bloom);
      const mid = pick(dm, MID), midCol = pick(dm, mid.bloom);
      const tall = pick(dt, TALL), tallCol = pick(dt, tall.bloom);
      for (let i = 0; i < 2; i++) {
        const z = -n - (i + r()) / 2, w = pathW(z);
        out.mounds.push(mound(r, pathX(z) + side * (w + span(r, [0.1, 0.34])), z, edge, edgeCol));
      }
      for (let i = 0; i < 2; i++) {
        const z = -n - (i + r()) / 2, w = pathW(z);
        const sp = r() < 0.25 ? MID[1] : mid, col = sp === mid ? midCol : pick(r, sp.bloom);
        out.mounds.push(mound(r, pathX(z) + side * (w + span(r, [0.55, 1.5])), z, sp, col));
      }
      // Back of the border: tall spikes in clumps, shrubs behind
      const clump = 2 + ((r() * 3) | 0), cz = -n - r(), cx = pathX(cz) + side * (pathW(cz) + span(r, [1.5, 2.6]));
      for (let i = 0; i < clump; i++) {
        const florets = [], h = span(r, tall.h);
        for (let y = h * 0.42; y < h; y += tall.r * (tall.shape === 'O' ? 1.5 : 1.25)) {
          const k = (y - h * 0.42) / (h * 0.58), rr = tall.r * (1 - k * 0.55);
          florets.push(y, rr, r() * 6.28);
        }
        out.spikes.push({ x: cx + (r() - 0.5) * 0.5, z: cz + (r() - 0.5) * 0.5, h, col: C[tallCol], shape: tall.shape, florets, ph: r() * 6.28 });
      }
      if (r() < 0.8) {
        const z = -n - r();
        out.mounds.push(mound(r, pathX(z) + side * (pathW(z) + span(r, [2.6, 4.2])), z, r() < 0.35 ? MID[1] : MID[0], pick(r, ['pink', 'white', 'rose', 'blush'])));
      }
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

  class Garden3D {
    constructor(canvas) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.walking = !this.reduced;
      this.camZ = 0; this.yaw = 0; this.lookYaw = 0; this.lookPitch = 0; this.idle = 0; this.pauseT = 0;
      this.segs = new Map();
      this.bits = Uint8Array.from({ length: 8192 }, () => (Math.random() < 0.5 ? 1 : 0));
      const wingCols = [['white', 'red'], ['yellow', 'dark'], ['blue', 'white'], ['coral', 'dark'], ['white', 'violet']];
      this.flyers = wingCols.map(([w, s], i) => ({
        wingC: C[w], spotC: C[s], scale: i === 0 ? 0.42 : 0.3 + Math.random() * 0.08,
        p: [pathX(-3 - i * 2) + Math.random() - 0.5, 1.2, -3 - i * 2.2], v: [0, 0, 0], yaw: -Math.PI / 2,
        phase: Math.random() * 6, glide: 0, perched: false, perchT: 0, dwell: 2, target: null, wand: 0, w: [0, 0, 0], flap: 0.5, hopT: 0,
      }));
      this.bee = { p: [0.9, 0.6, -3], v: [0, 0, 0], target: null, t: 0, yaw: 0 };
      this.motes = Array.from({ length: 40 }, () => this.newMote(true));
      this.resize();
      addEventListener('resize', () => this.resize());
      if (document.fonts) document.fonts.ready.then(() => this.resize());
      this.bindInput();
      this.last = performance.now();
      this.quality = 0; this.slow = 0; this.fast = 0;
      const loop = (now) => {
        requestAnimationFrame(loop);
        const t0 = performance.now();
        this.frame(Math.min(0.05, (now - this.last) / 1000), now / 1000);
        this.last = now;
        // Keep it smooth on slower machines: step the glyph size up (fewer cells) when frames run long
        const ms = performance.now() - t0;
        this.slow = ms > 20 ? this.slow + 1 : 0; this.fast = ms < 8 ? this.fast + 1 : 0;
        if (this.slow > 20 && this.quality < 4) { this.quality++; this.slow = 0; this.resize(); }
        else if (this.fast > 240 && this.quality > 0) { this.quality--; this.fast = 0; this.resize(); }
      };
      requestAnimationFrame(loop);
    }

    setWalking(on) { this.walking = on; return on; }

    newMote(any) {
      const z = this.camZ - (any ? Math.random() * 10 : 3 + Math.random() * 7);
      return { p: [pathX(z) + (Math.random() - 0.5) * 3, 0.3 + Math.random() * 1.8, z], ph: Math.random() * 6.28, sp: 0.5 + Math.random() };
    }

    resize() {
      // Rendered at 1× pixel density: the glyphs stay sharp enough, and it is 4× cheaper on hi-DPI screens
      const r = this.canvas.getBoundingClientRect(), d = 1;
      this.W = r.width; this.H = r.height;
      this.canvas.width = r.width * d; this.canvas.height = r.height * d;
      this.fs = (r.width < 600 ? 7 : 8) + (this.quality || 0);
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
        this.lookYaw = clamp(this.lookYaw + (e.clientX - drag.x) * 0.004, -1.5, 1.5);
        this.lookPitch = clamp(this.lookPitch - (e.clientY - drag.y) * 0.003, -0.45, 0.5);
        drag = { x: e.clientX, y: e.clientY }; this.idle = 0;
      });
      const end = () => { drag = null; };
      c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
      c.addEventListener('wheel', (e) => { e.preventDefault(); this.camZ -= e.deltaY * 0.004; this.pauseT = 2.5; this.idle = 0; }, { passive: false });
      this.dragging = () => !!drag;
    }

    scene() {
      const n0 = Math.floor(-(this.camZ + 3)), n1 = Math.floor(-(this.camZ - 26));
      for (const k of this.segs.keys()) if (k < n0 - 2 || k > n1 + 2) this.segs.delete(k);
      const out = { mounds: [], spikes: [] };
      for (let n = n0; n <= n1; n++) {
        if (!this.segs.has(n)) this.segs.set(n, segment(n));
        const s = this.segs.get(n);
        for (const v of s.mounds) out.mounds.push(v);
        for (const v of s.spikes) out.spikes.push(v);
      }
      return out;
    }

    // Butterflies land on the tops of mounds near the path
    pickFlower(list, near, far) {
      const c = list.filter((p) => p.z < this.camZ - near && p.z > this.camZ - far && Math.abs(p.x - pathX(p.z)) < 2.2);
      return c.length ? c[(Math.random() * c.length) | 0] : null;
    }
    stepFlyer(b, dt, t, list) {
      if (b.p[2] > this.camZ + 2.5) { const z = this.camZ - 9 - Math.random() * 4; b.p = [pathX(z) + Math.random() * 2 - 1, 1.3, z]; b.perched = false; b.target = null; }
      if (!b.target || b.target.z > this.camZ + 0.5) b.target = this.pickFlower(list, 1.5, 8);
      if (!b.target) return;
      const h = b.target, seat = [h.x, h.ry + 0.02, h.z];
      const d = [seat[0] - b.p[0], seat[1] - b.p[1], seat[2] - b.p[2]], dl = Math.hypot(d[0], d[1], d[2]);
      b.hopT += dt;
      if (b.perched) {
        b.perchT += dt; b.p = seat; b.flap = 1.25 + 0.22 * Math.sin(t * 1.4 + b.phase);
        if (b.perchT > b.dwell) { b.perched = false; b.hopT = 0; b.target = this.pickFlower(list, 1, 7); b.v = [Math.cos(b.yaw) * 0.3, 0.8, Math.sin(b.yaw) * 0.3]; }
        return;
      }
      if (b.hopT > 10) { b.target = this.pickFlower(list, 1, 7); b.hopT = 0; }
      b.wand -= dt;
      if (b.wand <= 0) { b.wand = 0.15 + Math.random() * 0.45; b.w = [(Math.random() * 2 - 1) * 0.7, (Math.random() * 2 - 1) * 0.5 + 0.1, (Math.random() * 2 - 1) * 0.7]; }
      const arrive = Math.min(1, dl), wob = 0.25 + 0.75 * arrive, st = Math.min(1, dt * (dl < 0.35 ? 6 : 2.2));
      for (let k = 0; k < 3; k++) b.v[k] += ((d[k] / (dl || 1)) * 1.1 * arrive + b.w[k] * wob + (k === 1 && dl > 0.8 ? 0.2 : 0) - b.v[k]) * st;
      if (b.glide > 0) { b.glide -= dt; b.v[1] -= 0.5 * dt; } else if (dl > 1 && Math.random() < dt * 0.5) b.glide = 0.3 + Math.random() * 0.4;
      for (let k = 0; k < 3; k++) b.p[k] += b.v[k] * dt;
      b.p[1] = Math.max(0.25, b.p[1]);
      if (b.glide > 0) b.flap += (0.12 - b.flap) * Math.min(1, dt * 8);
      else { b.phase += dt * 2 * Math.PI * 6; b.flap = 0.35 + 0.8 * Math.sin(b.phase); b.p[1] += Math.max(0, Math.cos(b.phase)) * 0.008; }
      if (Math.hypot(b.v[0], b.v[2]) > 0.1) { const da = ((Math.atan2(b.v[2], b.v[0]) - b.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; b.yaw += da * Math.min(1, dt * 6); }
      if (dl < 0.05) { b.perched = true; b.perchT = 0; b.glide = 0; b.dwell = 1.8 + Math.random() * 2.5; }
    }
    stepBee(dt, t, list) {
      const e = this.bee;
      const near = (p) => p.z < this.camZ - 1.2 && p.z > this.camZ - 5 && Math.abs(p.x - pathX(p.z)) < 1.6;
      if (!e.target || e.target.z > this.camZ - 0.8 || e.p[2] > this.camZ + 1) {
        e.target = list.find(near) || null;
        if (e.p[2] > this.camZ + 1) { const z = this.camZ - 6; e.p = [pathX(z) + 1, 0.6, z]; }
      }
      if (!e.target) return;
      const h = e.target, seat = [h.x + Math.sin(t * 2) * h.rx * 0.4, h.ry + 0.06, h.z];
      const d = [seat[0] - e.p[0], seat[1] - e.p[1], seat[2] - e.p[2]], dl = Math.hypot(d[0], d[1], d[2]);
      e.t += dt;
      if (dl < 0.08 && e.t > 1.4) {
        e.t = 0;
        const c = list.filter((p) => near(p) && Math.abs(p.x - h.x) < 1 && p !== h);
        if (c.length) e.target = c[(Math.random() * c.length) | 0];
      }
      const arrive = Math.min(1, dl / 0.4);
      for (let k = 0; k < 3; k++) { e.v[k] += ((d[k] / (dl || 1)) * 1.8 * arrive - e.v[k]) * Math.min(1, dt * 5); e.p[k] += e.v[k] * dt; }
      e.p[1] += Math.sin(t * 9) * 0.003;
      if (Math.hypot(e.v[0], e.v[2]) > 0.15) e.yaw = Math.atan2(e.v[2], e.v[0]);
    }

    frame(dt, t) {
      const { COLS, ROWS, zb, gl, co } = this;
      // ── Walk ──
      this.pauseT -= dt; this.idle += dt;
      if (this.walking && this.pauseT <= 0) this.camZ -= dt * 0.3;
      if (!this.dragging() && this.idle > 2.5) { this.lookYaw *= 1 - Math.min(1, dt * 0.7); this.lookPitch *= 1 - Math.min(1, dt * 0.7); }
      fillTables(this.camZ + 8);
      const cz = this.camZ, cx = pathX(cz) + 0.05 * Math.sin(t * 0.21);
      const cy = EYE + (this.walking && !this.reduced && this.pauseT <= 0 ? Math.sin(t * 3.4) * 0.007 : 0);
      const ahead = 2.4, wantYaw = Math.atan2(pathX(cz - ahead) - cx, ahead);
      this.yaw += (wantYaw - this.yaw) * Math.min(1, dt * 1.5);
      const yaw = this.yaw + this.lookYaw, pitch = -0.16 + this.lookPitch;
      const fx = Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = Math.sin(yaw);
      const FOC = Math.min(this.H, this.W * 1.2), ax = this.cw / FOC, ay = this.chH / FOC, hc = COLS / 2, hr = ROWS / 2 - pitch / ay;
      const fogOf = (z) => clamp(1.15 - z / 28, 0.28, 1);
      zb.fill(0); gl.fill(-1);

      // ── 1. Ray-cast: path, ground cover, tree wall, light through the canopy ──
      for (let sy = 0; sy < ROWS; sy++) {
        const b = (hr - sy - 0.5) * ay;
        for (let sx = 0; sx < COLS; sx++) {
          const a = (sx + 0.5 - hc) * ax, dx = fx + rx * a, dz = fz + rz * a;
          const i = sy * COLS + sx;
          let tHit = 1e9, glyph = -1, col = 0, lum = 0;
          if (b < -1e-4) {
            const tg = -cy / b, x = cx + dx * tg, z = cz + dz * tg;
            const d = Math.abs(x - pathX(z)), w = pathW(z) + (hash2(Math.floor(x * 6), Math.floor(z * 6)) - 0.5) * 0.14;
            tHit = tg;
            const dap = dapple(x, z), sunny = dap > 0.25;
            if (d < w) {
              const [edge, id] = stoneAt(x, z);
              if (tg < 10 && edge < 0.035) {
                glyph = id < 0.5 ? K[','] : K['.']; col = C.moss; lum = 0.55;          // moss in the joints
              } else {
                col = sunny ? C.sun : id < 0.4 ? C.stone : id < 0.75 ? C.stone2 : C.stone3;
                lum = (0.7 + 0.25 * id) * (sunny ? 1.15 : 0.9);
                glyph = tg < 10 && edge < 0.07 ? K[':'] : lum > 0.75 ? K['='] : K['-'];
              }
            } else {
              const hh = hash2(Math.floor(x * 14), Math.floor(z * 14));
              glyph = hh < 0.4 ? K[','] : hh < 0.7 ? K[';'] : K['%']; col = hh < 0.5 ? C.ground : C.leafD; lum = 0.5 + (sunny ? 0.18 : 0);
            }
          }
          // Tree wall on both sides, light breaking through near its top
          if (Math.abs(dx) > 1e-4) {
            const side = dx > 0 ? 1 : -1, tw = (side * TREES + pathX(cz) * 0.6 - cx) / dx;
            if (tw > 0 && tw < tHit) {
              const y = cy + b * tw, z = cz + dz * tw, top = treeTop(z);
              if (y >= 0 && y <= top) {
                tHit = tw;
                const hh = hash2(Math.floor(z * 10) + side * 999, Math.floor(y * 10)), k = y / top;
                if (k > 0.72 && hh < 0.12 * (k - 0.6) * 6) { glyph = K['.']; col = C.light; lum = 0.8; }
                else {
                  glyph = hh < 0.35 ? K['%'] : hh < 0.65 ? K['&'] : hh < 0.85 ? K['#'] : K['*'];
                  col = k > 0.6 && hh > 0.6 ? C.treesL : hh > 0.5 ? C.trees2 : C.trees;
                  lum = 0.44 + 0.4 * k + 0.15 * hh;
                }
              }
            }
          }
          if (tHit > 1e8) {
            // Sky between the trees: soft evening light
            const hh = hash2(sx * 3, sy * 7);
            if (hh < 0.05) { glyph = K['.']; col = C.light; lum = 0.35 + hh * 6; }
          } else zb[i] = 1 / tHit;
          if (glyph >= 0) { gl[i] = glyph; co[i] = col * NL + levelOf(lum * (tHit < 1e8 ? fogOf(tHit) : 1)); }
        }
      }

      // ── 2. Plants and creatures, depth-tested ──
      const proj = (x, y, z) => {
        const qx = x - cx, qz = z - cz, zc = qx * fx + qz * fz;
        if (zc < 0.12) return null;
        return [hc + (qx * rx + qz * rz) / zc / ax, hr - (y - cy) / zc / ay, zc];
      };
      const putCell = (sx, sy, zc, col, glyph, lum) => {
        sx |= 0; sy |= 0;
        if (sx < 0 || sy < 0 || sx >= COLS || sy >= ROWS) return;
        const i = sy * COLS + sx, iz = 1 / zc;
        if (iz <= zb[i]) return;
        zb[i] = iz; gl[i] = glyph; co[i] = col * NL + levelOf(lum * fogOf(zc));
      };
      const put = (x, y, z, col, glyph, lum) => { const p = proj(x, y, z); if (p) putCell(p[0], p[1], p[2], col, glyph, lum); };
      const cpu = (zc) => 1 / (zc * ax);
      const aspect = ax / ay;
      // A small round blossom, a disc of glyphs that shrinks to one glyph with distance
      const blossom = (p, rad, col, lum, rose) => {
        const rc = rad * cpu(p[2]);
        if (rc < 0.75) { putCell(p[0], p[1], p[2], col, rc > 0.4 ? K['@'] : K['*'], lum); return; }
        const ry = rc * aspect;
        for (let yy = Math.floor(p[1] - ry); yy <= p[1] + ry; yy++) for (let xx = Math.floor(p[0] - rc); xx <= p[0] + rc; xx++) {
          const u = (xx + 0.5 - p[0]) / rc, v = (yy + 0.5 - p[1]) / (ry || 1), d = u * u + v * v;
          if (d > 1) continue;
          const lit = clamp(lum * (1.05 - 0.35 * (v + 0.3) - 0.15 * u), 0, 1.2);
          const g = rose ? (d < 0.12 ? K['@'] : d < 0.45 ? K.o : d < 0.8 ? K['('] : K[':']) : (d < 0.15 ? K['@'] : d < 0.6 ? K.o : K[':']);
          putCell(xx, yy, p[2] - rad * (1 - d), col, rose && d >= 0.45 && d < 0.8 ? (u < 0 ? K['('] : K[')']) : g, lit);
        }
      };
      const S = this.scene();

      // Mounds and bushes: a leafy dome, then its blossoms
      for (const m of S.mounds) {
        const c = proj(m.x, m.ry * 0.5, m.z);
        if (!c || c[0] < -80 || c[0] > COLS + 80) continue;
        const rcx = Math.min(90, m.rx * cpu(c[2]));
        const ryc = m.ry * 0.5 * cpu(c[2]) * aspect;
        if (rcx < 0.8) { putCell(c[0], c[1], c[2], m.col, K['*'], 0.85); continue; }
        // Object-space texture (stable as you walk), quantised to about one cell
        const res = Math.max(0.03, Math.pow(2, Math.ceil(Math.log2(1 / cpu(c[2])))));
        for (let yy = Math.floor(c[1] - ryc); yy <= c[1] + ryc; yy++) for (let xx = Math.floor(c[0] - rcx); xx <= c[0] + rcx; xx++) {
          const u = (xx + 0.5 - c[0]) / rcx, v = (yy + 0.5 - c[1]) / (ryc || 1);
          const d = u * u + (v > 0 ? v * v * 0.6 : v * v);     // flatter at the bottom
          const hq = hash2(Math.floor((u * m.rx) / res) + m.seed, Math.floor((v * m.ry) / res) - m.seed);
          if (d > 0.86 + 0.14 * hq) continue;
          const lit = clamp(0.64 + 0.32 * (-v * 0.8 + u * 0.3) + 0.15 * hq, 0.2, 1);
          putCell(xx, yy, c[2] - Math.sqrt(Math.max(0, 1 - d)) * m.rx * 0.7, hq > 0.75 ? C.leafL : m.leaf, LEAF_G[(hq * LEAF_G.length) | 0], lit);
        }
        const B = m.blooms;
        for (let k = 0; k < B.length; k += 5) {
          const p = proj(m.x + B[k], B[k + 1], m.z + B[k + 2]);
          if (!p) continue;
          const lit = 0.72 + 0.35 * (B[k + 1] / m.ry);
          blossom([p[0], p[1], p[2] - m.rx * 0.6 * (B[k + 1] / m.ry)], B[k + 3], B[k + 4], lit, m.rose);
        }
      }
      // Tall spikes: stem, leaves at the base, stacked florets
      for (const s of S.spikes) {
        const sw = Math.sin(t * 1.1 + s.ph) * 0.03;
        const base = proj(s.x, 0, s.z), top = proj(s.x + sw, s.h, s.z);
        if (!base || !top || top[0] < -20 || top[0] > COLS + 20) continue;
        const n = Math.max(1, Math.ceil(Math.abs(base[1] - top[1])));
        for (let q = 0; q <= n; q++) { const k = q / n; putCell(base[0] + (top[0] - base[0]) * k, base[1] + (top[1] - base[1]) * k, base[2], C.stem, K['|'], 0.55); }
        for (let j = 0; j < s.florets.length; j += 3) {
          const y = s.florets[j], rr = s.florets[j + 1], a = s.florets[j + 2], k = y / s.h;
          const p = proj(s.x + sw * k + Math.cos(a) * rr * 0.5, y, s.z + Math.sin(a) * rr * 0.5);
          if (!p) continue;
          const rc = rr * cpu(p[2]);
          if (rc < 0.75) putCell(p[0], p[1], p[2] - 0.02, s.col, s.shape === 'O' ? K.o : s.shape === 'U' ? K.v : K['*'], 0.95 - k * 0.2);
          else if (s.shape === 'U') {           // foxglove bells: a little cup facing out
            for (let yy = -1; yy <= Math.ceil(rc * aspect); yy++) for (let xx = -Math.ceil(rc); xx <= rc; xx++) putCell(p[0] + xx, p[1] + yy, p[2] - 0.02, s.col, yy === -1 ? K['_'] : Math.abs(xx) >= rc - 0.5 ? K['|'] : K.U, 0.9 - k * 0.2);
          } else blossom(p, rr, s.col, 0.95 - k * 0.15, s.shape === 'O');
        }
      }
      // Rose arches over the path: a thick leafy hoop covered in blooms
      const a0 = Math.floor(-(this.camZ + 1) / ARCH_EVERY), a1 = Math.floor(-(this.camZ - 26) / ARCH_EVERY);
      for (let k = a0; k <= a1; k++) {
        const za = -ARCH_EVERY * k - 5;
        if (za > cz + 0.4) continue;
        const pxa = pathX(za), R = pathW(za) + 0.25, top = 1.75, rr = rng(k * 131 + 7);
        const pts = [];
        for (const side of [-1, 1]) for (let y = 0; y < top; y += 0.11) pts.push([pxa + side * R, y]);
        for (let ang = 0; ang <= Math.PI; ang += 0.1) pts.push([pxa + Math.cos(ang) * R, top + Math.sin(ang) * R * 0.75]);
        for (const [x, y] of pts) {
          const p = proj(x, y, za);
          if (!p) continue;
          const lr = 0.17 * cpu(p[2]), lry = lr * aspect;
          for (let yy = Math.floor(p[1] - lry); yy <= p[1] + lry; yy++) for (let xx = Math.floor(p[0] - lr); xx <= p[0] + lr; xx++) {
            const u = (xx + 0.5 - p[0]) / (lr || 1), v = (yy + 0.5 - p[1]) / (lry || 1), d = u * u + v * v;
            const hq = hash2(Math.floor(x * 30 + u * 3) + k * 17, Math.floor(y * 30 + v * 3));
            if (d > 0.8 + 0.2 * hq) continue;
            putCell(xx, yy, p[2] - 0.05 * (1 - d), hq > 0.7 ? C.leafL : C.leafD, LEAF_G[(hq * LEAF_G.length) | 0], 0.5 + 0.3 * (1 - v * 0.5));
          }
          const nb = 1 + ((rr() * 2.2) | 0);
          for (let j = 0; j < nb; j++) {
            const bp = proj(x + (rr() - 0.5) * 0.22, y + (rr() - 0.5) * 0.2, za + (rr() - 0.7) * 0.18);
            if (bp) blossom(bp, 0.055 + rr() * 0.03, C[pick(rr, ['pink', 'rose', 'blush', 'white', 'cream', 'pink'])], 0.95, true);
          }
        }
      }
      // Pollen drifting in the warm light
      for (const q of this.motes) {
        if (q.p[2] > this.camZ + 1) Object.assign(q, this.newMote(false));
        q.p[0] += Math.sin(t * 0.5 * q.sp + q.ph) * 0.002; q.p[1] += Math.sin(t * 0.7 + q.ph) * 0.0015;
        const glow = Math.sin(t * 1.3 * q.sp + q.ph);
        if (glow > 0.2) put(q.p[0], q.p[1], q.p[2], C.light, K['.'], 0.5 + glow * 0.5);
      }

      // Butterflies and the bee
      for (const b of this.flyers) this.stepFlyer(b, dt, t, S.mounds);
      this.stepBee(dt, t, S.mounds);
      for (let i = 0; i < 200; i++) this.bits[(Math.random() * 8192) | 0] ^= 1;
      for (const b of this.flyers) {
        const bp = proj(b.p[0], b.p[1], b.p[2]); if (!bp) continue;
        const rc = 0.3 * b.scale * cpu(bp[2]);
        if (rc < 2.5) { putCell(bp[0], bp[1], bp[2] - 0.05, b.wingC, b.flap > 0.6 ? K.v : K['-'], 1); continue; }
        const s = b.scale, cyy = Math.cos(b.yaw), syy = Math.sin(b.yaw), Sd = [-syy, 0, cyy];
        const pt = b.perched ? 0 : clamp(b.v[1] * 0.25, -0.4, 0.4), Fv = [cyy * Math.cos(pt), Math.sin(pt), syy * Math.cos(pt)];
        const cf = Math.cos(b.flap), sf = Math.sin(b.flap), bitsOn = rc > 6;
        for (let side = -1; side <= 1; side += 2) for (let k = 0; k < WING.length; k += 3) {
          const wu = WING[k] * s, ww = WING[k + 1] * s, kind = WING[k + 2];
          const x = b.p[0] + Fv[0] * wu + Sd[0] * side * cf * ww, y = b.p[1] + Fv[1] * wu + sf * ww, z = b.p[2] + Fv[2] * wu + Sd[2] * side * cf * ww;
          const L = 0.75 + 0.3 * cf;
          put(x, y, z, kind === 2 ? b.spotC : b.wingC, kind === 1 ? K[':'] : kind === 2 ? K['1'] : bitsOn ? (this.bits[k & 8191] ? K['1'] : K['0']) : PETAL_RAMP[clamp((L * 5) | 0, 0, 4)], L);
        }
        for (let q = -0.2; q <= 0.17; q += 0.015) put(b.p[0] + Fv[0] * q * s, b.p[1] + Fv[1] * q * s + 0.004, b.p[2] + Fv[2] * q * s, C.body, q > 0.13 ? K['0'] : q > 0.02 ? K['8'] : K['='], 1);
      }
      {
        const e = this.bee, bp = proj(e.p[0], e.p[1], e.p[2]);
        if (bp) {
          const rc = 0.06 * cpu(bp[2]);
          if (rc < 1.5) putCell(bp[0], bp[1], bp[2] - 0.05, C.gold, K['8'], 1);
          else {
            const cyy = Math.cos(e.yaw), syy = Math.sin(e.yaw);
            for (let q = -0.06; q <= 0.06; q += 0.01) for (let a = 0; a < 6.28; a += 0.6) {
              const rad = 0.032 * Math.sqrt(Math.max(0, 1 - (q / 0.07) ** 2)), stripe = ((q + 0.07) / 0.022) | 0;
              put(e.p[0] + cyy * q - syy * Math.cos(a) * rad, e.p[1] + Math.sin(a) * rad, e.p[2] + syy * q + cyy * Math.cos(a) * rad,
                q > 0.045 ? C.gold : stripe % 2 ? C.gold : C.dark, q > 0.045 ? K['0'] : stripe % 2 ? K['#'] : K['='], 1);
            }
            const open = 0.4 + 0.6 * Math.abs(Math.sin(t * 40));
            for (const side of [-1, 1]) for (let w = 0.015; w < 0.08; w += 0.015) put(e.p[0] - syy * side * w * (1 - open * 0.5), e.p[1] + 0.03 + w * open, e.p[2] + cyy * side * w * (1 - open * 0.5), C.glass, K[':'], 0.9);
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
