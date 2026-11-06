// Experiment 03 · Herbarium: a readable scrolling page in Papillon's language (EN + AR).
(function () {
  const D = window.EXP, T = window.HB_T, { decodeOnView, asciiImage, flowerHTML, Garden2D, clamp, rand, REDUCED } = window.KIT;
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

  // ── Tools: hover / tap a tool, a place or a stage; lines + pollen only for what's traced ──
  const map = $('#hb-map'), gP = $('#hb-paths'), gD = $('#hb-pollen'), cap = $('#hb-cap');
  const L = $$('button[data-k]', map), P = $$('.hb-place', map), H = $$('.hb-grp-h', map);
  const skill = (k) => D.skills.find((s) => s.key === k);
  const stageOf = (k) => L.find((x) => x.dataset.k === k)?.closest('.hb-grp').querySelector('.hb-grp-h').dataset.short || '';
  const kind = (b) => (b.classList.contains('is-role') ? 'w' : b.classList.contains('is-camp') ? 't' : '');
  let pinned = null, active = [];
  function trace(cur) {
    const ks = new Set(), ps = new Set(), pairs = [];
    if (!cur) return { ks, ps, pairs };
    const stageKeys = cur.type === 'stage' ? $$(`.hb-grp-h[data-stage="${cur.id}"] + ul button[data-k]`, map).map((b) => b.dataset.k) : [];
    const keys = cur.type === 'k' ? [cur.id] : stageKeys;
    if (cur.type === 'p') {
      const pl = P.find((x) => x.dataset.p === cur.id); ps.add(cur.id);
      pl.dataset.ks.split(' ').forEach((k) => { const tb = L.find((b) => b.dataset.k === k); if (tb) { ks.add(k); pairs.push([tb, pl]); } });
    } else keys.forEach((k) => {
      ks.add(k);
      const tb = L.find((b) => b.dataset.k === k);
      P.forEach((pl) => { if (pl.dataset.ks.split(' ').includes(k)) { ps.add(pl.dataset.p); pairs.push([tb, pl]); } });
    });
    return { ks, ps, pairs };
  }
  function drawPairs(pairs) {
    if (!wide()) { gP.innerHTML = ''; active = []; return; }
    const m = map.getBoundingClientRect();
    gP.innerHTML = pairs.map(([tb, pl]) => {
      const a = tb.querySelector('.mk').getBoundingClientRect(), b = pl.getBoundingClientRect();
      const x1 = (RTL ? a.left - 4 : a.right + 4) - m.left, y1 = a.top + a.height / 2 - m.top;
      const x2 = b.left + b.width / 2 - m.left, y2 = b.top - m.top - 2, dy = y2 - y1;
      return `<path class="${kind(pl)}" d="M${x1.toFixed(0)},${y1.toFixed(0)} C${(x1 + (RTL ? -40 : 40)).toFixed(0)},${(y1 + dy * 0.35).toFixed(0)} ${x2.toFixed(0)},${(y2 - dy * 0.45).toFixed(0)} ${x2.toFixed(0)},${y2.toFixed(0)}"/>`;
    }).join('');
    active = $$('path', gP).map((el) => ({ el, len: el.getTotalLength(), cls: el.getAttribute('class') }));
  }
  function light(sel) {
    const cur = sel || pinned, { ks, ps, pairs } = trace(cur);
    map.classList.toggle('is-hovering', !!cur);
    L.forEach((b) => b.classList.toggle('is-on', ks.has(b.dataset.k)));
    P.forEach((b) => b.classList.toggle('is-on', ps.has(b.dataset.p)));
    H.forEach((h) => h.classList.toggle('is-on', cur?.type === 'stage' && h.dataset.stage === cur.id));
    drawPairs(cur && cur.type === 'stage' ? [] : pairs);     // a whole stage is shown by highlight alone; lines would be a tangle
    caption(cur, ks, ps);
  }
  function caption(cur, ks, ps) {
    if (!cur) { cap.textContent = T.hint; return; }
    const count = (pre) => [...ps].filter((p) => (pre ? p.startsWith(pre) : !p.startsWith('role-') && !p.startsWith('camp-'))).length;
    const parts = (jobs, camp, projs) => [`<span class="g">${T.jobs} ${jobs}</span>`, camp ? `<span class="t">${T.camp} ✓</span>` : '', `<em>${T.projects} ${projs}</em>`].filter(Boolean).join(' · ');
    let t;
    if (cur.type === 'k') { const s = skill(cur.id); t = `<b>${s.label}</b> · ${stageOf(cur.id)} · ${parts(s.work.length, s.train.length > 0, s.used.length)}`; }
    else if (cur.type === 'p') { const st = [...new Set([...ks].map(stageOf))].filter(Boolean); t = `<b>${P.find((x) => x.dataset.p === cur.id).dataset.name}</b> · ${T.tools} ${ks.size} · ${st.join(RTL ? '، ' : ', ')}`; }
    else t = `<b>${H.find((x) => x.dataset.stage === cur.id).dataset.name}</b> · ${T.tools} ${ks.size} · ${parts(count('role-'), count('camp-') > 0, count(''))}`;
    cap.innerHTML = t + (pinned ? `<kbd>${T.pinned}</kbd>` : '');
  }
  const selOf = (b) => b.dataset.k ? { type: 'k', id: b.dataset.k } : b.dataset.stage ? { type: 'stage', id: b.dataset.stage } : { type: 'p', id: b.dataset.p };
  function pin(sel) { pinned = pinned && sel && pinned.type === sel.type && pinned.id === sel.id ? null : sel; light(); }
  map.addEventListener('mouseover', (e) => { const b = e.target.closest('button'); if (b && !pinned) light(selOf(b)); });
  map.addEventListener('mouseleave', () => light());
  map.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) pin(selOf(b)); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && pinned) pin(null); });
  addEventListener('resize', () => light());
  // "Latest training" on the landing opens the map with the bootcamp traced
  const campLink = $('[data-camp]');
  if (campLink) campLink.addEventListener('click', () => { const c = P.find((x) => x.classList.contains('is-camp')); if (c) setTimeout(() => { pinned = { type: 'p', id: c.dataset.p }; light(); }, 700); });
  light();

  // Pollen flows along the traced lines
  let mapOn = false, ml = performance.now(), grains = [];
  new IntersectionObserver(([e]) => { mapOn = e.isIntersecting; }).observe(map);
  const mloop = (now) => {
    requestAnimationFrame(mloop);
    const dt = Math.min(0.05, (now - ml) / 1000); ml = now;
    if (!mapOn || REDUCED || !active.length) { if (gD.childElementCount) gD.innerHTML = ''; grains = []; return; }
    for (const a of active) if (!grains.some((q) => q.p === a && q.u < 0.5)) grains.push({ p: a, u: 0, v: 0.45 + Math.random() * 0.25 });
    grains = grains.filter((q) => (q.u += q.v * dt) < 1 && active.includes(q.p));
    gD.innerHTML = grains.map((q) => { const pt = q.p.el.getPointAtLength(q.u * q.p.len); return `<circle class="${q.p.cls}" cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="1.8"/>`; }).join('');
  };
  requestAnimationFrame(mloop);

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
