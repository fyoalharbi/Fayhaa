// ─────────────────────────────────────────────
//  EASTER EGGS
//    1. Ballpoint pen overlay — draw anywhere on the page
//    2. ASCII rain           — triggered when contact mode opens
// ─────────────────────────────────────────────

// ══ 1. BALLPOINT PEN OVERLAY ════════════════════
// A full-viewport fixed canvas sits on top with pointer-events: none
// so all links, the p5 canvas, and nav buttons work normally.
// Drawing is captured at the document level instead.

const penCanvas = document.createElement('canvas');
penCanvas.id = 'pen-layer';
document.body.appendChild(penCanvas);
const penCtx = penCanvas.getContext('2d');

function _resizePen() {
  penCanvas.width  = window.innerWidth;
  penCanvas.height = window.innerHeight;
  // Drawings are cleared on resize — acceptable for a casual Easter egg
}
_resizePen();
window.addEventListener('resize', _resizePen);

// ── Drawing state ─────────────────────────────
let _penDown    = false;
let _lastPX     = 0;
let _lastPY     = 0;
let _didDrag    = false;
const DRAG_MIN  = 4; // pixels of movement before we commit to drawing

document.addEventListener('mousedown', e => {
  _penDown  = true;
  _didDrag  = false;
  _lastPX   = e.clientX;
  _lastPY   = e.clientY;
});

document.addEventListener('mousemove', e => {
  if (!_penDown) return;

  const x  = e.clientX;
  const y  = e.clientY;
  const dx = x - _lastPX;
  const dy = y - _lastPY;

  // Don't start drawing until the user has genuinely dragged
  if (!_didDrag && Math.hypot(dx, dy) < DRAG_MIN) return;
  _didDrag = true;

  penCtx.beginPath();
  penCtx.moveTo(_lastPX, _lastPY);
  penCtx.lineTo(x, y);
  penCtx.strokeStyle = 'rgba(20, 20, 20, 0.68)';
  penCtx.lineWidth   = 1.2;
  penCtx.lineCap     = 'round';
  penCtx.lineJoin    = 'round';
  penCtx.stroke();

  _lastPX = x;
  _lastPY = y;
});

document.addEventListener('mouseup',    () => { _penDown = false; });
document.addEventListener('mouseleave', () => { _penDown = false; });

// Called by the [ERASE_MARKINGS] footer button
function eraseMarkings() {
  penCtx.clearRect(0, 0, penCanvas.width, penCanvas.height);
}


// ══ 2. ASCII RAIN ════════════════════════════════
// Triggered when the user opens the SEND_SIGNAL / contact section.
// 50 chars spawn at the top of the video-holder column, fall with
// gravity, bounce once off the footer border line, then fade out.

const RAIN_POOL = '0|1@#%?!~∙◦*+-';

// Called from ui.js when currentMode === 'contact'
function startAsciiRain() {
  const holder = document.getElementById('video-holder');
  const footer = document.querySelector('footer.grid-row');
  if (!holder || !footer) return;

  const holderRect = holder.getBoundingClientRect();
  const bounceY    = footer.getBoundingClientRect().top - 6; // px above footer rule

  for (let i = 0; i < 50; i++) {
    // Stagger spawns over 1.5 s for a curtain / waterfall feel
    setTimeout(() => _spawnRainChar(holderRect, bounceY), i * 32);
  }
}

function _spawnRainChar(holderRect, bounceY) {
  const el = document.createElement('span');
  el.className   = 'rain-char';
  el.textContent = RAIN_POOL[Math.floor(Math.random() * RAIN_POOL.length)];
  document.body.appendChild(el);

  // Start position: random x within holder, slightly above it
  let x  = holderRect.left + Math.random() * holderRect.width;
  let y  = holderRect.top  - Math.random() * 50;
  let vy = 1.2 + Math.random() * 2.5; // initial downward velocity
  let bounces = 0;

  function _fall() {
    vy += 0.2;  // gravity
    y  += vy;

    if (y >= bounceY && bounces < 2) {
      y  = bounceY;
      vy = -(vy * (0.3 + Math.random() * 0.2)); // damped bounce
      bounces++;
    }

    el.style.left    = x + 'px';
    el.style.top     = y + 'px';
    el.style.opacity = String(Math.max(0, 1 - bounces * 0.4));

    // Stop when settled on the floor after max bounces
    if (bounces >= 2 && Math.abs(vy) < 0.6) {
      el.style.transition = 'opacity 0.5s ease';
      el.style.opacity    = '0';
      setTimeout(() => el.remove(), 550);
      return;
    }

    requestAnimationFrame(_fall);
  }

  requestAnimationFrame(_fall);
}
