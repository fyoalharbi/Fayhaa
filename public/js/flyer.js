// ─────────────────────────────────────────────
//  PROCEDURAL ASCII BUTTERFLY — digitized
//
//  Two views, both built from shapes (not video):
//    • TOP view while flying: wings foreshortened by cos(flap)
//    • SIDE view while perched: wings folded up, legs on the flower
//  The wing fill is a live stream of 0/1 bits; it glitches now and
//  then (rows slip sideways, a red ghost copy offsets).
//
//    const bf = new AsciiFlyer(canvas, { cols: 23, rows: 17, cell: 4 });
//    bf.frame(dt, { landed, climb, perched, facing });  // every frame
//    bf.seat(perched) → { x, y } px inside the canvas that touches the flower
// ─────────────────────────────────────────────
(function () {
  // ── TOP VIEW wings (x outward from body 0..1, y down -1..1) ──
  const TOP_WINGS = [
    { cx: 0.38, cy: -0.30, a: 0.40, b: 0.40, rot: -0.45, spot: [0.52, -0.42, 0.11] }, // forewing
    { cx: 0.30, cy: 0.34,  a: 0.30, b: 0.30, rot: 0.55,  spot: [0.34, 0.44, 0.08] },  // hindwing
  ];
  const BODY_W = 0.07;
  const VEINS = 4;

  // ── SIDE VIEW (u forward = facing direction, v down) ──
  const SIDE_WINGS = [
    { cx: 0.12, cy: 0.04, a: 0.34, b: 0.66, rot: 0.30, spot: [0.14, -0.20, 0.11] },    // forewing (folded)
    { cx: -0.14, cy: 0.44, a: 0.28, b: 0.30, rot: 0.20, spot: [-0.16, 0.46, 0.08] },   // hindwing
  ];
  const BODY_ROW_FROM_BOTTOM = 3; // body row; the two rows under it are legs

  function ellipseHit(wings, x, y, squash = 1) {
    let best = null;
    for (const w of wings) {
      const dx = (x - w.cx) / squash, dy = y - w.cy;
      const cs = Math.cos(-w.rot), sn = Math.sin(-w.rot);
      const px = dx * cs - dy * sn, py = dx * sn + dy * cs;
      const d = (px * px) / (w.a * w.a) + (py * py) / (w.b * w.b);
      if (d < 1 && (!best || d < best.d)) best = { d, w };
    }
    return best;
  }

  const flip = (ch, mirror) => (!mirror ? ch : ch === '/' ? '\\' : ch === '\\' ? '/' : ch);

  class AsciiFlyer {
    constructor(canvas, { cols = 23, rows = 17, cell = 4 } = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.cols = cols; this.rows = rows; this.cell = cell;
      this.width = cols * cell;
      this.height = rows * cell;
      const d = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = this.width * d;
      canvas.height = this.height * d;
      canvas.style.width = this.width + 'px';
      canvas.style.height = this.height + 'px';
      this.ctx.setTransform(d, 0, 0, d, 0, 0);

      this.bits = Uint8Array.from({ length: cols * rows }, () => (Math.random() < 0.5 ? 1 : 0));
      this.phase = 0;
      this.glide = 0;
      this.glitch = 0;            // seconds of glitch left
      this.view = 'top';
      this.ink = '#1a1a1a';
      this.accent = '#b4141e';
      this.frameN = 0;
    }

    /** Pixel (inside the canvas) that should sit on the perch point. */
    seat(perched) {
      // Perched: bottom of the leg row.  Flying: just below the thorax.
      return perched
        ? { x: this.width / 2, y: (this.rows - BODY_ROW_FROM_BOTTOM + 3) * this.cell - 1 }
        : { x: this.width / 2, y: this.height * 0.52 };
    }

    /** Pick ink that contrasts with whatever is underneath the butterfly. */
    sampleBackground() {
      const r = this.canvas.getBoundingClientRect();
      const stack = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      for (const el of stack) {
        if (el === this.canvas || el.classList.contains('lab-flyer')) continue;
        const m = getComputedStyle(el).backgroundColor.match(/\d+(\.\d+)?/g);
        if (!m || (m.length === 4 && +m[3] === 0)) continue;
        const dark = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255 < 0.4;
        this.ink = dark ? '#f4f4f4' : '#1a1a1a';
        this.accent = dark ? '#ff8a8a' : '#b4141e';
        return;
      }
    }

    // ── one cell, TOP view ──
    topCell(c, r, u, v, open, under, bit) {
      const x = Math.abs(u), side = u < 0 ? -1 : 1;
      const rowStep = 2 / (this.rows - 1);

      if (x < BODY_W) {
        if (v > -0.58 && v < -0.42) return ['0', 'ink'];
        if (v >= -0.42 && v < 0.05) return ['8', 'ink'];
        if (v >= 0.05 && v < 0.74) return [r % 2 ? ':' : '|', 'ink'];
      }
      const t = x / 0.26;
      if (t > 0.1 && t <= 1) {
        const va = -0.56 - 0.38 * Math.pow(t, 0.75);
        if (Math.abs(v - va) < rowStep * 0.55) return [side < 0 ? '\\' : '/', 'ink'];
      }

      const wx = (x - BODY_W * 0.6) / open;
      if (wx <= 0 || wx > 1) return null;
      const hit = ellipseHit(TOP_WINGS, wx, v);
      if (!hit) return null;

      const [sx, sy, sr] = hit.w.spot;
      if (Math.hypot((wx - sx) * open, v - sy) < sr) return ['1', 'accent'];
      if (hit.d > 0.82) return [':', 'ink'];

      const th = Math.atan2(v, wx);
      const k = (th * VEINS) / Math.PI;
      if (Math.abs(k - Math.round(k)) < 0.1 && hit.d > 0.1) {
        const deg = (th * 180) / Math.PI;
        if (Math.abs(deg) < 22.5) return ['-', 'ink'];
        if (Math.abs(deg) > 67.5 || open < 0.35) return ['|', 'ink'];
        return [(deg > 0) === (side > 0) ? '\\' : '/', 'ink'];
      }
      if (under) return [bit ? ':' : '.', 'ink'];
      return [bit ? '1' : '0', 'ink'];
    }

    // ── one cell, SIDE view (u already mirrored to face forward) ──
    sideCell(c, r, u, v, squash, bit, mirror) {
      const colStep = 2 / (this.cols - 1);
      const bodyRow = this.rows - BODY_ROW_FROM_BOTTOM;
      const near = (x) => Math.abs(u - x) < colStep * 0.5;

      // Body on one row: abdomen (=-) → thorax (8) → head (0)
      if (r === bodyRow) {
        if (u > 0.34 && u < 0.46) return ['0', 'ink'];
        if (u > 0.06 && u <= 0.34) return ['8', 'ink'];
        if (u > -0.46 && u <= 0.06) return [c % 2 ? '=' : '-', 'ink'];
        return null;
      }
      // Legs: two rows under the thorax, angled forward
      if (r === bodyRow + 1) return [0.12, 0.22, 0.32].some(near) ? [flip('/', mirror), 'ink'] : null;
      if (r === bodyRow + 2) return [0.04, 0.14, 0.24].some(near) ? [flip('/', mirror), 'ink'] : null;
      if (r > bodyRow) return null;

      // Antennae: short, from the head up and forward
      const bodyV = (bodyRow - (this.rows - 1) / 2) / ((this.rows - 1) / 2);
      const rowStep = 2 / (this.rows - 1);
      const t = (u - 0.44) / 0.3;
      if (t > 0 && t <= 1) {
        const va = bodyV - rowStep - 0.42 * t;
        if (Math.abs(v - va) < rowStep * 0.55) return [t > 0.85 ? '°' : flip('/', mirror), 'ink'];
      }

      // Folded wings rising from the thorax (squash < 1 = opening slightly)
      const hit = ellipseHit(SIDE_WINGS, u, v, squash);
      if (!hit) return null;
      const [sx, sy, sr] = hit.w.spot;
      if (Math.hypot((u - sx) / squash, v - sy) < sr) return ['1', 'accent'];
      if (hit.d > 0.8) return [':', 'ink'];
      // Veins fan up from the wing base on the thorax
      const th = Math.atan2(bodyV - v, u - 0.1);
      const k = (th * 5) / Math.PI;
      if (Math.abs(k - Math.round(k)) < 0.09 && hit.d > 0.08) {
        const deg = (th * 180) / Math.PI;
        if (deg > 67.5 && deg < 112.5) return ['|', 'ink'];
        return [flip(deg < 90 ? '/' : '\\', mirror), 'ink'];
      }
      return [bit ? '1' : '0', 'ink'];
    }

    /**
     * Advance + draw.
     *   perched → side view (facing ±1), slow fold/unfold
     *   landed  → resting flap (top view, e.g. hovering while you read)
     *   climb   → faster beats; random short glides while cruising
     */
    frame(dt, state = {}) {
      const { landed = false, climb = 0, perched = false, facing = 1 } = state;
      const view = perched ? 'side' : 'top';
      if (view !== this.view) { this.view = view; this.glitch = 0.22; }

      if (perched || landed) this.phase += dt * 1.5;
      else if (this.glide > 0) {
        this.glide -= dt;
        this.phase += (0 - Math.sin(this.phase)) * dt * 4;
      } else {
        this.phase += dt * (11 + climb * 9);
        if (Math.random() < dt * 0.25) this.glide = 0.5 + Math.random() * 0.6;
      }

      // Data stream: a few bits flip every frame
      for (let i = 0; i < this.bits.length; i++) if (Math.random() < 0.06) this.bits[i] ^= 1;
      // Occasional spontaneous glitch
      if (this.glitch <= 0 && Math.random() < dt * 0.35) this.glitch = 0.12;
      const glitching = this.glitch > 0;
      if (glitching) this.glitch -= dt;

      const cos = Math.cos(this.phase);
      const open = landed ? 0.45 + 0.55 * Math.abs(cos) : 0.14 + 0.86 * Math.abs(cos);
      const under = !landed && !perched && cos < 0 && this.glide <= 0;
      const squash = 0.78 + 0.22 * Math.abs(cos);     // side view: folded wings breathe

      if (this.frameN++ % 12 === 0) this.sampleBackground();

      const ctx = this.ctx;
      const { cols, rows, cell } = this;
      const hc = (cols - 1) / 2, hr = (rows - 1) / 2;
      ctx.clearRect(0, 0, this.width, this.height);
      ctx.font = `700 ${cell * 1.3}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Glitch: some rows slip sideways by a cell or two
      const slip = new Int8Array(rows);
      if (glitching) for (let r = 0; r < rows; r++) if (Math.random() < 0.3) slip[r] = ((Math.random() * 5) | 0) - 2;

      const cells = [];
      for (let r = 0; r < rows; r++) {
        const v = (r - hr) / hr;
        for (let c = 0; c < cols; c++) {
          let u = (c - hc) / hc;
          const bit = this.bits[r * cols + c];
          let out;
          if (view === 'side') {
            const mirror = facing < 0;
            if (mirror) u = -u;
            out = this.sideCell(c, r, u, v, squash, bit, mirror);
          } else {
            out = this.topCell(c, r, u, v, open, under, bit);
          }
          if (out) cells.push(out[0], out[1], (c + slip[r]) * cell + cell / 2, r * cell + cell / 2);
        }
      }

      // Red ghost copy, offset by a cell, while glitching
      if (glitching) {
        ctx.fillStyle = this.accent;
        ctx.globalAlpha = 0.55;
        for (let i = 0; i < cells.length; i += 4) ctx.fillText(cells[i], cells[i + 2] + cell, cells[i + 3]);
        ctx.globalAlpha = 1;
      }
      let current = null;
      for (let i = 0; i < cells.length; i += 4) {
        const col = cells[i + 1] === 'accent' ? this.accent : this.ink;
        if (col !== current) { ctx.fillStyle = col; current = col; }
        ctx.fillText(cells[i], cells[i + 2], cells[i + 3]);
      }
      return { open, ink: this.ink };
    }
  }

  window.AsciiFlyer = AsciiFlyer;
})();
