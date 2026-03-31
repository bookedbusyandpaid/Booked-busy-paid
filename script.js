const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const coinsEl = document.getElementById("coins");
const levelEl = document.getElementById("level");
const bestEl = document.getElementById("best");
const clickCountEl = document.getElementById("clickCount");
const dailyNudge = document.getElementById("dailyNudge");

const widerBtn = document.getElementById("widerBtn");
const slowBtn = document.getElementById("slowBtn");
const shopBtn = document.getElementById("shopBtn");

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

let gameState = "start";
let score = 0;
let coins = 0;
let level = 1;
let best = Number(localStorage.getItem("bbpBest")) || 0;
let plannerClicks = Number(localStorage.getItem("bbpPlannerClicks")) || 0;

bestEl.textContent = best;
clickCountEl.textContent = plannerClicks;

let frame = 0;
let sparkles = [];
let moneyDrops = [];
let hitTexts = [];

const bounceEmojis = ["💖", "💸", "💎", "✨"];
const decorEmojis = ["🌹", "💸", "📔", "✨"];

const paddle = {
  x: 145,
  y: 548,
  w: 110,
  h: 14
};

const ball = {
  x: 200,
  y: 300,
  r: 12,
  dx: 3.2,
  dy: -3.2
};

function playTone(freq, duration, type = "sine", volume = 0.03) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    audioCtx.currentTime + duration
  );

  osc.stop(audioCtx.currentTime + duration);
}

function playWallSound() {
  playTone(320, 0.05, "square", 0.02);
}

function playScoreSound() {
  playTone(650, 0.07, "triangle", 0.04);
  setTimeout(() => playTone(780, 0.09, "triangle", 0.03), 50);
}

function playLoseSound() {
  playTone(260, 0.12, "sawtooth", 0.035);
  setTimeout(() => playTone(180, 0.18, "sawtooth", 0.025), 80);
}

function playButtonSound() {
  playTone(720, 0.06, "sine", 0.03);
}

function vibrate(ms) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

function updateHUD() {
  scoreEl.textContent = score;
  coinsEl.textContent = coins;
  levelEl.textContent = level;
  bestEl.textContent = best;
  clickCountEl.textContent = plannerClicks;
}

function setLastPlayedToday() {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem("bbpLastPlayed", today);
}

function showDailyNudge() {
  const today = new Date().toISOString().slice(0, 10);
  const lastPlayed = localStorage.getItem("bbpLastPlayed");

  if (lastPlayed !== today) {
    dailyNudge.style.display = "block";
    dailyNudge.textContent = "👀 You haven’t played today… get back to your rich life 💖";
  } else {
    dailyNudge.style.display = "none";
  }
}

function trackPlannerClick() {
  plannerClicks += 1;
  localStorage.setItem("bbpPlannerClicks", plannerClicks);
  clickCountEl.textContent = plannerClicks;
}

function resetBall() {
  ball.x = 200;
  ball.y = 300;
  ball.dx = Math.random() > 0.5 ? 3.2 : -3.2;
  ball.dy = -3.2;
}

function hardResetToStart() {
  gameState = "start";
  score = 0;
  coins = 0;
  level = 1;
  moneyDrops = [];
  hitTexts = [];
  resetBall();
  updateHUD();
}

function spawnSparkle() {
  if (sparkles.length < 22 && Math.random() < 0.12) {
    sparkles.push({
      x: Math.random() * 400,
      y: Math.random() * 600,
      size: Math.random() * 8 + 8,
      alpha: Math.random() * 0.25 + 0.08,
      emoji: Math.random() > 0.5 ? "✨" : "✦"
    });
  }
}

function spawnHitText(text, x, y) {
  hitTexts.push({ text, x, y, life: 40 });
}

function spawnMoneyBurst(x, y) {
  for (let i = 0; i < 4; i++) {
    moneyDrops.push({
      x: x + (Math.random() * 16 - 8),
      y: y + (Math.random() * 16 - 8),
      speed: 1.2 + Math.random() * 1.2,
      drift: Math.random() * 1.4 - 0.7,
      emoji: decorEmojis[Math.floor(Math.random() * decorEmojis.length)],
      life: 80
    });
  }
}

function screenShake() {
  document.body.style.transition = "transform 0.1s";
  document.body.style.transform = "translateX(-5px)";
  setTimeout(() => {
    document.body.style.transform = "translateX(5px)";
  }, 50);
  setTimeout(() => {
    document.body.style.transform = "translateX(0px)";
  }, 100);
}

function popScore() {
  scoreEl.style.transition = "transform 0.2s";
  scoreEl.style.transform = "scale(1.25)";
  setTimeout(() => {
    scoreEl.style.transform = "scale(1)";
  }, 200);
}

function showCoinPopup(x, y) {
  const coin = document.createElement("div");
  coin.innerText = "+1 💰";
  coin.style.position = "fixed";
  coin.style.left = x + "px";
  coin.style.top = y + "px";
  coin.style.color = "#ff69b4";
  coin.style.fontWeight = "bold";
  coin.style.fontSize = "20px";
  coin.style.zIndex = "9999";
  coin.style.pointerEvents = "none";
  coin.style.transition = "all 0.6s ease";
  document.body.appendChild(coin);

  setTimeout(() => {
    coin.style.top = y - 40 + "px";
    coin.style.opacity = "0";
  }, 30);

  setTimeout(() => {
    coin.remove();
  }, 650);
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, 600);
  grad.addColorStop(0, "#35153d");
  grad.addColorStop(0.6, "#2a1030");
  grad.addColorStop(1, "#230d24");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 400, 600);

  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#ff69bc";
  ctx.fillRect(0, 500, 400, 90);
  ctx.globalAlpha = 1;

  for (const s of sparkles) {
    ctx.globalAlpha = s.alpha;
    ctx.font = s.size + "px serif";
    ctx.fillText(s.emoji, s.x, s.y);
  }
  ctx.globalAlpha = 1;
}

function drawStartScreen() {
  drawBackground();

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(32, 168, 336, 170);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 26px Arial";
  ctx.fillText("Welcome to your rich life 💖", 40, 220);

  ctx.fillStyle = "#ffd4ea";
  ctx.font = "21px Arial";
  ctx.fillText("Catch the bag. Stay focused.", 56, 265);
  ctx.fillText("Tap to Start", 127, 315);

  ctx.font = "18px serif";
  ctx.fillText("🌹  💸  ✨  📔", 130, 360);
}

function drawPaddle() {
  ctx.save();
  ctx.fillStyle = "#ff5db1";
  ctx.shadowBlur = 18;
  ctx.shadowColor = "rgba(255,146,202,.52)";
  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
  ctx.restore();

  ctx.font = "18px serif";
  ctx.fillText("📔", paddle.x + paddle.w / 2 - 8, paddle.y - 6);
}

function drawBall() {
  const emoji = bounceEmojis[Math.floor(frame / 8) % bounceEmojis.length];
  ctx.font = "34px serif";
  ctx.fillText(emoji, ball.x - 14, ball.y + 11);
}

function drawMoneyDrops() {
  for (const m of moneyDrops) {
    ctx.globalAlpha = Math.max(0.15, m.life / 80);
    ctx.font = "22px serif";
    ctx.fillText(m.emoji, m.x, m.y);
  }
  ctx.globalAlpha = 1;
}

function drawHitTexts() {
  for (const h of hitTexts) {
    ctx.globalAlpha = Math.max(0.15, h.life / 40);
    ctx.fillStyle = "#ffd8ef";
    ctx.font = "bold 28px Arial";
    ctx.fillText(h.text, h.x, h.y);
  }
  ctx.globalAlpha = 1;
}

function drawGame() {
  drawBackground();
  drawPaddle();
  drawBall();
  drawMoneyDrops();
  drawHitTexts();
}

function updateGame() {
  frame++;
  spawnSparkle();

  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.x + ball.r > 400 || ball.x - ball.r < 0) {
    ball.dx *= -1;
    spawnMoneyBurst(ball.x, ball.y);
    vibrate(8);
    playWallSound();
  }

  if (ball.y - ball.r < 0) {
    ball.dy *= -1;
    spawnMoneyBurst(ball.x, ball.y);
    vibrate(8);
    playWallSound();
  }

  if (
    ball.y + ball.r >= paddle.y &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.w &&
    ball.dy > 0
  ) {
    ball.dy *= -1;
    score += 1;
    coins += 2;

    if (score % 5 === 0) level += 1;

    if (score > best) {
      best = score;
      localStorage.setItem("bbpBest", best);
    }

    spawnMoneyBurst(ball.x, ball.y);
    spawnHitText(score % 2 === 0 ? "PAID! 💸" : "BOOKED! ✨", 138, 118);
    vibrate(15);
    playScoreSound();
    popScore();

    const rect = canvas.getBoundingClientRect();
    showCoinPopup(rect.left + ball.x - 10, rect.top + ball.y - 10);

    updateHUD();
  }

  if (ball.y - ball.r > 600) {
    vibrate(30);
    playLoseSound();
    screenShake();
    hardResetToStart();
  }

  for (let i = moneyDrops.length - 1; i >= 0; i--) {
    moneyDrops[i].y += moneyDrops[i].speed;
    moneyDrops[i].x += moneyDrops[i].drift;
    moneyDrops[i].life -= 1;
    if (moneyDrops[i].life <= 0) moneyDrops.splice(i, 1);
  }

  for (let i = hitTexts.length - 1; i >= 0; i--) {
    hitTexts[i].y -= 0.6;
    hitTexts[i].life -= 1;
    if (hitTexts[i].life <= 0) hitTexts.splice(i, 1);
  }
}

function loop() {
  if (gameState === "start") {
    drawStartScreen();
  } else {
    updateGame();
    drawGame();
  }
  requestAnimationFrame(loop);
}

function movePaddle(clientX) {
  const rect = canvas.getBoundingClientRect();
  let newX = ((clientX - rect.left) / rect.width) * 400 - paddle.w / 2;

  if (newX < 0) newX = 0;
  if (newX + paddle.w > 400) newX = 400 - paddle.w;

  paddle.x = newX;
}

canvas.addEventListener("click", () => {
  if (audioCtx.state === "suspended") audioCtx.resume();

  if (gameState === "start") {
    gameState = "playing";
    setLastPlayedToday();
    showDailyNudge();
    resetBall();
    vibrate(10);
    playButtonSound();
  }
});

canvas.addEventListener("touchstart", (e) => {
  if (audioCtx.state === "suspended") audioCtx.resume();

  if (gameState === "start") {
    gameState = "playing";
    setLastPlayedToday();
    showDailyNudge();
    resetBall();
    vibrate(10);
    playButtonSound();
  }
  movePaddle(e.touches[0].clientX);
}, { passive: true });

canvas.addEventListener("touchmove", (e) => {
  movePaddle(e.touches[0].clientX);
}, { passive: true });

canvas.addEventListener("mousemove", (e) => {
  movePaddle(e.clientX);
});

widerBtn.addEventListener("click", () => {
  if (coins >= 10) {
    coins -= 10;
    paddle.w = Math.min(180, paddle.w + 24);
    updateHUD();
    vibrate(10);
    playButtonSound();
  }
});

slowBtn.addEventListener("click", () => {
  if (coins >= 15) {
    coins -= 15;
    ball.dx *= 0.84;
    ball.dy *= 0.84;
    updateHUD();
    vibrate(10);
    playButtonSound();
  }
});

shopBtn.addEventListener("click", () => {
  if (audioCtx.state === "suspended") audioCtx.resume();
  trackPlannerClick();
  vibrate(12);
  playButtonSound();
  window.location.href = "https://square.link/u/8kqPFCgV?src=sheet";
});

showDailyNudge();
updateHUD();
loop();