// ─────────────────────────────────────────────
//  DIGITIZED GARDEN SPRITES — flowers, bee, hive
//
//  Drawn the same way as the AsciiFlyer butterfly (flyer.js) so they read as
//  one world: a cell grid, a live stream of 0/1 bits as fill, ':' edges, and
//  the odd glitch (rows slip, a ghost copy offsets).
//
//    const f = new AsciiSprite(canvas, { cols: 11, rows: 19, cell: 8, font: 1 }, painters.flower('daisy', 3));
//    f.draw(dt, { color: '#ff8a8a' });   // every frame (or every other)
//    f.head  → { x, y } px inside the canvas where a visitor lands (flowers only)
// ─────────────────────────────────────────────
(function () {
  const GREEN = '#6f9f6f', GREEN_DIM = '#3f6b3f', GOLD = '#e6c34a', AMBER = '#8a6a1f';

  class AsciiSprite {
    constructor(canvas, { cols, rows, cell = 8, font = 1 }, painter) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
      this.cols = cols; this.rows = rows; this.cell = cell; this.font = font;
      this.width = cols * cell; this.height = rows * cell;
      const d = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = this.width * d; canvas.height = this.height * d;
      canvas.style.width = this.width + 'px'; canvas.style.height = this.height + 'px';
      this.ctx.setTransform(d, 0, 0, d, 0, 0);
      this.paint = painter;
      this.bits = Uint8Array.from({ length: cols * rows }, () => (Math.random() < 0.5 ? 1 : 0));
      this.t = Math.random() * 10; this.glitch = 0;
      this.head = painter.head ? { x: painter.head[0] * cell + cell / 2, y: painter.head[1] * cell } : null;
    }

    draw(dt, state = {}) {
      this.t += dt;
      const flipRate = state.flip ?? 0.03;
      for (let i = 0; i < this.bits.length; i++) if (Math.random() < flipRate) this.bits[i] ^= 1;
      if (this.glitch <= 0 && Math.random() < dt * (state.glitchRate ?? 0.08)) this.glitch = 0.1;
      const glitching = this.glitch > 0;
      if (glitching) this.glitch -= dt;

      const { ctx, cols, rows, cell } = this;
      ctx.clearRect(0, 0, this.width, this.height);
      ctx.font = `700 ${cell * this.font}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const slip = new Int8Array(rows);
      if (glitching) for (let r = 0; r < rows; r++) if (Math.random() < 0.25) slip[r] = Math.random() < 0.5 ? -1 : 1;

      const out = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const cellOut = this.paint(c, r, this.bits[r * cols + c], this.t, state);
        if (cellOut) out.push(cellOut, (c + slip[r]) * cell + cell / 2, r * cell + cell / 2);
      }
      if (glitching) {
        ctx.globalAlpha = 0.45; ctx.fillStyle = state.ghost || '#ff8a8a';
        for (let i = 0; i < out.length; i += 3) ctx.fillText(out[i][0], out[i + 1] + cell, out[i + 2]);
      }
      let cur = null, curA = 1;
      for (let i = 0; i < out.length; i += 3) {
        const [ch, col, a = 1] = out[i];
        if (col !== cur) { ctx.fillStyle = col; cur = col; }
        if (a !== curA) { ctx.globalAlpha = a; curA = a; }
        ctx.fillText(ch, out[i + 1], out[i + 2]);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ── Painters: (col, row, bit, time, state) → [char, colour, alpha?] | null ──
  const painters = {
    /** A flower on a 13×21 grid. kind: daisy | tulip | round | star */
    flower(kind, seed = 0) {
      const hc = 6, hr = 4;                         // head centre (cells)
      const stemTop = hr + 2;
      // Leaves: a short midrib rising diagonally off the stem, with a filled blade above it
      const leaves = [{ r: 12 + (seed % 3), side: seed % 2 ? 1 : -1 }, { r: 16 + (seed % 2), side: seed % 2 ? -1 : 1 }];
      // Outline glyph that follows the edge's direction (same idea as the butterfly's veins)
      const edgeChar = (th) => {
        const a = ((((th + Math.PI / 2) * 180) / Math.PI) % 180 + 180) % 180;
        return a < 22.5 || a >= 157.5 ? '-' : a < 67.5 ? '\\' : a < 112.5 ? '|' : '/';
      };
      const radius = (th) => kind === 'daisy' ? 2.5 + 1.9 * Math.pow(Math.abs(Math.cos(2.5 * th)), 1.5)
        : kind === 'star' ? 2.0 + 2.4 * Math.pow(Math.abs(Math.cos(2.5 * th + 0.3)), 4)
        : kind === 'round' ? 3.3 : 0;
      const fn = (c, r, bit, t, st) => {
        const petal = st.color || '#ff8a8a';
        const dx = c - hc, dy = r - hr, rr = Math.hypot(dx, dy * 1.1), th = Math.atan2(dy, dx);
        // Centre disk
        if (rr < 1.2) return [dx === 0 && dy === 0 ? '@' : 'o', GOLD];
        if (kind === 'tulip') {
          const w = dy < -2 ? 0 : 3.2 - Math.max(0, dy) * 0.55;   // cup, narrowing toward the stem
          if (dy >= -2 && dy <= 3 && Math.abs(dx) <= w) return Math.abs(dx) > w - 1 ? [dx < 0 ? (dy > 0 ? '\\' : '(') : (dy > 0 ? '/' : ')'), petal] : [bit ? '1' : '0', petal];
          if (dy === -3 && [-2, 0, 2].includes(dx)) return ['^', petal];
        } else {
          const R = radius(th);
          if (rr < R) {
            if (rr > R - 0.9) return [edgeChar(th), petal];
            if (kind === 'round' && Math.abs(rr - 2.2) < 0.45) return [':', petal];
            return [bit ? '1' : '0', petal];
          }
        }
        // Stem: one column with a gentle bend, rooted at the bottom
        if (r >= stemTop) {
          const sx = hc + Math.round(Math.sin(r * 0.3 + seed) * 0.6);
          if (c === sx) return [bit && r % 4 === 0 ? ':' : '|', GREEN];
          for (const lf of leaves) {
            const k = (c - sx) * lf.side;                         // cells out from the stem
            if (k < 1 || k > 3) continue;
            if (r === lf.r - k) return [lf.side > 0 ? '/' : '\\', GREEN];            // midrib
            if (r === lf.r - k - 1 && k < 3) return [bit ? '1' : '0', GREEN_DIM];    // blade
          }
        }
        return null;
      };
      fn.head = [hc, hr - 1.6];
      return fn;
    },

    /** A bee facing right on a 12×8 grid; mirror with state.facing < 0 */
    bee() {
      return (c0, r, bit, t, st) => {
        const c = st.facing < 0 ? 11 - c0 : c0;
        const mirror = st.facing < 0;
        // Wings: fast blur over the back
        const open = 0.35 + 0.65 * Math.abs(Math.sin(t * 38));
        const wx = (c - 5.2) / 2.6, wy = (r - 2.4) / (1.7 * open);
        if (wx * wx + wy * wy < 1 && r < 4) return [bit ? ':' : '.', '#d7e6ff', 0.75];
        // Body: striped abdomen + thorax
        const bx = (c - 5.5) / 4.2, by = (r - 4.6) / 1.9;
        if (bx * bx + by * by < 1) {
          if (bx * bx + by * by > 0.72) return [':', GOLD];
          return ((c >> 1) % 2) ? [bit ? '1' : '0', GOLD] : ['=', AMBER];
        }
        // Head, eye, stinger, antenna
        if (Math.hypot(c - 10.4, r - 4.4) < 1.3) return [c === 11 && r === 4 ? '@' : '0', GOLD];
        if (c === 1 && r === 5) return ['-', GOLD];
        if (c === 11 && r === 2) return [mirror ? '\\' : '/', GOLD];
        return null;
      };
    },

    /** A hive on a 9×8 grid: banded dome with a dark doorway */
    hive() {
      const half = [1.5, 2.6, 3.4, 3.8, 3.9, 3.8, 3.4];
      return (c, r, bit) => {
        if (r === 0) return c === 4 ? ['|', AMBER] : null;
        const w = half[r - 1]; if (w === undefined) return null;
        const dx = Math.abs(c - 4);
        if (dx > w) return null;
        if (r === 6 && dx < 1) return ['0', '#3a2a0a'];
        if (dx > w - 1) return [':', '#b8913a'];
        return r % 2 ? ['=', '#b8913a'] : [bit ? '1' : '#', '#d1a748'];
      };
    },
  };

  window.AsciiSprite = AsciiSprite;
  window.AsciiPainters = painters;
})();
