// Build-time copy of KIT.flowerHTML (public/experiments/kit.js): an ASCII flower
// head as coloured <pre> markup, deterministic per seed.
const seeded = (s: string | number) => {
  let x = [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7) || 1;
  return () => ((x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
};
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));

export function flowerHTML({ R = 5, petals = 6, rot = 0, open = 1, seed = 1, squash = 0.5, stem = 0 } = {}) {
  const rnd = seeded(seed), Rv = Math.max(1, Math.round(R * squash));
  const W = R * 2 + 1, H = Rv * 2 + 1 + stem;
  const g: ([string, string] | null)[][] = Array.from({ length: H }, () => Array(W).fill(null));
  for (let dy = -Rv; dy <= Rv; dy++) for (let dx = -R; dx <= R; dx++) {
    const nx = dx / R, ny = dy / (R * squash), r = Math.hypot(nx, ny), a = Math.atan2(ny, nx);
    const edge = (0.55 + 0.45 * Math.abs(Math.cos((petals * a) / 2 + rot))) * (0.35 + 0.65 * open);
    let c: [string, string] | null = null;
    if (r < 0.26 * (0.6 + 0.4 * open)) c = [rnd() < 0.3 ? '8' : '@', 'c'];
    else if (r < 0.36 && open > 0.3) c = [rnd() < 0.5 ? 'o' : '.', 'd'];
    else if (r < edge - 0.14) c = [rnd() < 0.5 ? '0' : '1', 'p'];
    else if (r < edge) c = [rnd() < 0.5 ? "'" : '.', 'r'];
    if (c) g[dy + Rv][dx + R] = c;
  }
  for (let y = Rv * 2 + 1; y < H; y++) {
    const k = y - Rv * 2 - 1;
    g[y][R] = ['|', 's'];
    if (k === 1 && R > 2) { g[y][R + 1] = ['\\', 'l']; g[y][R + 2] = ['_', 'l']; }
    if (k === 3 && R > 2) { g[y][R - 1] = ['/', 'l']; g[y][R - 2] = ['_', 'l']; }
  }
  return g.map((row) => {
    let s = '', cur: string | null = null, run = '';
    const flush = () => { if (run) s += cur ? `<i class="t-${cur}">${esc(run)}</i>` : run; run = ''; };
    for (const c of row) { const tn = c ? c[1] : null; if (tn !== cur) { flush(); cur = tn; } run += c ? c[0] : ' '; }
    flush();
    return s;
  }).join('\n');
}
