// Experiment 04 · Bloom: a meadow seen from above; semantic zoom is the navigation.
// Every node lives at a world position with its own scale and a zoom range in
// which it is visible, so flowers open into sections and petals into projects.
(function () {
  const D = window.EXP, { esc, flowerHTML, clamp, seeded } = window.KIT;
  const bl = document.getElementById('bl'), world = document.getElementById('bl-world'), grass = document.getElementById('bl-grass');
  const crumbs = document.getElementById('bl-crumbs'), leaf = document.getElementById('bl-leaf'), hint = document.getElementById('bl-hint');

  // ── Layout of the meadow (world units); portrait screens get it turned on its side ──
  const PORT = innerHeight > innerWidth * 1.1, P = (x, y) => (PORT ? [y, x] : [x, y]);
  const SEC0 = {
    about: { x: 1500, y: 1000, tone: 'white', petals: 7, title: 'About' },
    projects: { x: 2380, y: 760, tone: '', petals: 8, title: 'Projects' },
    skills: { x: 640, y: 700, tone: 'gold', petals: 6, title: 'Skills' },
    blog: { x: 760, y: 1500, tone: 'violet', petals: 5, title: 'Blog' },
    contact: { x: 2250, y: 1560, tone: 'blush', petals: 12, title: 'Contact' },
  };
  const SEC = Object.fromEntries(Object.entries(SEC0).map(([k, s]) => { const [x, y] = P(s.x, s.y); return [k, { ...s, x, y }]; }));
  const MID = P(1500, 1060);
  const nodes = [];
  const add = (o) => {
    const el = document.createElement('div');
    el.className = 'bl-n ' + (o.cls || '');
    el.innerHTML = o.html;
    if (o.go) el.dataset.go = o.go;
    world.appendChild(el);
    nodes.push(Object.assign(o, { el, op: -1 }));
    return o;
  };
  const S_CARD = 0.25, S_PCARD = 0.06;
  const FRAME = {};   // where to put the camera for each place

  // Section cards
  const row = (b, s, t) => `<div class="row"><b>${esc(b)}</b><small>${esc(s)}</small>${t ? `<div>${esc(t)}</div>` : ''}</div>`;
  const CARD = {
    about: `<p class="k">the heart of the meadow</p><h2>${esc(D.name)}, ${esc(D.role.toLowerCase())}</h2><p>${esc(D.intro)}</p>
      ${D.experience.map((e) => row(e.title, `${e.org} · ${e.period}`, e.points[0])).join('')}
      ${D.education.map((e) => row(e.title, `${e.org} · ${e.period}`)).join('')}
      <p class="m" style="margin-top:12px">“${esc(D.philosophy.paragraphs[1])}”</p><a class="b" href="${D.papillon}">why butterflies ↗</a>`,
    projects: `<p class="k">${D.projects.length} petals</p><h2>Projects</h2><p>Every petal of this flower is a project. Zoom into one, or pick it here.</p>
      ${D.projects.map((p, i) => `<div class="row" data-go="p${i}" style="cursor:pointer"><b>${esc(p.title)} <span class="ptr">→</span></b><small>${esc(p.date)}</small></div>`).join('')}`,
    skills: `<p class="k">a golden-angle spiral</p><h2>Skills</h2><p>Tools grow around this flower the way seeds grow in a sunflower: the ones I use most sit closest to the middle.</p>
      <p class="m">${D.workflow.join(' → ')}</p>${[...new Set(D.skills.map((s) => s.groupLabel))].map((gl) => row(gl, D.skills.filter((s) => s.groupLabel === gl && s.used.length).map((s) => s.label).join(' · '))).join('')}`,
    blog: `<p class="k">field notes</p><h2>Blog</h2>${D.posts.map((p) => `<div class="row"><b>${esc(p.title)}</b><small>${esc(p.date)}</small><div>${esc(p.summary)}</div><a class="b" href="${p.href}">read →</a></div>`).join('')}`,
    contact: `<p class="k">a dandelion: make a wish</p><h2>Contact</h2><p>Email is the fastest way to reach me.</p>
      <a class="b" href="mailto:${D.email}" style="font-size:13px">${esc(D.email)}</a><br><a class="b" href="${D.links.linkedin}">LinkedIn ↗</a><a class="b" href="${D.links.github}">GitHub ↗</a>`,
  };
  for (const [id, s] of Object.entries(SEC)) {
    const R = id === 'about' ? 19 : 15;
    add({ id: id + ':art', x: s.x, y: s.y, k: 2.1, lod: [0, 0, 2.1, 3], floor: 0.06, go: id, cls: 'tone-' + s.tone,
      html: `<pre class="bl-art">${flowerHTML({ R, petals: s.petals, seed: id.length * 7, squash: 0.5 })}</pre><p class="bl-name"><b>${'0' + (Object.keys(SEC).indexOf(id) + 1)}</b> ${s.title}</p>` });
    add({ id, x: s.x, y: s.y, k: S_CARD, lod: [2.1, 3, 99, 99], html: `<article class="bl-card">${CARD[id]}</article>`, crumb: s.title });
    FRAME[id] = { x: s.x, y: s.y, s: 4.4 };
  }
  // Petals of the Projects flower: one small flower per project, each holding its case study
  const PR = SEC.projects, tones = ['', 'gold', 'white', 'violet', 'blush', 'orange', 'gold', 'white'];
  D.projects.forEach((p, i) => {
    const a = (i / D.projects.length) * Math.PI * 2 - Math.PI / 2, x = PR.x + Math.cos(a) * (PORT ? 300 : 360), y = PR.y + Math.sin(a) * (PORT ? 360 : 300);
    add({ id: 'p' + i + ':art', x, y, k: 0.9, lod: [0.25, 0.45, 9, 12.5], go: 'p' + i, cls: 'tone-' + tones[i % tones.length],
      html: `<pre class="bl-art">${flowerHTML({ R: 7, petals: 5 + (i % 4), seed: i + 11 })}</pre><p class="bl-name" style="font-size:10px;letter-spacing:.06em">${esc(p.title)}</p>` });
    add({ id: 'p' + i, x, y, k: S_PCARD, lod: [9, 12.5, 99, 99], crumb: p.title, parent: 'projects',
      html: `<article class="bl-card is-p">${p.thumb ? `<img src="${p.thumb}" alt="" loading="lazy">` : ''}<p class="k">petal ${i + 1} / ${D.projects.length} · ${esc(p.date)}</p><h2>${esc(p.title)}</h2>
        <p class="m">${esc(p.sub)}</p><p>${esc(p.summary)}</p><p class="m"><b style="color:var(--gold);font-weight:400">result</b> ${esc(p.tldr.result)}</p>
        <p class="tags">${p.skills.slice(0, 5).map((s) => esc(s.label)).join(' · ')}${p.skills.length > 5 ? ' · +' + (p.skills.length - 5) : ''}</p>
        <a class="b" href="${p.href}">case study →</a>${p.live ? `<a class="b" href="${p.live}">live ↗</a>` : ''}${p.code ? `<a class="b" href="${p.code}">code ↗</a>` : ''}</article>` });
    FRAME['p' + i] = { x, y, s: 17 };
  });
  // Skills as a sunflower spiral around their flower, most used in the middle
  const SK = SEC.skills, used = D.skills.filter((s) => s.used.length).sort((a, b) => b.used.length - a.used.length);
  used.forEach((s, i) => {
    const a = i * 2.39996, r = 150 + 34 * Math.sqrt(i + 1);
    const tall = Math.min(4, s.used.length);
    add({ id: 'sk' + i, x: SK.x + Math.cos(a) * r * 1.15, y: SK.y + Math.sin(a) * r * 0.9, k: 0.36, lod: [0.9, 1.5, 99, 99], go: 'skills',
      html: `<pre class="bl-sprout ${s.core ? 'is-core' : ''}">${'\\|/\n'.slice(0, 4)}${' | \n'.repeat(tall)}<b>${esc(s.label)}</b><small>${s.used.length} project${s.used.length > 1 ? 's' : ''}</small></pre>` });
  });

  // Footpaths trodden between the flowers
  const svgNS = 'http://www.w3.org/2000/svg', path = document.createElementNS(svgNS, 'svg');
  path.setAttribute('class', 'bl-path'); path.setAttribute('width', 1); path.setAttribute('height', 1);
  const A = SEC.about;
  path.innerHTML = `<path d="${['projects', 'skills', 'blog', 'contact'].map((k) => { const b = SEC[k], mx = (A.x + b.x) / 2 + (b.y - A.y) * 0.25, my = (A.y + b.y) / 2 - (b.x - A.x) * 0.15; return `M${A.x},${A.y} Q${mx},${my} ${b.x},${b.y}`; }).join(' ')}"/>`;
  world.prepend(path);

  // ── Camera ──
  const cam = { x: MID[0], y: MID[1], s: 0.4 };
  let W = 0, H = 0, FIT = 0.4, tween = null, settle = 0;
  function fit() { W = innerWidth; H = innerHeight; FIT = (PORT ? Math.min(W / 1900, H / 2900) : Math.min(W / 2900, H / 1900)) * 0.98; const d = Math.min(devicePixelRatio || 1, 2); grass.width = W * d; grass.height = H * d; grass.getContext('2d').setTransform(d, 0, 0, d, 0, 0); }
  fit(); addEventListener('resize', fit);
  cam.s = FIT;
  const MAX = 26;
  const toWorld = (px, py) => [(px - W / 2) / cam.s + cam.x, (py - H / 2) / cam.s + cam.y];
  function zoomAt(px, py, f) {
    const [wx, wy] = toWorld(px, py);
    cam.s = clamp(cam.s * f, FIT * 0.8, MAX);
    cam.x = wx - (px - W / 2) / cam.s; cam.y = wy - (py - H / 2) / cam.s;
    tween = null; moved();
  }
  function flyTo(id) {
    const f = id === 'meadow' ? { x: MID[0], y: MID[1], s: FIT } : FRAME[id]; if (!f) return;
    const from = { ...cam }, t0 = performance.now();
    const ls0 = Math.log(from.s), ls1 = Math.log(f.s), up = Math.max(0, Math.log(Math.hypot(f.x - from.x, f.y - from.y) * Math.max(from.s, f.s) / Math.max(W, 1)) * 0.6);
    const dur = 900 + Math.min(700, up * 300);
    tween = (now) => {
      const k = clamp((now - t0) / dur, 0, 1), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      // zoom out a little mid-flight when travelling far: the meadow stays legible
      cam.s = Math.exp(ls0 + (ls1 - ls0) * e - up * Math.sin(Math.PI * e));
      cam.x = from.x + (f.x - from.x) * e; cam.y = from.y + (f.y - from.y) * e;
      moved();
      if (k >= 1) tween = null;
    };
    hint.style.opacity = 0;
    history.replaceState(null, '', id === 'meadow' ? '#' : '#' + (id[0] === 'p' && id !== 'projects' ? 'projects/' + D.projects[+id.slice(1)].slug : id));
  }
  function moved() { settle = performance.now(); world.style.willChange = 'transform'; }

  // ── Input: drag to pan, wheel / pinch to zoom, tap a flower to go there ──
  const ptrs = new Map(); let downAt = null, pinch = null;
  bl.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button, .bl-index')) return;
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 1) downAt = { x: e.clientX, y: e.clientY, target: e.target, moved: 0 };
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) }; }
    bl.setPointerCapture(e.pointerId); bl.classList.add('is-drag'); tween = null;
  });
  bl.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) return;
    const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2 && pinch) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d / pinch.d); pinch.d = d;
      if (downAt) downAt.moved = 99;
      return;
    }
    cam.x -= (e.clientX - prev[0]) / cam.s; cam.y -= (e.clientY - prev[1]) / cam.s; moved();
    if (downAt) downAt.moved += Math.abs(e.clientX - prev[0]) + Math.abs(e.clientY - prev[1]);
  });
  const up = (e) => {
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
    if (!ptrs.size) {
      bl.classList.remove('is-drag');
      if (downAt && downAt.moved < 6) { const g = downAt.target.closest('[data-go]'); if (g) flyTo(g.dataset.go); }
      downAt = null;
    }
  };
  bl.addEventListener('pointerup', up); bl.addEventListener('pointercancel', up);
  bl.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018))); hint.style.opacity = 0; }, { passive: false });
  bl.addEventListener('dblclick', (e) => { if (!e.target.closest('.bl-card')) zoomAt(e.clientX, e.clientY, 2.2); });
  document.getElementById('bl-in').addEventListener('click', () => zoomAt(W / 2, H / 2, 1.8));
  document.getElementById('bl-out').addEventListener('click', () => zoomAt(W / 2, H / 2, 1 / 1.8));
  addEventListener('keydown', (e) => {
    if (e.key === '+' || e.key === '=') zoomAt(W / 2, H / 2, 1.6);
    if (e.key === '-') zoomAt(W / 2, H / 2, 1 / 1.6);
    if (e.key === 'Escape') { const c = here(); flyTo(c.length > 2 ? 'projects' : 'meadow'); }
  });
  crumbs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) flyTo(b.dataset.go); });

  // Index: the plain list, for anyone who'd rather not wander
  const idx = document.getElementById('bl-index');
  idx.innerHTML = Object.entries(SEC).map(([id, s]) => `<button data-go="${id}">${s.title}</button>` + (id === 'projects' ? D.projects.map((p, i) => `<button class="sub" data-go="p${i}">${esc(p.title)}</button>`).join('') : '')).join('');
  document.getElementById('bl-index-btn').addEventListener('click', () => { idx.hidden = !idx.hidden; });
  idx.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) { flyTo(b.dataset.go); idx.hidden = true; } });
  // the "pick it here" rows inside the Projects card
  world.addEventListener('click', (e) => { const r = e.target.closest('.bl-card [data-go]'); if (r) flyTo(r.dataset.go); });

  // Where am I? → breadcrumbs
  function here() {
    const out = [['meadow', 'meadow']];
    if (cam.s < 1.6) return out;
    let best = null, bd = 1e9;
    for (const [id, s] of Object.entries(SEC)) { const d = Math.hypot(s.x - cam.x, s.y - cam.y) - (id === 'projects' ? 380 : 0); if (d < bd) { bd = d; best = id; } }
    if (bd > 900 / cam.s + 500) return out;
    out.push([best, SEC[best].title]);
    if (best === 'projects' && cam.s > 6) {
      let bp = -1, bpd = 1e9;
      D.projects.forEach((p, i) => { const f = FRAME['p' + i], d = Math.hypot(f.x - cam.x, f.y - cam.y); if (d < bpd) { bpd = d; bp = i; } });
      if (bpd < 200) out.push(['p' + bp, D.projects[bp].title]);
    }
    return out;
  }

  // ── Grass seen from above, drawn on the canvas under the world ──
  const rnd = seeded('meadow'), TUFTS = Array.from({ length: 2600 }, () => [rnd() * (PORT ? 3200 : 4400) - (PORT ? 600 : 700), rnd() * (PORT ? 4400 : 3200) - (PORT ? 700 : 600), ".,'`;:\"*"[(rnd() * 8) | 0], rnd()]);
  const gx = grass.getContext('2d');
  function drawGrass(t) {
    gx.clearRect(0, 0, W, H);
    const fs = clamp(7 * Math.pow(cam.s, 0.55), 6, 26);
    gx.font = `${fs}px 'JetBrains Mono', monospace`; gx.textAlign = 'center';
    for (const [x, y, ch, r] of TUFTS) {
      const sx = (x - cam.x) * cam.s + W / 2, sy = (y - cam.y) * cam.s + H / 2;
      if (sx < -20 || sy < -20 || sx > W + 20 || sy > H + 20) continue;
      gx.fillStyle = ch === '*' ? (r > 0.5 ? '#ff8a8a55' : '#e6c34a55') : r > 0.66 ? '#4f8a4f88' : r > 0.33 ? '#3f6b3f99' : '#2f5a3aaa';
      gx.fillText(ch, sx + Math.sin(t * 0.8 + r * 9) * 1.5, sy);
    }
    // finer grass appears as you zoom in, level by level, so the ground never goes empty
    const lv = Math.log2(cam.s * 1.4), L0 = Math.floor(lv), fr = lv - L0;
    gx.font = `11px 'JetBrains Mono', monospace`;
    const [x0, y0] = toWorld(0, 0), [x1, y1] = toWorld(W, H);
    for (const L of [L0, L0 + 1]) {
      const g = 110 / Math.pow(2, L), a = L === L0 ? 1 - fr * 0.5 : fr;
      for (let i = Math.floor(x0 / g); i <= x1 / g; i++) for (let j = Math.floor(y0 / g); j <= y1 / g; j++) {
        let h = (i * 374761393 + j * 668265263 + L * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); const r = ((h ^ (h >>> 16)) >>> 0) / 4294967296;
        if (r > 0.55) continue;
        const sx = ((i + ((r * 1.7) % 1)) * g - cam.x) * cam.s + W / 2, sy = ((j + ((r * 7.3) % 1)) * g - cam.y) * cam.s + H / 2;
        gx.globalAlpha = a * (0.35 + r);
        gx.fillStyle = r < 0.03 ? '#ff8a8a' : r < 0.06 ? '#e6c34a' : r < 0.3 ? '#3f6b3f' : '#2f5a3a';
        gx.fillText(r < 0.06 ? '*' : ".,'`;:|"[((r * 70) | 0) % 7], sx + Math.sin(t + r * 20) * 1.2, sy);
      }
    }
    gx.globalAlpha = 1;
  }

  // ── A butterfly that keeps you company at screen scale ──
  let fly = null;
  if (window.AsciiFlyer) {
    const host = document.getElementById('bl-fly');
    const bf = new window.AsciiFlyer(host.firstElementChild, { cols: 23, rows: 17, cell: 3, font: 1.3 });
    bf.sampleBackground = () => {}; bf.ink = '#f4f4f4'; bf.accent = '#ff8a8a';
    fly = { host, bf, p: [W * 0.7, H * 0.3], t: 0 };
  }

  // ── Frame ──
  let lastCrumb = '', last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (tween) tween(now);
    world.style.transform = `translate(${(W / 2 - cam.x * cam.s).toFixed(2)}px, ${(H / 2 - cam.y * cam.s).toFixed(2)}px) scale(${cam.s.toFixed(4)})`;
    if (now - settle > 180 && world.style.willChange) world.style.willChange = '';    // re-raster crisp once still
    for (const n of nodes) {
      const [a0, a1, b0, b1] = n.lod, s = cam.s;
      let op = clamp(a1 > a0 ? (s - a0) / (a1 - a0) : 1, 0, 1) * clamp(b1 > b0 ? 1 - (s - b0) / (b1 - b0) : 1, 0, 1);
      if (n.floor && s > b0 && s < 6) op = Math.max(op, n.floor * clamp((6 - s) / 2, 0, 1));       // the opened flower stays as a faint bed under its card
      if (Math.abs(op - n.op) < 0.01) continue;
      n.op = op;
      n.el.style.opacity = op.toFixed(2);
      n.el.style.visibility = op < 0.02 ? 'hidden' : '';
      n.el.style.pointerEvents = op < 0.5 ? 'none' : '';
      // flowers "open": the art swells as it fades, the card settles in from slightly smaller
      const grow = n.lod[2] < 99 ? 1 + (1 - op) * 0.5 : 0.92 + op * 0.08;
      n.el.style.transform = `translate(${n.x}px, ${n.y}px) scale(${(n.k * grow).toFixed(4)}) translate(-50%, -50%)`;
    }
    drawGrass(now / 1000);
    const c = here(), key = c.map((x) => x[0]).join('/');
    if (key !== lastCrumb) {
      lastCrumb = key;
      crumbs.innerHTML = c.map(([id, t]) => `<button type="button" data-go="${id}">${esc(t)}</button>`).join('<span>/</span>');
    }
    const lk = (Math.log(cam.s) - Math.log(FIT * 0.8)) / (Math.log(MAX) - Math.log(FIT * 0.8));
    leaf.style.top = `calc(${((1 - lk) * 100).toFixed(1)}% - 4px)`;
    if (fly) {
      fly.t += dt;
      const last2 = c[c.length - 1][0], n = nodes.find((x) => x.id === last2) || null;
      const tgt = n ? [(n.x - cam.x) * cam.s + W / 2 + 150 * Math.min(1, cam.s / 5), (n.y - cam.y) * cam.s + H / 2 - 120] : [W * 0.72 + Math.sin(fly.t * 0.4) * W * 0.12, H * 0.3 + Math.sin(fly.t * 0.9) * 60];
      tgt[0] = clamp(tgt[0] + Math.sin(fly.t * 1.3) * 30, 40, W - 60); tgt[1] = clamp(tgt[1] + Math.cos(fly.t * 1.7) * 20, 60, H - 60);
      fly.p[0] += (tgt[0] - fly.p[0]) * Math.min(1, dt * 1.5); fly.p[1] += (tgt[1] - fly.p[1]) * Math.min(1, dt * 1.5);
      fly.bf.frame(dt, { landed: !tween && Math.hypot(tgt[0] - fly.p[0], tgt[1] - fly.p[1]) < 30 });
      fly.host.style.transform = `translate(${(fly.p[0] - 35) | 0}px, ${(fly.p[1] - 26) | 0}px)`;
    }
  }
  requestAnimationFrame(frame);

  // Deep link, else start on the meadow and drift toward the heart
  const [h0, h1] = location.hash.slice(1).split('/');
  if (h0 === 'projects' && h1) { const i = D.projects.findIndex((p) => p.slug === h1); if (i >= 0) setTimeout(() => flyTo('p' + i), 300); }
  else if (SEC[h0]) setTimeout(() => flyTo(h0), 300);
})();
