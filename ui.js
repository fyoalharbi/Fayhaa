// ─────────────────────────────────────────────
//  UI LOGIC — navigation · typewriter · language switcher
// ─────────────────────────────────────────────

// ── BILINGUAL CONTENT DATABASE ────────────────
const siteContent = {
  about: {
    EN: {
      label: 'MODE: WHO_AM_I',
      text: [
        'CORE_INTEL: [SQL // PYTHON // POWER_BI // p5.js].',
        'FOCUS: BUSINESS_INTELLIGENCE & GENERATIVE_ANALYTICS.',
        'WEBSITE: <a href="https://www.linkedin.com/in/fayhaaralharbi/" target="_blank">CLICK HERE ↗</a>',
        '',
        'DEPLOYMENT: [REMOTE_SERVER_ONLY]. CLOUD_WORKFLOW: [TRUE].',
        'SPEC: LIKES TO LEARN A LOT!',
        'WORKFLOW: IDEA → ANALYSIS → DEVELOP → DEPLOY',
        'STATUS: OPERATIONAL',
      ].join('\n'),
    },
    AR: {
      label: 'MODE: مين_انا',
      text: [
        'البيانات_الأساسية: [SQL // PYTHON // POWER_BI // p5.js].',
        'التركيز: ذكاء الأعمال والتحليلات التوليدية.',
        'الموقع: <a href="https://www.linkedin.com/in/fayhaaralharbi/" target="_blank">اضغط هنا ↗</a>',
        '',
        'نظام_العمل: [خادم_عن_بعد_فقط]. سير_العمل_السحابي: [مفعل].',
        'المواصفات: أحب اتعلم كثير!',
        'سير_العمل: فكرة ← تحليل ← تطوير ← تطبيق',
        'الحالة: تبحث عن فرص وتحديات جديدة',
      ].join('\n'),
    },
  },

  projects: {
    EN: {
      label: 'MODE: MY_PROJECTS',
      text: [
        'LOG_01: GEN_PIXEL_ARRAY_MORPH (p5.js)',
        'DATA_MAP: BRIGHTNESS → ASCII_CHAR // see live canvas',
        '',
        'INDEX_01: <a href="https://www.linkedin.com/posts/fayhaaralharbi_streamlit-dataabranalysis-fintech-ugcPost-7368461640532480003-fU7A?utm_source=share&utm_medium=member_desktop&rcm=ACoAADOtWxsBZoWmGnays5McimHAErtZqCtS0ak" target="_blank">Personal Finance Analyzer ↗</a>',
        'INDEX_02: <a href="https://app.powerbi.com/view?r=eyJrIjoiY2Y1M2M2ZjUtYjg4OC00NTc5LThlZTUtMjVjMDI5OWE1YjU5IiwidCI6ImMyYjA0ZGE2LTg0ODctNDFjYy04ODAzLTkwMzIxMDQ4YTc3MiIsImMiOjl9" target="_blank">EWC 2024 Dashboard ↗</a>',
        'INACTIVE_PROJECTS: 4',
      ].join('\n'),
    },
    AR: {
      label: 'MODE: مشاريعي',
      text: [
        'سجل_01: تحويل_مصفوفة_البكسل (p5.js)',
        'تخطيط_البيانات: السطوع → حرف_ASCII // انظر اللوحة',
        '',
        'فهرس_01: <a href="https://www.linkedin.com/posts/fayhaaralharbi_streamlit-dataabranalysis-fintech-ugcPost-7368461640532480003-fU7A?utm_source=share&utm_medium=member_desktop&rcm=ACoAADOtWxsBZoWmGnays5McimHAErtZqCtS0ak" target="_blank">محلل المعاملات البنكية ↗</a>',
        'فهرس_02: <a href="https://app.powerbi.com/view?r=eyJrIjoiY2Y1M2M2ZjUtYjg4OC00NTc5LThlZTUtMjVjMDI5OWE1YjU5IiwidCI6ImMyYjA0ZGE2LTg0ODctNDFjYy04ODAzLTkwMzIxMDQ4YTc3MiIsImMiOjl9" target="_blank">EWC 2024 Dashboard ↗</a>',
        'المشاريع غير النشطة: 4',
      ].join('\n'),
    },
  },

  philosophy: {
    EN: {
      label: 'MODE: MY_PHILOSOPHY',
      text: [
        'EVER_ASKED?',
        'WHY_BUTTERFLIES?',
        'THEIR_LIFESPAN_IS_SHORT',
        'THEIR_MAIN_TASK IS TO TRANSFER POLLEN BETWEEN FLOWERS',
        'MAYBE YOU THOUGHT ABOUT BEES!',
        'THEY ALL HAVE THE SAME TASK!',
        'BUT, BUTTERFLIES VISIT FLOWERS MORE OFTEN!',
        'AND YET, BEES ARE BETTER AT POLLINATION...',
        'BUTTERFLIES DIDN\'T DO THEIR MAIN JOB BETTER THAN ANYTHING ELSE',
        'BUT THEY COMPLEMENT IT BY FLYING AROUND AND VISITING FLOWERS ANYWAY!',
        'THIS IS MY CREATIVE ENGINE!',
        'I\'M NOT THE BEST BUT...',
        'I\'LL KEEP VISITING FLOWERS AND I DON\'T CARE ABOUT THE BEES',
      ].join('\n'),
    },
    AR: {
      label: 'MODE: فلسفتي',
      text: [
        'ما قد تسائلت؟',
        'ليش فيه فراشات؟',
        'حياتها قصيرة',
        'مهمتها الاساسية نقل لقاح الأزهار',
        'ممكن جاء على بالك النحلة!',
        'كلهم لهم نفس المهمة!',
        'لكن, الفراشة تزور الزهور أكثر!',
        'ورغم ذلك, النحلة احسن منها بالتلقيح...',
        'الفراشة ما قامت بدورها الرئيسي احسن شيء',
        'لكنها مكمله تطير وتزور الزهور ولا عليها!',
        'هذا هو محركي الإبداعي!',
        'أنا مو احسن وحدة لكن...',
        'بكمل ازور الزهور ولا علي من النحلة',

      ].join('\n'),
    },
  },
  contact: {
    EN: {
      label: 'MODE: SEND_SIGNAL',
      text: [
        'CHANNEL: GMAIL_DIRECT.',
        'ADDR: <a href="mailto:fayhaaralharbi@gmail.com">fayhaaralharbi@gmail.com ↗</a>',
        '',
        'STATUS: <span class="status-active">STANDBY_FOR_SIGNAL</span>',
        '',
        '// SECRET_CHANNEL: CLICK THE BUTTERFLY.',
        '',
        '> DATA_CHECK: LOCATION_INDEPENDENT_WORKFLOW_REQUIRED.',
        '> [ACCEPT_REMOTE_ONLY: TRUE]',
      ].join('\n'),
    },
    AR: {
      label: 'MODE: اتصل_بي',
      text: [
        'القناة: جيميل',
        'العنوان: <a href="mailto:fayhaaralharbi@gmail.com">fayhaaralharbi@gmail.com ↗</a>',
        '',
        'الحالة: <span class="status-active">في انتظار الإشارة</span>',
        '',
        '// القناة_السرية: اضغط على الفراشة.',
        '',
        '> فحص_البيانات: العمل_المستقل_عن_الموقع_مطلوب.',
        '> [قبول_العمل_عن_بعد_فقط: صحيح]',
      ].join('\n'),
    },
  },
};

// Section nav button IDs (language-independent)
const SECTION_META = {
  about:      'btn-01',
  projects:   'btn-02',
  philosophy: 'btn-03',
  contact:    'btn-04',
};

// ── STATE ─────────────────────────────────────
let currentMode     = 'about';
let currentLang     = 'EN';
let typewriterTimer = null;
let _contactTimer   = null;  // desperation Easter egg timer

// ── DESPERATION WARNING STRINGS ───────────────
const DESPERATION = {
  EN: '\n\n> WARNING: HIGH_REMOTE_PRIORITY.\n> IN_OFFICE_OFFERS_WILL_BE_REJECTED.\n> [RETRY_CONNECTION?]',
  AR: '\n\n> تحذير: أولوية_عالية_للعمل_عن_بعد.\n> العروض_المكتبية_سترفض_إلا_في_حال_وفرة_المال.\n> [إعادة_المحاولة؟]',
};

// ── UPDATE MODE (nav button click) ────────────
function updateMode(mode) {
  if (mode === currentMode) return;
  currentMode = mode;
  _renderMode(/* doGlitch = */ true);
}

// ── SWITCH LANGUAGE ───────────────────────────
function switchLanguage(lang) {
  if (lang === currentLang) return;
  currentLang = lang;

  // — Update switcher button indicators
  document.getElementById('lang-en').classList.toggle('active', lang === 'EN');
  document.getElementById('lang-ar').classList.toggle('active', lang === 'AR');

  // — Sync the remote status bar, uplink monitor, and header role
  _updateRemoteStatus(lang);
  _updateUplinkStatus(lang);
  _updateHeaderRole(lang);

  // — Toggle RTL / Arabic font on the output area
  const output   = document.getElementById('data-output');
  const metaWrap = document.getElementById('data-meta-wrap');
  const isAR     = lang === 'AR';

  output.classList.toggle('lang-ar',       isAR);
  metaWrap.classList.toggle('lang-ar-meta', isAR);

  // — Brief glitch to signal "system refresh", then re-print
  if (typeof triggerGlitch === 'function') triggerGlitch();
  setTimeout(() => _renderMode(/* doGlitch = */ false), 200);
}

// ── INTERNAL: apply mode state to UI ─────────
function _renderMode(doGlitch) {
  const content = siteContent[currentMode][currentLang];

  // Deactivate all nav buttons
  Object.entries(SECTION_META).forEach(([, btnId]) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.classList.remove('active');
    btn.querySelector('.btn-indicator').textContent = '□';
  });

  // Activate current
  const activeBtn = document.getElementById(SECTION_META[currentMode]);
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.querySelector('.btn-indicator').textContent = '■';
  }

  // Update meta labels
  document.getElementById('mode-label').textContent  = content.label;
  document.getElementById('data-status').textContent = 'STATUS: LOADING_▮';

  // Sync contact mode state with p5 sketch
  if (typeof setContactMode === 'function') {
    setContactMode(currentMode === 'contact');
  }

  // ASCII rain: spawn on contact mode entry
  if (currentMode === 'contact' && typeof startAsciiRain === 'function') {
    setTimeout(startAsciiRain, 420); // slight delay so glitch plays first
  }

  // Desperation Easter egg: 10s on contact page without clicking the link
  clearTimeout(_contactTimer);
  _contactTimer = null;
  if (currentMode === 'contact') {
    _contactTimer = setTimeout(() => {
      if (currentMode !== 'contact') return; // user left — abort
      _appendTypewrite(DESPERATION[currentLang]);
    }, 10000);
  }

  // Glitch → typewriter
  if (doGlitch && typeof triggerGlitch === 'function') triggerGlitch();
  setTimeout(() => _typewrite(content.text), doGlitch ? 180 : 0);
}

// ── TYPEWRITER (HTML-aware) ───────────────────
// Types visible characters one-by-one via innerHTML.
// When a '<' is encountered the entire tag is injected
// instantly (no delay) so links/spans are never half-rendered.
function _typewrite(text) {
  if (typewriterTimer !== null) {
    clearTimeout(typewriterTimer);
    typewriterTimer = null;
  }

  const el = document.getElementById('data-output');
  el.innerHTML = '';

  let i      = 0;
  let output = '';

  function tick() {
    if (i >= text.length) {
      document.getElementById('data-status').textContent = 'STATUS: READY';
      typewriterTimer = null;
      return;
    }

    const ch = text[i];

    if (ch === '<') {
      // Swallow the entire tag in one shot — find the closing '>'
      const closeIdx = text.indexOf('>', i);
      const end      = closeIdx !== -1 ? closeIdx + 1 : i + 1;
      output += text.slice(i, end);
      i = end;
      el.innerHTML = output;
      // Zero delay: tags are invisible, keep momentum going
      typewriterTimer = setTimeout(tick, 0);
      return;
    }

    output += ch;
    i++;
    el.innerHTML = output;

    // Tiered base delay + slight random jitter (20–50 ms range)
    const base  = ch === '\n' ? 85
                : ch === '.' ? 55
                : 20;
    const jitter = Math.random() * 30;   // 0–30 ms extra

    typewriterTimer = setTimeout(tick, base + jitter);
  }

  tick();
}

// ── APPEND TYPEWRITER ────────────────────────
// Like _typewrite but appends to existing content instead of clearing.
// Used by the desperation Easter egg.
function _appendTypewrite(text) {
  const el = document.getElementById('data-output');
  let i = 0;

  function tick() {
    if (i >= text.length) return;
    const ch = text[i];

    if (ch === '<') {
      const closeIdx = text.indexOf('>', i);
      const end = closeIdx !== -1 ? closeIdx + 1 : i + 1;
      el.innerHTML += text.slice(i, end);
      i = end;
      setTimeout(tick, 0);
      return;
    }

    el.innerHTML += ch;
    i++;
    const delay = ch === '\n' ? 100 : ch === '.' ? 65 : 32;
    setTimeout(tick, delay);
  }

  tick();
}

// ── HEADER ROLE ──────────────────────────────
function _updateHeaderRole(lang) {
  const el = document.getElementById('header-role');
  if (!el) return;
  if (lang === 'AR') {
    el.textContent = 'الدور: مهندس بيانات ذكاء أعمال // خبير تصور بيانات';
    el.style.direction  = 'rtl';
    el.style.fontFamily = "'Noto Sans Arabic', sans-serif";
    el.style.letterSpacing = '0';
  } else {
    el.textContent = 'ROLE: BI_DATA_ARCHITECT // VIZ_ENGINEER';
    el.style.direction  = '';
    el.style.fontFamily = '';
    el.style.letterSpacing = '';
  }
}

// ── UPLINK MONITOR ────────────────────────────
function _updateUplinkStatus(lang) {
  const el = document.getElementById('uplink-status');
  if (!el) return;
  if (lang === 'AR') {
    el.innerHTML = 'اتصال: [جاهز_عن_بعد] // التأخير: [0_ملي_ثانية] // الحزم: <span class="signal-blink">[متزامنة]</span>';
    el.classList.add('lang-ar-status');
  } else {
    el.innerHTML = 'UPLINK: [REMOTE_READY] // LATENCY: [0ms] // PACKETS: <span class="signal-blink">[SYNCED]</span>';
    el.classList.remove('lang-ar-status');
  }
}

// ── REMOTE STATUS BAR ────────────────────────
function _updateRemoteStatus(lang) {
  const el = document.getElementById('remote-status');
  if (!el) return;

  if (lang === 'AR') {
    el.innerHTML = 'الحالة: متاح_للعمل_عن_بعد // <span class="signal-blink">[الإشارة_نشطة]</span>';
    el.classList.add('lang-ar-status');
  } else {
    el.innerHTML = 'STATUS: OPEN_FOR_REMOTE_HIRE // <span class="signal-blink">[SIGNAL_ACTIVE]</span>';
    el.classList.remove('lang-ar-status');
  }
}

// ── INIT ──────────────────────────────────────
window.addEventListener('load', () => {
  _typewrite(siteContent.about.EN.text);
  _updateRemoteStatus('EN');
  _updateUplinkStatus('EN');
  _updateHeaderRole('EN');
});
