// Experiment 03 · Herbarium: a readable scrolling page in Papillon's language.
(function () {
  const { decodeOnView, asciiImage, flowerHTML, Garden2D } = window.KIT;
  decodeOnView();

  // Hero garden, paused once it scrolls away
  const gc = document.getElementById('hb-garden');
  const g = new Garden2D(gc, { plants: 34, font: 11, groundRows: 3, butterfly: true, moon: false, stars: 0.004, seed: 'herb' });
  new IntersectionObserver(([e]) => { g.paused = !e.isIntersecting; }).observe(gc);

  // Reveal blocks as they enter; plates "develop" from 0/1 into the photo
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target); e.target.classList.add('is-in');
    if (e.target.classList.contains('hb-plate')) setTimeout(() => e.target.classList.add('is-dev'), 900);
  }), { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.hb-sec > *:not(.hb-plates), .hb-plate').forEach((el) => io.observe(el));
  document.querySelectorAll('.hb-img canvas[data-src]').forEach((c) => {
    const ctl = asciiImage(c, c.dataset.src, { cell: 7 });
    // keep the glyphs flickering until the photo has developed
    let n = 0; const art = c.closest('.hb-plate');
    const id = setInterval(() => { if (ctl.draw && !art.classList.contains('is-dev')) ctl.draw(++n); if (++n > 400 || art.classList.contains('is-dev')) clearInterval(id); }, 140);
  });
  document.querySelectorAll('.hb-fallback').forEach((p) => { p.innerHTML = flowerHTML({ R: 14, seed: +p.dataset.seed, stem: 7, squash: 0.45 }); p.style.cssText += 'display:grid;place-items:center;font:9px/1.05 var(--mono)'; });

  // Rail: the stem grows with the scroll, the current plate lights up
  const links = [...document.querySelectorAll('.hb-rail a')], grow = document.getElementById('hb-grow');
  const wide = () => !matchMedia('(max-width: 860px)').matches;
  addEventListener('scroll', () => {
    const k = scrollY / (document.documentElement.scrollHeight - innerHeight);
    if (wide()) { grow.style.height = (k * 100).toFixed(1) + '%'; grow.style.width = ''; } else { grow.style.width = (k * 100).toFixed(1) + '%'; grow.style.height = ''; }
    let on = null;
    for (const a of links) { const s = document.getElementById(a.dataset.id); if (s.getBoundingClientRect().top < innerHeight * 0.45) on = a; }
    links.forEach((a) => a.classList.toggle('is-on', a === on));
  }, { passive: true });

  // Pollination map: a curve for every (tool → project) pair
  const map = document.getElementById('hb-map'), svg = document.getElementById('hb-map-lines');
  const L = [...map.querySelectorAll('[data-k]')], R = [...map.querySelectorAll('[data-p]')];
  let paths = [];
  function drawMap() {
    if (!wide()) return;
    const m = map.getBoundingClientRect();
    paths = [];
    let html = '';
    for (const r of R) for (const k of r.dataset.ks.split(' ')) {
      const l = L.find((x) => x.dataset.k === k); if (!l) continue;
      const a = l.getBoundingClientRect(), b = r.getBoundingClientRect();
      const x1 = a.right - m.left + 4, y1 = a.top + a.height / 2 - m.top, x2 = b.left - m.left - 6, y2 = b.top + b.height / 2 - m.top, cx = (x1 + x2) / 2;
      html += `<path data-k="${k}" data-p="${r.dataset.p}" d="M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}"/>`;
    }
    svg.innerHTML = html;
    paths = [...svg.querySelectorAll('path')];
  }
  drawMap(); addEventListener('resize', drawMap); document.fonts && document.fonts.ready.then(drawMap);
  function light(k, p) {
    map.classList.toggle('is-hovering', !!(k || p));
    const on = paths.filter((x) => (k && x.dataset.k === k) || (p && x.dataset.p === p));
    paths.forEach((x) => x.classList.toggle('is-on', on.includes(x)));
    const ks = new Set(on.map((x) => x.dataset.k)), ps = new Set(on.map((x) => x.dataset.p));
    if (!wide() && k) R.forEach((r) => r.dataset.ks.split(' ').includes(k) && ps.add(r.dataset.p));
    if (!wide() && p) R.find((r) => r.dataset.p === p)?.dataset.ks.split(' ').forEach((x) => ks.add(x));
    L.forEach((x) => x.classList.toggle('is-on', ks.has(x.dataset.k) || x.dataset.k === k));
    R.forEach((x) => x.classList.toggle('is-on', ps.has(x.dataset.p) || x.dataset.p === p));
  }
  map.addEventListener('mouseover', (e) => { const b = e.target.closest('button'); if (b) light(b.dataset.k, b.dataset.p); });
  map.addEventListener('mouseleave', () => light());
  map.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) light(b.dataset.k, b.dataset.p); });

  // Hero specimen: the big butterfly, pinned in a plate, still breathing
  const spec = document.querySelector('#hb-spec canvas');
  if (spec && window.AsciiFlyer && getComputedStyle(spec.parentElement).display !== 'none') {
    const big = new window.AsciiFlyer(spec, { cols: 23, rows: 17, cell: 11, font: 1.25 });
    big.sampleBackground = () => {}; big.ink = '#e8e4d0'; big.accent = '#ff8a8a';
    let l2 = performance.now();
    const sl = (now) => { requestAnimationFrame(sl); if (scrollY > innerHeight) return; const dt = Math.min(0.05, (now - l2) / 1000); l2 = now; big.frame(dt, { landed: true }); };
    requestAnimationFrame(sl);
  }

  // Contact: a big butterfly circles the address and lands on it when you reach for it
  const rel = document.getElementById('hb-release'), mail = document.getElementById('hb-mail');
  if (window.AsciiFlyer) {
    const bf = new window.AsciiFlyer(rel.firstElementChild, { cols: 23, rows: 17, cell: 5, font: 1.3, side: true });
    bf.sampleBackground = () => {}; bf.ink = '#f4f4f4'; bf.accent = '#ff8a8a';
    let t = 0, last = performance.now(), land = false, pos = [0, 0], on = false;
    new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(rel.parentElement);
    mail.addEventListener('pointerenter', () => { land = true; });
    mail.addEventListener('pointerleave', () => { land = false; });
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!on) return;
      t += dt;
      const sec = rel.parentElement.getBoundingClientRect(), mr = mail.getBoundingClientRect();
      const home = land ? [mr.right - sec.left - 40, mr.top - sec.top - 2] : [sec.width * 0.72 + Math.sin(t * 0.7) * sec.width * 0.18, 180 + Math.sin(t * 1.3) * 60];
      pos[0] += (home[0] - pos[0]) * Math.min(1, dt * (land ? 4 : 1.2)); pos[1] += (home[1] - pos[1]) * Math.min(1, dt * (land ? 4 : 1.2));
      const near = land && Math.hypot(home[0] - pos[0], home[1] - pos[1]) < 6;
      bf.frame(dt, { perched: near, facing: Math.cos(t * 0.7) > 0 ? 1 : -1, glide: Math.sin(t * 2) > 0.6 });
      const s = bf.seat(near);
      rel.style.cssText = `position:absolute;left:0;top:0;right:auto;pointer-events:none;transform:translate(${(pos[0] - s.x) | 0}px,${(pos[1] - s.y) | 0}px)`;
    };
    requestAnimationFrame(loop);
  }
})();
