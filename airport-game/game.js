const game = document.querySelector('#game');
const player = document.querySelector('#player');
const startScreen = document.querySelector('#startScreen');
const pauseScreen = document.querySelector('#pauseScreen');
const pauseButton = document.querySelector('#pauseButton');
const soundButton = document.querySelector('#soundButton');
const progressFill = document.querySelector('#progressFill');
const orbCount = document.querySelector('#orbCount');
const toast = document.querySelector('#toast');
const locationText = document.querySelector('#locationText');

const keys = { w: false, a: false, s: false, d: false };
const aliases = { ArrowUp: 'w', ArrowLeft: 'a', ArrowDown: 's', ArrowRight: 'd', W: 'w', A: 'a', S: 's', D: 'd', w: 'w', a: 'a', s: 's', d: 'd' };
const orbs = [...document.querySelectorAll('.orb')];

let running = false;
let paused = false;
let soundOn = true;
let x = 0;
let jump = 0;
let verticalVelocity = 0;
let direction = 1;
let lastTime = performance.now();
let collected = 0;
let audioContext;

function initialX() {
  return Math.max(46, game.clientWidth * .31);
}

function keycap(name, active) {
  document.querySelector(`[data-key="${name}"]`)?.classList.toggle('active', active);
}

function setKey(name, active) {
  if (!(name in keys)) return;
  keys[name] = active;
  keycap(name, active);
}

function tone(frequency, duration = .09, type = 'square') {
  if (!soundOn || !running) return;
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(.045, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 1500);
}

function startGame() {
  running = true;
  paused = false;
  x = initialX();
  startScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  pauseScreen.setAttribute('aria-hidden', 'true');
  game.focus();
  tone(523, .08);
  setTimeout(() => tone(784, .12), 90);
}

function setPaused(next) {
  if (!running) return;
  paused = next;
  pauseButton.setAttribute('aria-pressed', String(paused));
  pauseScreen.classList.toggle('hidden', !paused);
  pauseScreen.setAttribute('aria-hidden', String(!paused));
  if (!paused) game.focus();
}

function collectOrbs() {
  const playerCenter = x + player.offsetWidth / 2;
  orbs.forEach((orb) => {
    if (orb.classList.contains('collected')) return;
    const orbCenter = orb.offsetLeft + orb.offsetWidth / 2;
    if (Math.abs(playerCenter - orbCenter) < 48 && jump < 88) {
      orb.classList.add('collected');
      collected += 1;
      orbCount.textContent = `${collected} / 3`;
      progressFill.style.width = `${(collected / 3) * 100}%`;
      tone(880, .12, 'triangle');
      setTimeout(() => tone(1174, .15, 'triangle'), 80);
      showToast(collected === 3 ? '계곡의 빛이 모두 모였습니다!' : `계곡의 빛 ${collected}개 발견`);
    }
  });
}

function updateLocation() {
  const ratio = (x + player.offsetWidth / 2) / game.clientWidth;
  const next = ratio < .38 ? '오래된 수호목 아래' : ratio < .67 ? '은빛 폭포 물길' : '푸른 절벽의 끝';
  if (locationText.textContent !== next) locationText.textContent = next;
}

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, .032);
  lastTime = now;
  if (running && !paused) {
    const move = Number(keys.d) - Number(keys.a);
    const speed = Math.max(180, game.clientWidth * .19);
    if (move) {
      x += move * speed * dt;
      direction = move > 0 ? 1 : -1;
    }
    const maxX = game.clientWidth - player.offsetWidth - 22;
    x = Math.max(18, Math.min(maxX, x));

    if (keys.w && jump === 0) {
      verticalVelocity = 440;
      jump = .01;
      setKey('w', false);
      tone(420, .1, 'triangle');
    }
    if (jump > 0 || verticalVelocity > 0) {
      jump += verticalVelocity * dt;
      verticalVelocity -= 1050 * dt;
      if (jump <= 0) {
        jump = 0;
        verticalVelocity = 0;
        tone(180, .045);
      }
    }

    player.classList.toggle('moving', Boolean(move) && jump === 0 && !keys.s);
    player.classList.toggle('airborne', jump > 0);
    player.classList.toggle('crouching', keys.s && jump === 0);
    player.style.transform = `translate3d(${x}px, ${-jump}px, 0) scaleX(${direction})`;
    game.style.setProperty('--bg-shift', `${((x / Math.max(1, maxX)) - .5) * -28}px`);
    collectOrbs();
    updateLocation();
  }
  requestAnimationFrame(frame);
}

document.addEventListener('keydown', (event) => {
  const key = aliases[event.key];
  if (key) {
    event.preventDefault();
    setKey(key, true);
  }
  if (event.key === 'Escape') setPaused(!paused);
});
document.addEventListener('keyup', (event) => {
  const key = aliases[event.key];
  if (key) {
    event.preventDefault();
    setKey(key, false);
  }
});
window.addEventListener('blur', () => running && setPaused(true));
window.addEventListener('resize', () => { x = Math.min(x, game.clientWidth - player.offsetWidth - 22); });

document.querySelector('#startButton').addEventListener('click', startGame);
document.querySelector('#resumeButton').addEventListener('click', () => setPaused(false));
pauseButton.addEventListener('click', () => setPaused(!paused));
soundButton.addEventListener('click', () => {
  soundOn = !soundOn;
  soundButton.textContent = soundOn ? '♪' : '×';
  soundButton.setAttribute('aria-pressed', String(soundOn));
  if (soundOn) tone(660, .09);
});

document.querySelectorAll('[data-control]').forEach((button) => {
  const key = button.dataset.control;
  const down = (event) => { event.preventDefault(); setKey(key, true); };
  const up = (event) => { event.preventDefault(); setKey(key, false); };
  button.addEventListener('pointerdown', down);
  button.addEventListener('pointerup', up);
  button.addEventListener('pointercancel', up);
  button.addEventListener('pointerleave', up);
});

x = initialX();
requestAnimationFrame(frame);
