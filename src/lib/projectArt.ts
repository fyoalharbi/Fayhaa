// Herbarium plates: one ASCII specimen per project, drawn with the garden's own
// pieces: flowerCells heads (live 0/1 petals, gold @8 eye, ' . rim), stems that
// lean with | / \ and carry \_ _/ leaves, leafy & % # bushes, grass and soil,
// pollen and fireflies. Same glyphs and same palette as the hero garden
// (KIT.PAL), so every plate reads as a corner of that garden in close-up.

import { flowerCells } from './flowerArt';

const W = 64, H = 20, GY = 18;          // GY: the soil line; grass grows up from it
type Cell = [string, string] | null;     // [glyph, tone]

const hash = (n: number) => ((n * 2654435761) >>> 0);

class Plate {
  g: Cell[][] = Array.from({ length: H }, () => Array(W).fill(null));
  put(x: number, y: number, ch: string, tone: string) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < W && y < H) this.g[y][x] = [ch, tone];
  }
  /** A garden head centred on (x, y). `tone` colours the petals; the rim takes its darker shade. */
  head(x: number, y: number, o: { R: number; petals: number; tone: string; open?: number; rot?: number; seed?: number },
       map?: (dx: number, dy: number, ch: string, tn: string) => [string, string] | null) {
    for (const [dx, dy, ch, tn] of flowerCells({ R: o.R, petals: o.petals, open: o.open ?? 1, rot: o.rot ?? 0, seed: o.seed ?? o.R * 7 + o.petals })) {
      const c = map ? map(dx, dy, ch, tn) : null;
      if (map && c === null) continue;
      this.put(x + dx, y + dy, ...(c ?? [ch, tn === 'c' ? 'gold' : tn === 'd' ? 'gold2' : tn === 'r' ? o.tone + '2' : 'p ' + o.tone] as [string, string]));
    }
  }
  /** A stem from the soil at x0 up to (x1, top), easing over like the garden's sway, leaves every few rows. */
  stem(x0: number, x1: number, top: number, leaves = 1, from = GY) {
    let prev = x0;
    const len = from - top;
    for (let y = from - 1, i = 0; y > top; y--, i++) {
      const k = (from - y) / len, off = Math.round(x0 + (x1 - x0) * k * k);
      this.put(off, y, off > prev ? '/' : off < prev ? '\\' : '|', 'stem');
      if (leaves && (y + x0) % 4 === 0 && k > 0.15 && k < 0.8) {
        const sd = ((y + x0) % 8 ? 1 : -1) * (leaves < 0 ? -1 : 1);
        this.put(off + sd, y, sd > 0 ? '\\' : '/', 'leaf'); this.put(off + sd * 2, y, '_', 'leaf');
      }
      prev = off;
    }
  }
  /** A leafy mound with a few blossoms of `tone`. */
  bush(cx: number, w: number, h: number, tone: string) {
    for (let dy = 0; dy < h; dy++) {
      const half = Math.round(w * Math.sqrt(1 - Math.pow(dy / h, 2)));
      for (let dx = -half; dx <= half; dx++) {
        const n = (cx + dx) * 31 + dy * 17, edge = Math.abs(dx) >= half - 1 || dy === h - 1;
        const bloom = !edge && hash(n) % 7 === 0;
        this.put(cx + dx, GY - 1 - dy, bloom ? (hash(n) % 2 ? 'o' : '*') : edge ? (dx < 0 ? '(' : dx > 0 ? ')' : '^') : '&%#8@'[(n >>> 2) % 5],
          bloom ? tone : (dy + dx) % 3 ? 'leaf' : 'g2');
      }
    }
  }
  /** Grass blades and soil across [x0, x1], only where nothing is drawn yet. */
  ground(x0: number, x1: number) {
    for (let x = x0; x <= x1; x++) {
      const edge = Math.min(x - x0, x1 - x), hgt = edge < 2 ? hash(x) % 2 : 1 + (hash(x * 3) % 2);
      for (let k = 0; k < hgt; k++) {
        if (this.g[GY - 1 - k][x]) continue;
        const top = k === hgt - 1;
        this.put(x, GY - 1 - k, top ? ((x * 7) % 5 ? (x % 3 ? ',' : "'") : '|') : (x % 3 ? '|' : ';'), (x + k) % 5 === 0 ? 'leaf' : k === 0 ? 'g1' : 'g2');
      }
      if ((x * 13) % 4) this.put(x, GY, x % 3 ? '.' : ',', edge < 3 ? 'g0' : 'g1');
    }
  }
  /** Loose pollen motes and a firefly or two drifting above the heads. */
  air(spots: [number, number, string?][]) {
    for (const [x, y, c] of spots) if (!this.g[y]?.[x]) this.put(x, y, c ?? '·', c === '*' ? 'fly' : 'pollen');
  }
  center() {
    let lo = W, hi = -1;
    this.g.forEach((row) => row.forEach((c, x) => { if (c) { lo = Math.min(lo, x); hi = Math.max(hi, x); } }));
    const d = Math.round((W - 1 - hi - lo) / 2);
    if (d && hi >= 0) this.g = this.g.map((row) => row.map((_, x) => row[x - d] ?? null));
  }
  html() {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return this.g.map((row) => {
      let s = '', cur: string | null = null, run = '';
      const flush = () => { if (run) s += cur ? `<i class="${cur.split(' ').map((t) => 'a-' + t).join(' ')}">${esc(run)}</i>` : run; run = ''; };
      for (const c of row) { const t = c ? c[1] : null; if (t !== cur) { flush(); cur = t; } run += c ? c[0] : ' '; }
      flush();
      return s.replace(/\s+$/, '');
    }).join('\n');
  }
}

// 1 · one tall red bloom, wide open, the way the garden's flowers look when the butterfly lands
function redBloom(p: Plate) {
  p.stem(32, 33, 7, 1);
  p.head(33, 6, { R: 12, petals: 5, tone: 'red', rot: 0.3, seed: 11 });
  p.ground(20, 44);
  p.air([[16, 3], [49, 2], [52, 9, '*'], [12, 11]]);
  return { en: 'a single red bloom, wide open', ar: 'زهرة حمراء واحدة متفتحة' };
}

// 2 · white daisies: one big many-petalled head, a smaller one leaning beside it
function daisies(p: Plate) {
  p.stem(27, 25, 6, 1);
  p.stem(37, 42, 11, -1);
  p.head(42, 10, { R: 7, petals: 9, tone: 'white', rot: 1.1, seed: 4 });
  p.head(25, 6, { R: 10, petals: 8, tone: 'white', rot: 0.2, seed: 21 });
  p.ground(17, 50);
  p.air([[50, 3], [11, 9], [54, 6, '*']]);
  return { en: 'white daisies, a big one and a small one leaning in', ar: 'أقحوان أبيض، واحدة كبيرة وصغيرة تميل لها' };
}

// 3 · a heavy orange head with a wide seeded eye, on a stout double stem
function bigHead(p: Plate) {
  p.stem(31, 32, 8, 1); p.stem(32, 33, 8, -1);
  p.head(32, 6, { R: 12, petals: 11, tone: 'orange', rot: 0.5, seed: 9 });
  p.head(32, 6, { R: 5, petals: 13, tone: 'orange', seed: 9 }, (dx, dy, ch, tn) => tn === 'c' || tn === 'd' || tn === 'p' ? [tn === 'p' ? ':.'[hash(dx * 9 + dy) % 2] : ch, tn === 'c' ? 'gold' : 'gold2'] : null);
  p.bush(14, 5, 3, 'gold'); p.bush(51, 4, 2, 'orange');
  p.ground(8, 56);
  return { en: 'a heavy orange head, its eye full of seed', ar: 'رأس برتقالي ثقيل، عينه ممتلئة بالبذور' };
}

// 4 · blush roses: one half open, one still a bud
function blushBud(p: Plate) {
  p.stem(28, 24, 7, 1);
  p.stem(35, 41, 9, -1);
  p.head(24, 6, { R: 10, petals: 6, tone: 'blush', open: 0.7, rot: 0.9, seed: 5 });
  p.head(41, 8, { R: 6, petals: 4, tone: 'blush', open: 0.3, rot: 0.4, seed: 8 });
  p.ground(18, 47);
  p.air([[47, 3], [13, 3, '*'], [52, 11]]);
  return { en: 'blush roses, one half open, one still a bud', ar: 'ورد وردي، واحدة نصف متفتحة وأخرى برعم' };
}

// 5 · three violet heads branching from one stem
function violets(p: Plate) {
  p.stem(32, 32, 4, 1);
  p.stem(32, 20, 9, 0, 13); p.stem(32, 44, 8, 0, 14);
  p.head(20, 8, { R: 7, petals: 5, tone: 'violet', rot: 0.8, seed: 2 });
  p.head(44, 7, { R: 7, petals: 6, tone: 'violet', rot: 0.1, seed: 3 });
  p.head(32, 4, { R: 8, petals: 5, tone: 'violet', rot: 0.5, seed: 6 });
  p.ground(20, 44);
  p.air([[9, 4], [55, 2, '*'], [56, 12]]);
  return { en: 'three violet heads on one branching stem', ar: 'ثلاث زهرات بنفسجية على ساق متفرعة' };
}

// 6 · a white head gone to seed, a few seeds already drifting off
function seedHead(p: Plate) {
  p.stem(30, 28, 7, 1);
  p.head(28, 6, { R: 11, petals: 16, tone: 'white', seed: 13 }, (dx, dy, ch, tn) =>
    tn === 'c' ? [ch, 'gold2'] : tn === 'd' ? ['o', 'white2'] : tn === 'p' ? (hash(dx * 31 + dy * 7) % 3 ? null : ["'.:"[hash(dx + dy * 5) % 3], 'white2']) : hash(dx * 7 + dy * 13) % 3 ? null : ['*', 'white']);
  p.air([[43, 4, '*'], [47, 2, '·'], [50, 5, '*'], [54, 1, '·'], [57, 3, '*'], [45, 8, '·'], [52, 9, '·']]);
  for (const [x, y] of [[43, 4], [50, 5], [57, 3]]) p.put(x, y, '*', 'white');
  p.ground(18, 42);
  return { en: 'gone to seed, a few already drifting', ar: 'صارت بذوراً، وبعضها طار' };
}

// 7 · lavender: three spikes of small violet whorls from one root
function spikes(p: Plate) {
  const spike = (x0: number, x1: number, top: number, seed: number) => {
    p.stem(x0, x1, top + 6, 0);
    for (let k = 0; k < 4; k++) p.head(x1, top + k * 2, { R: 2 + (k > 0 ? 1 : 0), petals: 4, tone: 'violet', open: 0.9, rot: k, seed: seed + k });
  };
  spike(31, 22, 3, 30); spike(32, 32, 1, 40); spike(33, 42, 3, 50);
  p.put(32, GY - 1, ')', 'leaf'); p.put(30, GY - 1, '(', 'leaf');
  p.ground(18, 46);
  p.air([[12, 6], [51, 4, '*'], [53, 10]]);
  return { en: 'three lavender spikes from one root', ar: 'ثلاث سنابل خزامى من جذر واحد' };
}

// 8 · a meadow corner: a red head and a gold one between flowering bushes
function meadow(p: Plate) {
  p.bush(13, 7, 4, 'red'); p.bush(52, 6, 3, 'violet');
  p.stem(27, 25, 6, 1); p.stem(38, 40, 9, -1);
  p.head(40, 8, { R: 8, petals: 7, tone: 'gold', rot: 0.6, seed: 17 });
  p.head(25, 6, { R: 10, petals: 6, tone: 'red', rot: 0.2, seed: 19 });
  p.ground(5, 59);
  p.air([[9, 6, '*'], [55, 7], [33, 1]]);
  return { en: 'a meadow corner between flowering bushes', ar: 'ركن من مرج بين شجيرات مزهرة' };
}

const DRAW: Record<string, (p: Plate) => { en: string; ar: string }> = {
  invasight: redBloom, 'finance-analyzer': daisies, 'ewc-2024-dashboard': bigHead, 'qafiyah-feelings': blushBud,
  'bellabeat-case-study': violets, 'x-api-report': seedHead, 'saudi-sectors-dashboard': spikes, 'coworking-spaces-dashboard': meadow,
};
const ORDER = Object.values(DRAW);

/** The flower plate for a project: { html, en, ar }. Unknown slugs get a flower by position. */
export function projectArt(slug: string, i = 0) {
  const p = new Plate();
  const note = (DRAW[slug] ?? ORDER[i % ORDER.length])(p);
  p.center();
  return { html: p.html(), ...note };
}
