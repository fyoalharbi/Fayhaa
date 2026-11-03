// ─────────────────────────────────────────────
//  HOME BUTTERFLIES + HIDDEN PHILOSOPHY
//
//  1. Hero (dark stage): the big ASCII butterfly from the video.
//     Hold the cursor still on its body → it "lands" and turns into
//     the philosophy (EN: characters rearrange into text; AR: it
//     dissolves and the text types in its place, so letters can join).
//  2. Flying butterfly: once you scroll past the hero, a small one
//     drops bits as it flies and perches on project cards. Hover/tap
//     it → the philosophy note opens next to it.
//
//  window.BUTTERFLY = { lang, dir, lines, title, head, email, src, hints }
// ─────────────────────────────────────────────
(function () {
  const CFG = window.BUTTERFLY;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RTL = CFG.dir === 'rtl';
  window.BUTTERFLY_SRC = CFG.src;

  // Types lines into a container, one <p> per line; returns a cancel fn
  function typeLines(box, lines, done) {
    box.innerHTML = '';
    let li = 0, ci = 0, p = null, timer;
    const tick = () => {
      if (li >= lines.length) return done && done();
      const line = lines[li];
      if (!p) {
        p = document.createElement('p');
        if (li === lines.length - 1) p.className = 'is-last';
        box.appendChild(p);
      }
      if (REDUCED) { p.textContent = line; ci = line.length; }
      else p.textContent = line.slice(0, ++ci);
      if (ci >= line.length) { li++; ci = 0; p = null; timer = setTimeout(tick, REDUCED ? 0 : 140); }
      else timer = setTimeout(tick, 9 + Math.random() * 12);
    };
    tick();
    return () => clearTimeout(timer);
  }

  // ══ PHILOSOPHY NOTE (used by the flying butterfly) ════════
  const Note = (() => {
    let el, cancel, onCloseCb;
    function build() {
      el = document.createElement('div');
      el.className = 'philo-note';
      el.dir = CFG.dir;
      el.lang = CFG.lang;
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', CFG.title);
      el.innerHTML = `
        <button class="philo-close" type="button" aria-label="Close">×</button>
        <p class="philo-head"></p>
        <div class="philo-body" aria-live="polite"></div>`;
      el.querySelector('.philo-head').textContent = CFG.head;
      el.hidden = true;
      document.body.appendChild(el);
      el.querySelector('.philo-close').addEventListener('click', () => hide());
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
      // Clicking/tapping anywhere else closes it, so it never blocks the page
      document.addEventListener('pointerdown', (e) => {
        if (!el.hidden && !el.contains(e.target) && !e.target.closest('.flyer')) hide();
      });
    }
    function place(anchor) {
      const a = anchor.getBoundingClientRect();
      const w = el.offsetWidth, h = el.offsetHeight, pad = 12;
      const right = a.right + pad, left = a.left - w - pad;
      let x = RTL ? (left > pad ? left : right) : (innerWidth - a.right > w + pad * 2 ? right : left);
      x = Math.max(pad, Math.min(innerWidth - w - pad, x));
      let y = a.top + a.height / 2 - h / 2;
      y = Math.max(pad, Math.min(innerHeight - h - pad, y));
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    }
    function show(anchor, onClose) {
      if (!el) build();
      if (cancel) cancel();
      onCloseCb = onClose;
      const body = el.querySelector('.philo-body');
      // Measure the full text first so the box doesn't jump while typing
      el.hidden = false;
      body.style.minHeight = '';
      body.innerHTML = CFG.lines.map((l) => `<p>${l.replace(/</g, '&lt;')}</p>`).join('');
      place(anchor);
      body.style.minHeight = body.offsetHeight + 'px';
      requestAnimationFrame(() => el.classList.add('is-open'));
      el.querySelector('.philo-close').focus({ preventScroll: true });
      cancel = typeLines(body, CFG.lines);
    }
    function hide() {
      if (!el || el.hidden) return;
      if (cancel) cancel();
      el.classList.remove('is-open');
      setTimeout(() => { el.hidden = true; }, 250);
      if (onCloseCb) { const cb = onCloseCb; onCloseCb = null; cb(); }
    }
    return { show };
  })();

  // ══ 1. HERO: dark stage + land & speak ════════════════════
  const heroCanvas = document.getElementById('hero-ascii');
  const probeEl = document.getElementById('hero-probe');
  const hintEl = document.getElementById('hero-hint');
  const stageText = document.getElementById('stage-text');
  const pad = (n, l) => String(n).padStart(l, '0');
  const setHint = (t) => { if (hintEl) hintEl.textContent = t; };

  const hero = new window.AsciiView(heroCanvas, {
    grid: 60,
    ink: '#f4f4f4',
    accent: '#ff8a8a',
    skipAbove: 200,
    onProbe: (x, y, v) => {
      probeEl.textContent = x === null ? 'X:[--] Y:[--] VAL:[---]'
        : `X:[${pad(x, 2)}] Y:[${pad(y, 2)}] VAL:[${pad(v, 3)}]`;
    },
    onBody: landOnBody,
  });

  let landed = false, dwellStart = 0, leaveTimer = null, cancelStage = null;
  function landHero() {
    landed = true;
    dwellStart = 0;
    setHint(CFG.hints.landed);
    if (RTL) {
      // Arabic: dissolve the butterfly, then type real (joined, RTL) text over it
      hero.setText(['']);
      stageText.hidden = false;
      cancelStage = typeLines(stageText, CFG.lines);
    } else {
      hero.setText(CFG.lines);
    }
  }
  function releaseHero() {
    landed = false;
    hero.setText(null);
    if (cancelStage) { cancelStage(); cancelStage = null; }
    stageText.hidden = true;
    stageText.innerHTML = '';
    setHint(CFG.hints.idle);
  }
  function landOnBody(onBody, inside) {
    if (landed) {
      if (!inside && !leaveTimer) leaveTimer = setTimeout(() => { releaseHero(); leaveTimer = null; }, 700);
      if (inside && leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
      return;
    }
    if (onBody) {
      if (!dwellStart) { dwellStart = performance.now(); setHint(CFG.hints.still); }
      if (performance.now() - dwellStart > 1400) landHero();
    } else if (dwellStart) {
      dwellStart = 0;
      setHint(CFG.hints.idle);
    }
  }
  // Touch: long-press lands it; tapping outside lets it go
  let press;
  heroCanvas.addEventListener('touchstart', () => { press = setTimeout(landHero, 900); }, { passive: true });
  heroCanvas.addEventListener('touchend', () => clearTimeout(press));
  document.addEventListener('touchstart', (e) => {
    if (landed && !e.target.closest('.stage')) releaseHero();
  }, { passive: true });

  // Clicking it just glitches (the click → email secret lives in the terminal,
  // so nobody gets their mail app opened by accident here)
  heroCanvas.addEventListener('click', () => { if (!landed) hero.triggerGlitch(18); });

  // ══ 2. FLYING BUTTERFLY ═══════════════════════════════════
  (function flyer() {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'flyer';
    el.setAttribute('aria-label', CFG.title);
    el.innerHTML = '<canvas></canvas>';
    el.tabIndex = -1;
    document.body.appendChild(el);

    const bf = new window.AsciiFlyer(el.firstChild, { cols: 23, rows: 17, cell: 4 });
    const W = bf.width, H = bf.height;
    const SEAT = bf.seat(true);                // legs, in the side (perched) view
    let facing = RTL ? -1 : 1;

    let x = innerWidth - W - 40, y = -H, vx = 0, vy = 0, tx = 0, ty = 0;
    let heading = 0;
    let mode = 'wander';                       // wander | toCard | perched
    let spot = null, lastCard = null, until = 0;   // spot = { el, fx } on a card's top edge
    let noteOpen = false, shown = false;
    let lastScroll = scrollY, last = performance.now(), dropClock = 0;
    const px = { x: -1e4, y: -1e4 };
    const cards = [...document.querySelectorAll('#projects .card')];

    const perchPoint = (s) => {
      const r = s.el.getBoundingClientRect();
      return { x: r.left + r.width * s.fx - SEAT.x, y: r.top + 1 - SEAT.y };
    };
    const onScreen = (s) => {
      const r = (s.el || s).getBoundingClientRect();
      return r.top > 90 && r.top < innerHeight - 60 && r.left >= 0 && r.right <= innerWidth;
    };
    const wander = (now) => {
      mode = 'wander';
      tx = 20 + Math.random() * (innerWidth - W - 40);
      ty = 80 + Math.random() * (innerHeight - H - 120);
      until = now + 2500 + Math.random() * 2500;
    };
    function chooseNext(now) {
      if (spot) spot.el.classList.remove('is-perched');
      const options = cards.filter((c) => c !== lastCard && onScreen(c));
      if (options.length && Math.random() < 0.8) {
        spot = { el: options[(Math.random() * options.length) | 0], fx: 0.15 + Math.random() * 0.7 };
        mode = 'toCard';
      } else {
        spot = null;
        wander(now);
      }
    }

    new IntersectionObserver(([e]) => {
      shown = e.intersectionRatio < 0.35;
      el.classList.toggle('is-shown', shown);
      el.tabIndex = shown ? 0 : -1;
      if (shown && y < 0) { y = -H; x = innerWidth * (0.3 + Math.random() * 0.5); chooseNext(performance.now()); }
    }, { threshold: [0, 0.35, 0.6, 1] }).observe(document.querySelector('.hero-stage'));

    const openNote = () => {
      if (noteOpen || !shown) return;
      noteOpen = true;
      el.classList.add('is-landed');
      Note.show(el, () => {
        noteOpen = false;
        el.classList.remove('is-landed');
        until = Math.max(until, performance.now() + 1200);
      });
    };
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') openNote(); });
    el.addEventListener('click', openNote);
    window.addEventListener('pointermove', (e) => { px.x = e.clientX; px.y = e.clientY; }, { passive: true });

    // Bits fall off the wings: mostly 0/1, sometimes a letter, sometimes red
    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    function dropBit(slow) {
      if (REDUCED) return;
      const d = document.createElement('span');
      d.className = 'bit';
      d.setAttribute('aria-hidden', 'true');
      d.textContent = Math.random() < 0.85 ? (Math.random() < 0.5 ? '0' : '1')
                                            : LETTERS[(Math.random() * LETTERS.length) | 0];
      d.style.color = Math.random() < 0.18 ? bf.accent : bf.ink;
      const sx = x + W * (0.25 + Math.random() * 0.5), sy = y + H * (0.35 + Math.random() * 0.3);
      const fall = 70 + Math.random() * 90, drift = (Math.random() - 0.5) * 30 - vx * 6;
      document.body.appendChild(d);
      d.animate([
        { transform: `translate(${sx}px, ${sy}px)`, opacity: 0.95 },
        { transform: `translate(${sx + drift * 0.4}px, ${sy + fall * 0.35}px)`, opacity: 0.8, offset: 0.4 },
        { transform: `translate(${sx + drift}px, ${sy + fall}px) rotate(${(Math.random() - 0.5) * 120}deg)`, opacity: 0 },
      ], { duration: (slow ? 1800 : 1200) + Math.random() * 600, easing: 'cubic-bezier(.4,0,.8,.6)' })
        .onfinish = () => d.remove();
    }

    function step(now) {
      requestAnimationFrame(step);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const scrollDelta = scrollY - lastScroll;
      lastScroll = scrollY;
      if (!shown) return;

      let climb = 0;
      let perched = mode === 'perched';

      if (REDUCED) {
        // No flight: sit on the first visible card, or in the corner
        const c = cards.find(onScreen);
        const p = c ? perchPoint({ el: c, fx: 0.8 }) : { x: innerWidth - W - 24, y: innerHeight - H - 24 };
        x = p.x; y = p.y; heading = 0; perched = !!c;
      } else if (mode === 'perched') {
        // Stay on the card as the page scrolls; leave when rested or it goes off screen
        const p = perchPoint(spot);
        x = p.x; y = p.y;
        heading += (0 - heading) * Math.min(1, dt * 5);
        dropClock += dt;
        if (dropClock > 0.7) { dropClock = 0; dropBit(true); }
        if (!onScreen(spot) || (now > until && !noteOpen)) {
          lastCard = spot.el;
          vy = -2.2; vx = (Math.random() - 0.5) * 3;
          chooseNext(now);
        }
      } else if (noteOpen) {
        heading += (0 - heading) * Math.min(1, dt * 4);   // hover in place while you read
      } else {
        if (mode === 'toCard') {
          if (!onScreen(spot)) chooseNext(now);
          else { const p = perchPoint(spot); tx = p.x; ty = p.y; }
        } else if (now > until || Math.hypot(tx - x, ty - y) < 30) {
          chooseNext(now);
        }

        vy -= scrollDelta * 0.03;                         // scrolling gives it a little lift
        const dx = tx - x, dy = ty - y, dist = Math.hypot(dx, dy) || 1;
        const near = Math.hypot(px.x - (x + W / 2), px.y - (y + H / 2)) < 140;
        const want = Math.min(near ? 0.6 : 2.8, dist * 0.045);   // ease in on arrival
        vx += ((dx / dist) * want - vx) * 0.06;
        vy += ((dy / dist) * want - vy) * 0.06;
        x += vx * dt * 60;
        y += vy * dt * 60 + Math.sin(now * 0.006) * 0.25;
        climb = Math.max(0, Math.min(1, -vy / 2));

        if (mode === 'toCard' && dist < 4) {
          mode = 'perched';
          x = tx; y = ty; vx = vy = 0;
          spot.el.classList.add('is-perched');
          until = now + 2800 + Math.random() * 3200;
        }

        x = Math.max(-W / 2, Math.min(innerWidth - W / 2, x));
        y = Math.max(-H, Math.min(innerHeight - H / 2, y));

        const sp = Math.hypot(vx, vy);
        if (Math.abs(vx) > 0.35) facing = vx > 0 ? 1 : -1;
        const aim = sp > 0.3 ? Math.max(-55, Math.min(55, Math.atan2(vx, -vy) * 180 / Math.PI)) : 0;
        heading += (aim - heading) * Math.min(1, dt * 3);

        dropClock += dt;
        if (dropClock > 0.09 && sp > 0.6) { dropClock = 0; dropBit(false); }
      }

      const resting = perched || noteOpen;
      const { open } = bf.frame(dt, { landed: resting, climb, perched, facing });
      const bob = resting ? 0 : (open - 0.5) * -2;
      el.style.transform = `translate(${x}px, ${y + bob}px) rotate(${heading}deg)`;
    }
    requestAnimationFrame(step);
  })();
})();
