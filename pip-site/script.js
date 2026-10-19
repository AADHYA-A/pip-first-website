/* Pip's First Website · all interactions. No libraries. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const rand = (a, b) => Math.random() * (b - a) + a;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: fine */ } }
  };

  /* ---------- OPTIONAL BACKEND (Supabase REST). Empty config = local-only mode ---------- */
  const CFG = window.PIP_CONFIG || {};
  const BASE = String(CFG.SUPABASE_URL || '').replace(/\/+$/, '');
  const KEY = String(CFG.SUPABASE_ANON_KEY || '');
  const live = /^https:\/\//.test(BASE) && KEY.length > 20;
  async function sb(path, opts = {}) {
    const res = await fetch(`${BASE}/rest/v1/${path}`, {
      ...opts,
      signal: window.AbortSignal && AbortSignal.timeout ? AbortSignal.timeout(7000) : undefined,
      // legacy anon keys are JWTs and may be sent as a Bearer token; new "sb_publishable_" keys are not JWTs and go in `apikey` only
      headers: { apikey: KEY, ...(KEY.startsWith('eyJ') ? { Authorization: `Bearer ${KEY}` } : {}), 'Content-Type': 'application/json', ...(opts.headers || {}) }
    });
    if (!res.ok) throw new Error('Backend ' + res.status);
    const text = await res.text();             // inserts reply 201 with an empty body
    return text ? JSON.parse(text) : null;
  }

  /* ---------- AUDIO (Web Audio, global mute) ---------- */
  let ctx = null, master = null;
  let muted = store.get('pip-muted', false);

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.8;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, o = {}) {
    if (muted) return;
    const c = audio(); if (!c) return;
    const { dur = 1.2, type = 'sine', vol = 0.25, when = 0 } = o;
    const t = c.currentTime + when;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  function bell(freq, o = {}) {
    const vol = o.vol || 0.25, dur = o.dur || 1.2, when = o.when || 0;
    tone(freq, { vol, dur, when });
    tone(freq * 2, { vol: vol * 0.35, dur: dur * 0.6, when });
    tone(freq * 3.01, { vol: 0.05, dur: 0.4, when });
  }
  function giggle() {
    for (let i = 0; i < 5; i++) tone(480 + i * 70 + rand(-20, 20), { dur: 0.09, type: 'triangle', vol: 0.12, when: i * 0.08 });
  }
  function clunk() { tone(120, { dur: 0.18, type: 'square', vol: 0.1 }); tone(70, { dur: 0.25, type: 'sine', vol: 0.2 }); }

  const NOTES = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
  const NAMES = ['C', 'D', 'E', 'G', 'A', 'C', 'D', 'E'];

  ['pointerdown', 'keydown', 'touchend'].forEach(ev => window.addEventListener(ev, () => { if (!muted) audio(); }, { once: true, passive: true }));

  const muteBtn = $('#muteBtn');
  function renderMute() {
    muteBtn.setAttribute('aria-pressed', String(muted));
    muteBtn.setAttribute('aria-label', muted ? 'Sound off. Press to turn sound on' : 'Sound on. Press to mute');
    $('.label', muteBtn).textContent = muted ? 'Sound off' : 'Sound on';
  }
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    store.set('pip-muted', muted);
    if (master) master.gain.value = muted ? 0 : 0.8;
    if (muted) stopLullaby();
    renderMute();
    if (!muted) bell(NOTES[4], { dur: 0.8 });
  });
  renderMute();

  /* ---------- MOOD (day / night) ---------- */
  const moodBtn = $('#moodBtn');
  function setMood(m, quiet) {
    document.body.dataset.mood = m;
    moodBtn.setAttribute('aria-pressed', String(m === 'night'));
    $('span[aria-hidden]', moodBtn).textContent = m === 'night' ? '☾' : '☀';
    $('.label', moodBtn).textContent = m === 'night' ? 'Night' : 'Day';
    moodBtn.setAttribute('aria-label', m === 'night' ? 'Night mode. Press for day' : 'Day mode. Press for night');
    store.set('pip-mood', m);
    if (!quiet) { m === 'day' ? giggle() : bell(NOTES[1], { dur: 1.4 }); }
  }
  moodBtn.addEventListener('click', () => setMood(document.body.dataset.mood === 'night' ? 'day' : 'night'));
  setMood(store.get('pip-mood', 'night'), true);

  /* ---------- PIP: eyes follow pointer ---------- */
  const pipSvg = $('#pip');
  const eyes = $$('.eye');
  function updateEyes(x, y) {
    eyes.forEach(eye => {
      const r = $('.socket', eye).getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = x - cx, dy = y - cy;
      const d = Math.hypot(dx, dy) || 1;
      const m = Math.min(7, d / 18);
      $('.pupil', eye).style.transform = `translate(${(dx / d) * m}px, ${(dy / d) * m}px)`;
    });
    // the head leans a few degrees toward the pointer
    const pr = pipSvg.getBoundingClientRect();
    const tilt = clamp(((x - (pr.left + pr.width / 2)) / Math.max(300, window.innerWidth / 2)) * 8, -7, 7);
    $('#head').style.transform = `rotate(${tilt.toFixed(1)}deg)`;
  }
  // blink every few seconds
  (function blinkLoop() {
    setTimeout(() => {
      pipSvg.classList.add('blink');
      setTimeout(() => pipSvg.classList.remove('blink'), 130);
      blinkLoop();
    }, 2800 + Math.random() * 3200);
  })();
  let lastMove = 0;
  const onPointer = e => { lastMove = Date.now(); updateEyes(e.clientX, e.clientY); };
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', onPointer, { passive: true });
  // idle: Pip looks around on his own (also covers touch devices between taps)
  setInterval(() => {
    if (reduceMotion || Date.now() - lastMove < 3500) return;
    const r = pipSvg.getBoundingClientRect();
    updateEyes(r.left + r.width / 2 + rand(-250, 250), r.top + r.height / 2 + rand(-120, 200));
  }, 1800);

  function bounce() {
    pipSvg.classList.remove('bounce');
    void pipSvg.getBoundingClientRect();
    pipSvg.classList.add('bounce');
    giggle();
  }
  pipSvg.addEventListener('click', e => { if (!e.target.closest('#pompom, #zzz')) bounce(); });
  $('#giggleBtn').addEventListener('click', bounce);

  /* ---------- EASTER EGG: tickle the pompom 3x ---------- */
  const pompom = $('#pompom');
  const secretBox = $('#secret');
  const secretCount = $('#secretCount');
  let tickles = 0, tickleTimer;
  const secretsFound = new Set(store.get('pip-secrets', []));
  function renderSecret() { secretCount.textContent = secretsFound.size + '/3'; }
  function foundSecret(id) { secretsFound.add(id); store.set('pip-secrets', [...secretsFound]); renderSecret(); }
  let bannerTimer;
  function showBanner(a, b) {
    secretBox.innerHTML = '';
    [a, b].forEach(t => { const p = document.createElement('p'); p.textContent = t; secretBox.appendChild(p); });
    secretBox.hidden = false;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { secretBox.hidden = true; }, 6500);
  }
  function rain(glyph, n) {
    if (reduceMotion) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'fallstar';
      s.textContent = glyph;
      s.style.left = rand(0, 96) + 'vw';
      s.style.animationDelay = rand(0, 1.4) + 's';
      document.body.appendChild(s);
      s.addEventListener('animationend', () => s.remove());
    }
  }
  function tickle(e) {
    if (e) e.stopPropagation();
    tickles++;
    clearTimeout(tickleTimer);
    tickleTimer = setTimeout(() => { tickles = 0; }, 1600);
    pompom.classList.remove('wiggle');
    void pompom.getBoundingClientRect();
    pompom.classList.add('wiggle');
    giggle();
    if (tickles >= 3) { tickles = 0; secret(); }
  }
  function secret() {
    foundSecret('pompom');
    showBanner('✦ You found Pip’s secret lullaby! ✦', 'Pip giggled so hard the stars fell out of the nightcap.');
    // secret lullaby: a twinkly up-and-down run
    const seq = [0, 2, 3, 5, 7, 5, 3, 2, 0, 3, 5, 7];
    seq.forEach((n, i) => bell(NOTES[n], { when: i * 0.16, dur: 1.4, vol: 0.2 }));
    if (!reduceMotion) {
      for (let i = 0; i < 26; i++) {
        const s = document.createElement('span');
        s.className = 'fallstar';
        s.textContent = '✦';
        s.style.left = rand(0, 98) + 'vw';
        s.style.animationDelay = rand(0, 1.4) + 's';
        document.body.appendChild(s);
        s.addEventListener('animationend', () => s.remove());
      }
    }
  }
  pompom.addEventListener('click', tickle);
  pompom.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tickle(); } });
  renderSecret();

  /* ---------- SPARKLE CURSOR TRAIL ---------- */
  if (!reduceMotion) {
    let lastSpark = 0;
    const glyphs = ['✦', '✧', '☾', '·'];
    window.addEventListener('pointermove', e => {
      const now = performance.now();
      if (now - lastSpark < 55) return;
      lastSpark = now;
      const s = document.createElement('span');
      s.className = 'spark';
      s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      s.style.left = e.clientX + 'px';
      s.style.top = e.clientY + 'px';
      s.style.setProperty('--dx', rand(-22, 22) + 'px');
      document.body.appendChild(s);
      s.addEventListener('animationend', () => s.remove());
    }, { passive: true });
  }

  /* ---------- GREETING (Pip remembers you) + ODOMETER ---------- */
  const visits = store.get('pip-visits', 0) + 1;
  store.set('pip-visits', visits);
  $('#greeting').textContent = visits === 1
    ? 'Hi, new friend! Move your mouse (or your finger). I will look.'
    : `Welcome back${store.get('pip-name', '') ? ', ' + store.get('pip-name', '') : ''}! This is visit #${visits}. I saved your seat on the cloud.`;

  const odo = $('#odo');
  let delivered = 1204 + store.get('pip-delivered', 0);
  function renderOdo(animate) {
    const s = String(delivered).padStart(6, '0');
    odo.innerHTML = '';
    [...s].forEach((ch, i) => {
      const d = document.createElement('span');
      d.textContent = ch;
      if (animate && i === s.length - 1) d.className = 'tick';
      odo.appendChild(d);
    });
    odo.setAttribute('aria-label', `${delivered} dreams delivered`);
  }
  async function bumpDreams() {
    delivered++;                                   // optimistic: show it instantly
    store.set('pip-delivered', delivered - 1204);
    renderOdo(true);
    if (!live) return;
    try {
      const n = await sb('rpc/increment_dreams', { method: 'POST', body: '{}' });
      if (typeof n === 'number') { delivered = n; renderOdo(false); }   // swap in the shared number
    } catch (e) { /* keep the optimistic value */ }
  }
  function deliver() { bumpDreams(); bell(NOTES[5], { dur: 1.2 }); }
  async function pullDreams() {
    if (!live) return;
    try {
      const r = await sb('stats?select=dreams_delivered&id=eq.1');
      if (r && r[0]) { delivered = Number(r[0].dreams_delivered); renderOdo(false); }
    } catch (e) { /* offline: keep local value */ }
  }
  renderOdo(false);
  pullDreams();

  /* ---------- LULLABY LAB ---------- */
  const keysEl = $('#keys');
  const windBtn = $('#windBtn'), stopBtn = $('#stopBtn'), labStatus = $('#labStatus');
  const keyEls = NOTES.map((f, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'key';
    b.textContent = NAMES[i];
    b.setAttribute('aria-label', `Play note ${NAMES[i]}`);
    b.addEventListener('click', () => { flashKey(i); bell(f, { dur: 1.6 }); labStatus.textContent = 'Ding.'; if (muted) labStatus.textContent = 'Sound is off. Turn it on with the ♪ button.'; });
    keysEl.appendChild(b);
    return b;
  });
  function flashKey(i) {
    keyEls[i].classList.add('hit');
    setTimeout(() => keyEls[i].classList.remove('hit'), 180);
  }
  // an original little lullaby (indexes into NOTES)
  const MELODY = [2, 4, 5, 4, 2, 0, 2, 2, 4, 5, 7, 5, 4, 2, 4, 4, 5, 7, 7, 5, 4, 2, 4, 2, 0, 2, 4, 2, 0, 0, 0, 0];
  let lullabyTimer = null, step = 0;
  function playStep() {
    const n = MELODY[step % MELODY.length];
    flashKey(n);
    bell(NOTES[n], { dur: 1.5, vol: 0.22 });
    step++;
    lullabyTimer = setTimeout(playStep, Number($('#tempo').value) || 460);
  }
  function startLullaby() {
    if (muted) { labStatus.textContent = 'Sound is off. Turn it on with the ♪ button to hear the music box.'; return; }
    if (lullabyTimer) return;
    step = 0;
    windBtn.disabled = true; stopBtn.disabled = false;
    labStatus.textContent = 'The music box is humming…';
    playStep();
  }
  function stopLullaby() {
    if (lullabyTimer) { clearTimeout(lullabyTimer); lullabyTimer = null; }
    windBtn.disabled = false; stopBtn.disabled = true;
    labStatus.textContent = 'The music box is quiet.';
  }
  windBtn.addEventListener('click', startLullaby);
  stopBtn.addEventListener('click', stopLullaby);

  /* ---------- NIGHTLIGHTS ---------- */
  const lamps = $$('.lamp');
  const lampStatus = $('#lampStatus');
  lamps.forEach(l => l.addEventListener('click', () => {
    const on = l.getAttribute('aria-pressed') !== 'true';
    l.setAttribute('aria-pressed', String(on));
    bell(NOTES[Number(l.dataset.note)], { dur: 1.2 });
    const lit = lamps.filter(x => x.getAttribute('aria-pressed') === 'true').length;
    lampStatus.textContent = lit === 0 ? 'All lamps are off.'
      : lit === lamps.length ? 'Every lamp is glowing. Sweet dreams!' : `${lit} of ${lamps.length} lamps glowing.`;
    if (lit === lamps.length) giggle();
  }));

  /* flashlight attic */
  const attic = $('#attic');
  function aim(e) {
    const r = attic.getBoundingClientRect();
    attic.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    attic.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }
  attic.addEventListener('pointermove', aim);
  attic.addEventListener('pointerdown', aim);

  /* ---------- DREAM DELIVERY ROUTE (scroll-synced) ---------- */
  const route = $('#route'), courier = $('#courier'), routeWrap = $('#routeWrap');
  const routeLen = route.getTotalLength();
  route.style.strokeDasharray = routeLen;
  route.style.strokeDashoffset = routeLen;
  const lights = $$('.light');
  let routeDone = false;
  function updateRoute() {
    const r = routeWrap.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = clamp((vh * 0.9 - r.top) / (vh * 0.5 + r.height), 0, 1);
    route.style.strokeDashoffset = routeLen * (1 - p);
    const pt = route.getPointAtLength(routeLen * p);
    courier.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
    lights.forEach(l => l.classList.toggle('on', p >= Number(l.dataset.at)));
    // finishing the route is just a nudge; only the button and the guestbook change the shared counter
    if (p >= 0.98 && !routeDone) { routeDone = true; $('#deliverMsg').textContent = 'Route complete! Press the button to deliver a dream yourself.'; }
  }
  let lastDeliver = 0;
  $('#deliverBtn').addEventListener('click', () => {
    if (Date.now() - lastDeliver < 1500) return;      // tiny debounce so button-mashing can't spam the backend
    lastDeliver = Date.now();
    deliver();
    $('#deliverMsg').textContent = 'Pip dropped a dream down a chimney. Shhh.';
  });

  /* ---------- SCROLL: progress bar, parallax moon, route ---------- */
  const progress = $('#progress');
  let ticking = false;
  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
    h.style.setProperty('--scroll', window.scrollY);
    // anything at or above the viewport bottom is revealed, even if a jump-scroll skipped it
    $$('.reveal:not(.in)').forEach(el => { if (el.getBoundingClientRect().top < window.innerHeight * 0.95) el.classList.add('in'); });
    updateRoute();
    ticking = false;
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* reveal on scroll (story scenes, cards, growth chart) */
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { threshold: 0.2 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* ---------- BLOCK TOWER ---------- */
  const tower = $('#tower'), towerStatus = $('#towerStatus');
  const COLORS = ['#ffb3cf', '#c9b8ff', '#ffe27a', '#a8e6cf', '#8fd3ff'];
  const FACES = ['P', 'I', 'P', '★', '♥', '☾'];
  let blocks = 0, balance = 0, best = store.get('pip-best', 0);
  function renderTower(msg) { towerStatus.textContent = msg || `Tower: ${blocks} blocks. Best: ${best}.`; }
  function resetTower(delay) {
    setTimeout(() => { tower.innerHTML = ''; blocks = 0; balance = 0; renderTower(); }, delay);
  }
  function addBlock(dir) {
    if (tower.dataset.busy) return;
    const x = dir * 14 + rand(dir === 0 ? -9 : -3, dir === 0 ? 9 : 3);
    balance += x;
    const b = document.createElement('div');
    b.className = 'block';
    b.textContent = FACES[blocks % FACES.length];
    b.style.background = COLORS[blocks % COLORS.length];
    b.style.setProperty('--x', x.toFixed(1) + 'px');
    b.style.setProperty('--r', rand(-3, 3).toFixed(1) + 'deg');
    tower.appendChild(b);
    blocks++;
    clunk();
    if (blocks > best) { best = blocks; store.set('pip-best', best); }
    if (Math.abs(balance) > 45) {
      tower.dataset.busy = '1';
      renderTower('Oh no… the tower wobbled and fell! Pip is giggling.');
      setTimeout(() => {
        $$('.block', tower).forEach(bl => {
          bl.style.setProperty('--fx', (balance > 0 ? 1 : -1) * rand(60, 140) + 'px');
          bl.style.setProperty('--fr', rand(40, 160) + 'deg');
          bl.classList.add('fallen');
        });
        giggle();
      }, 350);
      setTimeout(() => { delete tower.dataset.busy; }, 1500);
      resetTower(1500);
    } else if (blocks >= 10) {
      tower.dataset.busy = '1';
      renderTower('Ten blocks! A perfect tower. Pip claps with both feet.');
      bell(NOTES[7], { dur: 1.5 }); setTimeout(giggle, 300);
      setTimeout(() => { delete tower.dataset.busy; }, 2500);
      resetTower(2500);
    } else {
      renderTower();
    }
  }
  $$('[data-dir]').forEach(btn => btn.addEventListener('click', () => addBlock(Number(btn.dataset.dir))));
  renderTower();

  /* ---------- GUESTBOOK (live wall via Supabase when configured, else this browser only) ---------- */
  const gbList = $('#gbList'), gbForm = $('#gbForm'), gbStatus = $('#gbStatus');
  const SEED = [
    { name: 'The Moon', message: 'Please keep the stars warm tonight.' },
    { name: 'A Ghost', message: 'Dreamed of pancakes. 10 out of 10.' },
    { name: 'Sleepy Cloud', message: 'Could you steer me a little left? Thanks, Pip.' }
  ];
  const BAD = /\b(fuck\w*|shit\w*|bitch\w*|asshole|cunt)\b/gi;   // tiny filter; real moderation = the `hidden` column
  const LOCAL_NOTE = 'Saved on this device only (backend not connected).';
  const LIVE_NOTE = 'Live wall: everyone who visits sees these wishes.';
  let gbEntries = [];
  function localGb() { return store.get('pip-guestbook', []).map(e => ({ name: e.n, message: e.m })).reverse(); }
  function renderGb() {
    gbList.innerHTML = '';
    const rows = gbEntries.length >= 3 ? gbEntries : [...gbEntries, ...SEED];
    rows.forEach(e => {
      const li = document.createElement('li');
      const s = document.createElement('strong');
      s.textContent = e.name;
      const p = document.createElement('p');
      p.textContent = e.message;   // textContent: visitors can't inject HTML
      li.appendChild(s); li.appendChild(p);
      gbList.appendChild(li);
    });
  }
  async function refreshGb() {
    if (!live) { gbEntries = localGb(); renderGb(); return true; }
    try {
      gbEntries = await sb('guestbook?select=name,message&hidden=eq.false&order=created_at.desc&limit=30');
      renderGb();
      return true;
    } catch (e) {
      gbEntries = localGb(); renderGb();
      return false;
    }
  }
  let lastPost = 0;
  gbForm.addEventListener('submit', async e => {
    e.preventDefault();
    if ($('#gbWeb').value) return;                       // honeypot: bots fill the hidden field
    const name = $('#gbName').value.trim().slice(0, 24).replace(BAD, '***');
    const message = $('#gbMsg').value.trim().slice(0, 120).replace(BAD, '***');
    if (!name || !message) return;
    if (Date.now() - lastPost < 15000) { gbStatus.textContent = 'Easy there! Pip needs a few seconds between wishes.'; return; }
    lastPost = Date.now();
    const btn = $('button[type="submit"]', gbForm);
    btn.disabled = true;
    try {
      if (live) {
        await sb('guestbook', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ name, message }) });
      } else {
        const all = store.get('pip-guestbook', []); all.push({ n: name, m: message }); store.set('pip-guestbook', all.slice(-30));
      }
      gbForm.reset();
      bell(NOTES[6], { dur: 1.3 });
      bumpDreams();
      await refreshGb();
      gbStatus.textContent = live ? 'Wish sent! Pip put it on the wall.' : 'Wish saved. ' + LOCAL_NOTE;
    } catch (err) {
      lastPost = 0;
      gbStatus.textContent = 'The wall is sleepy right now. Please try again in a moment.';
    }
    btn.disabled = false;
  });
  refreshGb().then(ok => { gbStatus.textContent = !live ? LOCAL_NOTE : ok ? LIVE_NOTE : 'Could not reach the wall just now. Showing wishes saved on this device.'; });
  // gentle polling (no websockets, no libraries): refresh the wall and counter while the tab is visible
  if (live) setInterval(() => { if (document.visibilityState === 'visible') { refreshGb(); pullDreams(); } }, 20000);

  /* ---------- OFFICIAL ASSET SLOTS (opt-in via config.js; nothing is requested unless a path is set) ---------- */
  const ASSETS = CFG.ASSETS || {};
  const usedAssets = [];
  function creditAssets() {
    const el = $('#officialCredit');
    if (el && usedAssets.length) el.textContent = 'Official Pip asset pack (haX.baby) used for: ' + usedAssets.join(', ') + '.';
  }
  $$('.slot').forEach(slot => {
    const src = ASSETS[slot.dataset.asset];
    if (!src) return;
    const img = new Image();
    img.alt = slot.dataset.alt || '';
    img.decoding = 'async';
    img.addEventListener('load', () => {
      $$('svg', slot).forEach(n => n.remove());
      slot.hidden = false;
      slot.appendChild(img);
      usedAssets.push(slot.dataset.credit || slot.dataset.asset);
      creditAssets();
    });
    img.src = src;
  });
  // cursor follower (the brief suggests this for the waving-on-a-cloud render)
  if (ASSETS.wave && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    const f = new Image();
    f.className = 'follower'; f.alt = ''; f.setAttribute('aria-hidden', 'true');
    f.addEventListener('load', () => {
      document.body.appendChild(f);
      usedAssets.push('the floating Pip that follows your cursor'); creditAssets();
      let tx = innerWidth / 2, ty = innerHeight / 2, cx = tx, cy = ty;
      window.addEventListener('pointermove', e => { tx = e.clientX + 18; ty = e.clientY + 18; }, { passive: true });
      (function tick() { cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08; f.style.transform = `translate(${cx}px, ${cy}px)`; requestAnimationFrame(tick); })();
    });
    f.src = ASSETS.wave;
  }

  /* ---------- BEDTIME STORYBOOK (page flip: buttons, swipe, arrow keys) ---------- */
  const PAGES = [
    { art: '🌙', title: 'The Moon Lost Its Pillow', text: 'The Moon could not sleep. Its pillow was gone, and a moon without a pillow is a very grumpy moon.' },
    { art: '🔦', title: 'Pip Goes Looking', text: 'Pip put on the nightcap and searched. Under the stairs: three socks. Behind a cloud: one very surprised owl.' },
    { art: '🐑', title: 'The Sheep Confess', text: 'A flock of sheep had been counting themselves to sleep on it. “Baa-rrowed,” said the sheep. “Not stolen.”' },
    { art: '🎵', title: 'A Fair Trade', text: 'Pip traded a lullaby for the pillow. The sheep hummed along and dozed off right there, all two hundred of them.' },
    { art: '🛏️', title: 'Up, Up, Up', text: 'Pip carried the pillow to the sky and tripped only twice. The Moon let out the happiest sigh in the universe.' },
    { art: '✦', title: 'The End', text: 'And that is why, on quiet nights, you can hear a tiny giggle somewhere near the stars. Sleep tight.' }
  ];
  const book = $('#book'), leaf = $('#leaf'), pageNo = $('#pageNo');
  const prevBtn = $('#prevPage'), nextBtn = $('#nextPage');
  let page = 0, flipping = false;
  function paint() {
    const pg = PAGES[page];
    leaf.innerHTML = '';
    const art = document.createElement('div'); art.className = 'page-art'; art.setAttribute('aria-hidden', 'true'); art.textContent = pg.art;
    const h = document.createElement('h4'); h.textContent = pg.title;
    const p = document.createElement('p'); p.textContent = pg.text;
    leaf.append(art, h, p);
    pageNo.textContent = `Page ${page + 1} of ${PAGES.length}`;
    prevBtn.disabled = page === 0;
    nextBtn.textContent = page === PAGES.length - 1 ? '↺ Read again' : 'Next ▶';
  }
  async function turn(dir) {
    const to = page + dir;
    if (flipping || to < 0 || to >= PAGES.length) return;
    flipping = true;
    page = to;
    tone(200 + page * 40, { dur: 0.14, type: 'triangle', vol: 0.1 });
    if (page === PAGES.length - 1) bell(NOTES[7], { dur: 1.6, vol: 0.18 });
    if (reduceMotion || !leaf.animate) { paint(); flipping = false; return; }
    try {
      leaf.style.transformOrigin = dir > 0 ? 'left center' : 'right center';
      await leaf.animate([{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${-85 * dir}deg)` }], { duration: 220, easing: 'ease-in' }).finished;
      paint();
      await leaf.animate([{ transform: `rotateY(${85 * dir}deg)` }, { transform: 'rotateY(0deg)' }], { duration: 260, easing: 'ease-out' }).finished;
    } catch (e) { paint(); }
    flipping = false;
  }
  nextBtn.addEventListener('click', () => { if (page === PAGES.length - 1) { page = -1; } turn(1); });
  prevBtn.addEventListener('click', () => turn(-1));
  book.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); if (page < PAGES.length - 1) turn(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); turn(-1); }
  });
  let swipeX = null;
  book.addEventListener('pointerdown', e => { swipeX = e.clientX; });
  book.addEventListener('pointerup', e => {
    if (swipeX === null) return;
    const dx = e.clientX - swipeX; swipeX = null;
    if (Math.abs(dx) > 40) { if (dx < 0 && page < PAGES.length - 1) turn(1); else if (dx > 0) turn(-1); }
  });
  paint();

  /* ---------- CHAT WITH PIP (rule-based, in character) ---------- */
  const chatLog = $('#chatLog'), chatForm = $('#chatForm'), chatIn = $('#chatIn');
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const JOKES = [
    'What do dreams wear to bed? Pyjama-ginations!',
    'Why did the ghost sleep so well? Nothing was haunting its mind. Hehehe.',
    'What is a sheep’s favourite bedtime snack? Baa-nana bread.',
    'Why did the moon skip dinner? It was already full!'
  ];
  const FALLBACK = [
    'Hee! I don’t know that one, but I like how you think. Ask me about dreams?',
    'Hmm. My nightcap is too floppy to think about that. Try “who are you” or “tell me a joke”.',
    'I giggled but I did not understand. Can you say it a different way?',
    'The Moon is whispering the answer, but I can’t hear. Ask me something sleepy!'
  ];
  const RULES = [
    { re: /(my name is|call me)\s+([a-z][a-z'-]{0,18})/i, fn: m => {
        const n = m[2][0].toUpperCase() + m[2].slice(1);
        store.set('pip-name', n);
        return `${n}! What a lovely name. I will tell the Moon. Next time you visit I will remember it.`;
      } },
    { re: /pancake/i, fn: () => { rain('🥞', 16); foundSecret('pancake'); setTimeout(() => showBanner('✦ You found the pancake secret! ✦', 'Three ghosts and one baby salute you.'), 300); return 'PANCAKES?! How did you know?! That was my first accidental dream. Quick, look up!'; } },
    { re: /secret|hidden|easter|egg/i, fn: () => 'Psst… the pompom on my nightcap is ticklish. And if you tap my little zzz’s, I fall asleep. I will not tell you the third one.' },
    { re: /\b(hi|hello|hey|hiya|yo)\b/i, fn: () => pick(['Hi hi hi! I am Pip!', 'Hello! You woke me up. I do not mind.', 'Heeey! Welcome to the Midnight Nursery.']) },
    { re: /who are you|what are you|about you|introduce/i, fn: () => 'I am Pip, a baby with a skull face and a very floppy nightcap. I am a Junior Dream Engineer: I build lullabies, nightlights and dreams for sleepy ghosts.' },
    { re: /skull|bone|scary|creepy|spooky|scared|afraid/i, fn: () => 'My face is a skull, but my heart is a marshmallow. I am built for bedtime, not for scares. Nobody has ever been scared of me for more than one giggle.' },
    { re: /job|work|do you do|engineer|project/i, fn: () => 'I design dreams! Check my work: a music box, nightlights, a block toy, a delivery route and a storybook. The delivery route is my favourite. I only get lost twice a night.' },
    { re: /joke|funny|laugh/i, fn: () => pick(JOKES) },
    { re: /sing|lullaby|music|song|hum/i, fn: () => { if (!muted) { startLullaby(); return 'Okay! Wound the music box for you. Hum along if you like.'; } return 'I would love to, but your sound is off. Press the ♪ button at the top and ask again!'; } },
    { re: /good ?night|sleep|tired|bed\b|bedtime/i, fn: () => 'Sleepy time! Close your eyes, count five slow breaths, and I will send you something soft to dream about.' },
    { re: /dream/i, fn: () => pick(['Tonight I am delivering a dream about flying pancakes.', 'I can build you a dream with a friendly cloud and a very tiny door. Interested?', 'Dreams are my favourite thing. Tell me one you remember!']) },
    { re: /colou?r|favou?rite/i, fn: () => 'Moonlight yellow! It glows and it is warm and it is the colour of my lantern.' },
    { re: /how are you|how r u|how do you feel/i, fn: () => 'Sleepy and happy. Which is the best way to be.' },
    { re: /thank/i, fn: () => 'You are welcome! Giggles on the house.' },
    { re: /bye|see you|goodbye|later/i, fn: () => 'Bye bye! Come back at bedtime. I will leave the nightlight on.' }
  ];
  function say(who, text, cls) {
    const li = document.createElement('div');
    li.className = 'msg ' + who + (cls ? ' ' + cls : '');
    li.textContent = text;
    chatLog.appendChild(li);
    chatLog.scrollTop = chatLog.scrollHeight;
    return li;
  }
  function reply(q) {
    for (const r of RULES) { const m = q.match(r.re); if (m) return r.fn(m); }
    return pick(FALLBACK);
  }
  function ask(q) {
    q = q.trim();
    if (!q) return;
    say('you', q);
    const dots = say('pip', 'Pip is thinking…', 'typing');
    setTimeout(() => {
      dots.remove();
      say('pip', reply(q));
      tone(520 + rand(0, 160), { dur: 0.1, type: 'triangle', vol: 0.1 });
    }, reduceMotion ? 0 : 550);
  }
  chatForm.addEventListener('submit', e => { e.preventDefault(); const q = chatIn.value; chatIn.value = ''; ask(q); });
  $$('.chip').forEach(c => c.addEventListener('click', () => ask(c.dataset.q)));
  const savedName = store.get('pip-name', '');
  say('pip', savedName ? `Hi again, ${savedName}! I kept your seat warm. What shall we talk about?` : 'Hi! I am Pip. Ask me anything, or tell me your name by saying “my name is…”');

  /* ---------- SECRET #2: tap the zzz three times and Pip falls asleep ---------- */
  const veil = $('#sleepVeil'), zzz = $('#zzz');
  let asleep = false, snoreTimer = null, zTaps = 0, zTimer;
  function snore() {
    if (!asleep) return;
    tone(98, { dur: 1.6, vol: 0.12 });
    tone(147, { dur: 1.2, vol: 0.05, when: 0.1 });
    snoreTimer = setTimeout(snore, 2600);
  }
  function sleepNow() {
    asleep = true;
    veil.hidden = false;
    foundSecret('sleep');
    stopLullaby();
    snore();
    veil.focus();
  }
  function wake() {
    if (!asleep) return;
    asleep = false;
    clearTimeout(snoreTimer);
    veil.hidden = true;
    bounce();
    showBanner('✦ Pip woke up! ✦', '“I was dreaming about pancakes,” Pip yawns.');
  }
  zzz.addEventListener('click', e => {
    e.stopPropagation();
    zTaps++;
    clearTimeout(zTimer);
    zTimer = setTimeout(() => { zTaps = 0; }, 1600);
    tone(130 + zTaps * 20, { dur: 0.3, vol: 0.1 });
    if (zTaps >= 3) { zTaps = 0; sleepNow(); }
  });
  veil.addEventListener('click', wake);
  veil.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wake(); } });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') wake(); });

  /* ---------- RESPONSIVE CHAOS MODE: the page's personality reshapes to your screen ---------- */
  const chaosBtn = $('#chaosBtn'), stickersEl = $('#stickers');
  const STICKERS = ['🧸', '⭐', '🌙', '☁️', '🍼', '🎀', '🪀', '🥞', '👻', '🛏️', '🦉', '🐑'];
  const frac = n => n - Math.floor(n);
  let chaosOn = store.get('pip-chaos', false), chaosTimer;
  function layoutChaos() {
    const w = window.innerWidth, h = window.innerHeight, ar = w / h;
    document.body.dataset.shape = ar < 0.8 ? 'tall' : ar > 1.6 ? 'wide' : 'square';
    const root = document.documentElement.style;
    root.setProperty('--hue', String(Math.round((w * 0.53 + h * 0.31) % 360)));
    root.setProperty('--tilt', clamp((ar - 1) * 1.6, -2.5, 2.5).toFixed(2));
    const count = clamp(Math.round(w * h / 42000), 6, 36);
    stickersEl.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.textContent = STICKERS[Math.floor(frac(Math.sin(i * 12.9898 + w) * 43758.5453) * STICKERS.length)];
      s.style.left = (frac(Math.sin(i * 78.233 + h) * 12345.6789) * 96) + 'vw';
      s.style.top = (frac(Math.sin(i * 39.346 + w * 0.7) * 9876.543) * 94) + 'vh';
      s.style.fontSize = (18 + frac(i * 0.618) * 26) + 'px';
      s.style.setProperty('--d', (5 + (i % 5)) + 's');
      s.style.setProperty('--r', ((i % 7) - 3) * 9 + 'deg');
      stickersEl.appendChild(s);
    }
  }
  function setChaos(on, quiet) {
    chaosOn = on;
    document.body.classList.toggle('chaos', on);
    chaosBtn.setAttribute('aria-pressed', String(on));
    store.set('pip-chaos', on);
    if (on) layoutChaos();
    else { stickersEl.innerHTML = ''; document.body.removeAttribute('data-shape'); }
    if (!quiet) { giggle(); if (on) showBanner('✺ Chaos Mode ON ✺', 'Resize the window or rotate your phone. Everything rearranges itself.'); }
  }
  chaosBtn.addEventListener('click', () => setChaos(!chaosOn));
  window.addEventListener('resize', () => { if (!chaosOn) return; clearTimeout(chaosTimer); chaosTimer = setTimeout(layoutChaos, 220); });

  /* ---------- DREAM MAKER: generated dream card + a lullaby unique to the dream ---------- */
  const esc = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const hash32 = str => { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const prng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const D_WHERE = { rooftop: 'Rooftop Row', cloud: 'Cloud Kingdom', door: 'Tiny Door Hall', cakes: 'Pancake Meadow', moon: 'Moon Kitchen' };
  const D_WHO = { ghost: ['sleepy ghost', '👻', 'Ghost'], owl: ['wise owl', '🦉', 'Owl'], sheep: ['fluffy sheep', '🐑', 'Sheep'], dragon: ['tiny dragon', '🐉', 'Dragon'], whale: ['cloud whale', '🐋', 'Whale'] };
  const D_FEEL = { cosy: { adj: 'Cosy', hue: 24, tempo: 540 }, giddy: { adj: 'Giddy', hue: 324, tempo: 340 }, brave: { adj: 'Brave', hue: 204, tempo: 430 }, dreamy: { adj: 'Dreamy', hue: 268, tempo: 640 } };
  const D_THINGS = ['a lantern full of giggles', 'a map drawn in lullabies', 'a spare pillow for the Moon', 'three warm pancakes', 'one very small, very brave key'];
  const D_VERBS = ['danced', 'floated', 'hummed along', 'giggled', 'drifted off'];
  const D_WISH = ['Sweet dreams.', 'Sleep tight, little one.', 'See you at moonrise.', 'Stay cosy.'];
  const dreamForm = $('#dreamForm'), dreamOut = $('#dreamOut'), dreamCard = $('#dreamCard');
  let dreamState = null, dreamTimers = [], dreamDelivered = false;

  function dreamScene(where, hue, rnd) {
    let g = '';
    if (where === 'rooftop') {
      for (let i = 0; i < 6; i++) {
        const x = i * 56 - 8 + rnd() * 10, w = 44 + rnd() * 14, ht = 34 + rnd() * 38, y = 196 - ht;
        g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${ht.toFixed(1)}" fill="hsl(${hue} 35% 13%)"/><path d="M${(x - 4).toFixed(1)} ${y.toFixed(1)} L${(x + w / 2).toFixed(1)} ${(y - 20).toFixed(1)} L${(x + w + 4).toFixed(1)} ${y.toFixed(1)}Z" fill="hsl(${hue} 35% 18%)"/>`;
        g += `<rect x="${(x + 8).toFixed(1)}" y="${(y + 10).toFixed(1)}" width="8" height="9" fill="#ffe27a"/>` + (rnd() > .4 ? `<rect x="${(x + w - 16).toFixed(1)}" y="${(y + 10).toFixed(1)}" width="8" height="9" fill="#ffe27a"/>` : '');
      }
    } else if (where === 'cloud') {
      for (let i = 0; i < 7; i++) g += `<ellipse cx="${(rnd() * 320).toFixed(1)}" cy="${(170 + rnd() * 30).toFixed(1)}" rx="${(40 + rnd() * 34).toFixed(1)}" ry="${(14 + rnd() * 14).toFixed(1)}" fill="#fff" opacity="${(0.55 + rnd() * 0.35).toFixed(2)}"/>`;
    } else if (where === 'door') {
      g += '<ellipse cx="160" cy="196" rx="120" ry="10" fill="#000" opacity=".25"/><path d="M128 198 V118 a32 32 0 0 1 64 0 V198 Z" fill="#ffe27a" stroke="#2b2250" stroke-width="3"/><path d="M160 86 V198" stroke="#2b2250" stroke-width="2" opacity=".5"/><circle cx="178" cy="150" r="3.4" fill="#2b2250"/>';
      g += `<circle cx="160" cy="140" r="64" fill="#ffe27a" opacity=".2"/>`;
    } else if (where === 'cakes') {
      for (let k = 0; k < 3; k++) {
        const cx = 60 + k * 100 + rnd() * 14;
        for (let j = 0; j < 3; j++) g += `<ellipse cx="${cx.toFixed(1)}" cy="${(190 - j * 9).toFixed(1)}" rx="40" ry="9" fill="${j % 2 ? '#f6cf8f' : '#e5a95e'}" stroke="#2b2250" stroke-width="1.6"/>`;
        g += `<rect x="${(cx - 8).toFixed(1)}" y="152" width="16" height="7" rx="2" fill="#fff2a8" stroke="#2b2250" stroke-width="1.3"/><path d="M${(cx - 24).toFixed(1)} 162 q4 12 8 2 q4 10 8 0" fill="none" stroke="#a8541f" stroke-width="3" stroke-linecap="round"/>`;
      }
    } else {
      g += '<ellipse cx="160" cy="236" rx="210" ry="58" fill="#f3e8c8" stroke="#2b2250" stroke-width="2"/><g fill="#ddd0a8"><ellipse cx="70" cy="200" rx="18" ry="5"/><ellipse cx="250" cy="206" rx="22" ry="6"/><ellipse cx="200" cy="220" rx="14" ry="4"/></g>';
      g += '<g transform="translate(236 168)"><path d="M-18 0 h36 l-4 24 h-28z" fill="#8a7be0" stroke="#2b2250" stroke-width="2"/><path d="M-6 -6 q-6 -12 2 -18 M6 -6 q6 -12 -2 -18" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/></g>';
    }
    return g;
  }
  function dreamSvg(d) {
    const rnd = prng(d.seed), hue = d.feel.hue;
    let stars = '';
    for (let i = 0; i < 34; i++) stars += `<circle cx="${(rnd() * 320).toFixed(1)}" cy="${(rnd() * 150).toFixed(1)}" r="${(0.6 + rnd() * 1.4).toFixed(1)}" fill="#fff" opacity="${(0.35 + rnd() * 0.65).toFixed(2)}"/>`;
    const mx = 40 + rnd() * 240, my = 24 + rnd() * 34;
    const title = esc(d.title), who = d.name ? esc('for ' + d.name) : 'a dream made by Pip';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" role="img" aria-label="${title}. A ${esc(d.feel.adj.toLowerCase())} ${esc(d.who[0])} in the ${esc(d.whereName)}.">
<defs><linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 55% 16%)"/><stop offset="1" stop-color="hsl(${(hue + 30) % 360} 60% 40%)"/></linearGradient><radialGradient id="dgl" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="hsl(${hue} 100% 85%)" stop-opacity=".7"/><stop offset="1" stop-color="hsl(${hue} 100% 85%)" stop-opacity="0"/></radialGradient></defs>
<rect width="320" height="240" fill="url(#dg)"/>${stars}
<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="16" fill="#fff3b0"/><circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="26" fill="#ffe27a" opacity=".2"/>
${dreamScene(d.whereKey, hue, rnd)}
<circle cx="160" cy="118" r="62" fill="url(#dgl)"/>
<text x="160" y="140" font-size="68" text-anchor="middle">${d.who[1]}</text>
<rect x="0" y="198" width="320" height="42" fill="#0b0824" opacity=".55"/>
<text x="160" y="217" font-size="13" font-weight="700" text-anchor="middle" fill="#fff" font-family="Courier New, monospace">${title}</text>
<text x="160" y="232" font-size="10" text-anchor="middle" fill="#ffe9a8" font-family="Courier New, monospace">${who}</text>
<rect x="3" y="3" width="314" height="234" rx="12" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>
</svg>`;
  }
  function dreamMelody(d) {
    const rnd = prng(d.seed ^ 0x9e3779b9), out = [];
    let idx = rnd() > 0.5 ? 2 : 4;
    for (let i = 0; i < 14; i++) {
      out.push({ n: idx, beats: rnd() > 0.7 ? 2 : 1 });
      idx = clamp(idx + Math.floor(rnd() * 5) - 2, 0, 7);
    }
    out.push({ n: 0, beats: 3 });           // always land home on C
    return out;
  }
  function stopDream() { dreamTimers.forEach(clearTimeout); dreamTimers = []; $('#dreamPlay').textContent = '▶ Play my lullaby'; }
  function playDream() {
    if (!dreamState) return;
    if (dreamTimers.length) { stopDream(); return; }
    if (muted) { $('#dreamMsg').textContent = 'Sound is off. Turn it on with the ♪ button to hear your lullaby.'; return; }
    $('#dreamMsg').textContent = 'Your lullaby is playing…';
    $('#dreamPlay').textContent = '■ Stop';
    let t = 0;
    dreamState.melody.forEach(({ n, beats }) => {
      dreamTimers.push(setTimeout(() => bell(NOTES[n], { dur: 1.4, vol: 0.2 }), t));
      t += dreamState.feel.tempo * beats * 0.9;
    });
    dreamTimers.push(setTimeout(() => { stopDream(); $('#dreamMsg').textContent = 'Sweet dreams!'; }, t + 900));
  }
  function makeDream() {
    const f = new FormData(dreamForm);
    const whereKey = f.get('where'), whoKey = f.get('who'), feelKey = f.get('feel');
    const name = String($('#dreamName').value || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    const seed = hash32([whereKey, whoKey, feelKey, name.toLowerCase()].join('|'));
    const rnd = prng(seed ^ 0x51ed270b);
    const who = D_WHO[whoKey], feel = D_FEEL[feelKey], whereName = D_WHERE[whereKey];
    const thing = D_THINGS[Math.floor(rnd() * D_THINGS.length)];
    const openers = [
      `In the ${whereName}, a ${feelKey} ${who[0]} was waiting with ${thing}.`,
      `A ${feelKey} ${who[0]} found ${thing} in the ${whereName}.`,
      `Deep in the ${whereName}, a ${who[0]} felt wonderfully ${feelKey} and held ${thing}.`
    ];
    const story = `${openers[Math.floor(rnd() * openers.length)]} ${name || 'You'} ${D_VERBS[Math.floor(rnd() * D_VERBS.length)]} until the whole sky yawned. Pip tucked the dream in and whispered, “${D_WISH[Math.floor(rnd() * D_WISH.length)]}”`;
    dreamState = { seed, whereKey, whereName, who, feel, name, story, title: `The ${feel.adj} ${who[2]} of the ${whereName}` };
    dreamState.melody = dreamMelody(dreamState);
    stopDream();
    dreamDelivered = false;
    dreamCard.innerHTML = dreamSvg(dreamState);
    $('#dreamTitle').textContent = dreamState.title;
    $('#dreamStory').textContent = story;
    $('#dreamMsg').textContent = '';
    $('#dreamDeliver').textContent = 'Deliver it';
    $('#dreamDeliver').disabled = false;
    dreamOut.hidden = false;
    $('#dreamTitle').focus({ preventScroll: true });
    if (!reduceMotion && dreamOut.scrollIntoView) dreamOut.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    giggle();
  }
  dreamForm.addEventListener('submit', e => { e.preventDefault(); makeDream(); });
  $('#dreamPlay').addEventListener('click', playDream);
  $('#dreamDeliver').addEventListener('click', () => {
    if (!dreamState || dreamDelivered) return;
    dreamDelivered = true;
    bumpDreams();
    bell(NOTES[5], { dur: 1.2 });
    $('#dreamDeliver').textContent = 'Delivered ✓';
    $('#dreamDeliver').disabled = true;
    $('#dreamMsg').textContent = 'Pip flew your dream across the rooftops and dropped it down a very sleepy chimney.';
  });
  $('#dreamSave').addEventListener('click', () => {
    if (!dreamState) return;
    const svgEl = dreamCard.querySelector('svg');
    const xml = new XMLSerializer().serializeToString(svgEl);
    const fname = 'pip-dream-' + dreamState.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.png';
    const save = (href, name) => { const a = document.createElement('a'); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
    const svgUrl = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = () => {
      try {
        const cv = document.createElement('canvas'); cv.width = 960; cv.height = 720;
        cv.getContext('2d').drawImage(img, 0, 0, 960, 720);
        cv.toBlob(b => {
          if (!b) { save(svgUrl, fname.replace('.png', '.svg')); return; }
          const u = URL.createObjectURL(b); save(u, fname); setTimeout(() => URL.revokeObjectURL(u), 4000);
        }, 'image/png');
      } catch (err) { save(svgUrl, fname.replace('.png', '.svg')); }
      $('#dreamMsg').textContent = 'Card saved. Share it with someone who needs a good night.';
    };
    img.onerror = () => { save(svgUrl, fname.replace('.png', '.svg')); };
    img.src = svgUrl;
  });

  setChaos(chaosOn, true);
})();
