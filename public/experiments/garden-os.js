// Experiment 02 · Garden OS: a persistent living garden; each section is a window
// that grows out of its flower and stays tied to it by a vine.
(function () {
  const D = window.EXP, { esc, decode, asciiImage, seeded } = window.KIT;
  const os = document.getElementById('os'), desk = document.getElementById('os-desk'), vines = document.getElementById('os-vines'), labels = document.getElementById('os-labels');
  const PHONE = () => matchMedia('(max-width: 760px)').matches;

  // ── The garden: five tall section flowers among wild ones ──
  const SECTIONS = [
    { id: 'about', file: 'about.txt', tone: 'white', x: 0.13 },
    { id: 'projects', file: 'projects/', tone: 'red', x: 0.32 },
    { id: 'skills', file: 'skills.map', tone: 'gold', x: 0.52 },
    { id: 'blog', file: 'blog/', tone: 'violet', x: 0.7 },
    { id: 'contact', file: 'contact.sh', tone: 'blush', x: 0.88 },
  ];
  const rnd = seeded('os');
  const plants = SECTIONS.map((s, i) => ({ x: s.x, h: 0.3 + (i % 2) * 0.06, R: PHONE() ? 5 : 8, petals: 6 + (i % 3), tone: s.tone, open: 0.7, base: 0.7, ph: i * 1.3, sec: s.id }));
  for (let i = 0; i < 26; i++) {
    const x = (i + rnd()) / 26;
    if (SECTIONS.some((s) => Math.abs(s.x - x) < 0.035)) continue;
    plants.push({ x, h: 0.06 + rnd() * 0.18, R: 2 + ((rnd() * 3) | 0), petals: 5 + ((rnd() * 3) | 0), tone: ['red', 'gold', 'white', 'violet', 'orange'][(rnd() * 5) | 0], open: 0.5 + rnd() * 0.5, ph: rnd() * 6 });
  }
  const g = new window.KIT.Garden2D(document.getElementById('os-canvas'), { plants, font: 12, groundRows: 3, butterfly: true, stars: 0.008, bushes: 7 });

  labels.innerHTML = SECTIONS.map((s, i) => `<button class="os-lab" data-i="${i}" type="button">${s.file}</button>`).join('');
  const labs = [...labels.children];
  labels.addEventListener('click', (e) => { const b = e.target.closest('.os-lab'); if (b) open(SECTIONS[+b.dataset.i].id); });
  // Clicking on a section flower in the canvas opens it too
  document.getElementById('os-garden').addEventListener('click', (e) => {
    let best = -1, bd = 60;
    SECTIONS.forEach((s, i) => { const h = g.head(i); const d = h && Math.hypot(h[0] - e.clientX, h[1] - e.clientY); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) open(SECTIONS[best].id);
  });

  // ── Windows ──
  const wins = new Map(); let z = 10, topId = null;
  const tick = () => { const d = new Date(); document.getElementById('os-clock').textContent = `${D.name.toLowerCase()}@garden · ${d.toTimeString().slice(0, 5)}`; };
  tick(); setInterval(tick, 20000);

  const CONTENT = {
    about: { title: 'about.txt', meta: `${D.experience.length} roles`, w: 380, h: 470, html: () => `
      <p class="os-m"><b>name</b> ${esc(D.name)} · <b>role</b> ${esc(D.role)}</p>
      <h2>${esc(D.name)}, ${esc(D.role.toLowerCase())}.</h2>
      <p>${esc(D.intro)}</p>
      <hr class="os-hr"><p class="os-m">// flight path</p>
      ${D.experience.map((e) => `<div class="os-job"><b>${esc(e.title)}</b><small>${esc(e.org)} · ${esc(e.period)}</small>${esc(e.points[0])}</div>`).join('')}
      <hr class="os-hr"><p class="os-m">// roots</p>
      ${D.education.map((e) => `<div class="os-job"><b>${esc(e.title)}</b><small>${esc(e.org)} · ${esc(e.period)}${e.note ? ' · ' + esc(e.note) : ''}</small></div>`).join('')}
      <hr class="os-hr"><p class="os-m">// ${esc(D.philosophy.title.toLowerCase())}</p><p style="font:italic 13.5px/1.6 var(--serif)">${esc(D.philosophy.paragraphs[1])}</p>` },
    projects: { title: 'projects/', meta: `${D.projects.length} items`, w: 520, h: 470, html: () => `
      <div class="os-files">${D.projects.map((p, i) => `<button class="os-file" data-p="${i}" type="button"><div class="th">${p.thumb ? `<img src="${p.thumb}" alt="" loading="lazy"><canvas data-src="${p.thumb}"></canvas>` : `<pre style="margin:0;padding:8px;font:7px/1.1 var(--mono);color:var(--leaf)">${window.KIT.flowerHTML({ R: 7, seed: i + 3, stem: 4 })}</pre>`}</div><b>${esc(p.title)}</b><span>${p.year} · ${esc(p.skills[0]?.label || '')}</span></button>`).join('')}</div>` },
    skills: { title: 'skills.map', meta: 'tree', w: 340, h: 500, html: () => {
      const groups = [...new Set(D.skills.map((s) => s.group))];
      let t = `<span class="c">~/skills</span>  <i>${D.workflow.join(' → ').toLowerCase()}</i>\n`;
      groups.forEach((gr, gi) => {
        const ss = D.skills.filter((s) => s.group === gr && s.used.length), last = gi === groups.length - 1;
        t += `${last ? '└' : '├'}── ${esc(ss[0].groupLabel.toLowerCase())}/\n`;
        ss.forEach((s, k) => { t += `${last ? ' ' : '│'}   ${k === ss.length - 1 ? '└' : '├'}── <button data-k="${s.key}" type="button" class="${s.core ? 'c' : ''}">${esc(s.label)}</button> <i>${'·'.repeat(s.used.length)} ${s.used.length}</i>\n`; });
      });
      return `<pre class="os-tree">${t}</pre><p class="os-m" style="margin-top:10px">hover a skill: its projects light up in projects/ · <b>gold</b> = core</p>`; } },
    blog: { title: 'blog/', meta: `${D.posts.length} notes`, w: 420, h: 330, html: () => D.posts.map((p) => `<a class="os-post" href="${p.href}"><small>${esc(p.date)} · ${esc(p.tags.join(', '))}</small><b>${esc(p.title)}</b><span class="os-m">${esc(p.summary)}</span></a>`).join('') },
    contact: { title: 'contact.sh', meta: 'bash', w: 400, h: 300, html: () => `<div class="os-term">
      <div><span class="pr">$</span> ./contact.sh</div>
      <div class="out">email is the fastest way to reach me.</div><br>
      <a class="os-btn" href="mailto:${D.email}">mail ${esc(D.email)}</a><button class="os-btn" type="button" data-copy>copy</button><br>
      <a class="os-btn" href="${D.links.linkedin}">linkedin ↗</a><a class="os-btn" href="${D.links.github}">github ↗</a><br><br>
      <div><span class="pr">$</span> <span class="os-caret"></span></div></div>` },
  };

  function placeFor(id) {
    // desktop: each section has its own spot on the desk, above its flower, so windows tile instead of piling up
    const SPOT = { about: [0.015, 48], projects: [0.285, 60], skills: [0.665, 48], blog: [0.55, 110], contact: [0.62, 170] };
    const i = SECTIONS.findIndex((s) => s.id === id), h = g.head(i) || [innerWidth / 2, innerHeight / 2], C = CONTENT[id];
    const w = Math.min(C.w, innerWidth - 40);
    const x = Math.max(16, Math.min(innerWidth - w - 16, (SPOT[id] || [0.3])[0] * innerWidth));
    const y = (SPOT[id] || [0, 60])[1];
    const hh = Math.max(220, Math.min(C.h, h[1] - 70 - y));
    return { x, y, w, h: hh, ox: h[0] - x, oy: h[1] - y };
  }
  function open(id, proj) {
    const key = proj != null ? 'p:' + proj : id;
    if (wins.has(key)) return focus(key);
    if (PHONE()) [...wins.keys()].forEach((k) => close(k, true));
    const C = proj != null ? projectWin(D.projects[proj]) : CONTENT[id];
    const el = document.createElement('section');
    el.className = 'os-win'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', C.title);
    const P = placeFor(id);
    if (proj != null) { const pw = wins.get('projects'); if (pw) { const r = pw.el.getBoundingClientRect(); P.x = Math.min(innerWidth - P.w - 16, r.right - 80); P.y = Math.max(44, r.top + 40); } }
    Object.assign(el.style, { left: P.x + 'px', top: P.y + 'px', width: P.w + 'px', height: P.h + 'px', '--ox': P.ox + 'px', '--oy': P.oy + 'px' });
    el.style.setProperty('--ox', P.ox + 'px'); el.style.setProperty('--oy', P.oy + 'px');
    el.innerHTML = `<div class="os-tb"><b>◇</b><span class="os-t">${esc(C.title)}</span><em>${esc(C.meta)}</em><button class="os-x" type="button" aria-label="Close">×</button></div><div class="os-body">${C.html()}</div>`;
    desk.appendChild(el);
    wins.set(key, { el, sec: id });
    decode(el.querySelector('.os-t'), C.title, { dur: 500 });
    el.querySelectorAll('canvas[data-src]').forEach((c) => asciiImage(c, c.dataset.src, { cell: 5 }));
    el.addEventListener('pointerdown', () => focus(key));
    el.querySelector('.os-x').addEventListener('click', (e) => { e.stopPropagation(); close(key); });
    drag(el, el.querySelector('.os-tb'));
    wire(el, key);
    focus(key);
    document.getElementById('os-tip').style.opacity = 0;
    layout();
  }
  function projectWin(p) {
    return { title: p.slug + '.md', meta: String(p.year), w: 420, h: 520, html: () => `
      ${p.thumb ? `<img class="os-shot" src="${p.thumb}" alt="">` : ''}
      <h2>${esc(p.title)}</h2><p class="os-m">${esc(p.sub)}</p><p>${esc(p.summary)}</p>
      <p class="os-m"><b>problem</b> ${esc(p.tldr.problem)}</p><p class="os-m"><b>result</b> ${esc(p.tldr.result)}</p>
      <p class="os-m" style="color:var(--leaf)">${p.skills.slice(0, 5).map((s) => esc(s.label)).join(' · ')}${p.skills.length > 5 ? ' · +' + (p.skills.length - 5) : ''}</p>
      <a class="os-btn" href="${p.href}">case study →</a>${p.live ? `<a class="os-btn" href="${p.live}">live demo ↗</a>` : ''}${p.code ? `<a class="os-btn" href="${p.code}">code ↗</a>` : ''}` };
  }
  function wire(el, key) {
    el.addEventListener('click', (e) => {
      const f = e.target.closest('.os-file'); if (f) open('projects', +f.dataset.p);
      if (e.target.closest('[data-copy]')) { navigator.clipboard?.writeText(D.email); e.target.textContent = 'copied ✓'; }
    });
    el.addEventListener('mouseover', (e) => {
      const b = e.target.closest('.os-tree button'); if (!b) return;
      const k = b.dataset.k, pw = wins.get('projects');
      el.querySelectorAll('.os-tree button').forEach((x) => x.classList.toggle('is-on', x === b));
      if (!pw) open('projects'), focus(key);
      const w = wins.get('projects');
      w.el.querySelectorAll('.os-file').forEach((f) => { const on = D.projects[+f.dataset.p].skills.some((s) => s.key === k); f.classList.toggle('is-hot', on); f.classList.toggle('is-dim', !on); });
    });
    el.addEventListener('mouseleave', () => { const w = wins.get('projects'); if (w && key === 'skills') w.el.querySelectorAll('.os-file').forEach((f) => f.classList.remove('is-hot', 'is-dim')); });
  }
  function focus(key) {
    const w = wins.get(key); if (!w) return;
    w.el.style.zIndex = ++z; topId = key;
    wins.forEach((v, k) => v.el.classList.toggle('is-top', k === key));
    g.focus = SECTIONS.findIndex((s) => s.id === w.sec);      // the butterfly flies to that flower
    labs.forEach((l, i) => l.classList.toggle('is-open', [...wins.values()].some((v) => v.sec === SECTIONS[i].id)));
  }
  function close(key, now) {
    const w = wins.get(key); if (!w) return;
    wins.delete(key);
    const done = () => w.el.remove();
    if (now) done(); else { w.el.classList.add('is-closing'); setTimeout(done, 380); }
    const rest = [...wins.keys()];
    if (rest.length) focus(rest[rest.length - 1]); else { g.focus = -1; topId = null; labs.forEach((l) => l.classList.remove('is-open')); }
    layout();
  }
  function drag(el, bar) {
    let s = null;
    bar.addEventListener('pointerdown', (e) => { if (PHONE() || e.target.closest('button')) return; s = [e.clientX - el.offsetLeft, e.clientY - el.offsetTop]; bar.setPointerCapture(e.pointerId); bar.style.cursor = 'grabbing'; });
    bar.addEventListener('pointermove', (e) => { if (!s) return; el.style.left = Math.max(-200, Math.min(innerWidth - 80, e.clientX - s[0])) + 'px'; el.style.top = Math.max(30, Math.min(innerHeight - 40, e.clientY - s[1])) + 'px'; });
    bar.addEventListener('pointerup', () => { s = null; bar.style.cursor = ''; });
  }
  // Phones: the garden shrinks above the open sheet so its flowers stay in view
  function layout() {
    const gd = document.getElementById('os-garden');
    gd.style.bottom = PHONE() && wins.size ? '58vh' : '0';
    g.resize();
  }

  // ── Vines from each window to its flower; plaques under the flowers ──
  g.onFrame = () => {
    let d = '', dTop = '';
    SECTIONS.forEach((s, i) => {
      const h = g.head(i); if (!h) return;
      labs[i].style.transform = `translate(${(h[0] - labs[i].offsetWidth / 2) | 0}px, ${(h[1] + 46) | 0}px)`;
    });
    wins.forEach((w, key) => {
      const i = SECTIONS.findIndex((s) => s.id === w.sec), h = g.head(i); if (!h) return;
      const r = w.el.getBoundingClientRect();
      const ax = Math.max(r.left + 20, Math.min(r.right - 20, h[0])), ay = r.bottom > h[1] ? r.top : r.bottom;
      const mx = (ax + h[0]) / 2 + Math.sin(performance.now() / 900 + i) * 14, my = Math.max(ay, h[1]) + 30;
      const seg = `M${ax | 0},${ay | 0} Q${mx | 0},${my | 0} ${h[0] | 0},${(h[1] - 4) | 0} `;
      if (key === topId) dTop += seg; else d += seg;
    });
    vines.innerHTML = `<path d="${d}"/><path class="is-top" d="${dTop}"/>`;
  };

  addEventListener('keydown', (e) => { if (e.key === 'Escape' && topId) close(topId); });
  addEventListener('resize', layout);
  const deep = location.hash.slice(1);
  setTimeout(() => open(SECTIONS.some((s) => s.id === deep) ? deep : 'about'), 700);
})();
