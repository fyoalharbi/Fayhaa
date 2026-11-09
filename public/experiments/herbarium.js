// The home page (Herbarium): the garden along the foot of the landing, the scroll lock from section to
// section, and the section rail. Everything shared with the other pages is in js/herb.js.
(function () {
  const { Garden2D, REDUCED } = window.KIT;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wide = () => !matchMedia('(max-width: 860px)').matches;
  // Keep your place when switching language
  const lang = $('.hb-lang'); if (lang) lang.addEventListener('click', () => { const on = $('.hb-rail a.is-on'); if (on) lang.href = lang.href.split('#')[0] + '#' + on.dataset.id; });

  // ── Garden band along the foot of the landing, paused once it scrolls away ──
  const hero = $('.hb-hero'), gwrap = $('.hb-gwrap'), gc = $('#hb-garden');
  const placeBand = () => { gwrap.style.top = (hero.getBoundingClientRect().bottom + scrollY - gwrap.offsetHeight) + 'px'; };
  placeBand();
  const g = new Garden2D(gc, { plants: 44, depth: 34, font: 11, groundRows: 3, butterfly: false, moon: false, stars: 0.003, seed: 'herb', bushes: 10 });
  new IntersectionObserver(([e]) => { g.paused = !e.isIntersecting; }).observe(gc);
  addEventListener('resize', () => { placeBand(); g.resize(); });

  // ── Scroll lock, section to section: when the reader's own scrolling stops between two stops, glide to the
  //    one they were heading for (a small nudge falls back). Stops, in page order: the landing, the Projects
  //    heading with the first featured project, each further featured project (one screen each), the collection link
  //    (centred), then each section.
  //    A section taller than the screen is entered at its top going down and at its bottom going up, and
  //    scrolls freely inside, so nothing is skipped. ──
  const more = $('.hb-explore.is-coll'), oneUp = matchMedia('(min-width: 861px) and (min-height: 620px)');
  const head = $('#work > .hb-head');
  // the Projects title screen: the heading and the first project, one stop together
  const first = $('.hb-feat'), headBlock = () => head.offsetHeight + (first ? first.offsetHeight : 0);
  if (head) new ResizeObserver(() => head.parentElement.style.setProperty('--hb-hh', head.offsetHeight + 'px')).observe(head);
  const stops = [$('.hb-hero'), head, ...$$('.hb-feat').slice(1), more, ...['about', 'tools', 'notes', 'contact'].map((id) => document.getElementById(id))].filter(Boolean);
  if (stops.length) {
    let settled = scrollY, busy = false, user = false, t = 0;
    // only the reader's own scrolling engages the lock; links and the rail land exactly where they point
    ['wheel', 'touchmove', 'keydown'].forEach((ev) => addEventListener(ev, () => { user = true; }, { passive: true }));
    const go = (y) => { if (Math.abs(y - scrollY) < 2) return; busy = true; scrollTo({ top: y, behavior: REDUCED ? 'auto' : 'smooth' }); };
    const settle = () => {
      const dir = Math.sign(scrollY - settled); settled = scrollY;
      if (busy) { busy = false; return; }
      const mine = user; user = false;
      if (!mine || !oneUp.matches || !dir) return;
      // layout positions (the reveal animation's transform must not shift them). rest: where a stop's top sits
      // when settled (0, or centred for the collection link); a tall stop settles on its bottom coming from below
      const H = innerHeight, box = stops.map((f) => {
        let y = 0, e = f; while (e) { y += e.offsetTop; e = e.offsetParent; }
        const h = f === head ? headBlock() : f.offsetHeight, tall = h > H + 2, rest = f === more ? (H - h) / 2 : f === head ? (H - headBlock()) / 2 : 0;
        return { top: y - scrollY, bottom: y - scrollY + h, rest, end: tall ? H : rest + h, tall };
      });
      const at = (r, d) => scrollY + (d < 0 && r.tall ? r.bottom - H : r.top - r.rest);   // where to settle on r
      // the stop coming into view in the scroll direction (not yet at its resting place), and the one it replaces
      const i = dir > 0 ? box.findIndex((r) => r.top > r.rest + 1 && r.top < H - 1) : box.findIndex((r) => r.bottom > 1 && r.bottom < r.end - 1);
      if (i < 0) {
        // nothing in view yet: between two stops with a gap, carry on to the next one (or fall back after a nudge),
        // unless the stop we are leaving is a tall one still being read
        const n = dir > 0 ? box.findIndex((r) => r.top > r.rest + 1) : box.findLastIndex((r) => r.bottom < r.end - 1), pv = box[n - dir];
        if (n >= 0 && pv) {
          if (pv.tall && (dir > 0 ? pv.bottom > H + 1 : pv.top < -1)) return;
          const moved = dir > 0 ? pv.rest - pv.top : pv.top - pv.rest;
          go(moved < H * 0.12 && !pv.tall ? at(pv, -dir) : at(box[n], dir));
          return;
        }
        // a small nudge out past the first or last stop falls back onto it; a real scroll carries on freely
        const r = box[dir > 0 ? box.length - 1 : 0], off = dir > 0 ? r.rest - r.top : r.top - r.rest;
        if (!r.tall && off > 1 && off < H * 0.12) go(at(r, -dir));
        return;
      }
      const j = i - dir, show = dir > 0 ? H - box[i].top : box[i].bottom;
      // nudged only a little: go back to the stop we were on, unless it is a tall one being read to its end
      if (show < H * 0.12) { if (box[j] && !box[j].tall) go(at(box[j], -dir)); return; }
      go(at(box[i], dir));
    };
    if ('onscrollend' in window) addEventListener('scrollend', settle);
    else addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(settle, 160); }, { passive: true });
  }

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

})();
