// ─────────────────────────────────────────────
//  3D ASCII COTTAGE GARDEN (orbit view)
//
//  One cottage-garden plot, circled by a slowly orbiting camera: an old
//  flagstone path with moss in its joints, borders on both sides (low mounds
//  at the edge, phlox and roses behind, hollyhocks, foxgloves and delphiniums
//  at the back) and a rose arch over the path. Butterflies and a bee work the
//  flowers, drawn brighter and larger than the blooms, with a faint trail.
//
//  How it is drawn (on the GPU via WebGL when available: the CPU only fills a
//  small grid of glyph + colour per cell; a shader draws the letters):
//   • The ground and path are ray-cast per character cell (Voronoi stones).
//   • Plants are soft impostors: a sparse leafy dome in screen space with
//     blossoms fixed in 3D on it, so they stay put and simply shrink with
//     distance (down to one glyph).
//
//    const g = new Garden3D(canvas);
//    g.setSpinning(true | false);   drag to orbit, scroll to zoom
// ─────────────────────────────────────────────
(function () {
  const BASE = {
    stone: '#c9c2b4', stone2: '#b7a690', stone3: '#9fa5aa', sun: '#f4dcae', moss: '#5f8f45',
    ground: '#2f5228', leafD: '#2c5a2c', leaf: '#43803a', leafL: '#6aa64e', stem: '#5f9a4f',
    pink: '#ff8fbd', rose: '#ff6f9e', magenta: '#e0549c', blush: '#ffc6d8', white: '#f8f6ee', cream: '#f4e4be',
    lavender: '#b49cf4', blue: '#7f9cff', violet: '#9a6ad8', red: '#ff4b4b', coral: '#ff806a', yellow: '#ffe066',
    body: '#ffffff', dark: '#3a2c08', glass: '#e7f0ff', gold: '#ffd24a', wing: '#ffffff', wingY: '#fff27a', wingB: '#9fd8ff', trail: '#fff6c8',
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
  const CH = ['.', ',', "'", '`', ':', ';', '|', '0', '1', '@', 'o', '8', '=', '-', '*', '+', '/', '\\', '°', '#', '%', '&', '~', '^', 'v', '"', '(', ')', '_', 'O', 'U', 'W', 'V', 'w'];
  const K = Object.fromEntries(CH.map((c, i) => [c, i]));
  const LEAF_G = ['%', '&', ',', ';', '%', '"'].map((c) => K[c]);

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
  const Z0 = 4, Z1 = -6;                                   // the path runs from z = 4 to z = −6
  const pathX = (z) => 0.6 * Math.sin(z * 0.32) + 0.2 * Math.sin(z * 0.9 + 1);
  const pathW = (z) => 0.5 + 0.06 * Math.sin(z * 0.7) + 0.04 * Math.sin(z * 1.9 + 2);
  const PLOT_R = 5.6;                                      // the garden fades out beyond this
  const CENTER = [0, 0.45, -1];
  const ARCH_Z = -1.2;
  const dapple = (x, z) => Math.sin(x * 2.3 + z * 1.1) * Math.sin(z * 1.6 - x * 0.8 + 1.2) + 0.5 * Math.sin(x * 5.1 - z * 3.7);
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

  // ── Planting: fewer, better-spaced plants than a real border, so it reads clearly ──
  const EDGE = [
    { bloom: ['lavender', 'blue'], leaf: 'leafL', rx: [0.26, 0.36], ry: [0.18, 0.28], density: 40, size: [0.03, 0.04] },
    { bloom: ['white', 'cream'], leaf: 'leaf', rx: [0.24, 0.32], ry: [0.12, 0.18], density: 45, size: [0.026, 0.034] },
    { bloom: ['pink', 'blush'], leaf: 'leafL', rx: [0.22, 0.32], ry: [0.14, 0.2], density: 36, size: [0.03, 0.04] },
  ];
  const MID = [
    { bloom: ['pink', 'blush', 'white', 'magenta'], leaf: 'leaf', rx: [0.4, 0.55], ry: [0.45, 0.65], density: 40, size: [0.035, 0.048] },
    { bloom: ['rose', 'pink', 'coral', 'cream', 'blush'], leaf: 'leafD', rx: [0.42, 0.6], ry: [0.5, 0.75], density: 10, size: [0.07, 0.1], rose: true },
  ];
  const TALL = [
    { bloom: ['pink', 'white', 'magenta', 'blush'], h: [1.5, 2.1], r: 0.075, shape: 'O' },
    { bloom: ['magenta', 'pink', 'white'], h: [1.0, 1.4], r: 0.042, shape: 'U' },
    { bloom: ['blue', 'violet', 'lavender'], h: [1.1, 1.6], r: 0.038, shape: '*' },
  ];
  const pick = (r, a) => a[(r() * a.length) | 0];
  const span = (r, [a, b]) => a + r() * (b - a);
  function mound(r, x, z, sp, colName) {
    const rx = span(r, sp.rx), ry = span(r, sp.ry), n = Math.round(sp.density * rx * 2), blooms = [];
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, e = Math.acos(1 - r() * (sp.rose ? 0.95 : 0.85));
      blooms.push(Math.sin(e) * Math.cos(a) * rx, Math.cos(e) * ry, Math.sin(e) * Math.sin(a) * rx * 0.85, span(r, sp.size), C[sp.bloom.length > 2 && r() < 0.15 ? pick(r, sp.bloom) : colName]);
    }
    return { x, z, rx, ry, leaf: C[sp.leaf], col: C[colName], rose: !!sp.rose, blooms: new Float32Array(blooms), seed: (r() * 1e6) | 0 };
  }
  function plant() {
    const r = rng(20251105), mounds = [], spikes = [];
    for (const side of [-1, 1]) {
      for (let z = Z0 - 0.4; z > Z1 + 0.4; z -= 0.75 + r() * 0.35) {
        const sp = EDGE[(Math.floor((z + 9) / 2.2) + (side > 0 ? 1 : 0)) % EDGE.length];
        mounds.push(mound(r, pathX(z) + side * (pathW(z) + span(r, [0.12, 0.3])), z, sp, pick(r, sp.bloom)));
      }
      for (let z = Z0 - 0.8; z > Z1 + 0.6; z -= 1.15 + r() * 0.5) {
        const sp = r() < 0.4 ? MID[1] : MID[0];
        mounds.push(mound(r, pathX(z) + side * (pathW(z) + span(r, [0.8, 1.4])), z, sp, pick(r, sp.bloom)));
      }
      for (let z = Z0 - 1.2; z > Z1 + 0.8; z -= 2 + r()) {
        const tall = pick(r, TALL), col = C[pick(r, tall.bloom)], cx = pathX(z) + side * (pathW(z) + span(r, [1.9, 2.5]));
        for (let i = 0; i < 3; i++) {
          const florets = [], h = span(r, tall.h);
          for (let y = h * 0.45; y < h; y += tall.r * (tall.shape === 'O' ? 1.6 : 1.35)) florets.push(y, tall.r * (1 - ((y - h * 0.45) / (h * 0.55)) * 0.5), r() * 6.28);
          spikes.push({ x: cx + (r() - 0.5) * 0.45, z: z + (r() - 0.5) * 0.45, h, col, shape: tall.shape, florets, ph: r() * 6.28 });
        }
      }
    }
    return { mounds, spikes };
  }

  // Butterfly wing template
  const WING = (() => {
    const pts = [];
    const fore = { cu: 0.07, cw: 0.21, a: 0.15, b: 0.2, rot: 0.5, spot: [0.12, 0.3, 0.045] };
    const hind = { cu: -0.09, cw: 0.15, a: 0.11, b: 0.13, rot: -0.4, spot: [-0.1, 0.2, 0.03] };
    for (let u = -0.26; u <= 0.3; u += 0.02) for (let w = 0.02; w <= 0.44; w += 0.02) {
      let best = null;
      for (const e of [fore, hind]) {
        const du = u - e.cu, dw = w - e.cw, cs = Math.cos(e.rot), sn = Math.sin(e.rot);
        const pu = du * cs - dw * sn, pw = du * sn + dw * cs, d = (pu * pu) / (e.a * e.a) + (pw * pw) / (e.b * e.b);
        if (d < 1 && (!best || d < best.d)) best = { d, e };
      }
      if (!best) continue;
      const [su, sw, sr] = best.e.spot;
      pts.push(u, w, Math.hypot(u - su, w - sw) < sr ? 2 : best.d > 0.72 ? 1 : 0);
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
      this.yaw = 0.5; this.pitch = 0.42; this.dist = 7.5; this.idle = 0;
      const P = plant();
      this.mounds = P.mounds; this.spikes = P.spikes;
      this.bits = Uint8Array.from({ length: 4096 }, () => (Math.random() < 0.5 ? 1 : 0));
      // Butterflies: bright wings that don't match any flower colour
      const wingCols = [['wing', 'red'], ['wingY', 'dark'], ['wingB', 'dark']];
      this.flyers = wingCols.map(([w, s], i) => ({
        wingC: C[w], spotC: C[s], scale: i === 0 ? 0.62 : 0.52,
        p: [Math.random() * 2 - 1, 1.2, Z0 - 2 - i * 3], v: [0, 0, 0], yaw: -Math.PI / 2, trail: [],
        phase: Math.random() * 6, glide: 0, perched: false, perchT: 0, dwell: 2, target: null, wand: 0, w: [0, 0, 0], flap: 0.5, hopT: 0,
      }));
      this.bee = { p: [1, 0.7, -2], v: [0, 0, 0], target: null, t: 0, yaw: 0, trail: [] };
      this.resize();
      addEventListener('resize', () => this.resize());
      if (document.fonts) document.fonts.ready.then(() => this.resize());
      this.bindInput();
      this.last = performance.now();
      this.quality = 0; this.slow = 0;
      const loop = (now) => {
        requestAnimationFrame(loop);
        const t0 = performance.now();
        this.frame(Math.min(0.05, (now - this.last) / 1000), now / 1000);
        this.last = now;
        // On slow machines, step the glyph size up (fewer cells to draw)
        this.slow = performance.now() - t0 > 18 ? this.slow + 1 : 0;
        if (this.slow > 20 && this.quality < 3) { this.quality++; this.slow = 0; this.resize(); }
      };
      requestAnimationFrame(loop);
    }

    setSpinning(on) { this.spinning = on; return on; }

    resize() {
      const r = this.canvas.getBoundingClientRect();
      const d = this.glr ? Math.min(devicePixelRatio || 1, 2) : 1;      // the GPU path can afford sharp hi-DPI text
      this.W = r.width; this.H = r.height; this.dpr = d;
      this.canvas.width = Math.round(r.width * d); this.canvas.height = Math.round(r.height * d);
      this.fs = (r.width < 600 ? 9 : 11) + (this.quality || 0);
      this.cw = this.fs * 0.6; this.chH = this.fs * 1.08;
      this.COLS = Math.ceil(r.width / this.cw); this.ROWS = Math.ceil(r.height / this.chH);
      if (this.glr) this.glAtlas(); else this.buildAtlas();
      const n = this.COLS * this.ROWS;
      this.zb = new Float32Array(n); this.gl = new Int8Array(n); this.co = new Int16Array(n);
    }

    // ── WebGL renderer: a full-screen quad; the fragment shader looks up which glyph
    // and colour its cell holds and samples the glyph from a white-on-clear atlas ──
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
      // Palette: every colour × brightness level, as one row of texels
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
        this.pitch = clamp(this.pitch + (e.clientY - drag.y) * 0.004, 0.12, 1.1);
        drag = { x: e.clientX, y: e.clientY }; this.idle = 0;
      });
      const end = () => { drag = null; };
      c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
      c.addEventListener('wheel', (e) => { e.preventDefault(); this.dist = clamp(this.dist * Math.exp(e.deltaY * 0.001), 2.5, 13); this.idle = 0; }, { passive: false });
      this.dragging = () => !!drag;
    }

    // ── Butterflies: natural flight between mound tops; the bee keeps to the edge mounds ──
    pickFlower(near) {
      const c = this.mounds.filter((m) => !near || Math.hypot(m.x - near.x, m.z - near.z) < 2.5);
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
      if (!e.target) e.target = this.mounds[0];
      const h = e.target, seat = [h.x + Math.sin(t * 2) * h.rx * 0.4, h.ry + 0.08, h.z];
      const d = [seat[0] - e.p[0], seat[1] - e.p[1], seat[2] - e.p[2]], dl = Math.hypot(d[0], d[1], d[2]);
      e.t += dt;
      if (dl < 0.1 && e.t > 1.4) {
        e.t = 0;
        const c = this.mounds.filter((m) => m !== h && Math.hypot(m.x - h.x, m.z - h.z) < 1.4);
        if (c.length) e.target = c[(Math.random() * c.length) | 0];
      }
      const arrive = Math.min(1, dl / 0.4);
      for (let k = 0; k < 3; k++) { e.v[k] += ((d[k] / (dl || 1)) * 1.6 * arrive - e.v[k]) * Math.min(1, dt * 5); e.p[k] += e.v[k] * dt; }
      e.p[1] += Math.sin(t * 9) * 0.003;
      if (Math.hypot(e.v[0], e.v[2]) > 0.15) e.yaw = Math.atan2(e.v[2], e.v[0]);
    }

    frame(dt, t) {
      const { COLS, ROWS, zb, gl, co } = this;
      // ── Orbit camera ──
      this.idle += dt;
      if (this.spinning && !this.dragging() && this.idle > 2) this.yaw += dt * 0.07;
      const cp = Math.cos(this.pitch);
      const cam = [CENTER[0] + this.dist * Math.sin(this.yaw) * cp, CENTER[1] + this.dist * Math.sin(this.pitch), CENTER[2] + this.dist * Math.cos(this.yaw) * cp];
      const f = norm([CENTER[0] - cam[0], CENTER[1] - cam[1], CENTER[2] - cam[2]]);
      const r = norm([-f[2], 0, f[0]]);
      const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
      const FOC = Math.min(this.H, this.W * 1.2) * 1.1, ax = this.cw / FOC, ay = this.chH / FOC, hc = COLS / 2, hr = ROWS / 2;
      const fogOf = (z) => clamp(1.25 - z / 22, 0.35, 1);
      zb.fill(0); gl.fill(-1);

      // ── 1. Ground and path, one ray per cell ──
      for (let sy = 0; sy < ROWS; sy++) {
        const b = (hr - sy - 0.5) * ay;
        for (let sx = 0; sx < COLS; sx++) {
          const a = (sx + 0.5 - hc) * ax;
          const dy = f[1] + u[1] * b;
          if (dy > -1e-4) continue;
          const dx = f[0] + r[0] * a + u[0] * b, dz = f[2] + r[2] * a + u[2] * b;
          const tg = -cam[1] / dy, x = cam[0] + dx * tg, z = cam[2] + dz * tg;
          const rr = Math.hypot(x - CENTER[0], (z - CENTER[2]) * 0.8);
          if (rr > PLOT_R + hash2(Math.floor(x * 5), Math.floor(z * 5)) * 0.6) continue;     // the plot ends softly
          const i = sy * COLS + sx;
          zb[i] = 1 / tg;
          const edgeFade = clamp((PLOT_R - rr) / 1.2, 0.25, 1);
          const d = Math.abs(x - pathX(z)), w = pathW(z) + (hash2(Math.floor(x * 6), Math.floor(z * 6)) - 0.5) * 0.12;
          const sunny = dapple(x, z) > 0.25;
          let glyph, col, lum;
          if (d < w && z < Z0 && z > Z1) {
            const [edge, id] = stoneAt(x, z);
            if (edge < 0.035) { glyph = id < 0.5 ? K[','] : K['.']; col = C.moss; lum = 0.55; }
            else {
              col = sunny ? C.sun : id < 0.4 ? C.stone : id < 0.75 ? C.stone2 : C.stone3;
              lum = (0.7 + 0.25 * id) * (sunny ? 1.12 : 0.9);
              glyph = edge < 0.07 ? K[':'] : lum > 0.75 ? K['='] : K['-'];
            }
          } else {
            const hh = hash2(Math.floor(x * 9), Math.floor(z * 9));
            if (hh > 0.55) { gl[i] = -1; continue; }        // sparse ground cover: calmer
            glyph = hh < 0.3 ? K[','] : K["'"]; col = C.ground; lum = 0.55 + (sunny ? 0.15 : 0);
          }
          gl[i] = glyph; co[i] = col * NL + levelOf(lum * edgeFade * fogOf(tg));
        }
      }

      // ── 2. Plants and creatures, depth-tested ──
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
      const cpu = (zc) => 1 / (zc * ax);
      const aspect = ax / ay;
      const blossom = (p, rad, col, lum, rose) => {
        const rc = rad * cpu(p[2]);
        if (rc < 0.75) { putCell(p[0], p[1], p[2], col, rc > 0.4 ? K['@'] : K['*'], lum); return; }
        const ry = rc * aspect;
        for (let yy = Math.floor(p[1] - ry); yy <= p[1] + ry; yy++) for (let xx = Math.floor(p[0] - rc); xx <= p[0] + rc; xx++) {
          const uu = (xx + 0.5 - p[0]) / rc, vv = (yy + 0.5 - p[1]) / (ry || 1), d = uu * uu + vv * vv;
          if (d > 1) continue;
          const g = rose ? (d < 0.12 ? K['@'] : d < 0.45 ? K.o : d < 0.8 ? (uu < 0 ? K['('] : K[')']) : K[':']) : (d < 0.15 ? K['@'] : d < 0.6 ? K.o : K[':']);
          putCell(xx, yy, p[2] - rad * (1 - d), col, g, clamp(lum * (1.05 - 0.3 * (vv + 0.3)), 0, 1.2));
        }
      };

      // Mounds: a sparse leafy dome, then the blossoms on it
      for (const m of this.mounds) {
        const c = proj(m.x, m.ry * 0.5, m.z);
        if (!c) continue;
        const rcx = Math.min(70, m.rx * cpu(c[2])), ryc = Math.min(70, m.ry * 0.5 * cpu(c[2]) * aspect);
        if (rcx < 0.8) { putCell(c[0], c[1], c[2], m.col, K['*'], 0.85); continue; }
        const res = Math.max(0.03, Math.pow(2, Math.ceil(Math.log2(1 / cpu(c[2])))));
        for (let yy = Math.floor(c[1] - ryc); yy <= c[1] + ryc; yy++) for (let xx = Math.floor(c[0] - rcx); xx <= c[0] + rcx; xx++) {
          const uu = (xx + 0.5 - c[0]) / rcx, vv = (yy + 0.5 - c[1]) / (ryc || 1);
          const d = uu * uu + (vv > 0 ? vv * vv * 0.6 : vv * vv);
          const hq = hash2(Math.floor((uu * m.rx) / res) + m.seed, Math.floor((vv * m.ry) / res) - m.seed);
          if (d > 0.86 + 0.14 * hq) continue;
          const depth = c[2] - Math.sqrt(Math.max(0, 1 - d)) * m.rx * 0.7;
          // Calm foliage: one leaf glyph shaded light to dark, a few highlights; the blossoms carry the colour
          const lit = clamp(0.72 + 0.3 * (-vv * 0.8 + uu * 0.3), 0.35, 0.95);
          putCell(xx, yy, depth, lit > 0.78 || hq > 0.85 ? C.leafL : m.leaf, hq > 0.85 ? K['&'] : lit > 0.66 ? K['%'] : K['#'], lit);
        }
        const B = m.blooms;
        for (let k = 0; k < B.length; k += 5) {
          const p = proj(m.x + B[k], B[k + 1], m.z + B[k + 2]);
          if (p) blossom([p[0], p[1], p[2] - m.rx * 0.6 * (B[k + 1] / m.ry)], B[k + 3], B[k + 4], 0.75 + 0.3 * (B[k + 1] / m.ry), m.rose);
        }
      }
      // Tall spikes
      for (const s of this.spikes) {
        const sw = Math.sin(t * 1.1 + s.ph) * 0.03;
        const base = proj(s.x, 0, s.z), top = proj(s.x + sw, s.h, s.z);
        if (!base || !top) continue;
        const n = Math.max(1, Math.ceil(Math.abs(base[1] - top[1])));
        for (let q = 0; q <= n; q++) { const k = q / n; putCell(base[0] + (top[0] - base[0]) * k, base[1] + (top[1] - base[1]) * k, base[2], C.stem, K['|'], 0.55); }
        for (let j = 0; j < s.florets.length; j += 3) {
          const y = s.florets[j], rr = s.florets[j + 1], a = s.florets[j + 2], k = y / s.h;
          const p = proj(s.x + sw * k + Math.cos(a) * rr * 0.5, y, s.z + Math.sin(a) * rr * 0.5);
          if (!p) continue;
          const rc = rr * cpu(p[2]);
          if (rc < 0.75) putCell(p[0], p[1], p[2] - 0.02, s.col, s.shape === 'O' ? K.o : s.shape === 'U' ? K.v : K['*'], 0.95 - k * 0.2);
          else if (s.shape === 'U') {
            for (let yy = -1; yy <= Math.ceil(rc * aspect); yy++) for (let xx = -Math.ceil(rc); xx <= rc; xx++) putCell(p[0] + xx, p[1] + yy, p[2] - 0.02, s.col, yy === -1 ? K['_'] : Math.abs(xx) >= rc - 0.5 ? K['|'] : K.U, 0.9 - k * 0.2);
          } else blossom(p, rr, s.col, 0.95 - k * 0.15, s.shape === 'O');
        }
      }
      // The rose arch
      {
        const pxa = pathX(ARCH_Z), R = pathW(ARCH_Z) + 0.25, top = 1.7, rr = rng(4242);
        const pts = [];
        for (const side of [-1, 1]) for (let y = 0; y < top; y += 0.12) pts.push([pxa + side * R, y]);
        for (let ang = 0; ang <= Math.PI; ang += 0.11) pts.push([pxa + Math.cos(ang) * R, top + Math.sin(ang) * R * 0.75]);
        for (const [x, y] of pts) {
          const p = proj(x, y, ARCH_Z);
          if (!p) continue;
          const lr = 0.15 * cpu(p[2]), lry = lr * aspect;
          for (let yy = Math.floor(p[1] - lry); yy <= p[1] + lry; yy++) for (let xx = Math.floor(p[0] - lr); xx <= p[0] + lr; xx++) {
            const uu = (xx + 0.5 - p[0]) / (lr || 1), vv = (yy + 0.5 - p[1]) / (lry || 1), d = uu * uu + vv * vv;
            const hq = hash2(Math.floor(x * 30 + uu * 3), Math.floor(y * 30 + vv * 3));
            if (d > 0.8 + 0.2 * hq) continue;
            putCell(xx, yy, p[2] - 0.05 * (1 - d), hq > 0.6 ? C.leafL : C.leaf, hq > 0.85 ? K['&'] : K['%'], 0.65 + 0.25 * (1 - vv * 0.5));
          }
          const nb = (rr() * 2.2) | 0;
          for (let j = 0; j < nb; j++) {
            const bp = proj(x + (rr() - 0.5) * 0.22, y + (rr() - 0.5) * 0.2, ARCH_Z + (rr() - 0.5) * 0.2);
            if (bp) blossom(bp, 0.06 + rr() * 0.03, C[pick(rr, ['pink', 'rose', 'blush', 'white', 'cream'])], 0.95, true);
          }
        }
      }

      // ── 3. Butterflies and the bee: bigger, brighter, with a faint trail, drawn on top ──
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
        if (rc < 2.2) {        // far: a clear little butterfly glyph that flaps
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
          if (p) putCell(p[0], p[1], p[2] * 0.7, kind === 2 ? b.spotC : b.wingC, kind === 1 ? K[':'] : kind === 2 ? K['1'] : this.bits[k & 4095] ? K['1'] : K['0'], 0.85 + 0.15 * cf, false);
        }
        for (let q = -0.2; q <= 0.17; q += 0.02) {
          const p = proj(b.p[0] + Fv[0] * q * s, b.p[1] + Fv[1] * q * s + 0.004, b.p[2] + Fv[2] * q * s);
          if (p) putCell(p[0], p[1], p[2] * 0.69, C.body, q > 0.13 ? K['0'] : q > 0.02 ? K['8'] : K['='], 1, false);
        }
      }
      {
        const e = this.bee; trailOf(e, 4);
        const bp = proj(e.p[0], e.p[1], e.p[2]);
        if (bp) {
          const rc = 0.09 * cpu(bp[2]);
          if (rc < 1.6) { putCell(bp[0] - 1, bp[1], bp[2] * 0.5, C.gold, K['('], 1, false); putCell(bp[0], bp[1], bp[2] * 0.5, C.gold, K['8'], 1, false); putCell(bp[0] + 1, bp[1], bp[2] * 0.5, C.gold, K[')'], 1, false); }
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
