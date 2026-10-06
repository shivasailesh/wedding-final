// ---- Falling petals (ambient) ----
const petalLayer = document.getElementById('petals');

for (let i = 0; i < 16; i++) {
  const p = document.createElement('span');
  p.className = 'petal' + (Math.random() < 0.4 ? ' gold' : '');
  const size = 8 + Math.random() * 7;
  p.style.width = size + 'px';
  p.style.height = (size * 1.3) + 'px';
  p.style.left = (Math.random() * 100) + '%';
  p.style.animationDuration = (10 + Math.random() * 10) + 's';
  p.style.animationDelay = (Math.random() * 12) + 's';
  p.style.opacity = (0.5 + Math.random() * 0.4).toFixed(2);
  petalLayer.appendChild(p);
}

function spawnBurst(n) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span');
    p.className = 'petal burst' + (Math.random() < 0.5 ? ' gold' : '');
    const size = 9 + Math.random() * 8;
    p.style.width = size + 'px';
    p.style.height = (size * 1.3) + 'px';
    p.style.left = (38 + Math.random() * 24) + '%';
    p.style.setProperty('--dx', (Math.random() * 300 - 150) + 'px');
    p.style.animationDuration = (1.1 + Math.random() * 0.8) + 's';
    petalLayer.appendChild(p);
    setTimeout(() => p.remove(), 2000);
  }
}

// ---- Countdown ----
const weddingDate = new Date('2026-11-11T09:05:00');

function setVal(id, val) {
  const el = document.getElementById(id);
  const str = String(val).padStart(2, '0');
  if (el.textContent !== str) {
    el.textContent = str;
    el.classList.remove('tick');
    void el.offsetWidth;
    el.classList.add('tick');
  }
}

function updateCountdown() {
  let diff = weddingDate - new Date();
  if (diff < 0) diff = 0;

  setVal('days', Math.floor(diff / 86400000));
  setVal('hours', Math.floor(diff % 86400000 / 3600000));
  setVal('mins', Math.floor(diff % 3600000 / 60000));
  setVal('secs', Math.floor(diff % 60000 / 1000));
}

updateCountdown();
setInterval(updateCountdown, 1000);

// ---- Scroll reveals ----
document.querySelectorAll('.connector').forEach(c => {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('grow');
      io.unobserve(e.target);
    }
  }), { threshold: .4 });
  io.observe(c);
});

document.querySelectorAll('.reveal').forEach(r => {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      io.unobserve(e.target);
    }
  }), { threshold: .25 });
  io.observe(r);
});

const namesReveal = document.getElementById('namesReveal');
new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) e.target.classList.add('visible');
}), { threshold: .5 }).observe(namesReveal);

// ---- Photo gallery / slideshow ----
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');
let sIdx = 0;

function showSlide(i) {
  slides.forEach((s, idx) => s.classList.toggle('active', idx === i));
  dots.forEach((d, idx) => d.classList.toggle('active', idx === i));
  sIdx = i;
}

let sTimer = setInterval(() => showSlide((sIdx + 1) % slides.length), 4000);

dots.forEach((d, idx) => d.addEventListener('click', () => {
  clearInterval(sTimer);
  showSlide(idx);
  sTimer = setInterval(() => showSlide((sIdx + 1) % slides.length), 4000);
}));

// ---- Background music: real file first, generated chime as fallback ----
const bgm = document.getElementById('bgm');
let bgmFailed = false;
let usingSynth = false;

bgm.addEventListener('error', () => { bgmFailed = true; });

let audioCtx = null;
let current = null;
const musicBtn = document.getElementById('musicBtn');

function startMusic() {
  if (!bgmFailed) {
    const p = bgm.play();
    if (p && p.then) {
      p.then(() => {
        usingSynth = false;
        musicBtn.setAttribute('aria-pressed', 'true');
        musicBtn.textContent = '♫ Pause music';
      }).catch(() => startSynthChime());
    }
    return;
  }
  startSynthChime();
}

function stopMusic() {
  if (usingSynth) {
    stopSynthChime();
    return;
  }

  bgm.pause();
  musicBtn.setAttribute('aria-pressed', 'false');
  musicBtn.textContent = '♪ Play music';
}

function startSynthChime() {
  usingSynth = true;

  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();

    const master = audioCtx.createGain();
    master.gain.value = 0.0001;
    master.connect(audioCtx.destination);
    master.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 2);

    const freqs = [261.63, 329.63, 392.00, 523.25];

    const oscs = freqs.map((f, i) => {
      const o = audioCtx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;

      const g = audioCtx.createGain();
      g.gain.value = i === 0 ? 0.4 : 0.22;

      o.connect(g);
      g.connect(master);
      o.start();

      return o;
    });

    const lfo = audioCtx.createOscillator();
    lfo.frequency.value = 0.15;

    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 0.015;

    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);
    lfo.start();

    oscs.push(lfo);
    current = { oscs, master };

    musicBtn.setAttribute('aria-pressed', 'true');
    musicBtn.textContent = '♫ Pause music';
  } catch (e) {
    musicBtn.textContent = 'Audio unavailable';
  }
}

function stopSynthChime() {
  if (!current) return;

  const { oscs, master } = current;
  const t = audioCtx.currentTime;

  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(0.0001, t + 1);

  setTimeout(() => {
    oscs.forEach(o => {
      try { o.stop(); } catch (e) {}
    });
  }, 1050);

  current = null;
  musicBtn.setAttribute('aria-pressed', 'false');
  musicBtn.textContent = '♪ Play music';
}

function isPlaying() {
  return usingSynth ? !!current : !bgm.paused;
}

musicBtn.addEventListener('click', () => {
  isPlaying() ? stopMusic() : startMusic();
});

// ---- Opening gate ----
const gate = document.getElementById('gate');
document.body.style.overflow = 'hidden';

function openGate() {
  if (gate.classList.contains('opened')) return;

  gate.classList.add('opened');
  document.body.style.overflow = '';
  spawnBurst(22);
  startMusic();

  setTimeout(() => {
    gate.style.display = 'none';
  }, 1150);
}

gate.addEventListener('click', openGate);

gate.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openGate();
  }
});
