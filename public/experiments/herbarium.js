// Experiment 03 · Herbarium: a readable scrolling page in Papillon's language (EN + AR).
(function () {
  const T = window.HB_T, { decodeOnView, asciiImage, flowerHTML, Garden2D, clamp, rand, REDUCED } = window.KIT;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RTL = document.documentElement.dir === 'rtl';
  const wide = () => !matchMedia('(max-width: 860px)').matches;
  decodeOnView();
  // Keep your place when switching language
  const lang = $('.hb-lang'); if (lang) lang.addEventListener('click', () => { const on = $('.hb-rail a.is-on'); if (on) lang.href = lang.href.split('#')[0] + '#' + on.dataset.id; });

  // ── Garden band along the foot of the landing, paused once it scrolls away ──
  const hero = $('.hb-hero'), gwrap = $('.hb-gwrap'), gc = $('#hb-garden');
  const placeBand = () => { gwrap.style.top = (hero.getBoundingClientRect().bottom + scrollY - gwrap.offsetHeight) + 'px'; };
  placeBand();
  const g = new Garden2D(gc, { plants: 38, font: 11, groundRows: 3, butterfly: false, moon: false, stars: 0.003, seed: 'herb', bushes: 8 });
  new IntersectionObserver(([e]) => { g.paused = !e.isIntersecting; }).observe(gc);
  addEventListener('resize', () => { placeBand(); g.resize(); });

  // ── Reveal blocks; project pictures develop from 0/1 into the photo under a scan line ──
  const develop = (art) => setTimeout(() => art.classList.add('is-dev'), REDUCED ? 0 : 800);
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target); e.target.classList.add('is-in');
    if (e.target.matches('.hb-feat, .hb-sheet')) develop(e.target);
  }), { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  $$('.hb-sec > *:not(.hb-feats):not(.hb-drawer), .hb-feat, .hb-sheet, .hb-entry').forEach((el) => io.observe(el));
  const nowCard = $('.hb-now-p'); if (nowCard) setTimeout(() => develop(nowCard), 900);
  $$('.hb-img canvas[data-src]').forEach((c) => {
    const art = c.closest('article');
    const ctl = asciiImage(c, c.dataset.src, { cell: 7 });
    let n = 0;
    const id = setInterval(() => { if (ctl.draw && !art.classList.contains('is-dev')) ctl.draw(++n); if (art.classList.contains('is-dev') || n > 300) clearInterval(id); }, 150);
  });
  $$('.hb-fallback').forEach((p) => { p.innerHTML = `<span>${flowerHTML({ R: 13, seed: +p.dataset.seed, stem: 6, squash: 0.45 })}</span>`; p.style.cssText += 'display:flex;align-items:center;justify-content:center;font:9px/1.05 var(--mono);overflow:hidden;direction:ltr'; });

  // ── Rail: hidden on the landing; the stem grows with the scroll ──
  const rail = $('#hb-rail'), links = $$('.hb-rail a'), grow = $('#hb-grow');
  const onScroll = () => {
    const k = scrollY / (document.documentElement.scrollHeight - innerHeight);
    if (wide()) { grow.style.height = (k * 100).toFixed(1) + '%'; grow.style.width = ''; } else { grow.style.width = (k * 100).toFixed(1) + '%'; grow.style.height = ''; }
    rail.classList.toggle('is-hero', scrollY < innerHeight * 0.55);
    let on = null;
    for (const a of links) if (document.getElementById(a.dataset.id).getBoundingClientRect().top < innerHeight * 0.45) on = a;
    links.forEach((a) => a.classList.toggle('is-on', a === on));
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ── The white butterfly: wanders the page, perches on headings and pictures, opens the garden when caught ──
  const fly = $('#hb-fly');
  if (fly && window.AsciiFlyer) {
    const bf = new window.AsciiFlyer(fly.querySelector('canvas'), { cols: 23, rows: 17, cell: wide() ? 4.2 : 3.6, font: 1.3, side: true });
    bf.sampleBackground = () => {}; bf.ink = '#f4f4f4'; bf.accent = '#ff8a8a';
    const S = { p: [innerWidth * (RTL ? 0.25 : 0.75), innerHeight * 0.3], v: [0, 0], to: null, perched: false, stay: 0, facing: RTL ? -1 : 1, wob: 0, hover: false, t: 0 };
    const mail = $('#hb-mail');
    fly.addEventListener('pointerenter', () => { S.hover = true; });
    fly.addEventListener('pointerleave', () => { S.hover = false; });
    // Phones: the first tap shows where it leads, the second one goes
    fly.addEventListener('click', (e) => { if (!wide() && !fly.classList.contains('is-tip')) { e.preventDefault(); fly.classList.add('is-tip'); setTimeout(() => fly.classList.remove('is-tip'), 2600); } });
    let mailHot = false;
    mail.addEventListener('pointerenter', () => { mailHot = true; S.to = mail; S.perched = false; });
    mail.addEventListener('pointerleave', () => { mailHot = false; });
    const spot = (el) => { const r = el.getBoundingClientRect(); return el === mail ? [r.left + r.width * 0.82, r.top + 4] : [RTL ? r.left + 26 : r.right - 26, r.top + 2]; };
    const visible = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 80 && r.top < innerHeight - 40 && r.width > 0; };
    function choose() {
      const opts = $$('[data-perch]').filter((el) => el !== S.to && visible(el));
      S.to = opts.length ? opts[(Math.random() * opts.length) | 0] : null;
      S.wander = [rand(innerWidth * 0.15, innerWidth * 0.85), rand(innerHeight * 0.2, innerHeight * 0.7)];
    }
    choose();
    let last = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now; S.t += dt;
      if (S.to && !visible(S.to) && !mailHot) { S.perched = false; choose(); }
      const goal = S.to ? spot(S.to) : S.wander;
      if (S.hover) { /* hold still while someone reaches for it */ }
      else if (S.perched) {
        S.p = goal.slice();                                   // ride along with the page as it scrolls
        if ((S.stay -= dt) <= 0 && !mailHot) { S.perched = false; S.v = [rand(-60, 60), -90]; choose(); }
      } else {
        const dx = goal[0] - S.p[0], dy = goal[1] - S.p[1], d = Math.hypot(dx, dy);
        S.wob += dt * 2.3;
        const sp = clamp(d * 1.4, 50, 300);
        const ax = (dx / (d || 1)) * sp + Math.cos(S.wob) * 50, ay = (dy / (d || 1)) * sp + Math.sin(S.wob * 1.7) * 60;
        S.v[0] += (ax - S.v[0]) * Math.min(1, dt * 2); S.v[1] += (ay - S.v[1]) * Math.min(1, dt * 2);
        if (REDUCED) { S.p = goal.slice(); S.v = [0, 0]; } else { S.p[0] += S.v[0] * dt; S.p[1] += S.v[1] * dt; }
        if (Math.abs(S.v[0]) > 10) S.facing = S.v[0] > 0 ? 1 : -1;
        if (d < 12) { if (S.to) { S.perched = true; S.stay = rand(3.5, 7); } else choose(); }
      }
      S.p[0] = clamp(S.p[0], 10, innerWidth - 10); S.p[1] = clamp(S.p[1], 10, innerHeight - 10);
      bf.frame(dt, { perched: S.perched || S.hover, facing: S.facing, glide: !S.perched && S.v[1] > 40 });
      const seat = bf.seat(S.perched || S.hover);
      fly.style.transform = `translate(${(S.p[0] - seat.x).toFixed(1)}px, ${(S.p[1] - seat.y).toFixed(1)}px)`;
    };
    requestAnimationFrame(loop);
  }
})();
