// Herbarium plates: one hand-drawn ASCII flower per project, each a different
// specimen (in bud, in full bloom, on a long stem, gone to seed, in a bunch…).
// All share one 64×20 grid, the same line conventions ( .-' ( ) / \ _ ) and the
// same palette, so the archive reads as one collection.
//
// Each plate is two layers: the plant (stems and leaves, muted blue) and the
// flower on top (grey line work; 0/1 inside the petals are live bits, @ is the
// bright eye, : is the dim seed texture).

const W = 64, H = 20;
type Tone = 'w' | 'g' | 'd' | 'u' | 'q';

class Plate {
  ch: (string | null)[][] = Array.from({ length: H }, () => Array(W).fill(null));
  tn: Tone[][] = Array.from({ length: H }, () => Array(W).fill('g'));
  /** Lines of art at (x, y); spaces are transparent. */
  draw(x: number, y: number, lines: string[], layer: 'plant' | 'flower') {
    lines.forEach((l, j) => [...l].forEach((g, i) => {
      const c = x + i, r = y + j;
      if (g === ' ' || c < 0 || r < 0 || c >= W || r >= H) return;
      this.ch[r][c] = g;
      this.tn[r][c] = layer === 'plant' ? (g === ',' ? 'd' : 'u') : g === '0' || g === '1' ? 'q' : g === '@' ? 'w' : g === ':' ? 'd' : 'g';
    }));
  }
  ground(cx: number, w: number) {
    const x = cx - Math.floor(w / 2);
    this.draw(x, H - 1, ['`' + '~'.repeat(w - 2) + '´'], 'flower');
    for (let i = 0; i < w; i++) this.tn[H - 1][x + i] = 'd';
  }
  tone(x0: number, y0: number, x1: number, y1: number, t: Tone, only?: string) {
    for (let r = y0; r <= y1; r++) for (let c = x0; c <= x1; c++) if (this.ch[r]?.[c] && (!only || only.includes(this.ch[r][c]!))) this.tn[r][c] = t;
  }
  /** Shift the drawing so it sits in the middle of the plate. */
  center() {
    let lo = W, hi = -1;
    this.ch.forEach((row) => row.forEach((g, c) => { if (g) { lo = Math.min(lo, c); hi = Math.max(hi, c); } }));
    const d = Math.round((W - 1 - hi - lo) / 2);
    if (!d || hi < 0) return;
    this.ch = this.ch.map((row) => row.map((_, c) => row[c - d] ?? null));
    this.tn = this.tn.map((row) => row.map((_, c) => row[c - d] ?? 'g'));
  }
  html() {
    return this.ch.map((row, r) => {
      let s = '', cur: Tone | null = null, run = '';
      const flush = () => { if (run) s += cur ? `<i class="a-${cur}">${run.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</i>` : run; run = ''; };
      row.forEach((g, c) => { const t = g ? this.tn[r][c] : null; if (t !== cur) { flush(); cur = t; } run += g ?? ' '; });
      flush();
      return s.replace(/\s+$/, '');
    }).join('\n');
  }
}

// 1 · Tulip: a long stem, the cup fully open, two blade leaves rising beside it
function tulip(p: Plate) {
  p.draw(22, 9, [
    '          |',
    '          |',
    '   .      |',
    '    \\     |      .',
    '     \\\\   |     /',
    '      \\\\  |    //',
    '       \\\\ |   //',
    '        \\\\|  //',
    '         \\| //',
    '          |/',
  ], 'plant');
  p.draw(23, 1, [
    '     _      _',
    "   .' '.  .' '.",
    "  /    '..'    \\",
    ' |  01  ||  10  |',
    ' |  10  ||  01  |',
    '  \\  01 || 10  /',
    "   '._  ||  _.'",
    "      '-..-'",
  ], 'flower');
  p.ground(32, 8);
  return { en: 'Tulipa · a long stem, the cup fully open', ar: 'توليب · ساق طويلة وكأس متفتحة' };
}

// 2 · Daisy: in full bloom, eight round petals around a bright eye, a short stem and one leaf
function daisy(p: Plate) {
  p.draw(20, 10, [
    '            |',
    '            |   _',
    "            |  / '.",
    "            | /  .'",
    "            |/_.'",
    '            |',
    '           /',
    '          |',
  ], 'plant');
  p.draw(20, 1, [
    '        .-.   .-.',
    '       ( 0 \\ / 1 )',
    '  .-.   \\ 1 V 0 /   .-.',
    " ( 01'-._\\  |  /_.-'10 )",
    "  '-.___ (@@@@@) ___.-'",
    " ( 10.-' /  |  \\ '-.01 )",
    "  '-'   / 0 ^ 1 \\   '-'",
    '       ( 1 / \\ 0 )',
    "        '-'   '-'",
  ], 'flower');
  p.ground(31, 6);
  return { en: 'Bellis · a field daisy in full bloom', ar: 'أقحوان · زهرة برية في كامل تفتحها' };
}

// 3 · Sunflower: a broad seeded head on a stout stem, heart-shaped leaves
function sunflower(p: Plate) {
  p.draw(18, 9, [
    '              ||',
    "     .--.     ||",
    "    /    '.   ||    .--.",
    "   (  ,   '-._||_.-'   ,)",
    "    '.  '.    ||    .'  .'",
    "      '-._'-. || .-'_.-'",
    "           '-.||.-'",
    '              ||',
    '              ||',
  ], 'plant');
  p.draw(18, 0, [
    '          _   _   _',
    '      _  / \\_/ \\_/ \\  _',
    '     / \\/ .:.:.:.:. \\/ \\',
    '    _\\  :.:.1.:.0.:.:  /_',
    '   /   .:.:.(@@@).:.:.   \\',
    "   \\_  ':.:0.:.:.1.:.'  _/",
    "     \\/\\  ':.:.:.:.'  /\\/",
    '        \\_/ \\_/ \\_/ \\_/',
  ], 'flower');
  p.tone(22, 2, 42, 6, 'd', '.');
  p.ground(32, 10);
  return { en: 'Helianthus · a heavy seeded head on a stout stem', ar: 'دوار الشمس · رأس ثقيل بالبذور على ساق متينة' };
}

// 4 · Rose: still in bud, sepals reaching up, a thorned stem with one leaf
function rosebud(p: Plate) {
  p.draw(23, 9, [
    '         |',
    '         |',
    '        <|',
    "   .--.  |",
    "  ( ,  '.|",
    "   '-.__/|>",
    '         |',
    '        <|',
    '         |',
    '         |',
  ], 'plant');
  p.draw(23, 2, [
    '       _..._',
    "     .' .-. '.",
    '    /  ( @ )  \\',
    "   |  '-.-.-'  |",
    '    \\  01|10  /',
    "     '._ | _.'",
  ], 'flower');
  p.draw(23, 8, ["    \\__.'|'.__/"], 'plant');
  p.ground(32, 6);
  return { en: 'Rosa · still in bud', ar: 'وردة · ما زالت برعماً' };
}

// 5 · Lily of the valley: bells hanging along an arching stem, a tall leaf beside it
function lily(p: Plate) {
  p.draw(6, 1, [
    "             _.-''''''''''''''''-._",
    "           .'    |     |     |     '.",
    '          /                          \\',
    '      .  |                            \\',
    '     / \\ |                             |',
    '    /   \\|                             |',
    '   /  |  |',
    '  |   |  |',
    '  |   |  |',
    '  |   |  |\\',
    '  |   |  | \\',
    '   \\  |  |  )',
    '    \\ |  | /',
    '     \\|  |/',
    '      \\  |',
    '       \\ |',
    '        \\|',
    '         |',
  ], 'plant');
  p.draw(6, 3, [
    '                /0\\   /1\\   /0\\',
    "                '-'   '-'   '-'",
    '',
    '',
    '                                     (1)',
    '                                      v',
    '                                      o',
  ], 'flower');
  p.ground(15, 8);
  return { en: 'Convallaria · bells along an arching stem', ar: 'زنبق الوادي · أجراس على ساق مقوّسة' };
}

// 6 · Dandelion: gone to seed, a few seeds already drifting off on the wind
function dandelion(p: Plate) {
  p.draw(16, 7, [
    '              |',
    '              |',
    '              |',
    '              |',
    '              |',
    '              |',
    '              |',
    '  _/\\_/\\_     |     _/\\_/\\_',
    "     '-._\\_   |   _/_.-'",
    "          '-._|_.-'",
    '              |',
  ], 'plant');
  p.draw(16, 0, [
    '          *  .  *  .  *',
    '       *   \\  \\ | /  /   *',
    '     .   \\  \\ \\|/ /  /   .',
    '    * ---- -- (@) -- ---- *',
    "     '   /  / /|\\ \\  \\   '",
    '       *   /  / | \\  \\   *',
    "          *  '  *  '  *",
  ], 'flower');
  p.draw(44, 0, ['   *', '  /    *', ' /    /', '      *', '     /'], 'flower');
  p.tone(20, 1, 41, 5, 'd', '\\/|-');
  p.tone(47, 0, 47, 0, 'w');
  p.ground(30, 8);
  return { en: 'Taraxacum · gone to seed, a few already drifting', ar: 'هندباء · صارت بذوراً وبعضها طار' };
}

// 7 · Lavender: three slim spikes gathered from one root
function lavender(p: Plate) {
  p.draw(20, 7, [
    '    |       |       |',
    '     \\      |      /',
    '      \\     |     /',
    '       \\    |    /',
    '        \\   |   /',
    '         \\  |  /',
    '          \\ | /',
    '           )|(',
    '          / | \\',
    "        ,'  |  ',",
    '            |',
    '            |',
  ], 'plant');
  const spike = ['  .', ' (0)', '(1)(0)', ' (0)(1)', '(1)(0)', ' (0)', '  |'];
  p.draw(22, 1, spike, 'flower'); p.draw(30, 0, spike, 'flower'); p.draw(38, 1, spike, 'flower');
  p.ground(32, 6);
  return { en: 'Lavandula · three spikes from one root', ar: 'خزامى · ثلاث سنابل من جذر واحد' };
}

// 8 · Poppy: one flower open with a dark eye, one bud still nodding on a hooked stem
function poppy(p: Plate) {
  p.draw(17, 6, [
    '         |               .-.',
    "         |              /   '.",
    "         '.            |      |",
    "           \\           |",
    "            |          |",
    "            |  '      /",
    "          ' |        /  '",
    '            \\      /',
    '             \\    /',
    '     _/\\_/\\_  \\  /  _/\\_/\\_',
    "        '-._'-.\\/.-'_.-'",
    "             '-.||.-'",
  ], 'plant');
  p.draw(17, 1, [
    "    .-~~-.  .-~~-.",
    "   (  01  `'  10  )",
    '  ( .-.  @@@@  .-. )',
    "   '(   '@@@@'   )'",
    "     '-._ || _.-'",
  ], 'flower');
  p.draw(44, 9, [' ( )', ' (1)', '  v'], 'flower');
  p.ground(31, 8);
  return { en: 'Papaver · one open, one still nodding', ar: 'خشخاش · واحدة متفتحة وأخرى مائلة' };
}

const DRAW: Record<string, (p: Plate) => { en: string; ar: string }> = {
  invasight: tulip, 'finance-analyzer': daisy, 'ewc-2024-dashboard': sunflower, 'qafiyah-feelings': rosebud,
  'bellabeat-case-study': lily, 'x-api-report': dandelion, 'saudi-sectors-dashboard': lavender, 'coworking-spaces-dashboard': poppy,
};
const ORDER = Object.values(DRAW);

/** The flower plate for a project: { html, en, ar }. Unknown slugs get a flower by position. */
export function projectArt(slug: string, i = 0) {
  const p = new Plate();
  const note = (DRAW[slug] ?? ORDER[i % ORDER.length])(p);
  p.center();
  return { html: p.html(), ...note };
}
