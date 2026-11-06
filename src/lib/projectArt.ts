// Monochrome ASCII plates for the Herbarium project frames: one drawing per
// project, about what the project actually does. Drawn at build time on a fixed
// 64×20 character grid, so every plate has the same size and visual weight.
//
// Tones: w = bright ink, g = grey, d = dim, u = muted blue, q = live bits (0/1, flicker in the browser).

const W = 64, H = 20;
type Tone = 'w' | 'g' | 'd' | 'u' | 'q';

class Grid {
  c: (string | null)[][] = Array.from({ length: H }, () => Array(W).fill(null));
  t: Tone[][] = Array.from({ length: H }, () => Array(W).fill('g'));
  /** Write a string; spaces are transparent. */
  put(x: number, y: number, s: string, tone: Tone = 'g') {
    [...s].forEach((ch, i) => {
      const xx = Math.round(x) + i, yy = Math.round(y);
      if (ch === ' ' || xx < 0 || yy < 0 || xx >= W || yy >= H) return;
      this.c[yy][xx] = ch; this.t[yy][xx] = tone;
    });
  }
  h(x0: number, x1: number, y: number, tone: Tone = 'g', ch = '─') { for (let x = x0; x <= x1; x++) this.put(x, y, ch, tone); }
  v(x: number, y0: number, y1: number, tone: Tone = 'g', ch = '│') { for (let y = y0; y <= y1; y++) this.put(x, y, ch, tone); }
  /** A dotted thread between two points (the "flow" in a drawing). */
  dots(x0: number, y0: number, x1: number, y1: number, tone: Tone = 'u', gap = 1.6) {
    const n = Math.hypot((x1 - x0) / 2, y1 - y0) / gap | 0;
    for (let i = 1; i < n; i++) this.put(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, '·', tone);
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

// ── InvaSight: four sources grow into one root, which feeds a star schema ──
function invasight(g: Grid) {
  [['ledger', 4], ['fx', 7], ['metals', 11], ['equity', 14]].forEach(([l, y]) => {
    g.put(2, +y, String(l), 'd'); g.put(10, +y, '○', 'g'); g.h(11, 13, +y, 'u');
  });
  g.v(14, 5, 13, 'u'); g.put(14, 4, '╮', 'u'); g.put(14, 7, '┤', 'u'); g.put(14, 11, '┤', 'u'); g.put(14, 14, '╯', 'u'); g.put(14, 9, '├', 'u');
  g.h(15, 46, 9, 'u');
  g.put(19, 9, ' 0110 1001 0111 ', 'q');
  g.put(18, 11, 'land', 'd'); g.put(27, 11, 'load', 'd'); g.put(36, 11, 'dbt', 'd');
  // the star: fact in the middle, five dimensions around it
  g.put(48, 9, '◆', 'w');
  g.v(48, 5, 8, 'g'); g.put(48, 4, '○', 'g'); g.put(46, 3, 'asset', 'd');
  g.put(50, 8, '╱', 'g'); g.put(52, 7, '╱', 'g'); g.put(54, 6, '○', 'g'); g.put(56, 6, 'client', 'd');
  g.h(49, 57, 9, 'g'); g.put(58, 9, '○', 'g'); g.put(60, 9, 'date', 'd');
  g.put(50, 10, '╲', 'g'); g.put(52, 11, '╲', 'g'); g.put(54, 12, '○', 'g'); g.put(56, 12, 'source', 'd');
  g.v(48, 10, 13, 'g'); g.put(48, 14, '○', 'g'); g.put(47, 15, 'ccy', 'd');
  g.put(45, 17, 'fact_holdings', 'd');
  return 'four sources, one root, a star schema';
}

// ── Personal Finance Analyzer: a statement read line by line, split into where money goes ──
function finance(g: Grid) {
  g.put(3, 2, '╭──────────────╮', 'g'); g.put(3, 17, '╰──────────────╯', 'g'); g.v(3, 3, 16, 'g'); g.v(18, 3, 16, 'g');
  g.put(5, 3, 'statement.pdf', 'd');
  [[5, 9, 'w'], [7, 5, 'g'], [9, 3, 'g'], [11, 6, 'g'], [13, 2, 'g'], [15, 4, 'g']].forEach(([y, n, tn]) => {
    g.put(5, +y, '·······', 'd'); g.put(13, +y, '━'.repeat(+n > 4 ? 4 : +n), tn as Tone);
  });
  g.h(19, 25, 9, 'u'); g.put(26, 9, '▸', 'u');
  g.put(28, 7, '┌─┬─┬─┐', 'd'); g.put(28, 8, '│', 'd'); g.put(29, 8, '01100', 'q'); g.put(34, 8, '│', 'd');
  g.put(28, 9, '├─┼─┼─┤', 'd'); g.put(28, 10, '│', 'd'); g.put(29, 10, '10110', 'q'); g.put(34, 10, '│', 'd'); g.put(28, 11, '└─┴─┴─┘', 'd');
  g.h(36, 40, 9, 'u'); g.put(41, 9, '┤', 'u'); g.v(41, 4, 15, 'u');
  g.put(41, 4, '╭', 'u'); g.put(41, 15, '╰', 'u');
  [[4, 'in', 12, 'w'], [7, 'rent', 7, 'g'], [10, 'food', 4, 'g'], [12, 'fuel', 3, 'g'], [15, 'other', 2, 'g']].forEach(([y, l, n, tn]) => {
    if (+y !== 4 && +y !== 15) g.put(41, +y, '├', 'u');
    g.put(42, +y, '─ ', 'u'); g.put(44, +y, String(l).padEnd(6), tn as Tone); g.put(50, +y, '━'.repeat(+n), tn as Tone);
  });
  g.put(42, 18, '▁▁▂▃▅▇▆▅▃▂▃▅▆▃▂', 'd'); g.put(58, 18, 'hour', 'd');
  return 'a statement, read line by line, split into where money goes';
}

// ── EWC 2024: a tournament bracket narrowing to one cup ──
function ewc(g: Grid) {
  const R1 = [2, 4, 6, 8, 11, 13, 15, 17], R2 = [3, 7, 12, 16], R3 = [5, 14];
  const side = (L: boolean) => {
    const X = (x: number) => (L ? x : 63 - x), c = (a: string, b: string) => (L ? a : b);
    R1.forEach((y, i) => { g.h(Math.min(X(2), X(6)), Math.max(X(2), X(6)), y, 'd'); g.put(X(2), y, '·', 'g'); g.put(X(7), y, i % 2 ? c('┘', '└') : c('┐', '┌'), 'd'); });
    R2.forEach((y, i) => { g.put(X(7), y, c('├', '┤'), 'd'); g.h(Math.min(X(8), X(11)), Math.max(X(8), X(11)), y, 'd'); g.put(X(12), y, i % 2 ? c('┘', '└') : c('┐', '┌'), 'd'); });
    R3.forEach((y, i) => { for (let k = R2[i * 2] + 1; k < R2[i * 2 + 1]; k++) g.put(X(12), k, '│', 'd'); g.put(X(12), y, c('├', '┤'), 'd'); g.h(Math.min(X(13), X(16)), Math.max(X(13), X(16)), y, 'd'); g.put(X(17), y, i ? c('┘', '└') : c('┐', '┌'), 'd'); });
    for (let k = 6; k < 14; k++) g.put(X(17), k, '│', 'd');
    g.put(X(17), 9, c('├', '┤'), 'd'); g.h(Math.min(X(18), X(27)), Math.max(X(18), X(27)), 9, 'd');
  };
  side(true); side(false);
  // one team's run to the final, traced in bright ink
  g.put(2, 4, '·', 'w'); g.h(3, 6, 4, 'w'); g.put(7, 4, '┘', 'w'); g.put(7, 3, '├', 'w'); g.h(8, 11, 3, 'w'); g.put(12, 3, '┐', 'w');
  g.v(12, 4, 4, 'w'); g.put(12, 5, '├', 'w'); g.h(13, 16, 5, 'w'); g.put(17, 5, '┐', 'w'); g.v(17, 6, 8, 'w'); g.put(17, 9, '├', 'w'); g.h(18, 27, 9, 'w');
  // the cup
  g.put(28, 4, '╭───────╮', 'g'); g.put(28, 5, '│   ★   │', 'g'); g.put(32, 5, '★', 'u');
  g.put(28, 6, '╰╮     ╭╯', 'g'); g.put(29, 7, '╰─┬─┬─╯', 'g'); g.put(31, 8, '│ │', 'g');
  g.put(28, 9, '──┴─┴──', 'g'); g.put(35, 9, '──', 'g');
  g.put(29, 11, 'ewc 2024', 'd'); g.put(26, 14, 'prizes by country', 'd');
  return 'brackets narrowing to one cup, prizes by country';
}

// ── Qafiyah: a wheel of eight feelings opening out of a book of verse ──
function qafiyah(g: Grid) {
  const cx = 32, cy = 13;
  g.v(cx, cy, 14, 'g'); g.put(cx, cy, '┴', 'g');
  for (let i = 0; i < 8; i++) {
    const a = Math.PI * (0.06 + (0.88 * i) / 7), x = cx - Math.cos(a) * 25, y = cy - Math.sin(a) * 11;
    g.dots(cx, cy, x, y, 'u', 1.25);
    g.put(x, y, i === 3 ? '●' : '○', i === 3 ? 'w' : 'g');
  }
  g.put(14, 15, '╭────────────────╮╭────────────────╮', 'g');
  g.put(14, 16, '│                ││                │', 'g'); g.put(14, 17, '│                ││                │', 'g');
  g.put(16, 16, '~~ ~~~~ ~~~ ~', 'd'); g.put(16, 17, '~~~ ~~ ~~~~', 'd'); g.put(34, 16, '~~~ ~~ ~~~~ ~', 'd'); g.put(34, 17, '~ ~~~~ ~~ ~', 'd');
  g.put(14, 18, '╰────────────────╯╰────────────────╯', 'g');
  return 'eight feelings opening from a book of verse';
}

// ── Bellabeat: a day of steps, sleep and a heartbeat ──
function bellabeat(g: Grid) {
  g.h(3, 50, 4, 'd');
  [10, 27, 42].forEach((x) => { g.put(x, 4, '╯', 'w'); g.put(x + 1, 3, '╱╲', 'w'); g.put(x + 3, 4, '╲', 'w'); g.put(x + 4, 5, '╲╱', 'w'); g.put(x + 6, 4, '╭', 'w'); });
  g.put(53, 4, 'bpm', 'd');
  const steps = [1, 1, 0, 0, 0, 1, 3, 5, 7, 5, 4, 5, 6, 5, 4, 5, 7, 8, 6, 4, 3, 2, 1, 1];
  steps.forEach((h, i) => {
    const x = 4 + i * 2, sleep = i < 6 || i > 21;
    for (let k = 0; k < h; k++) g.put(x, 15 - k, k === h - 1 ? '╷' : '│', sleep ? 'u' : 'g');
    if (sleep) g.put(x, 11 - (i % 2), i % 2 ? 'z' : '·', 'u');
  });
  g.h(3, 50, 16, 'd'); g.put(3, 17, '00h', 'd'); g.put(25, 17, '12h', 'd'); g.put(48, 17, '24h', 'd');
  g.put(53, 10, 'steps', 'd'); g.put(53, 12, 'sleep', 'u');
  return 'a day of steps, sleep and a heartbeat';
}

// ── X report: many posts in, a few metrics and one report out ──
function xreport(g: Grid) {
  [[3, 3], [7, 6], [11, 2], [5, 9], [14, 5], [9, 12], [3, 14], [13, 15], [7, 17], [16, 9], [11, 8]].forEach(([x, y], i) => g.put(x, y, i % 3 ? '·' : '○', i % 3 ? 'd' : 'g'));
  for (let k = 0; k < 6; k++) { g.put(19 + k, 3 + k, '╲', 'g'); g.put(36 - k, 3 + k, '╱', 'g'); }
  g.put(25, 9, '╰────╯', 'g'); g.v(26, 10, 11, 'g'); g.v(29, 10, 11, 'g');
  g.put(24, 4, '○', 'u'); g.put(30, 4, '○', 'u'); g.put(27, 6, '○', 'u'); g.put(28, 13, '·', 'w');
  g.put(24, 1, 'filter', 'd');
  g.h(31, 37, 13, 'u'); g.put(38, 13, '▸', 'u');
  [[41, 3], [43, 5], [45, 2], [47, 6]].forEach(([x, h]) => { for (let k = 0; k < h; k++) g.put(x, 15 - k, '┃', k === h - 1 ? 'w' : 'g'); });
  g.h(40, 48, 16, 'd'); g.put(40, 17, 'kpis', 'd');
  g.put(52, 9, '╭──────╮', 'g'); g.put(52, 10, '│ ──── │', 'g'); g.put(52, 11, '│ ──   │', 'g'); g.put(52, 12, '│ ───  │', 'g'); g.put(52, 13, '╰──────╯', 'g');
  g.put(53, 15, 'report', 'w');
  return 'many posts in, a few metrics and one report out';
}

// ── Sectors in Saudi Arabia: one root, a row of sectors, a fall of agencies ──
function sectors(g: Grid) {
  g.put(31, 1, '◆', 'w'); g.v(31, 2, 3, 'g');
  const xs = [6, 16, 26, 36, 46, 56], n = [7, 4, 9, 5, 8, 3];
  g.h(6, 56, 4, 'g'); g.put(6, 4, '┌', 'g'); g.put(56, 4, '┐', 'g'); g.put(31, 4, '┴', 'g');
  xs.forEach((x, i) => {
    if (i > 0 && i < 5) g.put(x, 4, '┬', 'g');
    g.put(x, 5, '│', 'g'); g.put(x, 6, i === 2 ? '●' : '○', i === 2 ? 'w' : 'g');
    for (let k = 0; k < n[i]; k++) g.put(x - 1, 8 + k, k % 3 === 1 ? '·:·' : ' · ', i === 2 ? 'u' : 'd');
  });
  g.put(20, 18, '32 sectors · 638 agencies', 'd');
  return 'one root, thirty-two sectors, a fall of agencies';
}

// ── Co-working: a quiet map, spaces clustered in three cities, desks in each ──
function coworking(g: Grid) {
  for (let y = 2; y < 19; y += 3) for (let x = 3; x < 62; x += 6) g.put(x + (y % 2 ? 3 : 0), y, '·', 'd');
  const city = (x: number, y: number, cols: number, rows: number, l: string, main = false) => {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) g.put(x + c * 2, y + r, (r * cols + c) % 5 === 1 ? '■' : '□', main ? 'w' : 'g');
    g.put(x - 1, y - 1, '╭' + '─'.repeat(cols * 2 - 1) + '╮', 'u'); g.put(x - 1, y + rows, '╰' + '─'.repeat(cols * 2 - 1) + '╯', 'u');
    for (let r = 0; r < rows; r++) { g.put(x - 1, y + r, '│', 'u'); g.put(x + cols * 2 - 1, y + r, '│', 'u'); }
    g.put(x, y + rows + 1, l, 'd');
  };
  city(10, 10, 3, 2, 'jeddah'); city(27, 6, 5, 3, 'riyadh', true); city(48, 5, 3, 2, 'dammam');
  g.put(25, 16, 'focus · price · reach', 'd');
  return 'spaces clustered across three cities, desk by desk';
}

const DRAW: Record<string, (g: Grid) => string> = {
  invasight, 'finance-analyzer': finance, 'ewc-2024-dashboard': ewc, 'qafiyah-feelings': qafiyah,
  'bellabeat-case-study': bellabeat, 'x-api-report': xreport, 'saudi-sectors-dashboard': sectors, 'coworking-spaces-dashboard': coworking,
};

/** The plate for a project: { html, caption } (caption is an English figure note). */
export function projectArt(slug: string) {
  const g = new Grid();
  const caption = (DRAW[slug] ?? ((gg: Grid) => { gg.put(30, 9, '( · )', 'g'); return ''; }))(g);
  return { html: g.html(), caption };
}
