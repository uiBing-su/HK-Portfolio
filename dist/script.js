const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-list');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}

document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

const filterButtons = document.querySelectorAll('[data-filter]');
const galleryItems = document.querySelectorAll('[data-category]');
filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    const filter = button.dataset.filter;
    galleryItems.forEach((item) => { item.hidden = filter !== 'all' && item.dataset.category !== filter; });
  });
});

document.querySelectorAll('.play-button').forEach((button) => {
  button.addEventListener('click', () => {
    const isPlaying = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!isPlaying));
    button.textContent = isPlaying ? '▶' : 'Ⅱ';
    button.setAttribute('aria-label', isPlaying ? '영상 재생' : '영상 일시정지');
  });
});

const canShowCursorTrail = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canShowCursorTrail) {
  const sparkColors = ['#315c47', '#6f955a', '#a9bd89', '#dfe9d3', '#fffbe8'];
  let lastSparkTime = 0;

  window.addEventListener('pointermove', (event) => {
    const now = performance.now();
    if (now - lastSparkTime < 34) return;
    lastSparkTime = now;

    const spark = document.createElement('i');
    const size = Math.random() > .72 ? 7 : 4;
    const driftX = Math.round((Math.random() - .5) * 18);
    const driftY = -8 - Math.round(Math.random() * 12);
    spark.className = 'cursor-spark';
    spark.setAttribute('aria-hidden', 'true');
    spark.style.setProperty('--spark-size', `${size}px`);
    spark.style.setProperty('--spark-color', sparkColors[Math.floor(Math.random() * sparkColors.length)]);
    spark.style.setProperty('--spark-x', `${event.clientX + 9}px`);
    spark.style.setProperty('--spark-y', `${event.clientY + 9}px`);
    spark.style.setProperty('--spark-drift-x', `${driftX}px`);
    spark.style.setProperty('--spark-drift-y', `${driftY}px`);
    spark.style.setProperty('--spark-life', `${520 + Math.round(Math.random() * 260)}ms`);
    document.body.appendChild(spark);
    spark.addEventListener('animationend', () => spark.remove(), { once: true });
  }, { passive: true });
}

const musicButton = document.createElement('button');
musicButton.className = 'music-toggle';
musicButton.type = 'button';
musicButton.setAttribute('aria-pressed', 'false');
musicButton.setAttribute('aria-label', '배경 음악 켜기');
musicButton.innerHTML = '<span class="music-note" aria-hidden="true">♪</span><span class="music-label">음악 켜기</span>';
document.body.appendChild(musicButton);

let audioContext;
let musicTimer;
let musicStep = 0;
const gardenMelody = [
  659.25, 783.99, 880.00, 783.99,
  659.25, 587.33, 523.25, null,
  587.33, 659.25, 783.99, 659.25,
  587.33, 523.25, 493.88, null,
  523.25, 659.25, 783.99, 880.00,
  783.99, 659.25, 587.33, null,
  659.25, 587.33, 523.25, 493.88,
  523.25, 587.33, 523.25, null
];
const gardenRoots = [261.63, 220.00, 174.61, 196.00, 261.63, 220.00, 196.00, 261.63];

function playChime(frequency, time) {
  if (!frequency || !audioContext) return;
  const master = audioContext.createGain();
  const softener = audioContext.createBiquadFilter();
  const bell = audioContext.createOscillator();
  const sparkle = audioContext.createOscillator();
  master.gain.setValueAtTime(.0001, time);
  master.gain.exponentialRampToValueAtTime(.035, time + .012);
  master.gain.exponentialRampToValueAtTime(.012, time + .16);
  master.gain.exponentialRampToValueAtTime(.0001, time + .62);
  softener.type = 'lowpass';
  softener.frequency.setValueAtTime(1950, time);
  bell.type = 'sine';
  bell.frequency.setValueAtTime(frequency, time);
  sparkle.type = 'triangle';
  sparkle.frequency.setValueAtTime(frequency * 2, time);
  sparkle.detune.setValueAtTime(3, time);
  bell.connect(softener);
  sparkle.connect(softener);
  softener.connect(master);
  master.connect(audioContext.destination);
  bell.start(time);
  sparkle.start(time);
  bell.stop(time + .66);
  sparkle.stop(time + .42);
}

function playBass(frequency, time) {
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, time);
  gain.gain.setValueAtTime(.0001, time);
  gain.gain.exponentialRampToValueAtTime(.012, time + .02);
  gain.gain.exponentialRampToValueAtTime(.0001, time + .72);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(time);
  oscillator.stop(time + .75);
}

function playMusicStep() {
  if (!audioContext || audioContext.state !== 'running') return;
  const now = audioContext.currentTime;
  playChime(gardenMelody[musicStep % gardenMelody.length], now);
  if (musicStep % 4 === 0) playBass(gardenRoots[(musicStep / 4) % gardenRoots.length], now);
  musicStep += 1;
}

async function startMusic() {
  audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
  await audioContext.resume();
  musicStep = 0;
  playMusicStep();
  musicTimer = window.setInterval(playMusicStep, 390);
  musicButton.setAttribute('aria-pressed', 'true');
  musicButton.setAttribute('aria-label', '배경 음악 끄기');
  musicButton.querySelector('.music-label').textContent = '음악 끄기';
}

async function stopMusic() {
  window.clearInterval(musicTimer);
  musicTimer = undefined;
  if (audioContext?.state === 'running') await audioContext.suspend();
  musicButton.setAttribute('aria-pressed', 'false');
  musicButton.setAttribute('aria-label', '배경 음악 켜기');
  musicButton.querySelector('.music-label').textContent = '음악 켜기';
}

musicButton.addEventListener('click', () => {
  if (musicButton.getAttribute('aria-pressed') === 'true') stopMusic();
  else startMusic();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && musicButton.getAttribute('aria-pressed') === 'true') stopMusic();
});
