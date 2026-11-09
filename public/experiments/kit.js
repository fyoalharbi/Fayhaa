// ─────────────────────────────────────────────
//  EXPERIMENTS KIT — shared pieces of the Papillon language for the
//  /experiments/ prototypes (does not touch the live site or Papillon):
//    KIT.decode(el, text)          0/1 noise resolving into letters
//    KIT.flowerCells(o)            an ASCII flower head as [dx, dy, ch, tone] cells
//    KIT.flowerHTML(o)             the same flower as coloured <pre> markup
//    new KIT.Garden2D(canvas, o)   a living side-view ASCII garden (+ butterfly)
//    KIT.asciiImage(canvas, src)   a picture re-drawn as coloured 0/1 glyphs
// ─────────────────────────────────────────────
(function () {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const seeded = (s) => { let x = [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7) || 1; return () => ((x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function decode(el, text, o = {}) {
    cancelAnimationFrame(el._raf || 0);
    const chars = [...text], n = chars.length, at = chars.map((_, i) => (i / n) * 0.7 + Math.random() * 0.12);
    const t0 = performance.now() + (o.delay || 0), dur = REDUCED ? 0 : o.dur || Math.min(1100, 380 + n * 10);
    const frame = (now) => {
      const k = now < t0 ? 0 : dur ? (now - t0) / dur : 2; let out = '', done = true;
      for (let i = 0; i < n; i++) {
        if (chars[i] === ' ' || chars[i] === '\n' || k >= at[i] + 0.18) out += chars[i];
        else { out += Math.random() < 0.5 ? '0' : '1'; done = false; }
      }
      el.textContent = out;
      if (!done) el._raf = requestAnimationFrame(frame); else if (o.done) o.done();
    };
    el._raf = requestAnimationFrame(frame);
  }
  // Decode every [data-decode] element the first time it scrolls into view
  function decodeOnView(root = document) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      decode(e.target, e.target.dataset.text || e.target.textContent, { delay: +(e.target.dataset.delay || 0) });
    }), { threshold: 0.4 });
    root.querySelectorAll('[data-decode]').forEach((el) => { el.dataset.text = el.textContent; el.style.minHeight = el.offsetHeight + 'px'; io.observe(el); });
  }

  // ── An ASCII flower head: petals of live bits, a seeded centre, a rim of dots ──
  // tones: 'c' centre, 'p' petal, 'r' rim, 'd' dark seed
  function flowerCells({ R = 5, petals = 6, rot = 0, open = 1, seed = 1, squash = 0.5 } = {}) {
    const rnd = seeded(seed), out = [];
    const Rv = Math.max(1, Math.round(R * squash));
    for (let dy = -Rv; dy <= Rv; dy++) for (let dx = -R; dx <= R; dx++) {
      const nx = dx / R, ny = dy / (R * squash), r = Math.hypot(nx, ny), a = Math.atan2(ny, nx);
      const edge = (0.55 + 0.45 * Math.abs(Math.cos((petals * a) / 2 + rot))) * (0.35 + 0.65 * open);
      if (r < 0.26 * (0.6 + 0.4 * open)) out.push([dx, dy, rnd() < 0.3 ? '8' : '@', 'c']);
      else if (r < 0.36 && open > 0.3) out.push([dx, dy, rnd() < 0.5 ? 'o' : '.', 'd']);
      else if (r < edge - 0.14) out.push([dx, dy, rnd() < 0.5 ? '0' : '1', 'p']);
      else if (r < edge) out.push([dx, dy, rnd() < 0.5 ? "'" : '.', 'r']);
    }
    return out;
  }
  function flowerHTML(o = {}) {
    const cells = flowerCells(o), R = o.R || 5, Rv = Math.max(1, Math.round(R * (o.squash || 0.5)));
    const W = R * 2 + 1, H = Rv * 2 + 1 + (o.stem || 0);
    const g = Array.from({ length: H }, () => Array(W).fill(null));
    for (const [dx, dy, ch, tn] of cells) g[dy + Rv][dx + R] = [ch, tn];
    for (let y = Rv * 2 + 1; y < H; y++) {
      const k = y - Rv * 2 - 1;
      g[y][R] = ['|', 's'];
      if (k === 1 && R > 2) g[y][R + 1] = ['\\', 'l'], g[y][R + 2] = ['_', 'l'];
      if (k === 3 && R > 2) g[y][R - 1] = ['/', 'l'], g[y][R - 2] = ['_', 'l'];
    }
    return g.map((row) => {
      let s = '', cur = null, run = '';
      const flush = () => { if (run) s += cur ? `<i class="t-${cur}">${esc(run)}</i>` : run; run = ''; };
      for (const c of row) { const tn = c ? c[1] : null; if (tn !== cur) { flush(); cur = tn; } run += c ? c[0] : ' '; }
      flush();
      return s;
    }).join('\n');
  }

  // ── Living side-view garden on a canvas character grid ──
  const PAL = {
    g0: '#1f3524', g1: '#2f5a3a', g2: '#3f6b3f', stem: '#5f8f5f', leaf: '#4f8a4f', star: '#55555f', star2: '#8a8a9a',
    red: '#ff8a8a', red2: '#b35a5a', gold: '#e6c34a', gold2: '#8a7428', white: '#f4f4f4', white2: '#9a9a9a',
    violet: '#c49aff', violet2: '#6f5a99', blush: '#ffc0d0', blush2: '#a07080', orange: '#ffb070', orange2: '#a06a3a',
    pollen: '#e6d27a', fly: '#d4ff7a', moon: '#e8e4d0', dim: '#3a3a44',
  };
  class Garden2D {
    constructor(canvas, o = {}) {
      this.c = canvas; this.x = canvas.getContext('2d');
      this.o = Object.assign({ font: 12, plants: 18, groundRows: 4, stars: 0.006, butterfly: false, moon: true, seed: 'garden', wind: 1, density: 1 }, o);
      this.plants = Array.isArray(this.o.plants) ? this.o.plants : null;
      this.t = 0; this.ptr = null; this.wind = 0; this.focus = -1; this.onFrame = null; this.paused = false;
      this.bits = Uint8Array.from({ length: 4096 }, () => (Math.random() < 0.5 ? 1 : 0));
      this.motes = [];
      this.resize();
      addEventListener('resize', () => this.resize());
      if (document.fonts) document.fonts.ready.then(() => this.resize());
      const host = canvas.parentElement;
      host.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); this.ptr = [e.clientX - r.left, e.clientY - r.top]; });
      host.addEventListener('pointerleave', () => { this.ptr = null; });
      if (this.o.butterfly && window.AsciiFlyer) this.makeFlyer(host);
      let last = performance.now();
      const loop = (now) => {
        requestAnimationFrame(loop);
        if (now - last < 30 || this.paused) return;        // ~30 fps is plenty for swaying glyphs
        const dt = Math.min(0.06, (now - last) / 1000); last = now;
        this.frame(dt);
      };
      requestAnimationFrame(loop);
    }
    resize() {
      const r = this.c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
      this.W = r.width; this.H = r.height;
      this.c.width = Math.max(1, r.width * d); this.c.height = Math.max(1, r.height * d);
      this.x.setTransform(d, 0, 0, d, 0, 0);
      this.fs = this.o.font; this.cw = this.fs * 0.6; this.ch = this.fs * 1.1;
      this.COLS = Math.ceil(r.width / this.cw); this.ROWS = Math.ceil(r.height / this.ch);
      this.x.font = `${this.fs}px 'JetBrains Mono', monospace`; this.x.textBaseline = 'top';
      const rnd = seeded(this.o.seed);
      this.starList = Array.from({ length: Math.round(this.COLS * this.ROWS * this.o.stars) }, () => [(rnd() * this.COLS) | 0, (rnd() * (this.ROWS - this.o.groundRows - 6)) | 0, rnd() * 6.28, rnd() < 0.15 ? '+' : rnd() < 0.5 ? '.' : '`']);
      const nb = Math.round((this.o.bushes ?? 6) * (this.W < 700 ? 0.5 : 1)), tn = ['red', 'gold', 'blush', 'violet'];
      this.bushes = Array.from({ length: nb }, (_, i) => ({ cx: Math.round(((i + 0.2 + rnd() * 0.6) / nb) * this.COLS), w: 4 + ((rnd() * 7) | 0), h: 2 + ((rnd() * 3) | 0), tone: tn[(rnd() * 4) | 0] }));
      if (!this.plants || this.o.autoPlants) {
        const n = typeof this.o.plants === 'number' ? Math.round(this.o.plants * (this.W < 700 ? 0.55 : 1)) : 0;
        const tones = ['red', 'gold', 'white', 'violet', 'blush', 'orange'];
        this.plants = Array.from({ length: n }, (_, i) => ({ x: (i + 0.2 + rnd() * 0.6) / n, h: 0.16 + rnd() * 0.34, R: 3 + ((rnd() * 5) | 0), petals: 5 + ((rnd() * 4) | 0), tone: tones[(rnd() * tones.length) | 0], open: 0.75 + rnd() * 0.25, ph: rnd() * 6.28 }));
        this.o.autoPlants = true;
      }
      // depth: a back row of smaller, dimmer flowers standing a row behind the front ones
      const nd = Math.round((this.o.depth || 0) * (this.W < 700 ? 0.55 : 1)), btn = ['red', 'gold', 'white', 'violet', 'blush', 'orange'];
      this.back = Array.from({ length: nd }, (_, i) => ({ x: (i + 0.1 + rnd() * 0.8) / nd, h: 0.1 + rnd() * 0.22, R: 2 + ((rnd() * 3) | 0), petals: 5 + ((rnd() * 3) | 0), tone: btn[(rnd() * btn.length) | 0], ph: rnd() * 6.28 }));
      this.fly && this.fly.p[0] === 0 && (this.fly.p = [this.W * 0.3, this.H * 0.4]);
    }
    head(i) {           // px position of a plant's head (with sway)
      const p = this.plants[i]; if (!p) return null;
      const gy = this.ROWS - this.o.groundRows, top = gy - Math.max(3, Math.round(p.h * this.ROWS));
      const sway = this.swayAt(p, 1);
      return [(Math.round(p.x * this.COLS) + sway) * this.cw + this.cw / 2, top * this.ch + this.ch / 2];
    }
    swayAt(p, k) {
      const near = this.ptr ? Math.max(0, 1 - Math.abs(this.ptr[0] - p.x * this.W) / 120) * Math.sign(p.x * this.W - this.ptr[0]) * 2 : 0;
      return Math.round((Math.sin(this.t * 0.9 + p.ph) * 0.9 + this.wind * 2 + near) * Math.pow(k, 1.4));
    }
    makeFlyer(host) {
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;will-change:transform;z-index:2';
      el.appendChild(document.createElement('canvas'));
      host.appendChild(el);
      const bf = new window.AsciiFlyer(el.firstChild, { cols: 23, rows: 17, cell: this.o.flyCell || 4.4, font: 1.3, side: true });
      bf.sampleBackground = () => {}; bf.ink = '#f4f4f4'; bf.accent = '#ff8a8a';
      this.fly = { el, bf, p: [this.W * 0.3, this.H * 0.4], v: [30, 0], target: 0, stay: 0, perched: false, facing: 1, wob: Math.random() * 6 };
    }
    stepFly(dt) {
      const F = this.fly; if (!F) return;
      const want = this.focus >= 0 ? this.focus : F.target;
      const h = this.head(want) || [this.W / 2, this.H / 2];
      const seat = F.bf.seat(F.perched);
      const goal = [h[0], h[1] - (F.perched ? 0 : 6)];
      const dx = goal[0] - F.p[0], dy = goal[1] - F.p[1], d = Math.hypot(dx, dy);
      if (F.perched) {
        F.p[0] = goal[0]; F.p[1] = goal[1];
        F.stay -= dt;
        if ((F.stay <= 0 && this.focus < 0) || (this.focus >= 0 && this.focus !== F.on)) { F.perched = false; F.v = [rand(-40, 40), -80]; if (this.focus < 0) F.target = (Math.random() * this.plants.length) | 0; }
      } else {
        F.wob += dt * 2.3;
        const sp = clamp(d * 1.6, 40, 260);
        const ax = (dx / (d || 1)) * sp + Math.cos(F.wob) * 40, ay = (dy / (d || 1)) * sp + Math.sin(F.wob * 1.7) * 50;
        F.v[0] += (ax - F.v[0]) * Math.min(1, dt * 2.2); F.v[1] += (ay - F.v[1]) * Math.min(1, dt * 2.2);
        F.p[0] += F.v[0] * dt; F.p[1] += F.v[1] * dt;
        if (Math.abs(F.v[0]) > 8) F.facing = F.v[0] > 0 ? 1 : -1;
        if (d < 14) { F.perched = true; F.on = want; F.stay = rand(2.5, 5); this.plants[want].open = 1; }
      }
      const r = F.bf.frame(dt, { perched: F.perched, facing: F.facing, glide: !F.perched && F.v[1] > 30 });
      const s2 = F.bf.seat(F.perched);
      F.el.style.transform = `translate(${(F.p[0] - s2.x).toFixed(1)}px, ${(F.p[1] - s2.y).toFixed(1)}px)`;
      return r;
    }
    frame(dt) {
      if (REDUCED) dt *= 0.3;
      this.t += dt;
      const { x, COLS, ROWS, cw, ch } = this, gr = this.o.groundRows, gy = ROWS - gr;
      for (let i = 0; i < 40; i++) this.bits[(Math.random() * 4096) | 0] ^= 1;
      this.wind = Math.sin(this.t * 0.23) * 0.4 * this.o.wind + Math.max(0, Math.sin(this.t * 0.11)) ** 6 * this.o.wind;
      // One glyph per cell (last write wins), grouped by colour when drawn
      const N = COLS * ROWS;
      if (!this.gch || this.gch.length !== N) { this.gch = new Array(N); this.gto = new Array(N); }
      const gch = this.gch, gto = this.gto; gch.fill(null);
      const put = (cx, cy, s, tone) => { cx |= 0; cy |= 0; if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return; const i = cy * COLS + cx; gch[i] = s; gto[i] = tone; };
      const bitAt = (n) => this.bits[n & 4095];
      x.clearRect(0, 0, this.W, this.H);
      // sky: stars and a 0/1 moon with a dim unlit side
      for (const [sx, sy, ph, s] of this.starList) { const tw = Math.sin(this.t * 1.3 + ph); if (tw > -0.4) put(sx, sy, s, tw > 0.7 ? 'star2' : 'star'); }
      if (this.o.moon && this.W > 700) {
        const mx = Math.round(COLS * 0.82), my = 5, R = 3.6;
        for (let dy = -4; dy <= 4; dy++) for (let dx = -9; dx <= 9; dx++) {
          const r = Math.hypot(dx / 2, dy);
          if (r >= R) continue;
          const lit = Math.hypot(dx / 2 - 1.5, dy + 0.5) > R * 0.82;
          put(mx + dx, my + dy, lit ? (r > R - 0.9 ? (dx < 0 ? '(' : '@') : bitAt(dx * 13 + dy * 7 + 77) ? '0' : '@') : r > R - 0.9 ? '.' : ' ', lit ? 'moon' : 'star');
        }
      }
      // the back row first, so everything in front overlaps it: dim stems, heads in their darker shade
      this.back.forEach((p, i) => {
        const px = Math.round(p.x * COLS), base = gy - 1, top = base - Math.max(2, Math.round(p.h * ROWS)), sw = Math.round(Math.sin(this.t * 0.6 + p.ph) * 0.6 + this.wind);
        for (let cy = base - 1; cy > top; cy--) put(px + ((cy - top) < 2 ? sw : 0), cy, '|', 'g1');
        for (const [dx, dy, s, tn] of flowerCells({ R: p.R, petals: p.petals, rot: this.t * 0.08 + p.ph, open: 0.85, seed: i + 200 })) {
          put(px + sw + dx, top + dy, tn === 'p' ? (bitAt(i * 53 + dx * 7 + dy) ? '1' : '0') : s, tn === 'c' || tn === 'd' ? 'gold2' : tn === 'r' ? 'g2' : p.tone + '2');
        }
      });
      // back grass: blades of varying height that lean with the wind and part around the pointer
      const near = (cx) => this.ptr && Math.abs(this.ptr[0] - cx * cw) < 70 && this.ptr[1] > (gy - 8) * ch ? Math.sign(cx * cw - this.ptr[0]) : 0;
      for (let cx = 0; cx < COLS; cx++) {
        const hgt = 1 + Math.max(0, Math.round(1.6 + Math.sin(cx * 0.21) * 1.4 + Math.sin(cx * 0.067 + 2) * 1.6 + ((cx * 7919) % 3) - 1)) * this.o.density;
        const sw = Math.sin(this.t * 1.4 + cx * 0.35) * 0.8 + this.wind, pn = near(cx);
        for (let k = 0; k < hgt; k++) {
          const top = k === hgt - 1, lean = pn ? (pn > 0 ? '/' : '\\') : sw > 0.75 ? '/' : sw < -0.75 ? '\\' : null;
          put(cx, gy - 1 - k, top ? (lean || ((cx * 7) % 5 ? (cx % 3 ? ',' : "'") : '|')) : (k === 0 ? (cx % 3 ? '|' : ';') : (lean || '|')), (cx + k) % 5 === 0 ? 'leaf' : k === 0 ? 'g1' : 'g2');
        }
        for (let k = 0; k < gr; k++) if ((cx * 13 + k * 7) % 4) put(cx, gy + k, (cx + k) % 3 ? '.' : ',', k < 1 ? 'g1' : 'g0');
      }
      // bushes: leafy mounds with a few blossoms
      for (const bu of this.bushes) {
        for (let dy = 0; dy < bu.h; dy++) {
          const half = Math.round(bu.w * Math.sqrt(1 - Math.pow(dy / bu.h, 2)));
          const sway = dy > bu.h * 0.6 ? Math.round(this.wind * 0.8 + Math.sin(this.t + bu.cx) * 0.4) : 0;
          for (let dx = -half; dx <= half; dx++) {
            const n = (bu.cx + dx) * 31 + dy * 17;
            const edge = Math.abs(dx) >= half - 1 || dy === bu.h - 1;
            const bloom = !edge && (n * 2654435761 >>> 0) % 23 === 0;
            put(bu.cx + dx + sway, gy - 1 - dy, bloom ? (bitAt(n) ? 'o' : '*') : edge ? (dx < 0 ? '(' : dx > 0 ? ')' : '^') : '&%#8@'[(n >>> 2) % 5], bloom ? bu.tone : (dy + dx) % 3 ? 'leaf' : 'g2');
          }
        }
      }
      // plants (stems first, heads on top)
      const heads = [];
      this.plants.forEach((p, i) => {
        const px = Math.round(p.x * COLS), top = gy - Math.max(3, Math.round(p.h * ROWS));
        const len = gy - top;
        let prev = px;
        for (let cy = gy - 1; cy > top; cy--) {
          const k = (gy - cy) / len, off = px + this.swayAt(p, k);
          put(off, cy, off > prev ? '/' : off < prev ? '\\' : '|', 'stem');
          if ((cy + i) % 4 === 0 && k > 0.15 && k < 0.85) { const sd = (cy + i) % 8 ? 1 : -1; put(off + sd, cy, sd > 0 ? '\\' : '/', 'leaf'); put(off + sd * 2, cy, '_', 'leaf'); }
          prev = off;
        }
        const foc = this.focus === i, op = p.open = p.open + ((foc ? 1 : p.base ?? p.open) - p.open) * Math.min(1, dt * 2);
        heads.push([px + this.swayAt(p, 1), top, p, op, foc, i]);
      });
      for (const [hx, hy, p, op, foc, i] of heads) {
        const R = Math.round(p.R * (foc ? 1.3 : 1));
        for (const [dx, dy, s, tn] of flowerCells({ R, petals: p.petals, rot: this.t * 0.15 + p.ph, open: op, seed: i + 1 })) {
          const bit = bitAt((dx + 20) * 31 + (dy + 9) * 7 + i * 101);
          const tone = tn === 'c' ? 'gold' : tn === 'd' ? 'gold2' : tn === 'r' ? p.tone + '2' : p.tone;
          put(hx + dx, hy + dy, tn === 'p' ? (bit ? '1' : '0') : s, tone);
        }
        if (Math.random() < (foc ? 0.5 : 0.04) * op) this.motes.push({ x: hx * cw, y: hy * ch, vx: rand(-8, 8), vy: rand(-28, -12), life: rand(1.5, 3.5) });
      }
      // fireflies + pollen
      for (let k = 0; k < 9; k++) { const fx = ((Math.sin(this.t * 0.17 * (k + 1) + k) + 1) / 2) * COLS, fy = gy - 3 - ((Math.sin(this.t * 0.31 + k * 2) + 1) / 2) * 8; if (Math.sin(this.t * 2 + k * 3) > 0.3) put(fx | 0, fy | 0, '*', 'fly'); }
      this.motes = this.motes.filter((m) => (m.life -= dt) > 0);
      for (const m of this.motes) { m.x += m.vx * dt; m.y += m.vy * dt; put((m.x / cw) | 0, (m.y / ch) | 0, m.life > 1 ? '·' : '.', 'pollen'); }
      const groups = {};
      for (let i = 0; i < N; i++) if (gch[i] !== null) (groups[gto[i]] || (groups[gto[i]] = [])).push(i);
      for (const tone in groups) {
        x.fillStyle = PAL[tone] || tone;
        for (const i of groups[tone]) x.fillText(gch[i], (i % COLS) * cw, ((i / COLS) | 0) * ch);
      }
      this.stepFly(dt);
      if (this.onFrame) this.onFrame(dt);
    }
  }

  // ── A picture re-drawn as coloured glyphs (light → dense glyphs, dark → dots) ──
  function asciiImage(canvas, src, o = {}) {
    const cell = o.cell || 7, ramp = ' .:-=+*01#@';
    const img = new Image();
    img.decoding = 'async'; img.src = src;
    const ctl = { k: 0, draw: null };
    img.onload = () => {
      const d = Math.min(devicePixelRatio || 1, 2);
      const W = canvas.offsetWidth || canvas.parentElement.offsetWidth, H = canvas.offsetHeight || canvas.parentElement.offsetHeight, cols = Math.ceil(W / (cell * 0.6)), rows = Math.ceil(H / cell);
      canvas.width = W * d; canvas.height = H * d;
      const x = canvas.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0);
      const off = document.createElement('canvas'); off.width = cols; off.height = rows;
      const ox = off.getContext('2d');
      // cover + top-centre, the same crop as the thumbnails
      const sc = Math.max(W / img.width, H / img.height), sw = W / sc, sh = H / sc;
      ox.drawImage(img, (img.width - sw) / 2, 0, sw, sh, 0, 0, cols, rows);
      const px = ox.getImageData(0, 0, cols, rows).data;
      let mean = 0; for (let q = 0; q < px.length; q += 4) mean += (0.2126 * px[q] + 0.7152 * px[q + 1] + 0.0722 * px[q + 2]) / 255; mean /= px.length / 4;
      const sat = (r, g, b) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
      x.font = `${cell}px 'JetBrains Mono', monospace`; x.textBaseline = 'top';
      ctl.draw = (t = 0) => {
        x.clearRect(0, 0, W, H);
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          const q = (j * cols + i) * 4, R = px[q], G = px[q + 1], B = px[q + 2];
          const l = (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255, dv = Math.min(1, Math.abs(l - mean) * 2.4 + sat(R, G, B) * 0.8);
          let g = ramp[Math.min(ramp.length - 1, (((l > 0.85 ? 0.1 : 0.24) + dv * 0.76) * ramp.length) | 0)];
          if (g === '0' || g === '1') g = (i * 7 + j * 13 + ((t * 8) | 0)) % 3 ? g : g === '0' ? '1' : '0';
          if (g === ' ') { if ((i + j) % 3 === 0) { x.fillStyle = '#ffffff18'; x.fillText('.', i * cell * 0.6, j * cell); } continue; }
          // night-tinted: keep the picture's hue but pull it toward the garden's ink
          const k2 = l > 0.8 ? 0.55 : 1;         // pale page backgrounds dim down to the night
          x.fillStyle = `rgb(${Math.min(255, R * k2 + 30) | 0},${Math.min(255, G * k2 + 28) | 0},${Math.min(255, B * k2 + 24) | 0})`;
          x.fillText(g, i * cell * 0.6, j * cell);
        }
      };
      ctl.draw();
      if (o.onReady) o.onReady(ctl);
    };
    return ctl;
  }

  window.KIT = { decode, decodeOnView, flowerCells, flowerHTML, Garden2D, asciiImage, rand, clamp, seeded, esc, REDUCED, PAL };
})();
