// Experiment 03 · Herbarium: a readable scrolling page in Papillon's language (EN + AR).
(function () {
  const T = window.HB_T, { decodeOnView, Garden2D, clamp, rand, REDUCED } = window.KIT;
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

  // ── Reveal blocks as they scroll in ──
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target); e.target.classList.add('is-in');
  }), { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  $$('.hb-sec > *:not(.hb-feats):not(.hb-coll), .hb-feat, .hb-fold-in > :not(ol), .hb-toc li, .hb-entry').forEach((el) => io.observe(el));

  // ── Plate size: each drawing is 64 columns, scaled to its frame's real width ──
  const fit = (img) => { const pre = img.querySelector('.hb-art'); if (pre) pre.style.setProperty('--art-fs', (img.clientWidth / 64 / 0.6 * 0.9).toFixed(2) + 'px'); };
  const ro = new ResizeObserver((es) => es.forEach((e) => fit(e.target)));
  $$('.hb-img').forEach((img) => { fit(img); ro.observe(img); });

  // ── Folds: "Explore the complete collection" / "Explore all writings" open the rest in place ──
  $$('.hb-more').forEach((btn) => {
    const fold = document.getElementById(btn.getAttribute('aria-controls')), label = btn.querySelector('span');
    const set = (on, jump) => {
      fold.classList.toggle('is-open', on); fold.inert = !on;
      btn.setAttribute('aria-expanded', String(on)); label.textContent = on ? btn.dataset.close : btn.dataset.open;
      if (on && jump) setTimeout(() => fold.scrollIntoView({ block: 'start' }), 60);
      // closing from inside the list: bring the button back into view rather than leaving the reader mid-page
      if (!on && btn.getBoundingClientRect().top < 0) btn.scrollIntoView({ block: 'center' });
    };
    set(location.hash === '#' + fold.id);
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true', true));
    addEventListener('hashchange', () => { if (location.hash === '#' + fold.id) set(true); });
  });

  // ── Featured projects, one per screen: when scrolling stops between two of them, glide to the one
  //    the reader was heading for (a small nudge falls back). Outside the featured run, scrolling is free. ──
  // stops: the featured projects, then the "Explore the complete collection" button (centred on screen)
  const more = $('.hb-explore.is-coll'), feats = [...$$('.hb-feat'), ...(more ? [more] : [])], oneUp = matchMedia('(min-width: 861px) and (min-height: 620px)');
  if (feats.length) {
    let settled = scrollY, busy = false, user = false, t = 0;
    // only the reader's own scrolling engages the lock; links and the rail land exactly where they point
    ['wheel', 'touchmove', 'keydown'].forEach((ev) => addEventListener(ev, () => { user = true; }, { passive: true }));
    const settle = () => {
      const dir = Math.sign(scrollY - settled); settled = scrollY;
      if (busy) { busy = false; return; }
      const mine = user; user = false;
      if (!mine || !oneUp.matches || !dir) return;
      // layout positions (the reveal animation's transform must not shift the target)
      // layout positions (the reveal animation's transform must not shift the target); rest = where each stop's
      // top sits once settled: 0 for a project, centred for the button
      const H = innerHeight, box = feats.map((f) => {
        let y = 0, e = f; while (e) { y += e.offsetTop; e = e.offsetParent; }
        const h = f.offsetHeight, rest = f === more ? (H - h) / 2 : 0;
        return { top: y - scrollY, bottom: y - scrollY + h, rest, end: rest + h };
      });
      // the stop coming into view in the scroll direction (not yet at its resting place), and the one it replaces
      const i = dir > 0 ? box.findIndex((r) => r.top > r.rest + 1 && r.top < H - 1) : box.findIndex((r) => r.bottom > 1 && r.bottom < r.end - 1);
      if (i < 0) {
        // a small nudge out past the first or last stop falls back onto it; a real scroll carries on freely
        const e = dir > 0 ? box.length - 1 : 0, r = box[e], off = dir > 0 ? r.rest - r.top : r.top - r.rest;
        if (off > 1 && off < H * 0.12) { busy = true; scrollTo({ top: r.top + scrollY - r.rest, behavior: REDUCED ? 'auto' : 'smooth' }); }
        return;
      }
      const j = i - dir, show = dir > 0 ? H - box[i].top : box[i].bottom;
      // nudged only a little: go back to where we were; otherwise go on
      let k = i;
      if (show < H * 0.12) { if (!feats[j]) return; k = j; }
      const y = box[k].top + scrollY - box[k].rest;
      if (Math.abs(y - scrollY) < 2) return;
      busy = true; scrollTo({ top: y, behavior: REDUCED ? 'auto' : 'smooth' });
    };
    if ('onscrollend' in window) addEventListener('scrollend', settle);
    else addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(settle, 160); }, { passive: true });
  }

  // ── Project plates: the ASCII drawing first; "Preview" reveals the real screenshot ──
  $$('.hb-prev').forEach((btn) => btn.addEventListener('click', () => {
    const art = btn.closest('article'), on = !art.classList.contains('is-prev');
    art.classList.toggle('is-prev', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = on ? btn.dataset.on : btn.dataset.off;
  }));
  // the few live bits in each drawing flip now and then, only while it's on screen
  const live = new Set();
  const lio = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? live.add(e.target) : live.delete(e.target))));
  $$('.hb-art').forEach((pre) => { if (pre.querySelector('.a-p')) lio.observe(pre); });
  if (!REDUCED) setInterval(() => {
    for (const pre of live) {
      if (Math.random() < 0.5) continue;
      const qs = pre.querySelectorAll('.a-p'), q = qs[(Math.random() * qs.length) | 0], t = [...q.textContent];
      const i = (Math.random() * t.length) | 0;
      if (t[i] === '0' || t[i] === '1') { t[i] = t[i] === '0' ? '1' : '0'; q.textContent = t.join(''); }
    }
  }, 420);

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
