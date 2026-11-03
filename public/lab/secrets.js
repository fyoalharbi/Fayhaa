// ─────────────────────────────────────────────
//  LAB — hero butterfly per layout + hidden philosophy variants
//
//  <html data-layout="a|b|c|d|current" data-secret="fly|land|flowers|bee|note">
//  window.LAB = { lines: [...], title, email }
// ─────────────────────────────────────────────
(function () {
  const LAB = window.LAB;
  const root = document.documentElement;
  const layout = root.dataset.layout;
  const secret = root.dataset.secret;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ══ PHILOSOPHY CARD (shared by every secret) ══════════════
  const Note = (() => {
    let el, typing, fadeTimer, onCloseCb;

    function build() {
      el = document.createElement('div');
      el.className = 'lab-note';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', LAB.title);
      el.innerHTML = `
        <button class="lab-note-close" type="button" aria-label="Close">×</button>
        <p class="lab-note-head">// WHY_BUTTERFLIES?</p>
        <div class="lab-note-body" aria-live="polite"></div>
        <div class="lab-note-life" hidden><span></span></div>`;
      document.body.appendChild(el);
      el.querySelector('.lab-note-close').addEventListener('click', () => hide());
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
    }

    function place(anchor) {
      el.style.left = el.style.top = el.style.right = el.style.bottom = '';
      el.classList.toggle('is-docked', !anchor);
      if (!anchor) return;
      const a = anchor.getBoundingClientRect();
      const w = el.offsetWidth, h = el.offsetHeight, pad = 12;
      const roomRight = innerWidth - a.right;
      let left = roomRight > w + pad * 2 ? a.right + pad : a.left - w - pad;
      left = Math.max(pad, Math.min(innerWidth - w - pad, left));
      let top = a.top + a.height / 2 - h / 2;
      top = Math.max(pad, Math.min(innerHeight - h - pad, top));
      el.style.left = left + 'px';
      el.style.top = top + 'px';
    }

    function show({ anchor = null, life = 0, onClose = null } = {}) {
      if (!el) build();
      clearTimeout(typing); clearTimeout(fadeTimer);
      onCloseCb = onClose;
      const body = el.querySelector('.lab-note-body');
      body.innerHTML = '';
      el.classList.remove('is-fading', 'is-gone');
      el.hidden = false;
      // Reserve full height first so placement is stable while typing
      body.style.minHeight = '';
      LAB.lines.forEach((l) => { const p = document.createElement('p'); p.textContent = l; body.appendChild(p); });
      place(anchor);
      body.style.minHeight = body.offsetHeight + 'px';
      body.innerHTML = '';
      requestAnimationFrame(() => el.classList.add('is-open'));

      const lifeBar = el.querySelector('.lab-note-life');
      lifeBar.hidden = !life;

      let li = 0, ci = 0, p = null;
      const tick = () => {
        if (li >= LAB.lines.length) return life && startLife(life);
        const line = LAB.lines[li];
        if (!p) {
          p = document.createElement('p');
          if (li === LAB.lines.length - 1) p.className = 'is-last';
          body.appendChild(p);
        }
        if (REDUCED) { p.textContent = line; ci = line.length; }
        else p.textContent = line.slice(0, ++ci);
        if (ci >= line.length) { li++; ci = 0; p = null; typing = setTimeout(tick, REDUCED ? 0 : 140); }
        else typing = setTimeout(tick, 9 + Math.random() * 12);
      };
      tick();
    }

    // Short-lived variant: a lifespan bar drains, then the note flies away
    function startLife(seconds) {
      const bar = el.querySelector('.lab-note-life span');
      bar.style.transition = 'none';
      bar.style.transform = 'scaleX(1)';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        bar.style.transition = `transform ${seconds}s linear`;
        bar.style.transform = 'scaleX(0)';
      }));
      fadeTimer = setTimeout(() => {
        el.classList.add('is-fading');
        fadeTimer = setTimeout(() => {
          hide(true);
          toast('it flew away.');
        }, 1600);
      }, seconds * 1000);
    }

    function hide(silent) {
      if (!el || el.hidden) return;
      clearTimeout(typing); clearTimeout(fadeTimer);
      el.classList.remove('is-open', 'is-fading');
      setTimeout(() => { el.hidden = true; }, 250);
      if (onCloseCb) { const cb = onCloseCb; onCloseCb = null; cb(); }
    }

    return { show, hide, get open() { return el && !el.hidden; } };
  })();

  function toast(text) {
    const t = document.createElement('div');
    t.className = 'lab-toast';
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('is-gone'), 3200);
    setTimeout(() => t.remove(), 4000);
  }

  // ══ HERO BUTTERFLY ════════════════════════════════════════
  const heroCanvas = document.getElementById('hero-ascii');
  const probeEl = document.getElementById('hero-probe');
  const hintEl = document.getElementById('hero-hint');
  const pad = (n, l) => String(n).padStart(l, '0');

  const hero = new window.AsciiView(heroCanvas, {
    grid: 60,
    ink: layout === 'a' ? '#f4f4f4' : '#1a1a1a',
    accent: layout === 'a' ? '#ff8a8a' : '#b4141e',
    skipAbove: layout === 'a' || layout === 'c' ? 200 : 256,
    onProbe: (x, y, v) => {
      if (!probeEl) return;
      probeEl.textContent = x === null ? 'X:[--] Y:[--] VAL:[---]' : `X:[${pad(x, 2)}] Y:[${pad(y, 2)}] VAL:[${pad(v, 3)}]`;
    },
    onBody: secret === 'land' ? landOnBody : null,
  });

  // Secret channel (kept from the original): click → glitch → email.
  // In "note" mode a triple-click opens the note instead.
  let clicks = [];
  heroCanvas.addEventListener('click', () => {
    if (secret === 'note') {
      const now = Date.now();
      clicks = clicks.filter((t) => now - t < 700).concat(now);
      if (clicks.length >= 3) { clicks = []; Note.show({ life: 30 }); }
      return;
    }
    if (hero.isText) return;
    hero.triggerGlitch(18);
    setTimeout(() => { location.href = `mailto:${LAB.email}`; }, 600);
  });

  // ══ SECRET 1: LAND & SPEAK ════════════════════════════════
  // Hold the cursor on the body → it lands and its characters
  // rearrange into the philosophy. Leave the canvas → it flies off.
  let dwellStart = 0, leaveTimer = null;
  function landOnBody(onBody, inside) {
    const now = performance.now();
    if (hero.isText) {
      if (!inside && !leaveTimer) leaveTimer = setTimeout(() => { hero.setText(null); setHint('hold still on its body…'); leaveTimer = null; }, 700);
      if (inside && leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
      return;
    }
    if (onBody) {
      if (!dwellStart) { dwellStart = now; setHint('keep still…'); }
      if (now - dwellStart > 1400) {
        hero.setText(LAB.lines);
        setHint('it landed. move off the canvas to let it go');
        dwellStart = 0;
      }
    } else if (dwellStart) {
      dwellStart = 0;
      setHint('hold still on its body…');
    }
  }
  function setHint(t) { if (hintEl) hintEl.textContent = t; }
  setHint({
    fly: 'psst, scroll down. it follows you',
    land: 'hold still on its body…',
    flowers: 'it loves flowers ✿',
    bee: 'is that a bee?',
    note: 'type w-h-y',
  }[secret] || hintEl.textContent);
  // Touch: long-press does the same thing
  if (secret === 'land') {
    let press;
    heroCanvas.addEventListener('touchstart', () => { press = setTimeout(() => hero.setText(LAB.lines), 900); }, { passive: true });
    heroCanvas.addEventListener('touchend', () => clearTimeout(press));
  }

  // ══ SECRET 2: FLYING BUTTERFLY (the original idea) ════════
  // Once you scroll past the hero, a small butterfly keeps you company.
  // It slows down near the cursor so you can catch it; hovering it
  // makes it land and the philosophy starts.
  function flyer() {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'lab-flyer';
    el.setAttribute('aria-label', LAB.title);
    el.innerHTML = '<canvas></canvas>';
    document.body.appendChild(el);

    new window.AsciiView(el.firstChild, {
      grid: 26, crop: [0.2, 0.1, 0.6, 0.78], skipAbove: 120, drift: 0, hearts: false, bold: true,
    });

    const W = 112, H = Math.round(112 * 0.78 / 0.6);
    let x = innerWidth - W - 40, y = -H, vx = 0, vy = 0, tx = 0, ty = 0;
    let landed = false, shown = false, lastScroll = scrollY, t = 0;
    const pick = () => {
      tx = 20 + Math.random() * (innerWidth - W - 40);
      ty = 70 + Math.random() * (innerHeight - H - 110);
    };
    pick();

    const heroEl = document.querySelector('.lab-hero');
    new IntersectionObserver(([e]) => {
      shown = e.intersectionRatio < 0.35;
      el.classList.toggle('is-shown', shown);
      if (shown && y < 0) { y = -H; x = innerWidth * (0.3 + Math.random() * 0.5); }
    }, { threshold: [0, 0.35, 0.6, 1] }).observe(heroEl);

    const land = () => {
      if (landed || !shown) return;
      landed = true;
      el.classList.add('is-landed');
      Note.show({ anchor: el, onClose: () => { landed = false; el.classList.remove('is-landed'); pick(); } });
    };
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') land(); });
    el.addEventListener('click', land);

    function step() {
      requestAnimationFrame(step);
      t++;
      const scrollDelta = scrollY - lastScroll;
      lastScroll = scrollY;
      if (!shown || landed) return;

      if (REDUCED) { x = innerWidth - W - 24; y = innerHeight - H - 24; }
      else {
        // Scrolling gives it a little lift, like air moving past
        vy -= scrollDelta * 0.035;
        const near = Math.hypot(window.__px - (x + W / 2), window.__py - (y + H / 2)) < 170;
        const pace = near ? 0.18 : 1;
        vx = (vx + (tx - x) * 0.0016) * 0.97;
        vy = (vy + (ty - y) * 0.0016) * 0.97;
        const sp = Math.hypot(vx, vy), max = 2.6;
        if (sp > max) { vx *= max / sp; vy *= max / sp; }
        x += vx * pace;
        y += vy * pace + Math.sin(t * 0.09) * 0.5 * pace;
        if (Math.hypot(tx - x, ty - y) < 40) pick();
        x = Math.max(4, Math.min(innerWidth - W - 4, x));
        y = Math.max(-H, Math.min(innerHeight - H - 4, y));
      }
      el.style.transform = `translate(${x}px, ${y}px) rotate(${Math.max(-18, Math.min(18, vx * 6))}deg)`;
    }
    window.__px = window.__py = -1e4;
    window.addEventListener('pointermove', (e) => { window.__px = e.clientX; window.__py = e.clientY; }, { passive: true });
    addEventListener('resize', pick);
    step();
  }

  // ══ SECRET 3: FLOWER HUNT ═════════════════════════════════
  function flowers() {
    const all = [...document.querySelectorAll('[data-flower]')];
    const found = new Set();
    let counter;
    all.forEach((f, i) => f.addEventListener('click', (e) => {
      e.preventDefault();
      if (found.has(i)) return;
      found.add(i);
      f.classList.add('is-found');
      f.textContent = '■';
      if (!counter) {
        counter = document.createElement('div');
        counter.className = 'lab-counter';
        document.body.appendChild(counter);
      }
      counter.innerHTML = `flowers visited <b>${all.map((_, k) => (found.has(k) ? '■' : '□')).join(' ')}</b>`;
      if (found.size === all.length) {
        counter.classList.add('is-done');
        setTimeout(() => Note.show({}), 500);
      }
    }));
  }

  // ══ SECRET 4: SHOO THE BEE ════════════════════════════════
  function bee() {
    const b = document.getElementById('lab-bee');
    const stage = document.querySelector('.lab-hero');
    if (!b || !stage) return;
    b.hidden = false;
    let anim, wings = 0, gone = false;
    setInterval(() => { if (!gone) b.textContent = (wings ^= 1) ? '~(::)>' : '^(::)>'; }, 120);

    function flyAcross() {
      if (gone || REDUCED) return;
      const w = stage.clientWidth, h = stage.clientHeight;
      const y0 = h * (0.2 + Math.random() * 0.5);
      const frames = Array.from({ length: 9 }, (_, i) => ({
        transform: `translate(${-80 + (w + 160) * (i / 8)}px, ${y0 + Math.sin(i * 1.7) * 40}px)`,
      }));
      anim = b.animate(frames, { duration: 7000, easing: 'linear' });
      anim.onfinish = () => setTimeout(flyAcross, 2500 + Math.random() * 3000);
    }
    if (REDUCED) b.style.transform = `translate(${stage.clientWidth * 0.55}px, ${stage.clientHeight * 0.2}px)`;
    setTimeout(flyAcross, 1200);

    b.addEventListener('click', () => {
      if (gone) return;
      gone = true;
      const m = new DOMMatrixReadOnly(getComputedStyle(b).transform);
      if (anim) anim.cancel();
      b.textContent = 'bzzt!';
      b.animate([
        { transform: `translate(${m.e}px, ${m.f}px)` },
        { transform: `translate(${m.e + 500}px, ${m.f - 400}px)`, opacity: 0 },
      ], { duration: 700, easing: 'ease-in', fill: 'forwards' });
      setTimeout(() => Note.show({ onClose: () => { gone = false; b.textContent = '~(::)>'; b.getAnimations().forEach((a) => a.cancel()); setTimeout(flyAcross, 3000); } }), 450);
    });
  }

  // ══ SECRET 5: SHORT-LIVED NOTE ════════════════════════════
  function note() {
    let buf = '';
    document.addEventListener('keydown', (e) => {
      if (e.target.closest && e.target.closest('input, textarea')) return;
      buf = (buf + e.key.toLowerCase()).slice(-3);
      if (buf === 'why') Note.show({ life: 30 });
    });
  }

  // ── Wire the chosen secret ──
  ({ fly: flyer, flowers, bee, note }[secret] || (() => {}))();
})();
