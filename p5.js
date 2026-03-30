// ─────────────────────────────────────────────
//  ASCII BUTTERFLY — p5.js sketch
//
//  Globals exposed to ui.js / easter.js:
//    triggerGlitch()      — short red scatter (~0.7 s)
//    setContactMode(bool) — swaps char set + red sparks
//
//  Secret trigger (canvas click):
//    Full 0.5 s invert glitch → mailto
//
//  Easter eggs:
//    Shy butterfly — whole image drifts away from cursor
//    Heart mode    — hearts appear when hovering the body center
// ─────────────────────────────────────────────

const CONTACT_MAILTO = 'mailto:fayhaaralharbi@gmail.com';

// ── CHAR SETS ────────────────────────────────
const CHARS         = '0|1. ';
const GLITCH_POOL   = '@#%&?!$/*+-~^░▒▓';
const CONTACT_CHARS = 'X%?! ';
const HEART_CHARS   = '♥ ✿ ☆ ';

let vid;
let cellW, cellH;

let glitchFrames     = 0;
let fullGlitchFrames = 0;
let contactMode      = false;

// Shy butterfly — smooth drift state
let driftX = 0, driftY = 0;
let targetDriftX = 0, targetDriftY = 0;
let isHeartMode = false;

// ── PRELOAD ──────────────────────────────────
function preload() {
  vid = createVideo(['newbutterfly1.mp4']);
}

// ── SETUP ────────────────────────────────────
function setup() {
  const container = document.getElementById('video-holder');
  const cw = container.offsetWidth || 600;

  const canvas = createCanvas(cw, cw);
  canvas.parent(container);

  canvas.elt.style.cursor = 'crosshair';
  canvas.mousePressed(secretTrigger);

  pixelDensity(1);
  vid.size(60, 60);
  vid.hide();
  vid.volume(0);

  vid.loop();
  vid.play();

  document.body.addEventListener('click', () => {
    vid.loop();
    vid.play();
  }, { once: true });
}

// ── DRAW ─────────────────────────────────────
function draw() {

  // ── 1. FULL SYSTEM GLITCH (secret butterfly click) ──
  if (fullGlitchFrames > 0) {
    fullGlitchFrames--;
    background(0);
    noStroke();
    textAlign(CENTER, CENTER);
    for (let k = 0; k < 500; k++) {
      const c = GLITCH_POOL.charAt(floor(random(GLITCH_POOL.length)));
      fill(random() < 0.7 ? color(255) : color(255, 40, 40));
      textSize(random(8, 20));
      text(c, random(width), random(height));
    }
    if (fullGlitchFrames === 0) {
      setTimeout(() => { window.location.href = CONTACT_MAILTO; }, 60);
    }
    return;
  }

  // ── 2. SHY BUTTERFLY DRIFT ───────────────────
  const inCanvas = mouseX >= 0 && mouseX <= width &&
                   mouseY >= 0 && mouseY <= height;
  const cX = width  / 2;
  const cY = height / 2;

  if (inCanvas) {
    const dx = mouseX - cX;
    const dy = mouseY - cY;
    const d  = sqrt(dx * dx + dy * dy) || 1;

    // Strength peaks near center, fades to zero at 55% of canvas width
    const maxRange = width * 0.55;
    const strength = 18 * max(0, 1 - d / maxRange);

    // Butterfly flees: drift is OPPOSITE to mouse direction from center
    targetDriftX = -(dx / d) * strength;
    targetDriftY = -(dy / d) * strength;

    // Heart mode: cursor is hovering the butterfly body
    isHeartMode = !contactMode && !glitchFrames && d < 55;
  } else {
    targetDriftX = 0;
    targetDriftY = 0;
    isHeartMode  = false;
  }

  // Ease toward target (0.06 = soft, laggy follow)
  driftX = lerp(driftX, targetDriftX, 0.06);
  driftY = lerp(driftY, targetDriftY, 0.06);

  // ── 3. NORMAL RENDER ─────────────────────────
  background(244);
  vid.loadPixels();

  cellW = width  / vid.width;
  cellH = height / vid.height;

  const glitching = glitchFrames > 0;
  if (glitching) glitchFrames--;

  // Pick active char set (priority: heart > contact > normal)
  const activeChars = isHeartMode ? HEART_CHARS
                    : contactMode ? CONTACT_CHARS
                    : CHARS;

  for (let x = 0; x < vid.width; x++) {
    for (let y = 0; y < vid.height; y++) {

      const idx = (x + y * vid.width) * 4;
      const lum = (vid.pixels[idx] + vid.pixels[idx + 1] + vid.pixels[idx + 2]) / 3;

      let c;
      if (glitching && random() < 0.55) {
        c = GLITCH_POOL.charAt(floor(random(GLITCH_POOL.length)));
      } else {
        const ci = floor(map(lum, 0, 255, 0, activeChars.length));
        c = activeChars.charAt(constrain(ci, 0, activeChars.length - 1));
      }

      // Ink color per mode
      if (glitching) {
        fill(random() < 0.4 ? color(180, 20, 20) : color(20));
      } else if (contactMode) {
        fill(random() < 0.08 ? color(200, 20, 20) : color(20));
      } else if (isHeartMode) {
        fill(random() < 0.25 ? color(180, 60, 90) : color(30));
      } else {
        fill(0);
      }

      noStroke();
      textSize(cellW * 1.15);
      textAlign(CENTER, CENTER);

      // Apply shy drift offset to all chars
      text(c,
        x * cellW + cellW / 2 + driftX,
        y * cellH + cellH / 2 + driftY
      );
    }
  }
}

// ── SECRET CHANNEL ────────────────────────────
function secretTrigger() {
  fullGlitchFrames = 15; // ~0.5 s at 30 fps
}

// ── CALLED BY ui.js ──────────────────────────
function triggerGlitch()        { glitchFrames = 22; }
function setContactMode(active) { contactMode = active; }

// ── DATA PROBE — injected at draw() end via patch ────────────
// Overwrites draw() to add the probe overlay after the char loop.
const _origDraw = draw;
draw = function() {
  _origDraw();

  // Only show probe in normal mode (not during full glitch)
  if (fullGlitchFrames > 0) return;

  const inC = mouseX >= 0 && mouseX <= width &&
              mouseY >= 0 && mouseY <= height;
  if (!inC || !vid.pixels || !vid.pixels.length) return;

  const pVidX = constrain(floor(mouseX / cellW), 0, vid.width  - 1);
  const pVidY = constrain(floor(mouseY / cellH), 0, vid.height - 1);
  const pIdx  = (pVidX + pVidY * vid.width) * 4;
  const pLum  = round((vid.pixels[pIdx] + vid.pixels[pIdx + 1] + vid.pixels[pIdx + 2]) / 3);

  const probe = `X:[${String(pVidX).padStart(2,'0')}] Y:[${String(pVidY).padStart(2,'0')}] VAL:[${String(pLum).padStart(3,'0')}]`;

  let px = mouseX + 14;
  let py = mouseY - 20;
  if (px + 152 > width)  px = mouseX - 156;
  if (py < 4)            py = mouseY + 14;

  noStroke();
  fill(244, 244, 244, 215);
  rect(px - 3, py - 2, 152, 14);

  fill(0);
  textSize(9);
  textAlign(LEFT, TOP);
  text(probe, px, py);
};
