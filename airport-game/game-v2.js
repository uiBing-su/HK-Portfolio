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
const playerSprite = document.querySelector('#playerSprite');
const actionButtons = [...document.querySelectorAll('[data-action]')];
const startButton = document.querySelector('#startButton');

const SPRITES = {
  idle: [
    './assets/cat-frames/idle/idle-front-a.png?v=3',
    './assets/cat-frames/idle/idle-front-b.png?v=3'
  ],
  walk: [1, 2, 3, 4].map((step) => `./assets/cat-frames/walk/walk-step-${step}.png?v=2`),
  side: './assets/cat-frames/idle/idle-side.png',
  sit: './assets/cat-frames/actions/action-sit.png?v=3'
};
const ACTIONS = {
  1: { label: '환호', bubble: '와아', src: './assets/cat-frames/actions/action-cheer.png', duration: 1.35 },
  2: { label: '윙크', bubble: '찡긋', src: './assets/cat-frames/actions/action-wink.png', duration: 1.25 },
  3: { label: '궁금', bubble: '어라?', src: './assets/cat-frames/actions/action-question.png', duration: 1.55 },
  4: { label: '축하', bubble: '축하해!', src: './assets/cat-frames/actions/action-celebrate.png', duration: 1.35 },
  5: { label: '앉기', bubble: '휴식 중', src: './assets/cat-frames/actions/action-sit.png?v=3', duration: 2.1 }
};
const ALL_SPRITES = [...new Set([
  ...SPRITES.idle,
  ...SPRITES.walk,
  SPRITES.side,
  SPRITES.sit,
  ...Object.values(ACTIONS).map((action) => action.src)
])];
const spriteCache = new Map();

const keys = { w: false, a: false, s: false, d: false };
const aliases = { ArrowUp: 'w', ArrowLeft: 'a', ArrowDown: 's', ArrowRight: 'd', W: 'w', A: 'a', S: 's', D: 'd', w: 'w', a: 'a', s: 's', d: 'd' };
const orbs = [...document.querySelectorAll('.orb')];
const orbWorldPositions = [620, 1460, 2380];

let running = false;
let paused = false;
let soundOn = true;
let playerX = 0;
let worldX = 0;
let jump = 0;
let verticalVelocity = 0;
let direction = 1;
let lastTime = performance.now();
let collected = 0;
let audioContext;
let animationClock = 0;
let animationState = 'idle';
let currentSprite = '';
let activeAction = null;
let actionTime = 0;

function preloadSprite(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve({ src, image, ok: true });
    image.onerror = () => resolve({ src, image, ok: false });
    image.src = src;
  });
}

async function prepareSprites() {
  startButton.disabled = true;
  startButton.innerHTML = '<span class="start-play" aria-hidden="true">▶</span><span>캐릭터 준비 중</span><span aria-hidden="true">···</span>';
  const loaded = await Promise.all(ALL_SPRITES.map(preloadSprite));
  loaded.forEach(({ src, image, ok }) => {
    if (ok) spriteCache.set(src, image);
  });
  startButton.disabled = false;
  startButton.innerHTML = '<span class="start-play" aria-hidden="true">▶</span><span>순찰 시작</span><span aria-hidden="true">→</span>';
  game.classList.add('sprites-ready');
}

function initialPlayerX() {
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

function releaseControls() {
  Object.keys(keys).forEach((key) => setKey(key, false));
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

function setSprite(src) {
  if (currentSprite === src) return;
  currentSprite = src;
  playerSprite.src = spriteCache.get(src)?.src || src;
}

function enterAnimationState(nextState) {
  if (animationState !== nextState) {
    animationState = nextState;
    animationClock = 0;
  }
  player.classList.toggle('idle', nextState === 'idle');
}

function playAction(number) {
  if (!running || paused || !ACTIONS[number]) return;
  activeAction = Number(number);
  actionTime = ACTIONS[number].duration;
  actionButtons.forEach((button) => button.classList.toggle('active', Number(button.dataset.action) === activeAction));
  player.classList.add('acting');
  enterAnimationState(number === 5 ? 'sit' : 'action');
  setSprite(ACTIONS[number].src);
  showToast(ACTIONS[number].bubble);
  tone(560 + Number(number) * 70, .09, 'triangle');
}

function updateSprite(dt, move) {
  if (activeAction) {
    actionTime -= dt;
    if (actionTime > 0) {
      enterAnimationState(activeAction === 5 ? 'sit' : 'action');
      setSprite(ACTIONS[activeAction].src);
      return;
    }
    activeAction = null;
    player.classList.remove('acting');
    actionButtons.forEach((button) => button.classList.remove('active'));
  }

  const nextState = keys.s && jump === 0 ? 'sit' : jump > 0 ? 'jump' : move ? 'walk' : 'idle';
  enterAnimationState(nextState);
  animationClock += dt;

  if (nextState === 'sit') setSprite(SPRITES.sit);
  else if (nextState === 'jump') setSprite(SPRITES.side);
  else if (nextState === 'walk') setSprite(SPRITES.walk[Math.floor(animationClock / .105) % SPRITES.walk.length]);
  else setSprite(SPRITES.idle[Math.floor(animationClock / .72) % SPRITES.idle.length]);
}

function startGame() {
  running = true;
  paused = false;
  playerX = initialPlayerX();
  game.classList.remove('is-starting');
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
  game.classList.toggle('is-paused', paused);
  pauseButton.setAttribute('aria-pressed', String(paused));
  pauseScreen.classList.toggle('hidden', !paused);
  pauseScreen.setAttribute('aria-hidden', String(!paused));
  if (paused) releaseControls();
  if (!paused) game.focus();
}

function updateOrbs() {
  const playerCenter = playerX + player.offsetWidth / 2;
  orbs.forEach((orb, index) => {
    const screenX = playerCenter + orbWorldPositions[index] - worldX;
    orb.style.left = `${screenX}px`;
    const visible = screenX > -60 && screenX < game.clientWidth + 60;
    orb.style.visibility = visible ? 'visible' : 'hidden';
    if (orb.classList.contains('collected')) return;
    if (Math.abs(playerCenter - screenX) < 46 && jump < 88) {
      orb.classList.add('collected');
      collected += 1;
      orbCount.textContent = `${collected} / 3`;
      progressFill.style.width = `${(collected / 3) * 100}%`;
      tone(880, .12, 'triangle');
      setTimeout(() => tone(1174, .15, 'triangle'), 80);
      showToast(collected === 3 ? '모든 활주로 신호를 확인했습니다!' : `활주로 신호 ${collected}개 확인`);
    }
  });
}

function updateLocation() {
  const cycle = ((worldX % 3690) + 3690) % 3690;
  const next = cycle < 1230 ? '국제선 터미널' : cycle < 2460 ? '제1활주로' : '제2활주로';
  if (locationText.textContent !== next) locationText.textContent = next;
}

function updateWorld(move, distance) {
  const leftDeadZone = game.clientWidth * .34;
  const rightDeadZone = game.clientWidth * .46;
  if (move > 0) {
    if (playerX < rightDeadZone) playerX = Math.min(rightDeadZone, playerX + distance);
    else worldX += distance;
  } else if (move < 0) {
    if (playerX > leftDeadZone) playerX = Math.max(leftDeadZone, playerX - distance);
    else worldX -= distance;
  }
}

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, .032);
  lastTime = now;
  if (running && !paused) {
    const move = activeAction || keys.s ? 0 : Number(keys.d) - Number(keys.a);
    const speed = Math.max(190, game.clientWidth * .2);
    if (move) {
      updateWorld(move, Math.abs(move) * speed * dt);
      direction = move > 0 ? 1 : -1;
    }

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
    // The source side-view jump frame is drawn facing left, while the walk
    // frames are drawn facing right. Invert only the airborne frame so both
    // animation sets follow the same world direction.
    const sitting = (keys.s && jump === 0) || activeAction === 5;
    const characterState = sitting ? 'sit' : jump > 0 ? 'jump' : move ? 'walk' : activeAction ? 'action' : 'idle';
    const facingScale = MotionMath.characterScale(direction, characterState);
    player.dataset.facing = sitting ? 'front' : direction > 0 ? 'right' : 'left';
    player.dataset.state = characterState;
    player.style.transform = `translate3d(${playerX}px, ${-jump}px, 0) scaleX(${facingScale})`;
    updateSprite(dt, move);
    game.style.setProperty('--world-x', `${-worldX}px`);
    updateOrbs();
    updateLocation();
  }
  requestAnimationFrame(frame);
}

document.addEventListener('keydown', (event) => {
  if (/^[1-5]$/.test(event.key) && !event.repeat) {
    event.preventDefault();
    playAction(event.key);
    return;
  }
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
window.addEventListener('blur', () => {
  releaseControls();
  if (running) setPaused(true);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    releaseControls();
    if (running) setPaused(true);
  }
});
window.addEventListener('resize', () => {
  playerX = Math.max(18, Math.min(game.clientWidth - player.offsetWidth - 22, playerX));
  updateOrbs();
});

startButton.addEventListener('click', startGame);
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

actionButtons.forEach((button) => button.addEventListener('click', () => playAction(button.dataset.action)));

playerX = initialPlayerX();
updateOrbs();
prepareSprites();
requestAnimationFrame(frame);

if (location.protocol === 'file:' && location.hash === '#game-preview') {
  running = true;
  startScreen.classList.add('hidden');
  game.classList.remove('is-starting');
} else if (location.protocol === 'file:' && location.hash === '#pause-preview') {
  running = true;
  startScreen.classList.add('hidden');
  game.classList.remove('is-starting');
  setPaused(true);
}
