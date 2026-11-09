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
//    g.setShot('wide' | 'butterfly' | 'bee' | 'hive' | 'far' | null);   // guided tour camera
// ─────────────────────────────────────────────
(function () {
  // ── Palette: base colours × 4 brightness levels ──
  const BASE = ['#3f6b3f', '#6f9f6f', '#4f8a4f', '#e6c34a', '#ff8a8a', '#f4f4f4', '#cfcfcf', '#8a8a9a',
    '#e6d27a', '#8ac6ff', '#c49aff', '#7fe0b0', '#ffb070', '#6a5214', '#d7e6ff',
    '#2f5a3a', '#e8e4d0', '#d4ff7a', '#ffc0d0', '#b8913a'];
  const C = { ground: 0, stem: 1, leaf: 2, gold: 3, pink: 4, white: 5, body: 6, star: 7, pollen: 8, blue: 9, violet: 10, mint: 11, orange: 12, dark: 13, glass: 14,
    grass2: 15, moon: 16, firefly: 17, blush: 18, amber: 19 };
  const LEVELS = [0.3, 0.5, 0.75, 1];
  const PAL = [];
  for (const h of BASE) {
    const n = parseInt(h.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    for (const l of LEVELS) PAL.push(`rgb(${(r * l) | 0},${(g * l) | 0},${(b * l) | 0})`);
  }
  const CH = ['.', ',', "'", '`', ':', ';', '|', '0', '1', '@', 'o', '8', '=', '-', '*', '+', '/', '\\', '°', '#', '%', '&'];
  const K = Object.fromEntries(CH.map((c, i) => [c, i]));
  const BIT = -1;                          // glyph slot meaning "use this point's live bit"
  const GRASS = [K['.'], K[','], K["'"], K['`'], K[';']];

  const L = norm([0.45, 1, 0.35]);       // light direction
  function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ── Static scene: a list of points (x y z nx ny nz colour glyph swayAmp phase fogless ao) ──
  const F = 12;
  const PHONE = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 700px), (pointer: coarse)').matches;
  const KEEP = PHONE ? 0.14 : 0.36;        // share of points kept: the surfaces are far denser than the glyph grid
  function Cloud() { this.d = []; }
  Cloud.prototype.add = function (x, y, z, nx, ny, nz, col, ch, sway = 0, ph = 0, fogless = 0, ao = 1) {
    if (!fogless && Math.random() > KEEP) return;
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
  function addHead(s, x, h, z, k, col, ph) {
    const sp = KINDS[k];
    for (let j = 0; j < sp.n; j++) {
      const a = (j / sp.n) * Math.PI * 2 + (k === 1 ? 0 : rand(-0.06, 0.06));
      const dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx;
      const lenJ = sp.len * rand(0.9, 1.08);
      for (let t = 0; t <= 1.001; t += 0.035) {
        const radial = sp.r0 + t * lenJ * Math.cos(sp.up), vert = t * lenJ * Math.sin(sp.up) - sp.droop * t * t;
        const slope = Math.atan2(lenJ * Math.sin(sp.up) - 2 * sp.droop * t, lenJ * Math.cos(sp.up));
        const nx = -dx * Math.sin(slope), ny = Math.cos(slope), nz = -dz * Math.sin(slope);
        const width = sp.w * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.04 + 0.04)), 0.65) * (k === 1 ? 0.7 + 0.5 * t : 1);
        for (let w = -1; w <= 1.001; w += 0.14) {
          const edge = Math.abs(w) > 0.86 || t > 0.96;
          s.add(x + dx * radial + px * w * width, h + vert, z + dz * radial + pz * w * width, nx, ny, nz,
            col, edge ? K[':'] : BIT, h, ph, 0, 1.3);
        }
      }
    }
    // Domed centre
    for (let e = 0; e <= Math.PI / 2; e += 0.25) for (let a = 0; a < Math.PI * 2; a += 0.35) {
      const rr = 0.06 * Math.cos(e);
      s.add(x + Math.cos(a) * rr, h + 0.035 * Math.sin(e) + 0.01, z + Math.sin(a) * rr, Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e),
        C.gold, e > 1.2 ? K['@'] : K.o, h, ph, 0, 1.3);
    }
  }

  function buildScene() {
    const s = new Cloud(), heads = [];
    // Ground: a jittered disc of grass glyphs that thins out toward the edge
    const R = 6.4;
    for (let i = 0; i < 12000; i++) {
      const r = R * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2;
      if (r > 4.8 && Math.random() < (r - 4.8) / 1.6) continue;
      s.add(r * Math.cos(a), 0, r * Math.sin(a), 0, 1, 0, Math.random() < 0.35 ? C.grass2 : C.ground, GRASS[(Math.random() * GRASS.length) | 0], 0, 0, 0, rand(0.42, 0.68));
    }
    // Grass blades: a few leaning segments each
    for (let i = 0; i < 2600; i++) {
      const r = 5.4 * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2, x = r * Math.cos(a), z = r * Math.sin(a);
      const h = rand(0.06, 0.28), lean = rand(-0.05, 0.05), seg = 4;
      for (let k = 1; k <= seg; k++) {
        const t = k / seg;
        s.add(x + lean * t * t, h * t, z + lean * t * t * 0.6, 0.3, 0.6, 0.3, Math.random() < 0.5 ? C.stem : C.leaf, K[k === seg ? "'" : '|'], h * t, a, 0, 0.75 * aoAt(h * t * 3));
      }
    }
    // Stars and a moon
    for (let i = 0; i < 320; i++) {
      const a = Math.random() * Math.PI * 2, e = rand(0.1, 1.35), r = 40;
      s.add(r * Math.cos(a) * Math.cos(e), r * Math.sin(e), r * Math.sin(a) * Math.cos(e), 0, -1, 0, C.star, Math.random() < 0.18 ? K['+'] : K['.'], 0, 0, 1);
    }
    {
      const dir = norm([-0.55, 0.45, -0.7]), D = 38, mr = 2.1;
      const ax = norm([dir[2], 0, -dir[0]]), ay = [dir[1] * ax[2] - dir[2] * ax[1], dir[2] * ax[0] - dir[0] * ax[2], dir[0] * ax[1] - dir[1] * ax[0]];
      for (let rr = 0; rr <= mr; rr += 0.12) for (let a = 0; a < Math.PI * 2; a += 0.12 / Math.max(rr, 0.12)) {
        const cx = Math.cos(a) * rr, cy = Math.sin(a) * rr;
        const crater = Math.hypot(cx + 0.6, cy - 0.4) < 0.45 || Math.hypot(cx - 0.7, cy + 0.6) < 0.35;
        s.add(dir[0] * D + ax[0] * cx + ay[0] * cy, dir[1] * D + ax[1] * cx + ay[1] * cy, dir[2] * D + ax[2] * cx + ay[2] * cy, 0, 1, 0,
          C.moon, rr > mr - 0.15 ? K[':'] : crater ? K.o : BIT, 0, 0, 1);
      }
    }
    // The hive, where the bee lives
    const hive = { x: -2.3, z: 1.7 };
    for (let y = 0; y <= 0.58; y += 0.022) {
      const rad = 0.34 * Math.sqrt(Math.max(0, 1 - (y / 0.62) ** 2)) + 0.03;
      for (let a = 0; a < Math.PI * 2; a += 0.05 / rad) {
        const door = Math.abs(((a + Math.PI) % (Math.PI * 2)) - Math.PI) < 0.32 && y < 0.13;
        const band = ((y / 0.075) | 0) % 2;
        s.add(hive.x + Math.cos(a) * rad, y, hive.z + Math.sin(a) * rad, Math.cos(a), 0.4, Math.sin(a),
          door ? C.dark : band ? C.amber : C.gold, door ? K['0'] : band ? K['='] : BIT, 0, 0, 0, aoAt(y + 0.3));
      }
    }
    // Flowers
    const PETALS = [C.pink, C.blue, C.violet, C.gold, C.mint, C.orange, C.blush, C.white];
    const placed = [[hive.x, hive.z]];
    let tries = 0;
    while (placed.length < 32 && tries++ < 1200) {
      const r = 4.5 * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2;
      const x = r * Math.cos(a), z = r * Math.sin(a);
      if (placed.some((p) => Math.hypot(p[0] - x, p[1] - z) < 0.66)) continue;
      placed.push([x, z]);
      const h = rand(0.65, 1.45), ph = Math.random() * 6.28, col = PETALS[placed.length % PETALS.length];
      const kind = placed.length % 3;
      // Stem: a thin tube with a gentle bend
      const bend = rand(-0.1, 0.1), bendA = Math.random() * 6.28;
      for (let t = 0; t <= 1; t += 0.018) {
        const y = t * h, ob = Math.sin(t * Math.PI) * bend;
        for (let q = 0; q < 3; q++) {
          const qa = (q / 3) * Math.PI * 2;
          s.add(x + Math.cos(bendA) * ob + Math.cos(qa) * 0.012, y, z + Math.sin(bendA) * ob + Math.sin(qa) * 0.012, Math.cos(qa), 0.2, Math.sin(qa),
            C.stem, t > 0.4 && Math.random() < 0.25 ? K[':'] : K['|'], y, ph, 0, aoAt(y));
        }
      }
      // Two curved leaves with a midrib
      for (let l = 0; l < 2; l++) {
        const ly = h * rand(0.18, 0.5), la = Math.random() * Math.PI * 2, len = rand(0.32, 0.48);
        const dx = Math.cos(la), dz = Math.sin(la);
        for (let u = 0; u <= 1; u += 0.025) for (let w = -1; w <= 1.001; w += 0.13) {
          const width = Math.pow(Math.sin(u * Math.PI), 0.8) * 0.085;
          const py = ly + u * len * 0.55 - u * u * len * 0.38;
          s.add(x + dx * u * len - dz * w * width, py, z + dz * u * len + dx * w * width, -dx * 0.5, 0.85, -dz * 0.5,
            C.leaf, Math.abs(w) < 0.1 ? K['-'] : Math.abs(w) > 0.8 || u > 0.95 ? K[':'] : BIT, py, ph, 0, aoAt(py));
        }
      }
      const hp0 = s.d.length / F;
      addHead(s, x, h, z, kind, col, ph);
      const hp1 = s.d.length / F;
      heads.push({ x, y: h + (kind === 1 ? 0.12 : 0.04), z, ph, col, type: KINDS[kind].name, p0: hp0, p1: hp1, hy: h });
    }
    // Rounded bushes between the flowers and around the edge of the plot
    const BLOOM = [C.blue, C.violet, C.pink, C.blush, C.white, -1, -1];
    for (let b = 0, tries = 0; b < 18 && tries < 800; tries++) {
      const r = 1.2 + 3.6 * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2;
      const x = r * Math.cos(a), z = r * Math.sin(a), rad = rand(0.32, 0.6), hgt = rad * rand(0.75, 1.05);
      if (placed.some((p) => Math.hypot(p[0] - x, p[1] - z) < rad + 0.3)) continue;
      placed.push([x, z]); b++;
      const bloom = BLOOM[(Math.random() * BLOOM.length) | 0], ph = Math.random() * 6.28;
      const step = 0.036 * Math.sqrt(KEEP) * 1.15;      // denser candidates: bushes keep a full, solid surface
      for (let e = 0; e <= Math.PI / 2 + 0.05; e += step / rad) {
        const ring = Math.cos(e) * rad;
        for (let q = 0; q < Math.PI * 2; q += step / Math.max(ring, 0.04)) {
          const nx = Math.cos(q) * Math.cos(e), ny = Math.sin(e), nz = Math.sin(q) * Math.cos(e);
          const lump = 1 + 0.08 * Math.sin(q * 5 + ph) * Math.sin(e * 4 + ph);      // a slightly lumpy outline
          const px = x + nx * rad * lump, py = ny * hgt * lump, pz = z + nz * rad * lump;
          const cl = bloom >= 0 && Math.sin(q * 7 + ph) * Math.sin(e * 6 + ph * 2) > 0.55 && e > 0.25;
          const hh = Math.random();
          s.add(px, py, pz, nx, ny, nz, cl ? bloom : hh < 0.3 ? C.leaf : C.stem, cl ? (hh < 0.4 ? K['@'] : K.o) : hh < 0.45 ? K['%'] : hh < 0.8 ? K['&'] : K['#'], py * 0.3, ph, 0, aoAt(py + 0.25));
        }
      }
      heads.push({ x, y: hgt * 0.6, z, ph, col: bloom >= 0 ? bloom : C.stem, type: bloom >= 0 ? 'flowering bush' : 'bush' });
    }
    // Depth: a dim ring of low shrubs and tall grass round the edge of the plot, a backdrop behind everything
    for (let b = 0; b < (PHONE ? 26 : 44); b++) {
      const a = (b / (PHONE ? 26 : 44)) * Math.PI * 2 + rand(-0.06, 0.06), r = rand(4.9, 5.7);
      const x = r * Math.cos(a), z = r * Math.sin(a), rad = rand(0.22, 0.42), hgt = rad * rand(0.8, 1.3), ph = Math.random() * 6.28;
      const step = 0.05 * Math.sqrt(KEEP);
      for (let e = 0; e <= Math.PI / 2 + 0.05; e += step / rad) {
        const ring = Math.cos(e) * rad;
        for (let q = 0; q < Math.PI * 2; q += step / Math.max(ring, 0.04)) {
          const nx = Math.cos(q) * Math.cos(e), ny = Math.sin(e), nz = Math.sin(q) * Math.cos(e), hh = Math.random();
          s.add(x + nx * rad, ny * hgt, z + nz * rad, nx, ny, nz, hh < 0.55 ? C.ground : C.grass2, hh < 0.5 ? K['%'] : K['&'], ny * hgt * 0.3, ph, 0, aoAt(ny * hgt) * 0.8);
        }
      }
      for (let k = 0; k < 5; k++) {            // a few tall blades poking out of each one
        const gx = x + rand(-rad, rad), gz = z + rand(-rad, rad), h = rand(0.35, 0.7);
        for (let t = 0.1; t <= 1; t += 0.1) s.add(gx, h * t, gz, 0.3, 0.6, 0.3, C.grass2, K[t > 0.9 ? "'" : '|'], h * t, ph + k, 0, 0.7);
      }
    }
    return { pts: new Float32Array(s.d), heads, hive: { x: hive.x, y: 0.66, z: hive.z } };
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
      this.canvas = canvas;
      this.glr = this.initGL();
      if (!this.glr) this.ctx = canvas.getContext('2d');
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const sc = buildScene();
      this.pts = sc.pts; this.heads = sc.heads; this.hive = sc.hive;
      this.nStatic = this.pts.length / F;
      // Garden reacting to the butterfly: per-point head link (for blooming), per-head bloom,
      // a coarse "discovered" light map, and the story stage (0 → 1)
      this.headOf = new Int16Array(this.nStatic).fill(-1);
      this.heads.forEach((h, k) => { if (h.p1) for (let n = h.p0; n < h.p1; n++) this.headOf[n] = k; });
      this.bloom = new Float32Array(this.heads.length);
      this.lit = new Float32Array(64 * 64);           // 0.18-unit cells over the plot, remembered
      this.stage = 0;
      // Atmosphere: wind gusts that sweep across the plot, rain on cue, events for sound
      this.gust = { front: -99, dir: 1, str: 0, next: 4 };
      this.rain = false; this.drops = [];
      this.onBloom = null; this.wasOpen = new Uint8Array(this.heads.length);
      this.bits = Uint8Array.from({ length: this.nStatic + 12000 }, () => (Math.random() < 0.5 ? 1 : 0));
      this.wing = wingTemplate();

      // Camera (orbit)
      this.yaw = 0.6; this.pitch = 0.46; this.dist = 6; this.tgt = [0, 0.7, 0];
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
      this.bee = { p: [this.hive.x, this.hive.y, this.hive.z], v: [0, 0, 0], target: 0, t: 0, yaw: 0, visits: 0, home: false };
      // Fireflies blinking low over the grass
      this.flies = Array.from({ length: 28 }, () => ({ p: [rand(-4, 4), rand(0.15, 0.7), rand(-4, 4)], ph: Math.random() * 6.28, sp: rand(0.6, 1.4) }));
      // Pollen motes drifting up from the flowers
      this.motes = Array.from({ length: 70 }, () => this.newMote(true));

      this.resize();
      addEventListener('resize', () => this.resize());
      if (document.fonts) document.fonts.ready.then(() => this.resize());   // re-render glyphs once the mono font is in
      this.bindInput();
      this.last = performance.now();
      this.minGap = 1000 / 61; this.avg = 8; this.quality = 0;
      const loop = (now) => {
        requestAnimationFrame(loop);
        if (now - this.last < this.minGap) return;
        const t0 = performance.now();
        this.frame(Math.min(0.05, (now - this.last) / 1000), now / 1000);
        this.last = now;
        this.avg = this.avg * 0.95 + (performance.now() - t0) * 0.05;
        if (this.avg > 13 && this.minGap < 30) { this.minGap = 1000 / 31; this.avg = 8; }
        else if (this.avg > 22 && this.quality < 3) { this.quality++; this.avg = 8; this.resize(); }
      };
      requestAnimationFrame(loop);
    }

    newMote(any) {
      const h = this.heads[(Math.random() * this.heads.length) | 0];
      return { x: h.x + rand(-0.1, 0.1), y: h.y + (any ? rand(0, 1.5) : 0), z: h.z + rand(-0.1, 0.1), vy: rand(0.08, 0.22), life: rand(4, 9), age: any ? rand(0, 4) : 0, dx: rand(-0.05, 0.05), dz: rand(-0.05, 0.05) };
    }

    resize() {
      const r = this.canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
      this.W = r.width; this.H = r.height; this.dpr = this.glr ? d : 1;
      this.fs = (r.width < 600 ? 8 : 8) + (this.quality || 0);
      this.cw = this.fs * 0.6; this.chH = this.fs * 1.05;
      if (this.glr) {
        this.canvas.width = Math.round(r.width * d); this.canvas.height = Math.round(r.height * d);
        this.glAtlas();
        const n = this.COLS * this.ROWS;
        this.zb = new Float32Array(n); this.gl = new Int8Array(n); this.co = new Int16Array(n);
        return;
      }
      this.canvas.width = r.width * d; this.canvas.height = r.height * d;
      this.ctx.setTransform(d, 0, 0, d, 0, 0);
      this.COLS = Math.ceil(r.width / this.cw); this.ROWS = Math.ceil(r.height / this.chH);
      const n = this.COLS * this.ROWS;
      this.zb = new Float32Array(n); this.gl = new Int8Array(n); this.co = new Int16Array(n);
      this.buildAtlas(d);
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
        this.yaw -= (e.clientX - drag.x) * 0.006;
        this.pitch = clamp(this.pitch + (e.clientY - drag.y) * 0.004, 0.05, 1.2);
        drag = { x: e.clientX, y: e.clientY }; this.idle = 0;
      });
      const end = () => { drag = null; };
      c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
      c.addEventListener('wheel', (e) => { e.preventDefault(); this.dist = clamp(this.dist * Math.exp(e.deltaY * 0.001), 2.2, 12); this.idle = 0; }, { passive: false });
      this.dragging = () => !!drag;
    }

    // What is under the pointer? Projects the actors and plants with the last frame's camera
    // and returns the nearest one within a few dozen pixels: { kind, name, colour, x, y }
    pick(px, py) {
      const V = this.view; if (!V) return null;
      const scr = (p) => {
        const dx = p[0] - V.cam[0], dy = p[1] - V.cam[1], dz = p[2] - V.cam[2];
        const zc = dx * V.f[0] + dy * V.f[1] + dz * V.f[2];
        if (zc < 0.2) return null;
        return [this.W / 2 + ((dx * V.r[0] + dy * V.r[1] + dz * V.r[2]) / zc) * V.FOC, this.H / 2 - ((dx * V.u[0] + dy * V.u[1] + dz * V.u[2]) / zc) * V.FOC, zc];
      };
      const cand = [];
      this.flyers.forEach((b, i) => cand.push({ kind: i === 0 ? 'me' : 'butterfly', p: b.p, w: 1.6, perched: b.perched }));
      cand.push({ kind: 'bee', p: this.bee.p, w: 1.5 });
      cand.push({ kind: 'hive', p: [this.hive.x, 0.35, this.hive.z], w: 1.1 });
      this.heads.forEach((h) => cand.push({ kind: h.type, p: [h.x, h.y, h.z], w: 1, col: PAL[h.col * 4 + 3] }));
      let best = null;
      for (const c of cand) {
        const s = scr(c.p); if (!s) continue;
        const d = Math.hypot(s[0] - px, s[1] - py) / c.w, lim = Math.max(18, 90 / s[2]);
        if (d < lim && (!best || d + s[2] * 2 < best.score)) best = { ...c, x: s[0], y: s[1], score: d + s[2] * 2 };
      }
      return best;
    }
    // Screen position (CSS px) of a world point with the last frame's camera, or null if behind
    toScreen(p) {
      const V = this.view; if (!V) return null;
      const dx = p[0] - V.cam[0], dy = p[1] - V.cam[1], dz = p[2] - V.cam[2];
      const zc = dx * V.f[0] + dy * V.f[1] + dz * V.f[2];
      if (zc < 0.2) return null;
      return [this.W / 2 + ((dx * V.r[0] + dy * V.r[1] + dz * V.r[2]) / zc) * V.FOC, this.H / 2 - ((dx * V.u[0] + dy * V.u[1] + dz * V.u[2]) / zc) * V.FOC, zc];
    }
    // N flowers spread around the plot (by angle), for pinning labels to
    spreadFlowers(n) {
      const fl = this.heads.map((h, i) => ({ h, i, a: Math.atan2(h.z, h.x), r: Math.hypot(h.x, h.z) }))
        .filter((o) => o.h.type && !o.h.type.includes('bush') && o.r > 0.8 && o.r < 3.6);
      fl.sort((a, b) => a.a - b.a);
      const out = [];
      for (let k = 0; k < n && fl.length; k++) out.push(fl[Math.floor((k + 0.5) * fl.length / n)].h);
      return out;
    }
    capture() {
      this.frame(0.001, performance.now() / 1000);
      return this.canvas.toDataURL('image/png');
    }
    toggleFollow() { this.follow = !this.follow; this.shot = null; this.idle = 0; return this.follow; }
    // Guided tour: each shot is a subject + distance; the camera glides between them
    setShot(name) { this.shot = name; this.follow = false; this.idle = 0; }
    shotTarget() {
      const far = this.heads.reduce((a, h) => (Math.hypot(h.x, h.z) > Math.hypot(a.x, a.z) ? h : a), this.heads[0]);
      switch (this.shot) {
        case 'butterfly': return [this.flyers[0].p, 2.3];
        case 'bee': return [this.bee.p, 2.1];
        case 'hive': return [[this.hive.x, 0.5, this.hive.z], 2.8];
        case 'far': return [[far.x, far.y, far.z], 3];
        case 'wide': return [[0, 0.7, 0], 7.5];
        default: return null;
      }
    }

    // ── Natural flight: wander + steer + glides + perching (same rules as the 2D page) ──
    stepFlyer(b, dt, t) {
      if (b.held) { b.flap = 1.25 + 0.22 * Math.sin(t * 1.4 + b.phase); return; }   // someone is reading its card: hover in place
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
      if (e.held) return;                         // held still while its card is read
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

      // Camera: idle auto-orbit; follow mode eases toward the white butterfly
      this.idle += dt;
      if (!this.dragging() && this.idle > 2.5 && !this.reduced) this.yaw += dt * (this.slowSpin ? 0.025 : 0.09);
      const st = this.shot ? this.shotTarget() : null;
      const want = st ? st[0] : this.follow ? this.flyers[0].p : [0, 0.7, 0];
      for (let k = 0; k < 3; k++) this.tgt[k] += (want[k] - this.tgt[k]) * Math.min(1, dt * (st ? 1.6 : 2.5));
      if (st) this.dist += (st[1] - this.dist) * Math.min(1, dt * 1.4);      // smooth dolly in / out
      const dist = this.follow ? Math.min(this.dist, this.W < 700 ? 1.7 : 2.6) : this.dist;   // closer on a narrow screen, so the butterfly is not a speck
      const cp = Math.cos(this.pitch);
      const cam = [this.tgt[0] + dist * Math.sin(this.yaw) * cp, this.tgt[1] + dist * Math.sin(this.pitch), this.tgt[2] + dist * Math.cos(this.yaw) * cp];
      const f = norm([this.tgt[0] - cam[0], this.tgt[1] - cam[1], this.tgt[2] - cam[2]]);
      const r = norm([-f[2], 0, f[0]]);                       // right = forward × up
      const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
      this.view = { cam, f, r, u, FOC: Math.min(this.H, this.W * 1.2) * 1.05 };      // kept for pick()
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
        const fog = fogless ? 0.55 : clamp(1.3 - zc / 13, 0.15, 1);
        gl[i] = ch === BIT ? (bits[bitIdx % bits.length] ? K['1'] : K['0']) : ch;
        co[i] = col * 4 + Math.min(3, Math.max(0, (lum * fog * 4.2 - 0.4) | 0));
      };

      // ── The garden reacts to the white butterfly ──
      const me = this.flyers[0].p, mx = me[0], my = me[1], mz = me[2];
      for (let k = 0; k < this.heads.length; k++) {
        const h = this.heads[k], d = Math.hypot(h.x - mx, h.y - my, h.z - mz);
        const want = d < 1.1 ? 1 - d / 1.1 : 0;                          // flowers open as it approaches
        this.bloom[k] += (Math.max(want, this.bloom[k] * 0.999) - this.bloom[k]) * Math.min(1, dt * (want > this.bloom[k] ? 3 : 0.25));
        const open = this.bloom[k] > 0.55 ? 1 : this.bloom[k] < 0.25 ? 0 : this.wasOpen[k];
        if (open && !this.wasOpen[k] && this.onBloom) this.onBloom(h);
        this.wasOpen[k] = open;
      }
      // Wind: every so often a gust front crosses the garden
      const G = this.gust;
      G.next -= dt;
      if (G.next <= 0 && !this.reduced) { G.dir = Math.random() < 0.5 ? -1 : 1; G.front = -7 * G.dir; G.str = 0.7 + Math.random() * 0.6; G.next = 9 + Math.random() * 8; if (this.onGust) this.onGust(G.str); }
      if (Math.abs(G.front) < 8) G.front += G.dir * dt * 3.2;
      const gustAt = (x) => { const d = (x - G.front) * G.dir; return d > -1.4 && d < 0.6 ? G.str * Math.exp(-(d * d) / 0.35) : 0; };
      this.gustAt = gustAt;
      for (const b of this.flyers) { const w = gustAt(b.p[0]); if (w > 0.05 && !b.perched) { b.v[0] += G.dir * w * dt * 2.4; b.v[1] += w * dt * 0.8; } }
      {
        const ci = Math.floor((mx + 5.8) / 0.18), cj = Math.floor((mz + 5.8) / 0.18);   // light where it has been
        for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
          const ii = ci + a, jj = cj + b; if (ii < 0 || jj < 0 || ii > 63 || jj > 63) continue;
          const q = jj * 64 + ii, v = Math.max(0, 1 - Math.hypot(a, b) / 2.6);
          if (v > this.lit[q]) this.lit[q] += (v - this.lit[q]) * Math.min(1, dt * 1.5);
        }
      }
      const stageLum = 0.82 + 0.3 * this.stage, LIT = this.lit, HO = this.headOf, BL = this.bloom, HD = this.heads;
      const litAt = (x, z) => { const ii = Math.floor((x + 5.8) / 0.18), jj = Math.floor((z + 5.8) / 0.18); return ii < 0 || jj < 0 || ii > 63 || jj > 63 ? 0 : LIT[jj * 64 + ii]; };

      // Static scene with sway
      const P = this.pts;
      for (let n = 0, o = 0; n < this.nStatic; n++, o += F) {
        const sway = P[o + 8];
        let x = P[o], y = P[o + 1], z = P[o + 2], sw = sway ? Math.sin(t * 1.3 + P[o + 9]) * 0.04 * sway : 0;
        if (sway && G.str) { const w = gustAt(x); if (w > 0.01) sw += G.dir * w * 0.22 * sway * (1 + 0.3 * Math.sin(t * 9 + P[o + 9])); }   // the gust bends everything it passes
        if (sway) {
          // Plants bend away from the butterfly as it flies past
          const ddx = x - mx, ddz = z - mz, d2 = ddx * ddx + ddz * ddz;
          if (d2 < 0.5) { const push = (1 - d2 / 0.5) * 0.09 * sway / (Math.sqrt(d2) + 0.05); x += ddx * push; z += ddz * push; }
        }
        const hk = HO[n];
        if (hk >= 0 && BL[hk] > 0.01) {
          // Blooming: the head's petals open outward and lift a little
          const h = HD[hk], b = BL[hk] * 0.35;
          x = h.x + (x - h.x) * (1 + b); z = h.z + (z - h.z) * (1 + b); y += (y - h.hy) * b * 0.6 + b * 0.04;
        }
        const glow = (fogless) => (fogless ? 1 - 0.75 * this.stage : stageLum * (1 + 0.55 * litAt(x, z) + (hk >= 0 ? BL[hk] * 0.6 : 0)));
        put(x + sw, y, z + sw * 0.6, P[o + 3], P[o + 4], P[o + 5], P[o + 6], P[o + 7], P[o + 10], n, P[o + 11] * glow(P[o + 10]));
      }
      // The sun rises opposite the moon over the last part of the story
      if (this.stage > 0.45) {
        const k = Math.min(1, (this.stage - 0.45) / 0.55), el = -0.12 + 0.34 * k, az = 0.55 + Math.PI;
        const D = 38, dir = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
        const ax2 = norm([dir[2], 0, -dir[0]]), ay2 = [dir[1] * ax2[2] - dir[2] * ax2[1], dir[2] * ax2[0] - dir[0] * ax2[2], dir[0] * ax2[1] - dir[1] * ax2[0]];
        const R = 2.4;
        for (let rr = 0; rr <= R + 1.6; rr += 0.16) for (let a = 0; a < Math.PI * 2; a += 0.16 / Math.max(rr, 0.16)) {
          const ray = rr > R, ang = Math.round((a / (Math.PI * 2)) * 12);
          if (ray && (Math.abs(a - (ang / 12) * Math.PI * 2) > 0.05 || rr > R + 0.6 + 0.8 * Math.abs(Math.sin(t + ang)))) continue;
          const cx = Math.cos(a) * rr, cy = Math.sin(a) * rr;
          put(dir[0] * D + ax2[0] * cx + ay2[0] * cy, dir[1] * D + ax2[1] * cx + ay2[1] * cy, dir[2] * D + ax2[2] * cx + ay2[2] * cy, 0, 1, 0,
            ray ? C.gold : rr > R - 0.3 ? C.orange : C.gold, ray ? K['.'] : rr > R - 0.3 ? K[':'] : BIT, 1, 0, 0.5 + 0.7 * k);
        }
      }
      // Rain: short-lived drops falling through the plot
      if (this.rain && !this.reduced) for (let i = 0; i < 26; i++) this.drops.push([this.tgt[0] + (Math.random() - 0.5) * 9, 3 + Math.random() * 2, this.tgt[2] + (Math.random() - 0.5) * 9]);
      for (let i = this.drops.length - 1; i >= 0; i--) {
        const d = this.drops[i]; d[1] -= dt * 6.5; d[0] += (G.dir * gustAt(d[0]) * 0.8) * dt;
        if (d[1] < 0) { this.drops.splice(i, 1); continue; }
        put(d[0], d[1], d[2], 0, 1, 0, C.glass, d[1] < 0.15 ? K[','] : K["'"], 0, 0, 0.75);
      }
      if (this.drops.length > 1400) this.drops.splice(0, this.drops.length - 1400);
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

      // Draw on the GPU: only a small grid of glyph + colour per cell goes up each frame
      if (this.glr) {
        const R = this.glr, g = R.g, D = R.data, n = COLS * ROWS;
        for (let i = 0, o = 0; i < n; i++, o += 4) {
          if (zb[i] <= 0) { D[o] = 255; continue; }
          D[o] = gl[i]; D[o + 1] = co[i] & 255; D[o + 2] = co[i] >> 8;
        }
        g.activeTexture(g.TEXTURE0);
        g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, COLS, ROWS, 0, g.RGBA, g.UNSIGNED_BYTE, D);
        g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT);
        g.drawArrays(g.TRIANGLES, 0, 6);
        return;
      }
      // CPU fallback: write each cell's pre-rendered glyph pixels straight into one frame buffer
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
