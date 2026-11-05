// ─────────────────────────────────────────────
//  3D ASCII GARDEN
//
//  A tiny point renderer: every surface (ground, stems, leaves, petals, wings)
//  is a cloud of points with a normal. Each frame the points are projected
//  through an orbiting perspective camera into a character grid with a depth
//  buffer; lighting picks the brightness, the surface picks the glyph. Fills
//  use the same live 0/1 bit stream as the 2D garden.
//
//    const g = new Garden3D(canvas);
//    g.setMode('walk' | 'orbit' | 'follow');
//      walk:   stroll along the garden path at eye height (drag to look around)
//      orbit:  circle the whole garden (drag to orbit, scroll to zoom)
//      follow: the camera chases the white butterfly
// ─────────────────────────────────────────────
(function () {
  // ── Palette: base colours × 4 brightness levels ──
  const BASE = ['#3f6b3f', '#6f9f6f', '#4f8a4f', '#e6c34a', '#ff8a8a', '#f4f4f4', '#cfcfcf', '#8a8a9a',
    '#e6d27a', '#8ac6ff', '#c49aff', '#7fe0b0', '#ffb070', '#6a5214', '#d7e6ff',
    '#2f5a3a', '#e8e4d0', '#d4ff7a', '#ffc0d0', '#b8913a', '#d9cdb2', '#8c826f', '#ff6f91'];
  const C = { ground: 0, stem: 1, leaf: 2, gold: 3, pink: 4, white: 5, body: 6, star: 7, pollen: 8, blue: 9, violet: 10, mint: 11, orange: 12, dark: 13, glass: 14,
    grass2: 15, moon: 16, firefly: 17, blush: 18, amber: 19, stone: 20, gravel: 21, rose: 22 };
  const LEVELS = [0.2, 0.36, 0.55, 0.78, 1];
  const NL = LEVELS.length;
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

  // ── Static scene: a list of points (x y z nx ny nz colour glyph swayAmp phase fogless ao) ──
  const F = 12;
  function Cloud() { this.d = []; this.groups = []; }
  Cloud.prototype.add = function (x, y, z, nx, ny, nz, col, ch, sway = 0, ph = 0, fogless = 0, ao = 1) {
    this.d.push(x, y, z, nx, ny, nz, col, ch, sway, ph, fogless, ao);
  };
  // Darker near the ground, like light that does not reach the bottom of the grass
  const aoAt = (y) => 0.45 + 0.55 * clamp(y / 0.9, 0, 1);

  // Petals: each one is its own curved blade around a domed centre
  const KINDS = [
    { n: 12, len: 0.3, w: 0.045, up: 0.12, droop: 0.16, r0: 0.055, name: 'daisy' },
    { n: 6, len: 0.22, w: 0.1, up: 1.15, droop: -0.04, r0: 0.03, name: 'tulip' },
    { n: 8, len: 0.27, w: 0.075, up: 0.42, droop: 0.04, r0: 0.05, name: 'cosmos' },
  ];
  function addHead(s, x, h, z, k, col, ph, size = 1) {
    const sp = KINDS[k];
    for (let j = 0; j < sp.n; j++) {
      const a = (j / sp.n) * Math.PI * 2 + (k === 1 ? 0 : rand(-0.06, 0.06));
      const dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx;
      const lenJ = sp.len * size * rand(0.9, 1.08);
      for (let t = 0; t <= 1.001; t += 0.07) {
        const radial = sp.r0 * size + t * lenJ * Math.cos(sp.up), vert = t * lenJ * Math.sin(sp.up) - sp.droop * t * t;
        const slope = Math.atan2(lenJ * Math.sin(sp.up) - 2 * sp.droop * t, lenJ * Math.cos(sp.up));
        const nx = -dx * Math.sin(slope), ny = Math.cos(slope), nz = -dz * Math.sin(slope);
        const width = sp.w * size * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.04 + 0.04)), 0.65) * (k === 1 ? 0.7 + 0.5 * t : 1);
        for (let w = -1; w <= 1.001; w += 0.34) {
          const edge = Math.abs(w) > 0.8 || t > 0.95;
          s.add(x + dx * radial + px * w * width, h + vert, z + dz * radial + pz * w * width, nx, ny, nz,
            col, edge ? K[':'] : BIT, h, ph, 0, 1.3);
        }
      }
    }
    // Domed centre
    for (let e = 0; e <= Math.PI / 2; e += 0.25) for (let a = 0; a < Math.PI * 2; a += 0.35) {
      const rr = 0.06 * size * Math.cos(e);
      s.add(x + Math.cos(a) * rr, h + 0.035 * Math.sin(e) + 0.01, z + Math.sin(a) * rr, Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e),
        C.gold, e > 1.2 ? K['@'] : K.o, h, ph, 0, 1.3);
    }
  }

  // The path: a closed, winding loop (x, z) and helpers to sample it
  const PATH_N = 600;
  function pathAt(u) {
    const a = u * Math.PI * 2;
    return [4.3 * Math.cos(a) + 0.75 * Math.cos(3 * a), 3.3 * Math.sin(a) + 0.55 * Math.sin(2 * a)];
  }
  const PATH = Array.from({ length: PATH_N }, (_, i) => pathAt(i / PATH_N));
  function pathDist(x, z) {
    let best = 1e9;
    for (let i = 0; i < PATH_N; i += 3) { const d = (PATH[i][0] - x) ** 2 + (PATH[i][1] - z) ** 2; if (d < best) best = d; }
    return Math.sqrt(best);
  }
  const PATH_W = 0.42;                      // half width

  function buildScene() {
    const s = new Cloud(), heads = [];
    // Ground: dark, sparse grass glyphs; gravel where the path runs
    const R = 7.6;
    for (let i = 0; i < 15000; i++) {
      const r = R * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2, x = r * Math.cos(a), z = r * Math.sin(a);
      if (r > 6 && Math.random() < (r - 6) / 1.6) continue;
      const pd = pathDist(x, z);
      if (pd < PATH_W) s.add(x, 0.005, z, 0, 1, 0, C.gravel, Math.random() < 0.5 ? K['.'] : K[','], 0, 0, 0, rand(0.55, 0.8));
      else s.add(x, 0, z, 0, 1, 0, Math.random() < 0.35 ? C.grass2 : C.ground, Math.random() < 0.6 ? K['.'] : K[','], 0, 0, 0, rand(0.3, 0.5));
    }
    // Extra ground detail near the path, where the walker's eye is close to the ground
    for (let i = 0; i < 16000; i++) {
      const [x, z] = PATH[(Math.random() * PATH_N) | 0], a = Math.random() * Math.PI * 2, off = Math.pow(Math.random(), 1.6) * 1.8;
      const px = x + Math.cos(a) * off, pz = z + Math.sin(a) * off, pd = pathDist(px, pz);
      if (pd < PATH_W) s.add(px, 0.005, pz, 0, 1, 0, C.gravel, Math.random() < 0.6 ? K['.'] : K[','], 0, 0, 0, rand(0.5, 0.75));
      else s.add(px, 0, pz, 0, 1, 0, Math.random() < 0.4 ? C.grass2 : C.ground, GRASS[(Math.random() * GRASS.length) | 0], 0, 0, 0, rand(0.32, 0.55));
    }
    // Stepping stones down the middle of the path
    for (let i = 0; i < PATH_N; i += 9) {
      const [x, z] = PATH[i], [x2, z2] = PATH[(i + 3) % PATH_N];
      const ta = Math.atan2(z2 - z, x2 - x), ra = rand(0.15, 0.2), rb = rand(0.11, 0.15), jx = rand(-0.06, 0.06), jz = rand(-0.06, 0.06);
      for (let u = -1; u <= 1; u += 0.13) for (let v = -1; v <= 1; v += 0.17) {
        const dd = u * u + v * v;
        if (dd > 1) continue;
        const px = x + jx + Math.cos(ta) * u * ra - Math.sin(ta) * v * rb, pz = z + jz + Math.sin(ta) * u * ra + Math.cos(ta) * v * rb;
        s.add(px, 0.02 + 0.015 * (1 - dd), pz, -u * 0.2, 1, -v * 0.2, C.stone, dd > 0.7 ? K[':'] : Math.random() < 0.08 ? K.o : K['='], 0, 0, 0, 1.05);
      }
    }
    // Grass blades, kept off the path
    for (let i = 0; i < 1600; i++) {
      const r = 6.2 * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2, x = r * Math.cos(a), z = r * Math.sin(a);
      if (pathDist(x, z) < PATH_W + 0.08) continue;
      const h = rand(0.06, 0.22), lean = rand(-0.05, 0.05), seg = 4;
      for (let k = 1; k <= seg; k++) {
        const t = k / seg;
        s.add(x + lean * t * t, h * t, z + lean * t * t * 0.6, 0.3, 0.6, 0.3, Math.random() < 0.5 ? C.stem : C.leaf, K[k === seg ? "'" : '|'], h * t, a, 0, 0.6 * aoAt(h * t * 3));
      }
    }
    // Stars and a moon
    for (let i = 0; i < 340; i++) {
      const a = Math.random() * Math.PI * 2, e = rand(0.08, 1.35), r = 40;
      s.add(r * Math.cos(a) * Math.cos(e), r * Math.sin(e), r * Math.sin(a) * Math.cos(e), 0, -1, 0, C.star, Math.random() < 0.18 ? K['+'] : K['.'], 0, 0, 1);
    }
    {
      const dir = norm([-0.55, 0.42, -0.7]), D = 38, mr = 2.2;
      const ax = norm([dir[2], 0, -dir[0]]), ay = [dir[1] * ax[2] - dir[2] * ax[1], dir[2] * ax[0] - dir[0] * ax[2], dir[0] * ax[1] - dir[1] * ax[0]];
      for (let rr = 0; rr <= mr; rr += 0.12) for (let a = 0; a < Math.PI * 2; a += 0.12 / Math.max(rr, 0.12)) {
        const cx = Math.cos(a) * rr, cy = Math.sin(a) * rr;
        const crater = Math.hypot(cx + 0.6, cy - 0.4) < 0.45 || Math.hypot(cx - 0.7, cy + 0.6) < 0.35;
        s.add(dir[0] * D + ax[0] * cx + ay[0] * cy, dir[1] * D + ax[1] * cx + ay[1] * cy, dir[2] * D + ax[2] * cx + ay[2] * cy, 0, 1, 0,
          C.moon, rr > mr - 0.15 ? K[':'] : crater ? K.o : BIT, 0, 0, 1);
      }
    }
    // The hive, in the meadow inside the loop
    const hive = { x: -1.1, z: 0.5 };
    for (let y = 0; y <= 0.58; y += 0.022) {
      const rad = 0.34 * Math.sqrt(Math.max(0, 1 - (y / 0.62) ** 2)) + 0.03;
      for (let a = 0; a < Math.PI * 2; a += 0.05 / rad) {
        const door = Math.abs(((a + Math.PI / 2 + Math.PI) % (Math.PI * 2)) - Math.PI) < 0.32 && y < 0.13;
        const band = ((y / 0.075) | 0) % 2;
        s.add(hive.x + Math.cos(a) * rad, y, hive.z + Math.sin(a) * rad, Math.cos(a), 0.4, Math.sin(a),
          door ? C.dark : band ? C.amber : C.gold, door ? K['0'] : band ? K['='] : BIT, 0, 0, 0, aoAt(y + 0.3));
      }
    }
    // Flower beds: short flowers at the path's edge, taller ones behind them
    const PETALS = [C.pink, C.blue, C.violet, C.gold, C.mint, C.orange, C.blush, C.white, C.rose];
    const placed = [[hive.x, hive.z, 0.6]];
    const plant = (x, z, h, size) => {
      const g0 = s.d.length / F;
      const ph = Math.random() * 6.28, col = PETALS[(Math.random() * PETALS.length) | 0], kind = (Math.random() * 3) | 0;
      const bend = rand(-0.08, 0.08), bendA = Math.random() * 6.28;
      for (let t = 0; t <= 1; t += 0.03) {
        const y = t * h, ob = Math.sin(t * Math.PI) * bend;
        for (let q = 0; q < 2; q++) {
          const qa = q * Math.PI;
          s.add(x + Math.cos(bendA) * ob + Math.cos(qa) * 0.011, y, z + Math.sin(bendA) * ob + Math.sin(qa) * 0.011, Math.cos(qa), 0.2, Math.sin(qa),
            C.stem, t > 0.4 && Math.random() < 0.25 ? K[':'] : K['|'], y, ph, 0, aoAt(y));
        }
      }
      for (let l = 0; l < 2; l++) {
        const ly = h * rand(0.15, 0.45), la = Math.random() * Math.PI * 2, len = rand(0.22, 0.4) * size;
        const dx = Math.cos(la), dz = Math.sin(la);
        for (let u = 0; u <= 1; u += 0.055) for (let w = -1; w <= 1.001; w += 0.3) {
          const width = Math.pow(Math.sin(u * Math.PI), 0.8) * 0.075 * size;
          const py = ly + u * len * 0.55 - u * u * len * 0.38;
          s.add(x + dx * u * len - dz * w * width, py, z + dz * u * len + dx * w * width, -dx * 0.5, 0.85, -dz * 0.5,
            C.leaf, Math.abs(w) < 0.1 ? K['-'] : Math.abs(w) > 0.8 || u > 0.95 ? K[':'] : BIT, py, ph, 0, aoAt(py));
        }
      }
      addHead(s, x, h, z, kind, col, ph, size);
      heads.push({ x, y: h + (kind === 1 ? 0.1 * size : 0.04), z, ph, col });
      s.groups.push([g0, s.d.length / F, x, h * 0.6, z]);   // point range + centre, for culling
    };
    const free = (x, z, r) => !placed.some((q) => Math.hypot(q[0] - x, q[1] - z) < Math.max(r, q[2]));
    for (let i = 0; i < PATH_N; i += 9) {
      const [x, z] = PATH[i], [x2, z2] = PATH[(i + 2) % PATH_N];
      const tx = x2 - x, tz = z2 - z, tl = Math.hypot(tx, tz) || 1, nx = -tz / tl, nz = tx / tl;
      for (const side of [-1, 1]) {
        if (Math.random() < 0.32) continue;
        const off = rand(PATH_W + 0.12, PATH_W + 1.1), fx = x + nx * side * off, fz = z + nz * side * off;
        if (pathDist(fx, fz) < PATH_W + 0.1 || !free(fx, fz, 0.3)) continue;
        const k = (off - PATH_W) / 1.1;                      // 0 at the edge … 1 at the back
        const h = 0.24 + k * 0.55 + rand(-0.05, 0.08), size = 0.7 + k * 0.4;
        placed.push([fx, fz, 0.28]);
        plant(fx, fz, h, size);
      }
    }
    // A few tall ones in the meadow
    for (let i = 0, tries = 0; i < 10 && tries < 300; tries++) {
      const r = 2.4 * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2, x = r * Math.cos(a) * 1.2, z = r * Math.sin(a) * 0.9;
      if (pathDist(x, z) < PATH_W + 0.3 || !free(x, z, 0.5)) continue;
      placed.push([x, z, 0.4]); plant(x, z, rand(0.7, 1.1), 1.05); i++;
    }
    // Tiny ground-cover blossoms between the beds
    for (let i = 0; i < 900; i++) {
      const [x, z] = PATH[(Math.random() * PATH_N) | 0], a = Math.random() * Math.PI * 2, off = rand(PATH_W + 0.05, PATH_W + 1.4);
      const fx = x + Math.cos(a) * off, fz = z + Math.sin(a) * off;
      if (pathDist(fx, fz) < PATH_W + 0.04) continue;
      s.add(fx, 0.03, fz, 0, 1, 0, PETALS[(Math.random() * PETALS.length) | 0], Math.random() < 0.5 ? K['*'] : K['°'], 0.03, a, 0, 0.75);
    }
    return { pts: new Float32Array(s.d), heads, hive: { x: hive.x, y: 0.66, z: hive.z }, groups: s.groups };
  }

  // ── Butterfly template (body frame: u forward, w outward from the body) ──
  function wingTemplate() {
    const pts = [];
    const fore = { cu: 0.07, cw: 0.21, a: 0.15, b: 0.2, rot: 0.5, spot: [0.12, 0.3, 0.045] };
    const hind = { cu: -0.09, cw: 0.15, a: 0.11, b: 0.13, rot: -0.4, spot: [-0.1, 0.2, 0.03] };
    for (let u = -0.26; u <= 0.3; u += 0.009) for (let w = 0.02; w <= 0.44; w += 0.009) {
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
      this.pts = sc.pts; this.heads = sc.heads; this.hive = sc.hive; this.groups = sc.groups;
      this.nStatic = this.pts.length / F;
      this.bits = Uint8Array.from({ length: this.nStatic + 12000 }, () => (Math.random() < 0.5 ? 1 : 0));
      this.wing = wingTemplate();

      // Camera: walk (default), orbit or follow
      this.mode = opts.mode || 'walk';
      this.yaw = 0.6; this.pitch = 0.46; this.dist = 9; this.tgt = [0, 0.6, 0];
      this.walkU = Math.random(); this.lookYaw = 0; this.lookPitch = 0; this.idle = 0;
      this.fogDist = 10;

      // Butterflies: the white one is "ours"
      const cols = [[C.white, C.pink], [C.blue, C.white], [C.violet, C.gold], [C.orange, C.dark], [C.gold, C.dark], [C.mint, C.violet]];
      this.flyers = cols.map(([wingC, spotC], i) => ({
        wingC, spotC, scale: i === 0 ? 0.95 : rand(0.6, 0.78),
        p: [rand(-3, 3), rand(0.9, 1.6), rand(-3, 3)], v: [0, 0, 0], yaw: Math.random() * 6.28,
        phase: Math.random() * 6, glide: 0, perched: false, perchT: 0, target: (Math.random() * this.heads.length) | 0,
        wand: 0, w: [0, 0, 0], flap: 0.5, hopT: 0,
      }));
      // One bee, busy and direct
      this.bee = { p: [this.hive.x, this.hive.y, this.hive.z], v: [0, 0, 0], target: 0, t: 0, yaw: 0, visits: 0, home: false };
      // Fireflies blinking low over the grass
      this.flies = Array.from({ length: 40 }, () => ({ p: [rand(-5, 5), rand(0.15, 0.8), rand(-4, 4)], ph: Math.random() * 6.28, sp: rand(0.6, 1.4) }));
      // Pollen motes drifting up from the flowers
      this.motes = Array.from({ length: 70 }, () => this.newMote(true));

      this.resize();
      addEventListener('resize', () => this.resize());
      if (document.fonts) document.fonts.ready.then(() => this.resize());   // re-render glyphs once the mono font is in
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
      this.fs = r.width < 600 ? 7 : 8;
      this.cw = this.fs * 0.6; this.chH = this.fs * 1.05;
      this.COLS = Math.ceil(r.width / this.cw); this.ROWS = Math.ceil(r.height / this.chH);
      const n = this.COLS * this.ROWS;
      this.zb = new Float32Array(n); this.gl = new Int8Array(n); this.co = new Int16Array(n);
      this.buildAtlas(d);
    }

    // Every glyph in every palette colour, rendered once per resize, kept as sparse
    // pixel lists (offset in the frame buffer, RGBA) so drawing is a few array writes
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
      // Keep glyphs inside the buffer (no wrap past the right edge or the last row)
      this.ROWS = Math.min(this.ROWS, Math.floor((H - gh) / (this.chH * d)));
      const cols = Math.min(this.COLS, Math.floor((W - gw) / (this.cw * d)));
      if (cols !== this.COLS) {             // keep the grid width in step with the depth buffer
        this.COLS = cols;
        const n = cols * this.ROWS;
        this.zb = new Float32Array(n); this.gl = new Int8Array(n); this.co = new Int16Array(n);
      }
    }

    bindInput() {
      const c = this.canvas;
      let drag = null;
      c.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; c.setPointerCapture(e.pointerId); this.idle = 0; });
      c.addEventListener('pointermove', (e) => {
        if (!drag) return;
        if (this.mode === 'walk') {
          this.lookYaw = clamp(this.lookYaw - (e.clientX - drag.x) * 0.005, -2.6, 2.6);
          this.lookPitch = clamp(this.lookPitch + (e.clientY - drag.y) * 0.003, -0.5, 0.6);
        } else {
          this.yaw -= (e.clientX - drag.x) * 0.006;
          this.pitch = clamp(this.pitch + (e.clientY - drag.y) * 0.004, 0.05, 1.2);
        }
        drag = { x: e.clientX, y: e.clientY }; this.idle = 0;
      });
      const end = () => { drag = null; };
      c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
      c.addEventListener('wheel', (e) => { e.preventDefault(); if (this.mode === 'walk') this.walkU += e.deltaY * 0.00004; else this.dist = clamp(this.dist * Math.exp(e.deltaY * 0.001), 2.2, 13); this.idle = 0; }, { passive: false });
      this.dragging = () => !!drag;
    }

    setMode(m) { this.mode = m; this.idle = 0; this.lookYaw = 0; this.lookPitch = 0; }

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
      const e = this.bee;
      if (!this.near) {                          // flowers closest to the hive: the bee's patch
        this.near = this.heads.map((h, i) => [Math.hypot(h.x - this.hive.x, h.z - this.hive.z), i]).sort((a, b) => a[0] - b[0]).slice(0, 5).map((x) => x[1]);
      }
      const h = e.home ? this.hive : this.heads[this.near[e.target % this.near.length]];
      const seat = e.home ? [h.x, h.y * 0.25, h.z + 0.36] : [h.x, h.y + 0.08, h.z];
      const d = [seat[0] - e.p[0], seat[1] - e.p[1], seat[2] - e.p[2]], dl = Math.hypot(d[0], d[1], d[2]);
      e.t += dt;
      if (dl < 0.08 && e.t > (e.home ? 3 : 1.1)) {
        e.t = 0;
        if (e.home) { e.home = false; e.visits = 0; }
        else if (++e.visits >= 5) e.home = true;
        else e.target += 1 + ((Math.random() * 2) | 0);
      }
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

      // Camera
      this.idle += dt;
      let cam, f;
      if (this.mode === 'walk') {
        // Stroll along the path at eye height, with a gentle step bob; drag to look around,
        // and the gaze drifts back ahead when left alone
        if (!this.reduced) this.walkU = (this.walkU + dt * 0.0075) % 1;
        if (!this.dragging() && this.idle > 2.5) { this.lookYaw *= 1 - Math.min(1, dt * 0.8); this.lookPitch *= 1 - Math.min(1, dt * 0.8); }
        const a = pathAt(((this.walkU % 1) + 1) % 1), b = pathAt(((this.walkU + 0.03) % 1 + 1) % 1);
        const bob = this.reduced ? 0 : Math.sin(t * 3.4) * 0.008;
        cam = [a[0], 0.66 + bob, a[1]];
        const hd = Math.atan2(b[1] - a[1], b[0] - a[0]) + this.lookYaw;
        f = norm([Math.cos(hd), -0.22 + this.lookPitch, Math.sin(hd)]);
        this.fogDist = 7.5;
      } else {
        if (this.mode === 'orbit' && !this.dragging() && this.idle > 2.5 && !this.reduced) this.yaw += dt * 0.08;
        const want = this.mode === 'follow' ? this.flyers[0].p : [0, 0.6, 0];
        for (let k = 0; k < 3; k++) this.tgt[k] += (want[k] - this.tgt[k]) * Math.min(1, dt * 2.5);
        const dist = this.mode === 'follow' ? Math.min(this.dist, 2.4) : this.dist;
        const cp = Math.cos(this.pitch);
        cam = [this.tgt[0] + dist * Math.sin(this.yaw) * cp, this.tgt[1] + dist * Math.sin(this.pitch), this.tgt[2] + dist * Math.cos(this.yaw) * cp];
        f = norm([this.tgt[0] - cam[0], this.tgt[1] - cam[1], this.tgt[2] - cam[2]]);
        this.fogDist = this.mode === 'follow' ? 8 : 14;
      }
      const r = norm([-f[2], 0, f[0]]);                       // right = forward × up
      const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
      const FOC = Math.min(this.H, this.W * 1.2) * 1.05, cwI = 1 / this.cw, chI = 1 / this.chH, hc = COLS / 2, hr = ROWS / 2;
      zb.fill(0);
      const bits = this.bits;

      // Project one point into the grid (depth test, lighting → brightness level)
      const put = (x, y, z, nx, ny, nz, col, ch, fogless, bitIdx, ao = 1) => {
        const dx = x - cam[0], dy = y - cam[1], dz = z - cam[2];
        const zc = dx * f[0] + dy * f[1] + dz * f[2];
        if (zc < 0.15) return;
        const sx = (hc + ((dx * r[0] + dy * r[1] + dz * r[2]) / zc) * FOC * cwI) | 0;
        const sy = (hr - ((dx * u[0] + dy * u[1] + dz * u[2]) / zc) * FOC * chI) | 0;
        if (sx < 0 || sy < 0 || sx >= COLS || sy >= ROWS) return;
        const i = sy * COLS + sx, iz = 1 / zc;
        if (iz <= zb[i]) return;
        zb[i] = iz;
        const lum = (0.35 + 0.65 * Math.abs(nx * L[0] + ny * L[1] + nz * L[2])) * ao;
        const fog = fogless ? 0.6 : clamp(1.35 - zc / this.fogDist, 0.12, 1);
        gl[i] = ch === BIT ? (bits[bitIdx % bits.length] ? K['1'] : K['0']) : ch;
        co[i] = col * NL + Math.min(NL - 1, Math.max(0, (lum * fog * NL * 1.1 - 0.45) | 0));
      };

      // Static scene with sway
      const P = this.pts, G = this.groups;
      // Points outside any flower (ground, stones, sky, hive) are always drawn;
      // each flower is skipped when its centre is behind the camera or lost in the fog
      const drawRange = (from, to) => {
        for (let n = from, o = from * F; n < to; n++, o += F) {
          const sway = P[o + 8], sw = sway ? Math.sin(t * 1.3 + P[o + 9]) * 0.04 * sway : 0;
          put(P[o] + sw, P[o + 1], P[o + 2] + sw * 0.6, P[o + 3], P[o + 4], P[o + 5], P[o + 6], P[o + 7], P[o + 10], n, P[o + 11]);
        }
      };
      const firstFlower = G.length ? G[0][0] : this.nStatic;
      drawRange(0, firstFlower);
      const maxZ = this.fogDist * 1.4;
      for (const g of G) {
        const dx = g[2] - cam[0], dy = g[3] - cam[1], dz = g[4] - cam[2];
        const zc = dx * f[0] + dy * f[1] + dz * f[2];
        if (zc < -0.8 || zc > maxZ) continue;
        if (zc > 0.5 && Math.abs(dx * r[0] + dy * r[1] + dz * r[2]) > zc * 1.9 + 0.8) continue;
        drawRange(g[0], g[1]);
      }
      const lastFlower = G.length ? G[G.length - 1][1] : this.nStatic;
      drawRange(lastFlower, this.nStatic);
      // Fireflies: drift and blink
      for (const q of this.flies) {
        q.p[0] += Math.sin(t * 0.4 * q.sp + q.ph) * 0.004; q.p[2] += Math.cos(t * 0.33 * q.sp + q.ph) * 0.004;
        q.p[1] = clamp(q.p[1] + Math.sin(t * 0.9 + q.ph) * 0.002, 0.12, 0.9);
        const glow = Math.sin(t * 2.2 * q.sp + q.ph);
        if (glow > 0.2) put(q.p[0], q.p[1], q.p[2], 0, 1, 0, C.firefly, glow > 0.75 ? K['*'] : K['+'], 1, 0);
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

      // Draw: write each cell's pre-rendered glyph pixels straight into one frame buffer
      // (one putImageData per frame; fast even without GPU canvas)
      const A = this.atlas, buf = A.buf, NG = CH.length, cw = this.cw * A.d, chh = this.chH * A.d, BW = A.W;
      buf.fill(0);
      const n = COLS * ROWS;
      for (let i = 0; i < n; i++) {
        if (zb[i] <= 0) continue;
        const g = A.slots[co[i] * NG + gl[i]];
        if (!g) continue;
        const base = Math.round(((i / COLS) | 0) * chh) * BW + Math.round((i % COLS) * cw);
        for (let k = 0; k < g.length; k += 2) buf[base + g[k]] = g[k + 1];
      }
      ctx.putImageData(A.img, 0, 0);
    }
  }

  window.Garden3D = Garden3D;
})();
