// ─────────────────────────────────────────────
//  TERMINAL — commands · typewriter · language switcher
//
//  Content for projects / skills / links comes from window.PORTFOLIO,
//  which the Astro build fills from src/data/profile.ts and
//  src/content/projects/*. Add a project there and it shows up here.
// ─────────────────────────────────────────────

const DATA = window.PORTFOLIO;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const link = (href, label, ext = true) =>
  `<a href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
const mailto = `mailto:${DATA.profile.email}`;

// ── HAND-WRITTEN TERMINAL COPY ────────────────
// (kept in the terminal voice on purpose; the normal view has plain prose)
const COPY = {
  about: {
    EN: () => [
      'CORE_INTEL: [PYTHON // SQL // AIRFLOW // DBT // POWER_BI].',
      'FOCUS: DATA_PIPELINES & BUSINESS_INTELLIGENCE.',
      'BACKGROUND: API_INTEGRATIONS // FINANCE_SYSTEMS.',
      `LINKEDIN: ${link(DATA.profile.links.linkedin, '/in/fayhaaralharbi ↗')}`,
      `GITHUB: ${link(DATA.profile.links.github, '@fyoalharbi ↗')}`,
      DATA.resume ? `RESUME: ${link(DATA.resume, 'resume.pdf ↗')}` : null,
      '',
      'SPEC: LIKES TO LEARN A LOT!',
      'WORKFLOW: INGEST → TRANSFORM → MODEL → REPORT',
      'STATUS: OPERATIONAL',
      '',
      '<span class="comment">// try: ls projects · skills · help</span>',
    ],
    AR: () => [
      'البيانات_الأساسية: [PYTHON // SQL // AIRFLOW // DBT // POWER_BI].',
      'التركيز: خطوط البيانات وذكاء الأعمال.',
      'الخلفية: تكامل الأنظمة // الأنظمة المالية.',
      `لينكدإن: ${link(DATA.profile.links.linkedin, '/in/fayhaaralharbi ↗')}`,
      `جيت_هب: ${link(DATA.profile.links.github, '@fyoalharbi ↗')}`,
      DATA.resume ? `السيرة_الذاتية: ${link(DATA.resume, 'resume.pdf ↗')}` : null,
      '',
      'المواصفات: أحب اتعلم كثير!',
      'سير_العمل: استخراج ← تحويل ← نمذجة ← تقارير',
      'الحالة: تبحث عن فرص وتحديات جديدة',
      '',
      '<span class="comment">// جرب: ls projects · skills · help</span>',
    ],
  },
  philosophy: {
    EN: () => [
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
    ],
    AR: () => [
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
    ],
  },
  contact: {
    EN: () => [
      'CHANNEL: GMAIL_DIRECT.',
      `ADDR: ${link(mailto, `${DATA.profile.email} ↗`, false)}`,
      `LINKEDIN: ${link(DATA.profile.links.linkedin, '/in/fayhaaralharbi ↗')}`,
      '',
      'STATUS: <span class="status-active">STANDBY_FOR_SIGNAL</span>',
      '',
      '<span class="comment">// SECRET_CHANNEL: CLICK THE BUTTERFLY.</span>',
      '',
    ],
    AR: () => [
      'القناة: جيميل',
      `العنوان: ${link(mailto, `${DATA.profile.email} ↗`, false)}`,
      `لينكدإن: ${link(DATA.profile.links.linkedin, '/in/fayhaaralharbi ↗')}`,
      '',
      'الحالة: <span class="status-active">في انتظار الإشارة</span>',
      '',
      '<span class="comment">// القناة_السرية: اضغط على الفراشة.</span>',
      '',
    ],
  },
};

// Labels used by generated output
const L = {
  EN: {
    modes: { about: 'WHO_AM_I', projects: 'MY_PROJECTS', project: 'PROJECT_FILE', skills: 'MY_SKILLS',
             philosophy: 'MY_PHILOSOPHY', contact: 'SEND_SIGNAL', help: 'HELP', error: 'ERROR' },
    dir: 'DIR: ~/projects', files: (n) => `[${n}_FILES]`,
    openHint: "// open one: cat <name>  or  cat 01",
    problem: 'PROBLEM', role: 'ROLE', tools: 'TOOLS', result: 'RESULT', tags: 'SKILLS',
    readFull: 'READ_FULL_CASE_STUDY ↗', live: 'LIVE ↗', code: 'CODE ↗', post: 'LINKEDIN_POST ↗',
    wip: '// FULL_WRITE_UP: IN_PROGRESS',
    notFound: (x) => `ERR: NO_SUCH_FILE "${x}"`, tryLs: "// try: ls projects",
    skillsHead: 'SKILL_INDEX // [PROJECT_COUNT]', skillHint: '// drill down: skill <name>',
    noSkill: (x) => `ERR: UNKNOWN_SKILL "${x}"`, usedIn: 'USED_IN:', none: '  (WRITE-UP COMING SOON)',
    unknown: (x) => `COMMAND_NOT_FOUND: ${x}`, typeHelp: "// type 'help' for the command list",
    noResume: 'RESUME: NOT_UPLOADED_YET. EMAIL ME AND I\'LL SEND IT.',
    openingResume: 'OPENING resume.pdf ...', toNormal: 'SWITCHING_TO_NORMAL_VIEW ...',
    sudo: ['[sudo] password for recruiter: ********', 'ACCESS_GRANTED.', 'OPENING_MAIL_CLIENT ...'],
    help: [
      'AVAILABLE_COMMANDS:',
      '  whoami           about me',
      '  ls projects      list project files',
      '  cat <name|nn>    open a project',
      '  skills           skills + project count',
      '  skill <name>     projects using a skill',
      '  philosophy       why butterflies?',
      '  contact          send a signal',
      '  resume           download my résumé',
      '  lang en|ar       switch language',
      '  normal           leave the terminal',
      '  clear            clear the screen',
      '',
      '<span class="comment">// ↑ ↓ history · TAB completes</span>',
    ],
  },
  AR: {
    modes: { about: 'مين_انا', projects: 'مشاريعي', project: 'ملف_مشروع', skills: 'مهاراتي',
             philosophy: 'فلسفتي', contact: 'اتصل_بي', help: 'مساعدة', error: 'خطأ' },
    dir: 'المجلد: ~/projects', files: (n) => `[${n}_ملفات]`,
    openHint: '// افتح مشروع: cat <الاسم> أو cat 01',
    problem: 'المشكلة', role: 'الدور', tools: 'الأدوات', result: 'النتيجة', tags: 'المهارات',
    readFull: 'اقرأ_دراسة_الحالة ↗', live: 'مباشر ↗', code: 'الكود ↗', post: 'منشور_لينكدإن ↗',
    wip: '// الشرح_الكامل: قيد_الكتابة',
    notFound: (x) => `خطأ: الملف غير موجود "${x}"`, tryLs: '// جرب: ls projects',
    skillsHead: 'فهرس_المهارات // [عدد_المشاريع]', skillHint: '// للتفاصيل: skill <الاسم>',
    noSkill: (x) => `خطأ: مهارة غير معروفة "${x}"`, usedIn: 'مستخدمة_في:', none: '  (الشرح قريباً)',
    unknown: (x) => `الأمر غير موجود: ${x}`, typeHelp: "// اكتب 'help' لقائمة الأوامر",
    noResume: 'السيرة_الذاتية: لم ترفع بعد. راسلني وأرسلها لك.',
    openingResume: 'جاري فتح resume.pdf ...', toNormal: 'جاري التحويل للواجهة العادية ...',
    sudo: ['[sudo] كلمة المرور للمُوظِّف: ********', 'تم_منح_الصلاحية.', 'جاري فتح البريد ...'],
    help: [
      'الأوامر_المتاحة:',
      '  whoami           عني',
      '  ls projects      قائمة المشاريع',
      '  cat <اسم|رقم>    افتح مشروع',
      '  skills           المهارات وعدد المشاريع',
      '  skill <اسم>      مشاريع مهارة معينة',
      '  philosophy       ليش فراشات؟',
      '  contact          تواصل',
      '  resume           السيرة الذاتية',
      '  lang en|ar       تغيير اللغة',
      '  normal           الواجهة العادية',
      '  clear            مسح الشاشة',
    ],
  },
};

// Nav buttons highlight by mode (the skills/project sub-modes map to their parent)
const MODE_BTN = {
  about: 'btn-01', projects: 'btn-02', project: 'btn-02',
  skills: 'btn-03', philosophy: 'btn-04', contact: 'btn-05',
};

// ── STATE ─────────────────────────────────────
let currentMode     = null;
let currentLang     = 'EN';
let lastCommand     = 'whoami';
let typewriterTimer = null;
const history = [];
let historyIdx = 0;


// ── DATA HELPERS ──────────────────────────────
const projects = () => DATA.projects[currentLang === 'AR' ? 'ar' : 'en'];
const langKey = () => (currentLang === 'AR' ? 'ar' : 'en');
const skillLabel = (key) => DATA.skills.find((s) => s.key === key)?.label[langKey()] ?? key;

function findProject(arg) {
  const list = projects();
  if (/^\d+$/.test(arg)) return list[parseInt(arg, 10) - 1];
  const a = arg.toLowerCase().replace(/\.md$/, '');
  return list.find((p) => p.slug === a) || list.find((p) => p.slug.startsWith(a));
}

// ── COMMANDS ──────────────────────────────────
// Each returns { mode, lines, speed? } or performs a side effect.
const COMMANDS = {
  help:       () => ({ mode: 'help', lines: L[currentLang].help, speed: 'fast' }),
  whoami:     () => ({ mode: 'about', lines: COPY.about[currentLang]() }),
  about:      () => COMMANDS.whoami(),
  philosophy: () => ({ mode: 'philosophy', lines: COPY.philosophy[currentLang]() }),
  contact:    () => ({ mode: 'contact', lines: COPY.contact[currentLang]() }),

  ls: () => {
    const t = L[currentLang];
    const list = projects();
    const lines = [`${t.dir}  ${t.files(list.length)}`, ''];
    list.forEach((p, i) => {
      const n = String(i + 1).padStart(2, '0');
      lines.push(`${n}  <a href="?cmd=cat%20${esc(p.slug)}" data-cmd="cat ${esc(p.slug)}">${esc(p.slug)}</a>`);
      lines.push(`    ${esc(p.summary)}`);
      lines.push(`    <span class="comment">${esc(p.date)} // ${p.skills.map((s) => esc(skillLabel(s))).join(' · ')}</span>`);
      lines.push('');
    });
    lines.push(`<span class="comment">${t.openHint}</span>`);
    return { mode: 'projects', lines, speed: 'fast' };
  },

  cat: (arg) => {
    const t = L[currentLang];
    if (!arg) return COMMANDS.ls();
    const p = findProject(arg);
    if (!p) return { mode: 'error', lines: [t.notFound(esc(arg)), '', `<span class="comment">${t.tryLs}</span>`], speed: 'fast' };

    const lines = [`FILE: ${esc(p.slug)}.md`, `<b>${esc(p.title)}</b>`, `<span class="comment">${esc(p.date)}</span>`, ''];
    if (p.url) {
      // Only published case studies show the TL;DR (drafts still contain TODOs).
      lines.push(
        `${t.problem}: ${esc(p.tldr.problem)}`,
        `${t.role}: ${esc(p.tldr.role)}`,
        `${t.tools}: ${esc(p.tldr.tools)}`,
        `${t.result}: ${esc(p.tldr.result)}`,
      );
    } else {
      lines.push(esc(p.summary));
    }
    lines.push('', `${t.tags}: [${p.skills.map((s) => esc(skillLabel(s))).join(' // ')}]`, '');
    if (p.url) lines.push(`> ${link(p.url, t.readFull, false)}`);
    else lines.push(`<span class="comment">${t.wip}</span>`);
    if (p.links.live) lines.push(`> ${link(p.links.live, t.live)}`);
    if (p.links.github) lines.push(`> ${link(p.links.github, t.code)}`);
    if (p.links.linkedin) lines.push(`> ${link(p.links.linkedin, t.post)}`);
    return { mode: 'project', lines, speed: 'fast' };
  },

  skills: () => {
    const t = L[currentLang];
    const lines = [t.skillsHead, ''];
    DATA.skills.forEach((s) => {
      const n = projects().filter((p) => p.skills.includes(s.key)).length;
      const bar = '■'.repeat(n) + '□'.repeat(Math.max(0, 3 - n));
      lines.push(`${bar}  <a href="?cmd=skill%20${s.key}" data-cmd="skill ${s.key}">${esc(s.label[langKey()])}</a>`);
    });
    lines.push('', `<span class="comment">${t.skillHint}</span>`);
    return { mode: 'skills', lines, speed: 'fast' };
  },

  skill: (arg) => {
    const t = L[currentLang];
    if (!arg) return COMMANDS.skills();
    const a = arg.toLowerCase();
    const s = DATA.skills.find((x) => x.key === a || x.label.en.toLowerCase() === a || x.key.startsWith(a));
    if (!s) return { mode: 'error', lines: [t.noSkill(esc(arg)), '', `<span class="comment">// skills</span>`], speed: 'fast' };
    const used = projects().filter((p) => p.skills.includes(s.key));
    const lines = [`SKILL: <b>${esc(s.label[langKey()])}</b>`, '', t.usedIn];
    if (!used.length) lines.push(t.none);
    used.forEach((p) => lines.push(`  → <a href="?cmd=cat%20${p.slug}" data-cmd="cat ${esc(p.slug)}">${esc(p.title)}</a>`));
    return { mode: 'skills', lines, speed: 'fast' };
  },

  resume: () => {
    const t = L[currentLang];
    if (!DATA.resume) return { mode: 'contact', lines: [t.noResume, '', `ADDR: ${link(mailto, DATA.profile.email + ' ↗', false)}`], speed: 'fast' };
    setTimeout(() => window.open(DATA.resume, '_blank'), 600);
    return { mode: 'about', lines: [t.openingResume, `> ${link(DATA.resume, 'resume.pdf ↗')}`], speed: 'fast' };
  },

  lang: (arg) => {
    const l = (arg || '').toUpperCase();
    switchLanguage(l === 'AR' ? 'AR' : l === 'EN' ? 'EN' : currentLang === 'EN' ? 'AR' : 'EN');
    return null; // switchLanguage re-renders the last command
  },

  normal: () => {
    try { localStorage.setItem('fayhaa:view', 'normal'); } catch (e) {}
    setTimeout(() => { location.href = DATA.normal[langKey()]; }, 450);
    return { mode: 'help', lines: [L[currentLang].toNormal], speed: 'fast' };
  },
  exit: () => COMMANDS.normal(),
  gui:  () => COMMANDS.normal(),

  clear: () => {
    clearTimeout(typewriterTimer);
    document.getElementById('data-output').innerHTML = '';
    return null;
  },

  sudo: (arg) => {
    if (!/hire/.test(arg)) return { mode: 'error', lines: ['nice try.', '<span class="comment">// sudo hire-me</span>'], speed: 'fast' };
    setTimeout(() => { location.href = mailto + '?subject=' + encodeURIComponent("Let's work together"); }, 1800);
    return { mode: 'contact', lines: L[currentLang].sudo };
  },
};
COMMANDS.open = COMMANDS.cat;
COMMANDS.projects = COMMANDS.ls;

// ── RUN A COMMAND (typed, clicked, or from ?cmd=) ──
function runCommand(raw, { echo = false, remember = true } = {}) {
  const input = String(raw).trim();
  if (!input) return;
  const [name, ...rest] = input.split(/\s+/);
  let arg = rest.join(' ');
  const fn = COMMANDS[name.toLowerCase()];

  if (name.toLowerCase() === 'ls' && arg && !/^projects?\/?$/i.test(arg)) {
    // `ls skills` is a friendly alias
    if (/^skills?$/i.test(arg)) return runCommand('skills', { echo, remember });
  }

  const result = fn
    ? fn(arg)
    : { mode: 'error', lines: [L[currentLang].unknown(esc(name)), '', `<span class="comment">${L[currentLang].typeHelp}</span>`], speed: 'fast' };

  if (remember && fn && !['lang', 'clear', 'normal', 'exit', 'gui', 'sudo', 'resume'].includes(name.toLowerCase())) {
    lastCommand = input;
  }
  if (!result) return;

  const lines = result.lines.filter((l) => l !== null);
  const text = (echo ? `<span class="comment">&gt; ${esc(input)}</span>\n\n` : '') + lines.join('\n');
  _render(result.mode, text, result.speed);
}

// ── SWITCH LANGUAGE ───────────────────────────
function switchLanguage(lang) {
  if (lang === currentLang) return;
  currentLang = lang;

  document.getElementById('lang-en').classList.toggle('active', lang === 'EN');
  document.getElementById('lang-ar').classList.toggle('active', lang === 'AR');
  document.getElementById('normal-link').href = DATA.normal[langKey()];
  document.documentElement.lang = langKey();

  _updateRemoteStatus(lang);
  _updateUplinkStatus(lang);
  _updateHeaderRole(lang);

  const output   = document.getElementById('data-output');
  const metaWrap = document.getElementById('data-meta-wrap');
  const isAR     = lang === 'AR';
  output.classList.toggle('lang-ar', isAR);
  metaWrap.classList.toggle('lang-ar-meta', isAR);

  if (typeof triggerGlitch === 'function') triggerGlitch();
  currentMode = null; // force a re-render in the new language
  setTimeout(() => runCommand(lastCommand, { remember: false }), 200);
}

// ── INTERNAL: apply mode state to UI, then type ──
function _render(mode, text, speed) {
  const modeChanged = mode !== currentMode;
  currentMode = mode;

  Object.values(MODE_BTN).forEach((btnId) => {
    const btn = document.getElementById(btnId);
    btn.classList.remove('active');
    btn.querySelector('.btn-indicator').textContent = '□';
  });
  const activeBtn = document.getElementById(MODE_BTN[mode]);
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.querySelector('.btn-indicator').textContent = '■';
  }

  document.getElementById('mode-label').textContent  = `MODE: ${L[currentLang].modes[mode] || mode.toUpperCase()}`;
  document.getElementById('data-status').textContent = 'STATUS: LOADING_▮';

  if (typeof setContactMode === 'function') setContactMode(mode === 'contact');
  if (mode === 'contact' && modeChanged && typeof startAsciiRain === 'function' && !REDUCED_MOTION) {
    setTimeout(startAsciiRain, 420);
  }


  const doGlitch = modeChanged;
  if (doGlitch && typeof triggerGlitch === 'function') triggerGlitch();
  setTimeout(() => _typewrite(text, speed), doGlitch ? 180 : 0);
}

// ── TYPEWRITER (HTML-aware) ───────────────────
// Types visible characters one-by-one via innerHTML. A '<' injects the whole
// tag instantly so links/spans are never half-rendered; '&' injects the whole
// entity. speed 'fast' types several chars per tick for long listings.
function _typewrite(text, speed) {
  if (typewriterTimer !== null) {
    clearTimeout(typewriterTimer);
    typewriterTimer = null;
  }

  const el = document.getElementById('data-output');
  const status = document.getElementById('data-status');
  el.setAttribute('aria-busy', 'true');

  const done = () => {
    el.innerHTML = text;
    el.setAttribute('aria-busy', 'false');
    status.textContent = 'STATUS: READY';
    typewriterTimer = null;
  };
  if (REDUCED_MOTION) return done();

  // 'fast' output is paced by elapsed time (≈350 chars/s) rather than per tick,
  // so long listings stay quick even while the p5 canvas is busy.
  const fast = speed === 'fast';
  const FAST_RATE = 0.35; // chars per ms
  let lastTick = performance.now();
  let i = 0;
  let output = '';

  function step() {
    const ch = text[i];
    if (ch === '<' || ch === '&') {
      const close = text.indexOf(ch === '<' ? '>' : ';', i);
      const end = close !== -1 ? close + 1 : i + 1;
      output += text.slice(i, end);
      i = end;
      return '';
    }
    output += ch;
    i++;
    return ch;
  }

  function tick() {
    if (i >= text.length) return done();
    const now = performance.now();
    const perTick = fast ? Math.max(1, Math.round((now - lastTick) * FAST_RATE)) : 1;
    lastTick = now;
    let last = '';
    for (let n = 0; n < perTick && i < text.length; n++) last = step() || last;
    el.innerHTML = output;

    const base = fast ? 10
               : last === '\n' ? 85
               : last === '.' ? 55
               : 20;
    typewriterTimer = setTimeout(tick, fast ? base : base + Math.random() * 30);
  }

  tick();
}

// ── APPEND TYPEWRITER (desperation Easter egg) ──
function _appendTypewrite(text) {
  const el = document.getElementById('data-output');
  if (REDUCED_MOTION) { el.innerHTML += text; return; }
  let i = 0;
  function tick() {
    if (i >= text.length) return;
    const ch = text[i];
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
  const isAR = lang === 'AR';
  el.textContent = isAR ? `الدور: ${DATA.profile.role.ar}` : `ROLE: ${DATA.profile.role.en.toUpperCase()}`;
  el.style.direction     = isAR ? 'rtl' : '';
  el.style.fontFamily    = isAR ? "'Noto Sans Arabic', sans-serif" : '';
  el.style.letterSpacing = isAR ? '0' : '';
}

// ── UPLINK MONITOR ────────────────────────────
function _updateUplinkStatus(lang) {
  const el = document.getElementById('uplink-status');
  if (!el) return;
  if (lang === 'AR') {
    el.innerHTML = 'اتصال: [جاهز] // التأخير: [0_ملي_ثانية] // الحزم: <span class="signal-blink">[متزامنة]</span>';
    el.classList.add('lang-ar-status');
  } else {
    el.innerHTML = 'UPLINK: [READY] // LATENCY: [0ms] // PACKETS: <span class="signal-blink">[SYNCED]</span>';
    el.classList.remove('lang-ar-status');
  }
}

// ── REMOTE STATUS BAR ────────────────────────
function _updateRemoteStatus(lang) {
  const el = document.getElementById('remote-status');
  if (!el) return;
  if (lang === 'AR') {
    el.innerHTML = 'الحالة: متصلة // <span class="signal-blink">[الإشارة_نشطة]</span>';
    el.classList.add('lang-ar-status');
  } else {
    el.innerHTML = 'STATUS: ONLINE // <span class="signal-blink">[SIGNAL_ACTIVE]</span>';
    el.classList.remove('lang-ar-status');
  }
}

// ── COMMAND LINE INPUT ────────────────────────
function _completions(partial) {
  const [name, ...rest] = partial.split(/\s+/);
  if (!rest.length) return Object.keys(COMMANDS).filter((c) => c.startsWith(name.toLowerCase()));
  const arg = rest.join(' ').toLowerCase();
  const pool = /^(cat|open)$/.test(name) ? projects().map((p) => p.slug)
             : name === 'skill' ? DATA.skills.map((s) => s.key)
             : name === 'lang' ? ['en', 'ar']
             : name === 'ls' ? ['projects', 'skills'] : [];
  return pool.filter((x) => x.startsWith(arg)).map((x) => `${name} ${x}`);
}

function _initInput() {
  const form  = document.getElementById('term-form');
  const input = document.getElementById('term-input');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    history.push(v);
    historyIdx = history.length;
    input.value = '';
    runCommand(v, { echo: true });
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && history.length) {
      e.preventDefault();
      historyIdx = Math.max(0, historyIdx - 1);
      input.value = history[historyIdx];
    } else if (e.key === 'ArrowDown' && history.length) {
      e.preventDefault();
      historyIdx = Math.min(history.length, historyIdx + 1);
      input.value = history[historyIdx] ?? '';
    } else if (e.key === 'Tab' && input.value) {
      const c = _completions(input.value.trim());
      if (c.length) { e.preventDefault(); input.value = c[0] + (c.length === 1 ? ' ' : ''); }
    }
  });

  // Links inside the output that carry data-cmd run in place instead of reloading
  document.getElementById('data-output').addEventListener('click', (e) => {
    const a = e.target.closest('a[data-cmd]');
    if (!a) return;
    e.preventDefault();
    runCommand(a.dataset.cmd, { echo: true });
  });

  // Typing anywhere focuses the prompt, but never steal keys from a focused
  // button/link (space activates them) or another field
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1 || e.key === ' ') return;
    const a = document.activeElement;
    if (a === input || (a && a.closest('button, a, input, textarea, select'))) return;
    input.focus();
  });
}

// ── INIT ──────────────────────────────────────
window.addEventListener('load', () => {
  _initInput();
  _updateRemoteStatus('EN');
  _updateUplinkStatus('EN');
  _updateHeaderRole('EN');

  const params = new URLSearchParams(location.search);
  const cmd = params.get('cmd');
  if (params.get('lang') === 'ar') {
    lastCommand = cmd || 'whoami';
    switchLanguage('AR');
  } else {
    runCommand(cmd || 'whoami', { echo: Boolean(cmd) });
  }
});
