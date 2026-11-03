// ─────────────────────────────────────────────
//  PROCEDURAL ASCII BUTTERFLY (seen from above)
//
//  Built from shapes, not video, so it can flap, glide and rest:
//    • fore/hind wings = rotated ellipses, foreshortened by cos(flap)
//    • veins radiate from the body and pick / | \ - by angle
//    • eye-spots in the accent colour; underside shows on the upstroke
//    • ink flips automatically over dark sections
//
//    const bf = new AsciiFlyer(canvas);
//    bf.frame(dt, { landed, speed, climb });   // call every animation frame
// ─────────────────────────────────────────────
(function () {
  const COLS = 31, ROWS = 21, CELL = 6;          // grid + CSS px per cell
  const HALF_C = (COLS - 1) / 2, HALF_R = (ROWS - 1) / 2;

  // Wing-local coords: x = outward from body (0..1), y = down (-1..1)
  const WINGS = [
    { cx: 0.50, cy: -0.32, a: 0.54, b: 0.40, rot: -0.50, spot: [0.70, -0.42, 0.12] }, // forewing
    { cx: 0.36, cy: 0.36,  a: 0.38, b: 0.33, rot: 0.60,  spot: [0.42, 0.46, 0.08] },  // hindwing
  ];
  const VEINS = 5;          // veins per half-turn
  const BODY_W = 0.06;

  // Cheap stable per-cell noise for the 0/1 texture
  const hash = (c, r) => ((c * 73856093) ^ (r * 19349663)) >>> 0;

  function wingHit(wx, v) {
    let best = null;
    for (let k = 0; k < WINGS.length; k++) {
      const w = WINGS[k];
      const dx = wx - w.cx, dy = v - w.cy;
      const cs = Math.cos(-w.rot), sn = Math.sin(-w.rot);
      const px = dx * cs - dy * sn, py = dx * sn + dy * cs;
      const d = (px * px) / (w.a * w.a) + (py * py) / (w.b * w.b);
      if (d < 1 && (!best || d < best.d)) best = { d, w };
    }
    return best;
  }

  // Character + colour for one cell. side: -1 left, 1 right.
  function cell(c, r, u, v, open, under) {
    const x = Math.abs(u), side = u < 0 ? -1 : 1;
    const rowStep = 1 / HALF_R;

    // Body: head, thorax, abdomen
    if (x < BODY_W) {
      if (v > -0.62 && v < -0.46) return ['o', 'ink'];
      if (v >= -0.46 && v < 0.02) return ['8', 'ink'];
      if (v >= 0.02 && v < 0.78) return [r % 2 ? ':' : '|', 'ink'];
    }

    // Antennae: gentle curves from the head, fixed (they don't flap)
    const t = x / 0.32;
    if (t > 0.08 && t <= 1) {
      const va = -0.6 - 0.42 * Math.pow(t, 0.75);
      if (Math.abs(v - va) < rowStep * 0.55) {
        if (t > 0.9) return ['°', 'ink'];
        return [side < 0 ? '\\' : '/', 'ink'];
      }
    }

    // Wings, squashed horizontally by how open they are
    const wx = (x - BODY_W * 0.6) / open;
    if (wx <= 0 || wx > 1.2) return null;
    const hit = wingHit(wx, v);
    if (!hit) return null;

    // Eye-spot
    const [sx, sy, sr] = hit.w.spot;
    const ds = Math.hypot((wx - sx) * open, v - sy);
    if (ds < sr * 0.45) return ['@', 'accent'];
    if (ds < sr) return ['o', 'accent'];

    // Outline
    if (hit.d > 0.8) return [hit.d > 0.92 ? '.' : ':', 'ink'];

    // Veins radiating from the wing root
    const th = Math.atan2(v, wx);
    const k = (th * VEINS) / Math.PI;
    if (Math.abs(k - Math.round(k)) < 0.09 && hit.d > 0.08) {
      const deg = (th * 180) / Math.PI;
      if (Math.abs(deg) < 22.5) return ['-', 'ink'];
      if (Math.abs(deg) > 67.5 || open < 0.35) return ['|', 'ink'];
      const down = deg > 0;
      return [(down === (side > 0)) ? '\\' : '/', 'ink'];
    }

    // Fill: upper side is dense 0/1, underside (upstroke) is lighter
    if (under) return [hit.d < 0.5 ? ':' : '.', 'ink'];
    return [hash(c, r) % 5 === 0 ? '1' : '0', 'ink'];
  }

  class AsciiFlyer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.width = COLS * CELL;
      this.height = ROWS * CELL;
      const d = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = this.width * d;
      canvas.height = this.height * d;
      canvas.style.width = this.width + 'px';
      canvas.style.height = this.height + 'px';
      this.ctx.setTransform(d, 0, 0, d, 0, 0);

      this.phase = 0;
      this.glide = 0;          // seconds left in a glide
      this.ink = '#1a1a1a';
      this.accent = '#b4141e';
      this.frameN = 0;
    }

    /** Pick ink that contrasts with whatever is underneath the butterfly. */
    sampleBackground() {
      const r = this.canvas.getBoundingClientRect();
      const stack = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      for (const el of stack) {
        if (el === this.canvas || el.classList.contains('lab-flyer')) continue;
        const bg = getComputedStyle(el).backgroundColor;
        const m = bg.match(/\d+(\.\d+)?/g);
        if (!m || (m.length === 4 && +m[3] === 0)) continue;
        const lum = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
        const dark = lum < 0.4;
        this.ink = dark ? '#f4f4f4' : '#1a1a1a';
        this.accent = dark ? '#ff8a8a' : '#b4141e';
        return;
      }
    }

    /**
     * Advance + draw.  state.landed → slow resting flap;
     * state.climb (0..1) → faster beats; random short glides while cruising.
     */
    frame(dt, state = {}) {
      const { landed = false, climb = 0 } = state;
      if (landed) {
        this.phase += dt * 1.6;                              // slow open/close
      } else if (this.glide > 0) {
        this.glide -= dt;
        this.phase += (0 - Math.sin(this.phase)) * dt * 4;   // settle wings open
      } else {
        this.phase += dt * (11 + climb * 9);
        if (Math.random() < dt * 0.25) this.glide = 0.5 + Math.random() * 0.6;
      }

      // open: 1 = fully spread, ~0.12 = edge-on.  Resting flap stays fairly open.
      const cos = Math.cos(this.phase);
      const open = landed ? 0.45 + 0.55 * Math.abs(cos) : 0.12 + 0.88 * Math.abs(cos);
      const under = !landed && cos < 0 && this.glide <= 0;

      if (this.frameN++ % 12 === 0) this.sampleBackground();

      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);
      ctx.font = `700 ${CELL * 1.3}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let current = null;
      for (let r = 0; r < ROWS; r++) {
        const v = (r - HALF_R) / HALF_R;
        for (let c = 0; c < COLS; c++) {
          const u = (c - HALF_C) / HALF_C;
          const out = cell(c, r, u, v, open, under);
          if (!out) continue;
          const col = out[1] === 'accent' ? this.accent : this.ink;
          if (col !== current) { ctx.fillStyle = col; current = col; }
          ctx.fillText(out[0], c * CELL + CELL / 2, r * CELL + CELL / 2);
        }
      }
      return { open, ink: this.ink };
    }
  }

  window.AsciiFlyer = AsciiFlyer;
})();
