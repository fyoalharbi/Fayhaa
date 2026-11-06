// Experiment 01 · Expedition: five places in the 3D garden are the five sections.
// Uses the live Garden3D engine as-is: the camera is steered by overriding this
// instance's shotTarget(), never by editing garden3d.js.
(function () {
  const D = window.EXP, { esc, decode } = window.KIT;
  const ex = document.getElementById('ex'), body = document.getElementById('ex-body'), card = document.getElementById('ex-card');
  const titleEl = document.getElementById('ex-title'), whereEl = document.getElementById('ex-where'), nEl = document.getElementById('ex-n'), travelEl = document.getElementById('ex-travel');
  const pinsEl = document.getElementById('ex-pins'), svg = document.getElementById('ex-lines'), trail = document.getElementById('ex-trail');
  const PHONE = matchMedia('(max-width: 760px)').matches;

  const cv = document.getElementById('ex-canvas'), g = new window.Garden3D(cv);
  g.slowSpin = true;
  const far = g.heads.reduce((a, h) => (Math.hypot(h.x, h.z) > Math.hypot(a.x, a.z) ? h : a), g.heads[0]);
  const H = g.hive;
  const LOCS = [
    { id: 'about', title: 'About', where: 'the white butterfly', glyph: '}{', to: () => [g.flyers[0].p, PHONE ? 3.2 : 2.5], pitch: 0.34 },
    { id: 'projects', title: 'Projects', where: 'the flower beds', glyph: '*@*', to: () => [[0, 0.4, 0], PHONE ? 8 : 6.4], pitch: 0.8 },
    { id: 'skills', title: 'Skills', where: 'the hive', glyph: '<#>', to: () => [[H.x * 0.6, 0.6, H.z * 0.6], PHONE ? 6.5 : 5], pitch: 0.55 },
    { id: 'blog', title: 'Blog', where: 'the farthest flower', glyph: '[=]', to: () => [[far.x, far.y, far.z], 3.2], pitch: 0.42 },
    { id: 'contact', title: 'Contact', where: 'under the moon', glyph: '( )', to: () => [[0, 1.4, 0], 7.5], pitch: 0.05 },
  ];
  let cur = 0, flightT = 0, detail = null, hotSkill = null;
  g.shot = 'about';
  g.shotTarget = () => LOCS[cur].to();

  // ── Trail map ──
  trail.innerHTML = LOCS.map((L, i) => (i ? `<span class="ex-path" data-i="${i}">${PHONE ? '···' : '·····'}</span>` : '') +
    `<button class="ex-stop" data-i="${i}" type="button"><pre>${esc(L.glyph)}</pre><span>${L.title}</span></button>`).join('');
  trail.addEventListener('click', (e) => { const b = e.target.closest('.ex-stop'); if (b) go(+b.dataset.i); });
  addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go((cur + 1) % LOCS.length);
    if (e.key === 'ArrowLeft') go((cur + LOCS.length - 1) % LOCS.length);
    if (e.key >= '1' && e.key <= '5') go(+e.key - 1);
    if (e.key === 'Escape' && detail) { detail = null; render(); }
  });
  document.getElementById('ex-grip').addEventListener('click', () => card.classList.toggle('is-open'));

  // ── Project pins on real flowers ──
  const spots = g.spreadFlowers(D.projects.length);
  pinsEl.innerHTML = D.projects.map((p, i) => `<a class="ex-pin" data-i="${i}" href="#projects/${p.slug}"><b>${String(i + 1).padStart(2, '0')}</b><span> ${esc(p.title)}</span></a>`).join('');
  const pins = [...pinsEl.children];
  pinsEl.addEventListener('click', (e) => {
    const a = e.target.closest('.ex-pin'); if (!a) return;
    e.preventDefault(); openProject(+a.dataset.i);
  });
  pinsEl.addEventListener('mouseover', (e) => { const a = e.target.closest('.ex-pin'); hover(a ? +a.dataset.i : -1); });
  pinsEl.addEventListener('mouseout', () => hover(-1));
  function hover(i) { body.querySelectorAll('.ex-proj').forEach((r) => r.classList.toggle('is-hot', +r.dataset.i === i)); pins.forEach((p, k) => p.classList.toggle('is-hot', k === i || (hotSkill && D.projects[k].skills.some((s) => s.key === hotSkill)))); }

  // Every frame: pins follow their flowers, callout lines are redrawn
  function tick() {
    requestAnimationFrame(tick);
    if (flightT > 0) { flightT -= 1 / 60; g.pitch += (LOCS[cur].pitch - g.pitch) * 0.04; }
    const L = LOCS[cur].id, show = L === 'projects' || (L === 'skills' && hotSkill);
    let d = '';
    const hexEl = hotSkill && body.querySelector('.ex-hex.is-on');
    const hb = hexEl && hexEl.getBoundingClientRect();
    const ox = cv.getBoundingClientRect().left, cardL = PHONE ? 1e9 : card.getBoundingClientRect().left - 12;
    spots.forEach((h, i) => {
      const s0 = g.toScreen([h.x, h.y, h.z]), s = s0 && s0[0] + ox < cardL ? [s0[0] + ox, s0[1], s0[2]] : null, pin = pins[i];
      if (!s || !show) { pin.style.visibility = s ? '' : 'hidden'; return; }
      pin.style.visibility = '';
      const up = 34 + (i % 3) * 16, side = i % 2 ? 18 : -18 - pin.offsetWidth;
      const px = s[0] + side, py = s[1] - up;
      pin.style.transform = `translate(${Math.min(px, cardL - pin.offsetWidth).toFixed(0)}px, ${py.toFixed(0)}px)`;
      const on = L === 'projects' || pin.classList.contains('is-hot');
      if (!on) return;
      const ax = i % 2 ? px : px + pin.offsetWidth, ay = py + pin.offsetHeight / 2;
      d += `M${ax},${ay} L${(s[0] + (i % 2 ? 8 : -8)).toFixed(0)},${ay} L${s[0].toFixed(0)},${s[1].toFixed(0)} `;
      if (hb && pin.classList.contains('is-hot')) d += `M${hb.left + hb.width / 2},${hb.top + hb.height / 2} Q${(hb.left + s[0]) / 2},${Math.min(hb.top, s[1]) - 80} ${s[0].toFixed(0)},${s[1].toFixed(0)} `;
    });
    svg.innerHTML = d ? `<path d="${d}"/>` + spots.map((h) => { const s = g.toScreen([h.x, h.y, h.z]); return s && show && s[0] + ox < cardL ? `<circle cx="${(s[0] + ox) | 0}" cy="${s[1] | 0}" r="1.6"/>` : ''; }).join('') : '';
  }
  requestAnimationFrame(tick);

  // ── Cards ──
  const sec = (s) => `<p class="ex-sec">${s}</p>`;
  const thumb = (p, cls) => `<div class="${cls}" style="${p.thumb ? `background-image:url('${p.thumb}')` : ''}"></div>`;
  const CARDS = {
    about: () => `${sec('specimen · data engineer')}
      <p class="ex-lead">${esc(D.intro)}</p>
      <p class="ex-quote">“${esc(D.philosophy.paragraphs[1])}” <a href="${D.papillon}" style="color:var(--red)">why butterflies ↗</a></p>
      ${sec('flight path')}
      ${D.experience.map((e) => `<div class="ex-row"><b>${esc(e.title)}</b><small>${esc(e.period)}</small><span>${esc(e.org)} — ${esc(e.points[0])}</span></div>`).join('')}
      ${sec('roots')}
      ${D.education.map((e) => `<div class="ex-row"><b>${esc(e.title)}</b><small>${esc(e.period)}</small><span>${esc(e.org)}${e.note ? ' · ' + esc(e.note) : ''}</span></div>`).join('')}
      ${D.certifications.map((e) => `<div class="ex-row"><b>${esc(e.title)}</b><small>${esc(e.period)}</small><span>${esc(e.org)}</span></div>`).join('')}`,
    projects: () => detail != null ? projectDetail(D.projects[detail]) : `${sec(`${D.projects.length} flowers in the beds`)}
      <p class="ex-p">Each flower carries one project. Pick one here or on the garden.</p>
      ${D.projects.map((p, i) => `<button class="ex-proj" data-i="${i}" type="button">${thumb(p, 'th')}<div><b>${esc(p.title)}</b><span>${esc(p.sub || p.summary.slice(0, 70))}</span></div></button>`).join('')}`,
    skills: () => {
      const groups = [...new Set(D.skills.map((s) => s.group))];
      return `${sec('the hive')}<p class="ex-p">Bees stay close to home, so this is where the everyday tools live. Hover a cell to see the flowers it pollinated.</p>` +
        groups.map((gr) => { const ss = D.skills.filter((s) => s.group === gr && s.used.length); return `${sec(esc(ss[0]?.groupLabel || gr))}<div class="ex-hive-wrap"><div class="ex-hive">${ss.map((s) => `<button class="ex-hex ${s.core ? 'is-core' : ''}" data-k="${s.key}" type="button"><i>${esc(s.label)}</i></button>`).join('')}</div></div>`; }).join('') +
        `<p class="ex-legend">gold cells = core · ${D.workflow.join(' → ')}</p>`;
    },
    blog: () => `${sec('notes left at the edge')}<p class="ex-p">The farthest flower is where the butterfly leaves what it learned.</p>
      ${D.posts.map((p) => `<a class="ex-row" href="${p.href}" style="text-decoration:none"><b>${esc(p.title)}</b><small>${esc(p.date)}</small><span>${esc(p.summary)}</span></a>`).join('')}`,
    contact: () => `${sec('send a signal')}<p class="ex-lead">${esc('Email is the fastest way to reach me.')}</p>
      <p style="margin:16px 0"><a class="ex-link" href="mailto:${D.email}" style="font-size:13px;padding:10px 12px;border-color:#ff8a8a88">${esc(D.email)} ↗</a></p>
      <a class="ex-link" href="${D.links.linkedin}">LinkedIn ↗</a><a class="ex-link" href="${D.links.github}">GitHub ↗</a>
      ${sec('or')}<p class="ex-p">Watch the fireflies a while. They blink back.</p>`,
  };
  function projectDetail(p) {
    return `<button class="ex-back" type="button" data-back>← all flowers</button>
      ${thumb(p, 'ex-shot')}
      <p class="ex-sec">${esc(p.date)}${p.featured ? ' · featured' : ''}</p>
      <h2 style="margin:0 0 4px;font:400 24px/1.15 var(--serif);font-style:italic">${esc(p.title)}</h2>
      <p class="ex-p" style="color:var(--dim)">${esc(p.sub)}</p>
      <p class="ex-p">${esc(p.summary)}</p>
      ${sec('result')}<p class="ex-p">${esc(p.tldr.result)}</p>
      <p class="ex-tags">${p.skills.slice(0, 6).map((s) => esc(s.label)).join(' · ')}${p.skills.length > 6 ? ` · +${p.skills.length - 6}` : ''}</p>
      <a class="ex-link" href="${p.href}">Case study →</a>${p.live ? `<a class="ex-link" href="${p.live}">Live demo ↗</a>` : ''}${p.code ? `<a class="ex-link" href="${p.code}">Code ↗</a>` : ''}`;
  }
  body.addEventListener('click', (e) => {
    const pr = e.target.closest('.ex-proj'); if (pr) return openProject(+pr.dataset.i);
    if (e.target.closest('[data-back]')) { detail = null; render(); history.replaceState(null, '', '#projects'); }
  });
  body.addEventListener('mouseover', (e) => {
    const pr = e.target.closest('.ex-proj'); if (pr) hover(+pr.dataset.i);
    const hx = e.target.closest('.ex-hex');
    if (hx) { hotSkill = hx.dataset.k; body.querySelectorAll('.ex-hex').forEach((x) => x.classList.toggle('is-on', x === hx)); hover(-1); }
  });
  body.addEventListener('mouseout', (e) => { if (e.target.closest('.ex-hex') && !e.relatedTarget?.closest?.('.ex-hex')) { hotSkill = null; body.querySelectorAll('.ex-hex').forEach((x) => x.classList.remove('is-on')); hover(-1); } else hover(-1); });

  function openProject(i) {
    detail = i;
    if (LOCS[cur].id !== 'projects') go(1, true); else render();
    history.replaceState(null, '', '#projects/' + D.projects[i].slug);
    card.classList.add('is-open');
    const h = spots[i], k = g.heads.indexOf(h);
    if (k >= 0) g.flyers[0].target = k;            // the butterfly goes to visit it
  }
  function render() {
    const L = LOCS[cur];
    body.innerHTML = CARDS[L.id]();
    body.scrollTop = 0;
    body.querySelectorAll('.ex-sec, .ex-p, .ex-lead').forEach((el, k) => { if (k < 6) decode(el, el.textContent, { delay: k * 60, dur: 500 }); });
  }

  function go(i, keepDetail) {
    if (i === cur && flightT > 0) return;
    const from = cur; cur = i; flightT = 2.2;
    if (!keepDetail) detail = null;
    hotSkill = null;
    const L = LOCS[i];
    ex.dataset.loc = L.id; ex.classList.add('is-flying');
    g.shot = L.id; g.idle = 0;
    if (L.id === 'blog') g.flyers[0].target = g.heads.indexOf(far);
    trail.querySelectorAll('.ex-stop').forEach((b) => b.classList.toggle('is-on', +b.dataset.i === i));
    trail.querySelectorAll('.ex-path').forEach((p) => p.classList.toggle('is-walked', +p.dataset.i <= i));
    nEl.textContent = `0${i + 1} / 0${LOCS.length}`;
    if (from !== i) decode(travelEl, `flying to ${L.where} ${'·'.repeat(8)}`, { dur: 600 });
    clearTimeout(go.t);
    go.t = setTimeout(() => {
      ex.classList.remove('is-flying');
      decode(titleEl, L.title, { dur: 500 }); whereEl.textContent = L.where; travelEl.textContent = '';
      render();
      if (!keepDetail) history.replaceState(null, '', '#' + L.id);
    }, from === i ? 0 : 1000);
  }

  // Deep links: #projects, #projects/<slug>, #skills …
  const [h0, h1] = location.hash.slice(1).split('/');
  const start = Math.max(0, LOCS.findIndex((L) => L.id === h0));
  cur = -1; go(start);
  if (h1) { const i = D.projects.findIndex((p) => p.slug === h1); if (i >= 0) setTimeout(() => openProject(i), 1100); }
})();
