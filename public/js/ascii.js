// ─────────────────────────────────────────────
//  ASCII BUTTERFLY ENGINE (no p5 needed)
//
//  One shared <video>, any number of views. Each view samples the
//  video onto a grid, maps brightness → characters, and draws them.
//
//    const v = new AsciiView(canvas, { grid: 60, ink: '#1a1a1a' });
//    v.setText(['line one', 'line two']);  // morph chars into text
//    v.setText(null);                      // morph back
//    v.triggerGlitch();
// ─────────────────────────────────────────────
(function () {
  const RAMP   = '0|1. ';
  const GLITCH = '@#%&?!$/*+-~^░▒▓';
  const HEARTS = '♥✿☆ ';

  // ── Shared video source ─────────────────────
  let video;
  function sharedVideo() {
    if (video) return video;
    video = document.createElement('video');
    video.src = window.BUTTERFLY_SRC;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.preload = 'auto';
    const play = () => video.play().catch(() => {});
    play();
    // Some browsers only allow playback after a gesture
    ['pointerdown', 'keydown', 'touchstart'].forEach((e) =>
      window.addEventListener(e, play, { once: true, passive: true }));
    return video;
  }

  // ── Shared pointer position (viewport coords) ──
  const pointer = { x: -1e4, y: -1e4 };
  window.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer.x = pointer.y = -1e4; });

  // Wrap + centre lines of text onto a grid × grid character board
  function layoutText(lines, g) {
    const width = g - 6;
    const rows = [];
    lines.forEach((line, k) => {
      if (k) rows.push('');
      let cur = '';
      line.split(' ').forEach((word) => {
        if ((cur + ' ' + word).trim().length > width) { rows.push(cur); cur = word; }
        else cur = (cur + ' ' + word).trim();
      });
      rows.push(cur);
    });
    const top = Math.max(0, Math.floor((g - rows.length) / 2));
    const board = Array.from({ length: g }, () => ' '.repeat(g));
    rows.slice(0, g).forEach((row, i) => {
      const left = Math.floor((g - row.length) / 2);
      board[top + i] = (' '.repeat(left) + row).padEnd(g, ' ').slice(0, g);
    });
    return board;
  }

  class AsciiView {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.o = Object.assign({
        grid: 60,
        crop: [0, 0, 1, 1],     // x, y, w, h as fractions of the video frame
        ink: '#1a1a1a',
        accent: '#b4141e',
        skipAbove: 256,         // brightness above this draws nothing (transparent bg)
        drift: 18,              // px the butterfly shies away from the cursor (0 = off)
        bold: false,            // heavier glyphs (reads better when small)
        hearts: true,           // hovering the body swaps to hearts
        onProbe: null,          // (x, y, value) | (null) while hovering
        onBody: null,           // (isOverBody, isInside) every frame
      }, opts);

      const g = this.o.grid;
      this.sample = document.createElement('canvas');
      this.sample.width = this.sample.height = g;
      this.sctx = this.sample.getContext('2d', { willReadFrequently: true });
      this.rand = Float32Array.from({ length: g * g }, Math.random);

      this.dx = 0; this.dy = 0;
      this.glitch = 0;
      this.morph = 0; this.morphTarget = 0; this.text = null;
      this.visible = true;
      this.video = sharedVideo();

      this.resize();
      new ResizeObserver(() => this.resize()).observe(canvas);
      new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }).observe(canvas);
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }

    resize() {
      const r = this.canvas.getBoundingClientRect();
      const d = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.max(1, Math.round(r.width * d));
      this.canvas.height = Math.max(1, Math.round(r.height * d));
      this.ctx.setTransform(d, 0, 0, d, 0, 0);
    }

    setText(lines) {
      if (lines) { this.text = layoutText(lines, this.o.grid); this.morphTarget = 1; }
      else this.morphTarget = 0;
    }
    get isText() { return this.morphTarget === 1; }

    triggerGlitch(frames = 22) { this.glitch = frames; }

    loop() {
      requestAnimationFrame(this.loop);
      if (this.visible) this.draw();
    }

    draw() {
      const { grid: g, crop, ink, accent, skipAbove } = this.o;
      const ctx = this.ctx;
      const r = this.canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      const v = this.video;
      if (v.readyState < 2 || !r.width) return;

      this.sctx.drawImage(v, crop[0] * v.videoWidth, crop[1] * v.videoHeight,
        crop[2] * v.videoWidth, crop[3] * v.videoHeight, 0, 0, g, g);
      const px = this.sctx.getImageData(0, 0, g, g).data;

      // Pointer relative to this canvas
      const mx = pointer.x - r.left, my = pointer.y - r.top;
      const inside = mx >= 0 && my >= 0 && mx <= r.width && my <= r.height;
      const ddx = mx - r.width / 2, ddy = my - r.height / 2;
      const dist = Math.hypot(ddx, ddy) || 1;
      const body = inside && dist < Math.min(r.width, r.height) * 0.09;
      if (this.o.onBody) this.o.onBody(body, inside);

      // Shy drift (off while showing text)
      let tx = 0, ty = 0;
      if (inside && this.o.drift && this.morphTarget === 0) {
        const strength = this.o.drift * Math.max(0, 1 - dist / (r.width * 0.55));
        tx = -(ddx / dist) * strength;
        ty = -(ddy / dist) * strength;
      }
      this.dx += (tx - this.dx) * 0.06;
      this.dy += (ty - this.dy) * 0.06;

      // Ease the char→text morph
      this.morph += (this.morphTarget - this.morph) * 0.045;
      if (Math.abs(this.morphTarget - this.morph) < 0.002) this.morph = this.morphTarget;

      const cw = r.width / g, ch = r.height / g;
      // Glyphs shrink a little while showing text so wrapped lines don't touch
      const size = Math.min(cw, ch) * (1.15 - 0.25 * this.morph);
      ctx.font = `${this.o.bold ? 700 : 400} ${size}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const glitching = this.glitch > 0;
      if (glitching) this.glitch--;
      const ramp = this.o.hearts && body && !glitching && this.morph === 0 ? HEARTS : RAMP;
      let current = null;

      for (let y = 0; y < g; y++) {
        for (let x = 0; x < g; x++) {
          const i = y * g + x;
          let c, col = ink;
          if (this.morph > 0 && this.text && this.rand[i] < this.morph) {
            c = this.text[y][x];                         // revealed text cell
          } else if (glitching && Math.random() < 0.55) {
            c = GLITCH[(Math.random() * GLITCH.length) | 0];
            if (Math.random() < 0.4) col = accent;
          } else {
            const lum = (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3;
            if (lum > skipAbove) continue;
            c = ramp[Math.min(ramp.length - 1, (lum / 256 * ramp.length) | 0)];
            if (ramp === HEARTS && Math.random() < 0.25) col = accent;
          }
          if (c === ' ') continue;
          if (col !== current) { ctx.fillStyle = col; current = col; }
          const k = 1 - this.morph; // text sits still
          ctx.fillText(c, x * cw + cw / 2 + this.dx * k, y * ch + ch / 2 + this.dy * k);
        }
      }

      if (this.o.onProbe) {
        if (inside) {
          const gx = Math.min(g - 1, Math.max(0, Math.floor(mx / cw)));
          const gy = Math.min(g - 1, Math.max(0, Math.floor(my / ch)));
          const j = (gy * g + gx) * 4;
          this.o.onProbe(gx, gy, Math.round((px[j] + px[j + 1] + px[j + 2]) / 3));
        } else if (this.lastInside) this.o.onProbe(null);
      }
      this.lastInside = inside;
    }
  }

  window.AsciiView = AsciiView;
})();
