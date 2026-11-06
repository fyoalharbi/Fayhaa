// Herbarium plates: one ASCII flower per project, each a different specimen
// (in bud, in full bloom, gone to seed, on a long stem, in a bunch…). All drawn
// at build time on the same 64×20 grid, in the same quiet palette, so the
// archive reads as one collection.
//
// Tones: w = bright ink, g = grey, d = dim, u = muted blue (stems, leaves), q = live bits (0/1 that flicker).

const W = 64, H = 20;
type Tone = 'w' | 'g' | 'd' | 'u' | 'q';

class Grid {
  c: (string | null)[][] = Array.from({ length: H }, () => Array(W).fill(null));
  t: Tone[][] = Array.from({ length: H }, () => Array(W).fill('g'));
  put(x: number, y: number, s: string, tone: Tone = 'g') {
    [...s].forEach((ch, i) => {
      const xx = Math.round(x) + i, yy = Math.round(y);
      if (ch === ' ' || xx < 0 || yy < 0 || xx >= W || yy >= H) return;
      this.c[yy][xx] = ch; this.t[yy][xx] = /[01]/.test(ch) && tone !== 'u' ? 'q' : tone;
    });
  }
  /** Several lines at once; spaces are transparent, 0/1 become live bits. */
  block(x: number, y: number, lines: string[], tone: Tone = 'g') { lines.forEach((l, i) => this.put(x, y + i, l, tone)); }
  /** A stem through points; each step gets the glyph of its direction. */
  path(pts: [number, number][], tone: Tone = 'u') {
    for (let k = 1; k < pts.length; k++) {
      let [x, y] = pts[k - 1].map(Math.round); const [x1, y1] = pts[k].map(Math.round);
      const dx = Math.abs(x1 - x), dy = -Math.abs(y1 - y), sx = x < x1 ? 1 : -1, sy = y < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        if (x === x1 && y === y1) break;
        const e2 = 2 * err; let mx = false, my = false;
        if (e2 >= dy) { err += dy; x += sx; mx = true; }
        if (e2 <= dx) { err += dx; y += sy; my = true; }
        this.put(x, y, mx && my ? ((sx > 0) === (sy > 0) ? '╲' : '╱') : mx ? '─' : '│', tone);
      }
    }
  }
  /** Points around an ellipse (rx in columns, ry in rows); glyph chosen by angle. */
  ring(cx: number, cy: number, rx: number, ry: number, n: number, glyph: (a: number, i: number) => [string, Tone] | null, phase = 0) {
    for (let i = 0; i < n; i++) {
      const a = phase + (i / n) * Math.PI * 2, r = glyph(a, i);
      if (r) this.put(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, r[0], r[1]);
    }
  }
  fill(cx: number, cy: number, rx: number, ry: number, glyph: (x: number, y: number, r: number) => [string, Tone] | null) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const r = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (r <= 1) { const gph = glyph(x, y, r); if (gph) this.put(x, y, gph[0], gph[1]); }
    }
  }
  html() {
    return this.c.map((row, y) => {
      let s = '', cur: Tone | null = null, run = '';
      const flush = () => { if (run) s += cur ? `<i class="a-${cur}">${run.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</i>` : run; run = ''; };
      row.forEach((ch, x) => { const tn = ch ? this.t[y][x] : null; if (tn !== cur) { flush(); cur = tn; } run += ch ?? ' '; });
      flush();
      return s.replace(/\s+$/, '');
    }).join('\n');
  }
}
// petal glyph for a ray pointing at angle a (screen y down)
const ray = (a: number) => { const d = ((a % Math.PI) + Math.PI) % Math.PI; return d < Math.PI / 8 || d > Math.PI * 7 / 8 ? '─' : d < Math.PI * 3 / 8 ? '╲' : d < Math.PI * 5 / 8 ? '│' : '╱'; };
const leafR = [' .-~~-.', "'-~~-'"], leafL = ['.-~~-. ', " '-~~-'"];

// 1 · Tulip: a long stem, the cup fully open, two blade leaves
function tulip(g: Grid) {
  g.block(26, 2, [
    '  _     _  ',
    ' / \\ _ / \\ ',
    '|   ( )   |',
    '|  01|10  |',
    ' \\ 10|01 / ',
    "  '.___.'  ",
  ], 'g');
  g.put(31, 4, '( )', 'w');
  g.path([[31, 8], [31, 13], [32, 18]]);
  g.path([[25, 11], [30, 17]]); g.put(24, 10, "'", 'u');
  g.path([[38, 13], [33, 17]]); g.put(39, 12, "'", 'u');
  g.put(29, 19, '`~~~´', 'd');
  return { en: 'Tulipa · a long stem, the cup fully open', ar: 'توليب · ساق طويلة وكأس متفتحة' };
}

// 2 · Daisy: in full bloom, rays of bits around a bright eye, short stem
function daisy(g: Grid) {
  const cx = 32, cy = 6;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    for (let r = 1.9; r <= (i % 2 ? 3.2 : 4.3); r += 1.2) g.put(cx + Math.cos(a) * r * 2.1, cy + Math.sin(a) * r, i % 4 === 0 ? (r > 3 ? '1' : '0') : ray(a), 'g');
    g.put(cx + Math.cos(a) * (i % 2 ? 4.1 : 5.1) * 2.1, cy + Math.sin(a) * (i % 2 ? 4.1 : 5.1), "'", 'd');
  }
  g.put(30, 6, '(@)', 'w'); g.put(30, 5, ' ˙ ', 'w');
  g.path([[32, 11], [32, 14], [31, 18]]);
  g.block(33, 13, leafR, 'u');
  return { en: 'Bellis · a field daisy in full bloom', ar: 'أقحوان · زهرة برية في كامل تفتحها' };
}

// 3 · Sunflower: a heavy seeded head, nodding a little, on a thick stem
function sunflower(g: Grid) {
  const cx = 31, cy = 7;
  g.ring(cx, cy, 10.5, 4.8, 16, (a) => [ray(a), 'g']);
  g.ring(cx, cy, 12, 5.5, 16, () => ["'", 'd'], Math.PI / 16);
  g.fill(cx, cy, 7, 3.2, (x, y, r) => (r < 0.25 ? ['@', 'w'] : (x + y) % 2 ? null : [(x * 7 + y) % 5 === 0 ? '1' : r > 0.8 ? '·' : ':', r < 0.7 ? 'g' : 'd']));
  g.put(cx - 1, cy, '(@)', 'w');
  g.path([[31, 13], [32, 15], [32, 18]]);
  g.block(34, 14, leafR, 'u'); g.block(24, 16, leafL, 'u');
  return { en: 'Helianthus · a heavy head, nodding a little', ar: 'دوار الشمس · رأس ثقيل مائل قليلاً' };
}

// 4 · Rose: still in bud, sepals clasping it, a thorned stem
function rosebud(g: Grid) {
  g.block(28, 3, [
    '  .-~-.  ',
    ' / 1 0 \\ ',
    '(  (@)  )',
    ' \\ 0 1 / ',
    "  '._.'  ",
  ], 'g');
  g.put(31, 5, '(@)', 'w');
  g.put(28, 8, '\\_\\|/_/', 'u');
  g.path([[32, 9], [32, 12], [30, 15], [31, 18]]);
  g.put(30, 11, '<', 'd'); g.put(32, 14, '>', 'd'); g.put(29, 16, '<', 'd');
  g.block(33, 12, leafR, 'u');
  return { en: 'Rosa · still in bud', ar: 'وردة · ما زالت برعماً' };
}

// 5 · Lily of the valley: an arching stem with bells hanging along it, one tall leaf
function lily(g: Grid) {
  for (let y = 5; y <= 17; y++) { const k = (y - 11) / 6.5, w = Math.round(3.6 * Math.sqrt(Math.max(0, 1 - k * k))); if (w) { g.put(17 - w, y, '(', 'u'); g.put(17 + w, y, ')', 'u'); } }
  g.put(17, 4, '.', 'u'); g.path([[17, 6], [17, 17]], 'd'); g.put(17, 18, "'", 'u');
  g.path([[22, 18], [23, 10], [26, 5], [32, 3], [40, 3], [46, 5], [49, 8]]);
  [[29, 4, 3], [35, 4, 3], [41, 4, 2], [46, 6, 1], [49, 9, 0]].forEach(([x, y, s]) => {
    g.put(x, y, '│', 'd');
    if (s >= 2) { g.put(x - 1, y + 1, '/' + (s > 2 ? '0' : '1') + '\\', 'g'); g.put(x - 1, y + 2, "'v'", 'g'); }
    else if (s === 1) { g.put(x - 1, y + 1, '(1)', 'g'); }
    else g.put(x, y + 1, 'o', 'g');
  });
  g.put(19, 19, '`~~~~´', 'd');
  return { en: 'Convallaria · bells along an arching stem', ar: 'زنبق الوادي · أجراس على ساق مقوّسة' };
}

// 6 · Dandelion: gone to seed, a few already drifting away
function dandelion(g: Grid) {
  const cx = 30, cy = 6;
  g.ring(cx, cy, 10, 4.6, 26, (a, i) => (Math.cos(a) > 0.55 && Math.sin(a) < 0.2 && i % 2 ? null : [i % 3 ? '*' : '+', 'g']));
  g.ring(cx, cy, 5.5, 2.6, 18, (a, i) => [i % 2 ? '·' : ':', 'd']);
  g.ring(cx, cy, 2.6, 1.2, 10, (a, i) => [i % 2 ? '1' : '0', 'q']);
  g.put(cx, cy, '@', 'w');
  [[44, 4], [49, 2], [55, 3], [52, 6]].forEach(([x, y], i) => { g.put(x, y, i % 2 ? '+' : '*', i === 1 ? 'w' : 'g'); g.put(x - 1, y + 1, '╱', 'd'); });
  g.path([[30, 11], [31, 15], [30, 18]]);
  g.put(24, 18, '╲╱╲╱', 'u'); g.put(32, 18, '╲╱╲╱', 'u');
  return { en: 'Taraxacum · gone to seed, a few already drifting', ar: 'هندباء · صارت بذوراً وبعضها طار' };
}

// 7 · Lavender: three slim spikes from one root, florets crowding the tips
function lavender(g: Grid) {
  const spikes: [number, number, number][] = [[32, 1, 0], [25, 4, -1], [39, 3, 1]];   // tip x, tip y, lean
  for (const [tx, ty, lean] of spikes) {
    g.path(tx === 32 ? [[32, ty + 6], [32, 15]] : [[tx, ty + 6], [tx, 11], [Math.round(tx + (32 - tx) * 0.85), 15]]);
    for (let k = 0; k < 6; k++) {
      g.put(tx - 1, ty + k, k % 2 ? 'o' : '0', k < 2 ? 'g' : 'd'); g.put(tx, ty + k, '│', 'u'); g.put(tx + 1, ty + k, k % 2 ? '1' : 'o', k < 2 ? 'g' : 'd');
    }
    g.put(tx, ty - 1, "'", 'g');
  }
  g.put(30, 15, '─)(─', 'g');
  g.path([[32, 16], [32, 18]]);
  g.put(31, 19, '╲│╱', 'd');
  return { en: 'Lavandula · three spikes from one root', ar: 'خزامى · ثلاث سنابل من جذر واحد' };
}

// 8 · Poppy: one flower open, one bud still nodding on a hooked stem
function poppy(g: Grid) {
  g.block(17, 3, [
    ' .-~~-.-~~-. ',
    '(   .01.    )',
    ' \\  `@@`   / ',
    "  '-.__.-'   ",
  ], 'g');
  g.put(22, 5, '@@', 'w');
  g.path([[23, 7], [24, 12], [28, 16], [30, 18]]);
  g.path([[30, 18], [33, 13], [36, 7], [39, 4], [42, 4], [44, 6]]);
  g.block(43, 7, ['(1)', ' v '], 'g');
  [[24, 10], [26, 14], [34, 11], [37, 6]].forEach(([x, y]) => g.put(x + 1, y, "'", 'd'));
  g.put(26, 19, '`~~~~~´', 'd');
  return { en: 'Papaver · one open, one still nodding', ar: 'خشخاش · واحدة متفتحة وأخرى مائلة' };
}

const DRAW: Record<string, (g: Grid) => { en: string; ar: string }> = {
  invasight: tulip, 'finance-analyzer': daisy, 'ewc-2024-dashboard': sunflower, 'qafiyah-feelings': rosebud,
  'bellabeat-case-study': lily, 'x-api-report': dandelion, 'saudi-sectors-dashboard': lavender, 'coworking-spaces-dashboard': poppy,
};
const ORDER = Object.values(DRAW);

/** The flower plate for a project: { html, en, ar } (en/ar: the specimen note). Unknown slugs get a flower by position. */
export function projectArt(slug: string, i = 0) {
  const g = new Grid();
  const note = (DRAW[slug] ?? ORDER[i % ORDER.length])(g);
  return { html: g.html(), ...note };
}
