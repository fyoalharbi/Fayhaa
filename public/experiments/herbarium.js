// Experiment 03 · Herbarium (v2): a readable scrolling page in Papillon's language.
(function () {
  const D = window.EXP, { decodeOnView, asciiImage, flowerHTML, flowerCells, Garden2D, clamp, REDUCED } = window.KIT;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wide = () => !matchMedia('(max-width: 860px)').matches;
  decodeOnView();

  // ── Garden band along the foot of the landing, paused once it scrolls away ──
  const hero = $('.hb-hero'), gwrap = $('.hb-gwrap'), gc = $('#hb-garden');
  const placeBand = () => { gwrap.style.top = (hero.getBoundingClientRect().bottom + scrollY - gwrap.offsetHeight) + 'px'; };
  placeBand();
  const g = new Garden2D(gc, { plants: 38, font: 11, groundRows: 3, butterfly: true, moon: false, stars: 0.003, seed: 'herb', bushes: 8 });
  new IntersectionObserver(([e]) => { g.paused = !e.isIntersecting; }).observe(gc);
  addEventListener('resize', () => { placeBand(); g.resize(); });

  // ── Fig. 1: the flower whose four petals are the four stages ──
  const fc = $('#hb-flower'), svgC = $('#hb-callouts'), cos = $$('.hb-co');
  const ANG = [-Math.PI * 0.75, -Math.PI * 0.25, Math.PI * 0.25, Math.PI * 0.75];   // ingest, transform, model, report (clockwise)
  const F = { t: 0, hot: -1, drawn: false, bits: Uint8Array.from({ length: 8192 }, () => (Math.random() < 0.5 ? 1 : 0)), motes: [] };
  function sizeFlower() {
    const d = Math.min(devicePixelRatio || 1, 2);
    F.W = fc.offsetWidth; F.H = fc.offsetHeight;
    fc.width = F.W * d; fc.height = F.H * d;
    F.x = fc.getContext('2d'); F.x.setTransform(d, 0, 0, d, 0, 0);
    F.fs = clamp(F.W / 64, 6, 10); F.cw = F.fs * 0.6; F.ch = F.fs * 1.08;
    F.COLS = Math.floor(F.W / F.cw); F.ROWS = Math.floor(F.H / F.ch);
    F.R = Math.floor(Math.min(F.COLS * 0.34, F.ROWS * 0.64));
    F.cx = Math.round(F.COLS / 2); F.cy = Math.round(F.ROWS * 0.4);
    F.drawn = false; svgC.innerHTML = '';
  }
  const SHADE = ['#ffc2b8', '#ff9d94', '#ff8a8a', '#d9726f', '#a65a58'];
  function drawFlower(dt) {
    const { x, cw, ch, COLS, ROWS, R, cx, cy } = F;
    F.t += dt;
    const grow = REDUCED ? 1 : clamp(F.t / 2.4, 0, 1), open = (0.12 + 0.88 * (1 - Math.pow(1 - grow, 3))) * (0.965 + 0.035 * Math.sin(F.t * 0.9));
    for (let i = 0; i < 90; i++) F.bits[(Math.random() * 8192) | 0] ^= 1;
    x.clearRect(0, 0, F.W, F.H);
    x.font = `${F.fs}px 'JetBrains Mono', monospace`; x.textBaseline = 'top';
    const groups = {};
    const put = (c, r, s, col) => { if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return; (groups[col] || (groups[col] = [])).push(s, c * cw, r * ch); };
    // stem and two leaves, swaying a little from the base
    const Rv = Math.round(R * 0.5), base = ROWS - 1;
    for (let r = base; r > cy + Rv * 0.6; r--) {
      const k = (base - r) / (base - cy), off = Math.round(Math.sin(F.t * 0.7) * 1.2 * k * k);
      put(cx + off, r, (r % 4) ? '|' : '1', '#5f8f5f');
      for (const [side, at, len] of [[1, 0.28, 11], [-1, 0.5, 9]]) {
        const rr = Math.round(base - (base - cy) * at);
        if (r === rr) for (let j = 1; j <= len; j++) { const w = Math.round(Math.sin((j / len) * Math.PI) * 2); for (let v = -w; v <= w; v++) put(cx + off + side * j, r + v - Math.round(j * 0.25), v === -w || v === w ? (side > 0 ? '/' : '\\') : F.bits[j * 31 + v + 900] ? '1' : '0', v === 0 ? '#6f9f6f' : '#4f8a4f'); }
      }
    }
    // the head: petals of live bits, shaded by distance, the hovered stage's petal in gold
    for (const [dx, dy, s, tn] of flowerCells({ R, petals: 8, rot: 0, open, seed: 7 })) {
      const nx = dx / R, ny = dy / (R * 0.5), r = Math.hypot(nx, ny), a = Math.atan2(ny, nx);
      let col;
      if (tn === 'c') col = '#e6c34a'; else if (tn === 'd') col = '#8a7428';
      else {
        const near = F.hot >= 0 && Math.abs(((a - ANG[F.hot] + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < Math.PI / 8;
        col = near ? (tn === 'r' ? '#8a7428' : r < 0.6 ? '#ffe28a' : '#e6c34a') : tn === 'r' ? '#6e4442' : SHADE[Math.min(4, (r * 5) | 0)];
      }
      put(cx + dx, cy + dy, tn === 'p' ? (F.bits[((dx + 64) * 97 + (dy + 40) * 13) & 8191] ? '1' : '0') : s, col);
    }
    // pollen rising off the centre
    if (Math.random() < 0.25 * grow) F.motes.push({ c: cx + (Math.random() - 0.5) * R * 0.4, r: cy, v: 2 + Math.random() * 3, l: 2 + Math.random() * 2 });
    F.motes = F.motes.filter((m) => (m.l -= dt) > 0);
    for (const m of F.motes) { m.r -= m.v * dt; m.c += Math.sin(F.t * 2 + m.l) * dt; put(Math.round(m.c), Math.round(m.r), m.l > 1 ? '·' : '.', '#e6d27a'); }
    for (const col in groups) { x.fillStyle = col; const a = groups[col]; for (let i = 0; i < a.length; i += 3) x.fillText(a[i], a[i + 1], a[i + 2]); }
    if (!F.drawn && grow >= 0.92) callouts(open);
  }
  // Old-game callouts from each petal tip to its stage label, drawn one after another
  function callouts(open) {
    F.drawn = true;
    const W = F.W, H = F.H;
    let html = '';
    cos.forEach((el, i) => {
      const a = ANG[i], tx = (F.cx + Math.cos(a) * F.R * open * 0.93) * F.cw, ty = (F.cy + Math.sin(a) * F.R * 0.5 * open * 0.93) * F.ch;
      const left = Math.cos(a) < 0, up = Math.sin(a) < 0;
      const ex = tx + (left ? -1 : 1) * 26, ey = ty + (up ? -1 : 1) * 26;
      const lw = el.offsetWidth, lh = el.offsetHeight;
      const lx = clamp(left ? ex - 20 - lw : ex + 20, -40, W - lw + 40), ly = clamp(ey - lh / 2, -10, H - lh);
      el.style.transform = `translate(${lx | 0}px, ${ly | 0}px)`;
      const ax = left ? lx + lw : lx;
      html += `<path data-i="${i}" d="M${tx | 0},${ty | 0} L${ex | 0},${ey | 0} L${ax | 0},${ey | 0}"/><circle data-i="${i}" cx="${tx | 0}" cy="${ty | 0}" r="2"/>`;
    });
    svgC.innerHTML = html;
    $$('path', svgC).forEach((p, i) => {
      p.style.setProperty('--len', p.getTotalLength() + 1);
      setTimeout(() => { p.classList.add('is-drawn'); svgC.querySelector(`circle[data-i="${i}"]`).classList.add('is-drawn'); }, REDUCED ? 0 : i * 260);
      setTimeout(() => cos[i].classList.add('is-on'), REDUCED ? 0 : i * 260 + 500);
    });
  }
  cos.forEach((el, i) => {
    el.addEventListener('mouseenter', () => { F.hot = i; });
    el.addEventListener('mouseleave', () => { F.hot = -1; });
    el.addEventListener('click', () => pin({ type: 'stage', id: el.dataset.stage }));
  });
  sizeFlower();
  addEventListener('resize', () => { sizeFlower(); cos.forEach((c) => c.classList.remove('is-on')); });
  let heroOn = true, fl = performance.now();
  new IntersectionObserver(([e]) => { heroOn = e.isIntersecting; }).observe(fc);
  const floop = (now) => { requestAnimationFrame(floop); if (!heroOn || now - fl < 33) return; const dt = Math.min(0.06, (now - fl) / 1000); fl = now; drawFlower(dt); };
  requestAnimationFrame(floop);

  // ── Reveal blocks; specimens "develop" from 0/1 into the photo under a scan line ──
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target); e.target.classList.add('is-in');
    if (e.target.matches('.hb-feat, .hb-sheet')) setTimeout(() => e.target.classList.add('is-dev'), REDUCED ? 0 : 800);
  }), { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  $$('.hb-sec > *:not(.hb-feats):not(.hb-drawer):not(.hb-cap), .hb-feat, .hb-sheet, .hb-entry').forEach((el) => io.observe(el));
  $$('.hb-img canvas[data-src]').forEach((c) => {
    const art = c.closest('article');
    const ctl = asciiImage(c, c.dataset.src, { cell: 7 });
    let n = 0;
    const id = setInterval(() => { if (ctl.draw && !art.classList.contains('is-dev')) ctl.draw(++n); if (art.classList.contains('is-dev') || n > 300) clearInterval(id); }, 150);
  });
  $$('.hb-fallback').forEach((p) => { p.innerHTML = `<span>${flowerHTML({ R: 13, seed: +p.dataset.seed, stem: 6, squash: 0.45 })}</span>`; p.style.cssText += 'display:flex;align-items:center;justify-content:center;font:9px/1.05 var(--mono);overflow:hidden'; });

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

  // ── Pollination map ──
  const map = $('#hb-map'), gP = $('#hb-paths'), gD = $('#hb-pollen'), cap = $('#hb-cap');
  const L = $$('button[data-k]', map), R = $$('.hb-map-r button', map), H = $$('.hb-grp-h', map);
  const skill = (k) => D.skills.find((s) => s.key === k);
  const stageName = (h) => h.dataset.name;
  const stageOf = (k) => { const b = L.find((x) => x.dataset.k === k); const h = b && b.closest('.hb-grp').querySelector('.hb-grp-h'); return h ? h.dataset.short : ''; };
  let paths = [];
  function drawMap() {
    if (!wide()) { gP.innerHTML = ''; paths = []; return; }
    const m = map.getBoundingClientRect();
    let html = '';
    for (const r of R) for (const k of r.dataset.ks.split(' ')) {
      const l = L.find((x) => x.dataset.k === k); if (!l) continue;
      const a = l.getBoundingClientRect(), b = r.getBoundingClientRect();
      const x1 = a.right - m.left + 6, y1 = a.top + a.height / 2 - m.top, x2 = b.left - m.left - 8, y2 = b.top + Math.min(b.height / 2, 14) - m.top, cx = (x1 + x2) / 2;
      html += `<path class="${r.classList.contains('is-role') ? 'role' : ''}" data-k="${k}" data-p="${r.dataset.p}" d="M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}"/>`;
    }
    gP.innerHTML = html;
    paths = $$('path', gP).map((el) => ({ el, len: el.getTotalLength(), k: el.dataset.k, p: el.dataset.p, role: el.classList.contains('role') }));
  }
  drawMap(); addEventListener('resize', drawMap); document.fonts && document.fonts.ready.then(drawMap);

  let pinned = null, active = [];
  function light(sel) {
    const cur = sel || pinned;
    map.classList.toggle('is-hovering', !!cur);
    const stageKeys = cur && cur.type === 'stage' ? $$(`.hb-grp-h[data-stage="${cur.id}"] + ul button[data-k]`, map).map((b) => b.dataset.k) : [];
    const ok = (x) => cur && ((cur.type === 'k' && x.k === cur.id) || (cur.type === 'p' && x.p === cur.id) || (cur.type === 'stage' && stageKeys.includes(x.k)));
    active = paths.filter(ok);
    paths.forEach((x) => x.el.classList.toggle('is-on', active.includes(x)));
    // the buttons at both ends (worked out from the data too, for phones where there are no lines)
    const ks = new Set(), ps = new Set();
    if (cur) {
      if (cur.type === 'k') { ks.add(cur.id); R.forEach((r) => r.dataset.ks.split(' ').includes(cur.id) && ps.add(r.dataset.p)); }
      if (cur.type === 'p') { ps.add(cur.id); R.find((r) => r.dataset.p === cur.id)?.dataset.ks.split(' ').forEach((k) => L.some((b) => b.dataset.k === k) && ks.add(k)); }
      if (cur.type === 'stage') stageKeys.forEach((k) => { ks.add(k); R.forEach((r) => r.dataset.ks.split(' ').includes(k) && ps.add(r.dataset.p)); });
    }
    L.forEach((b) => b.classList.toggle('is-on', ks.has(b.dataset.k)));
    R.forEach((b) => b.classList.toggle('is-on', ps.has(b.dataset.p)));
    H.forEach((h) => h.classList.toggle('is-on', cur?.type === 'stage' && h.dataset.stage === cur.id));
    caption(cur, ks, ps);
  }
  function caption(cur, ks, ps) {
    if (!cur) { cap.innerHTML = '<span>Hover a tool, a job or a project. Click to pin.</span>'; return; }
    const jobs = [...ps].filter((p) => p.startsWith('role-')).length, projs = ps.size - jobs;
    const n = (c, w) => `${c} ${w}${c === 1 ? '' : 's'}`;
    let t = '';
    if (cur.type === 'k') { const s = skill(cur.id); t = `<b>${s.label}</b> · ${stageOf(cur.id)} · used at <span class="g">${n(s.work.length, 'job')}</span> and in <em>${n(s.used.length, 'project')}</em>`; }
    else if (cur.type === 'p') { const b = R.find((r) => r.dataset.p === cur.id), st = [...new Set([...ks].map(stageOf).filter(Boolean))]; t = `<b>${b.dataset.name}</b> · ${n(ks.size, 'tool')} across ${st.join(', ')}`; }
    else { const h = H.find((x) => x.dataset.stage === cur.id); t = `<b>${stageName(h)}</b> · ${n(ks.size, 'tool')} · used at <span class="g">${n(jobs, 'job')}</span> and in <em>${n(projs, 'project')}</em>`; }
    cap.innerHTML = t + (pinned ? '<kbd>pinned · click again or esc</kbd>' : '');
  }
  const selOf = (b) => b.dataset.k ? { type: 'k', id: b.dataset.k } : b.dataset.stage ? { type: 'stage', id: b.dataset.stage } : { type: 'p', id: b.dataset.p };
  function pin(sel) { pinned = pinned && sel && pinned.type === sel.type && pinned.id === sel.id ? null : sel; light(); }
  map.addEventListener('mouseover', (e) => { const b = e.target.closest('button'); if (b && !pinned) light(selOf(b)); });
  map.addEventListener('mouseleave', () => light());
  map.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) pin(selOf(b)); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && pinned) pin(null); });
  light();

  // Pollen travels along the traced threads; when nothing is traced, a stray grain now and then
  let mapOn = false, ml = performance.now(), grains = [], stray = 0;
  new IntersectionObserver(([e]) => { mapOn = e.isIntersecting; }).observe(map);
  const mloop = (now) => {
    requestAnimationFrame(mloop);
    const dt = Math.min(0.05, (now - ml) / 1000); ml = now;
    if (!mapOn || !paths.length || REDUCED) { if (gD.childElementCount) gD.innerHTML = ''; return; }
    if (active.length) { for (const a of active) if (!grains.some((g2) => g2.p === a && g2.u < 0.5)) grains.push({ p: a, u: 0, v: 0.38 + Math.random() * 0.2 }); }
    else if ((stray -= dt) <= 0) { stray = 1.1; grains.push({ p: paths[(Math.random() * paths.length) | 0], u: 0, v: 0.3, faint: true }); }
    grains = grains.filter((g2) => (g2.u += g2.v * dt) < 1 && (g2.faint || active.includes(g2.p)));
    gD.innerHTML = grains.map((g2) => { const pt = g2.p.el.getPointAtLength(g2.u * g2.p.len); return `<circle class="${g2.p.role ? '' : 'r'}" cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${g2.faint ? 1.2 : 1.8}" opacity="${g2.faint ? 0.45 : 1}"/>`; }).join('');
  };
  requestAnimationFrame(mloop);

  // ── Contact: a big butterfly circles the address and lands on it when you reach for it ──
  const rel = $('#hb-release'), mail = $('#hb-mail');
  if (window.AsciiFlyer) {
    const bf = new window.AsciiFlyer(rel.firstElementChild, { cols: 23, rows: 17, cell: 5, font: 1.3, side: true });
    bf.sampleBackground = () => {}; bf.ink = '#f4f4f4'; bf.accent = '#ff8a8a';
    let t = 0, last = performance.now(), land = false, pos = null, on = false;
    new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(rel.parentElement);
    mail.addEventListener('pointerenter', () => { land = true; });
    mail.addEventListener('pointerleave', () => { land = false; });
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!on) return;
      t += dt;
      const sec = rel.parentElement.getBoundingClientRect(), mr = mail.getBoundingClientRect();
      const home = land ? [mr.right - sec.left - 40, mr.top - sec.top - 2] : [sec.width * 0.72 + Math.sin(t * 0.7) * sec.width * 0.18, 200 + Math.sin(t * 1.3) * 60];
      if (!pos) pos = [home[0], home[1]];
      pos[0] += (home[0] - pos[0]) * Math.min(1, dt * (land ? 4 : 1.2)); pos[1] += (home[1] - pos[1]) * Math.min(1, dt * (land ? 4 : 1.2));
      const near = land && Math.hypot(home[0] - pos[0], home[1] - pos[1]) < 6;
      bf.frame(dt, { perched: near, facing: Math.cos(t * 0.7) > 0 ? 1 : -1, glide: Math.sin(t * 2) > 0.6 });
      const s = bf.seat(near);
      rel.style.cssText = `position:absolute;left:0;top:0;right:auto;pointer-events:none;transform:translate(${(pos[0] - s.x) | 0}px,${(pos[1] - s.y) | 0}px)`;
    };
    requestAnimationFrame(loop);
  }
})();
