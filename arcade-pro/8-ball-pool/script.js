(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const menuScreen = document.getElementById("menuScreen");
  const gameScreen = document.getElementById("gameScreen");
  const difficultyGrid = document.getElementById("difficultyGrid");
  const progressText = document.getElementById("progressText");
  const progressBar = document.getElementById("progressBar");
  const resetProgressBtn = document.getElementById("resetProgressBtn");

  const powerValue = document.getElementById("powerValue");
  const powerFill = document.getElementById("powerFill");
  const dragState = document.getElementById("dragState");
  const newGameBtn = document.getElementById("newGameBtn");
  const menuBtn = document.getElementById("menuBtn");
  const soundBtn = document.getElementById("soundBtn");
  const helpBtn = document.getElementById("helpBtn");

  const difficultyBadge = document.getElementById("difficultyBadge");
  const turnLabel = document.getElementById("turnLabel");
  const messageLabel = document.getElementById("messageLabel");
  const playerCard = document.getElementById("playerCard");
  const cpuCard = document.getElementById("cpuCard");
  const playerGroup = document.getElementById("playerGroup");
  const cpuGroup = document.getElementById("cpuGroup");
  const playerBalls = document.getElementById("playerBalls");
  const cpuBalls = document.getElementById("cpuBalls");
  const cpuThinking = document.getElementById("cpuThinking");

  const orientationGate = document.getElementById("orientationGate");
  const landscapeBtn = document.getElementById("landscapeBtn");
  const orientationText = document.getElementById("orientationText");
  const orientationHint = document.getElementById("orientationHint");

  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalIcon = document.getElementById("modalIcon");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  const modalActions = document.getElementById("modalActions");

  const GAME_VERSION = "11.0-mobile-continuous-aim";
  const STORAGE_KEY = "vigu-sinuca-arena-progress-v1";
  const LEGACY_STORAGE_KEY = "vigu-cue-clash-progress-v1";

  const LEVELS = {
    easy: {
      name: "EASY",
      aimError: 0.22,
      powerError: 0.28,
      smartChance: 0.30,
      bankChance: 0.00,
      think: 420
    },
    medium: {
      name: "MEDIUM",
      aimError: 0.11,
      powerError: 0.16,
      smartChance: 0.62,
      bankChance: 0.05,
      think: 360
    },
    hard: {
      name: "HARD",
      aimError: 0.045,
      powerError: 0.08,
      smartChance: 0.88,
      bankChance: 0.13,
      think: 310
    },
    hardcore: {
      name: "HARDCORE",
      aimError: 0.012,
      powerError: 0.025,
      smartChance: 0.995,
      bankChance: 0.38,
      think: 260
    }
  };

  const BALL_COLORS = {
    1: "#f3d329", 2: "#2670e8", 3: "#e33b36", 4: "#743fa8",
    5: "#f39a32", 6: "#1b8750", 7: "#8d2b28", 8: "#141414",
    9: "#f3d329", 10: "#2670e8", 11: "#e33b36", 12: "#743fa8",
    13: "#f39a32", 14: "#1b8750", 15: "#8d2b28"
  };

  let W = 1000;
  let H = 500;
  let DPR = 1;

  const table = {
    x: 74,
    y: 66,
    w: 852,
    h: 368,
    rail: 34,
    pocketR: 22
  };

  let balls = [];
  let currentDifficulty = "easy";
  let turn = "player";
  let groups = { player: null, cpu: null };
  let shotInProgress = false;
  let firstHit = null;
  let pocketedThisShot = [];
  let scratchThisShot = false;
  let gameOver = false;
  let cpuTimer = null;

  let aim = {
    angle: 0,
    pointX: 0,
    pointY: 0
  };

  let cueGesture = {
    active: false,
    mode: null, // "aiming" | "charging"
    pointerId: null,
    pointerType: "mouse",
    startX: 0,
    startY: 0,
    pull: 0,
    maxPull: 150,
    lockedAngle: 0
  };

  let physicsAccumulator = 0;
  // 120 Hz mantém colisões estáveis e reduz o custo em celulares menores.
  const PHYSICS_STEP = 1 / 120;

  let soundEnabled = true;
  let audioUnlocked = false;
  let audioUnlockPromise = null;
  const soundPools = {};
  const soundPoolCursor = {};
  const SOUND_CONFIG = {
    cue:       { src: "sounds/cue.wav",       volume: 0.72, pool: 3 },
    collision: { src: "sounds/collision.wav", volume: 0.48, pool: 7 },
    rail:      { src: "sounds/rail.wav",      volume: 0.42, pool: 4 },
    pocket:    { src: "sounds/pocket.wav",    volume: 0.72, pool: 4 },
    ui:        { src: "sounds/ui.wav",        volume: 0.34, pool: 3 },
    win:       { src: "sounds/win.wav",       volume: 0.68, pool: 2 },
    lose:      { src: "sounds/lose.wav",      volume: 0.58, pool: 2 }
  };

  let progress = loadProgress();

  function loadProgress() {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      const parsed = JSON.parse(current || legacy || "{}");
      const loaded = {
        easy: !!parsed.easy,
        medium: !!parsed.medium,
        hard: !!parsed.hard,
        hardcoreUnlocked: !!parsed.hardcoreUnlocked
      };

      if (!current && legacy) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
      }

      return loaded;
    } catch {
      return { easy: false, medium: false, hard: false, hardcoreUnlocked: false };
    }
  }

  function saveProgress() {
    progress.hardcoreUnlocked = progress.easy && progress.medium && progress.hard;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    updateProgressUI();
  }

  function updateProgressUI() {
    const wins = ["easy", "medium", "hard"].filter(k => progress[k]).length;
    progressText.textContent = `${wins}/3 wins`;
    progressBar.style.width = `${(wins / 3) * 100}%`;

    ["easy", "medium", "hard"].forEach(level => {
      const pill = document.querySelector(`[data-status="${level}"]`);
      if (progress[level]) {
        pill.textContent = "✓ Complete";
        pill.classList.add("cleared");
      } else {
        pill.textContent = "Available";
        pill.classList.remove("cleared");
      }
    });

    const hardcoreBtn = document.querySelector('[data-level="hardcore"]');
    const hardcorePill = document.querySelector('[data-status="hardcore"]');
    if (progress.hardcoreUnlocked) {
      hardcoreBtn.classList.remove("disabled");
      hardcorePill.textContent = "☠ Unlocked";
      hardcorePill.classList.remove("locked");
      hardcorePill.classList.add("cleared");
    } else {
      hardcoreBtn.classList.add("disabled");
      hardcorePill.textContent = "🔒 Locked";
      hardcorePill.classList.add("locked");
      hardcorePill.classList.remove("cleared");
    }
  }

  function isTouchMobileLayout() {
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const hasTouch = (navigator.maxTouchPoints || 0) > 0;
    const shortestScreenSide = Math.min(
      window.screen?.width || window.innerWidth,
      window.screen?.height || window.innerHeight
    );
    return (coarsePointer || hasTouch) && shortestScreenSide <= 1024;
  }

  function isPortraitViewport() {
    return window.innerHeight > window.innerWidth;
  }

  function updateOrientationGate() {
    const gameIsOpen = gameScreen.classList.contains("active");
    const needsLandscape = gameIsOpen && isTouchMobileLayout() && isPortraitViewport();

    orientationGate.classList.toggle("hidden", !needsLandscape);

    if (!needsLandscape) {
      orientationText.textContent = "The table is optimized for full-screen landscape play.";
      orientationHint.textContent = "If your browser cannot rotate automatically, turn your device sideways.";
      // Espera o viewport estabilizar depois da rotação/fullscreen.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (gameIsOpen) resizeCanvas();
        });
      });
    }
  }

  async function requestLandscapeExperience() {
    if (!isTouchMobileLayout()) return false;

    let fullscreenEntered = !!document.fullscreenElement;
    let orientationLocked = false;

    // Navegadores modernos normalmente exigem um gesto do usuário para fullscreen.
    if (!fullscreenEntered && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen({ navigationUI: "hide" });
        fullscreenEntered = true;
      } catch {
        // Fallback abaixo: o jogador ainda pode girar o aparelho manualmente.
      }
    }

    // Em navegadores que suportam Screen Orientation API, o lock costuma
    // funcionar depois que a página entrou em fullscreen.
    if (screen.orientation && typeof screen.orientation.lock === "function") {
      try {
        await screen.orientation.lock("landscape");
        orientationLocked = true;
      } catch {
        // iOS/Safari e alguns navegadores não permitem lock de orientação.
      }
    }

    updateOrientationGate();

    if (isPortraitViewport()) {
      orientationText.textContent = orientationLocked
        ? "Landscape mode requested. Please wait a moment."
        : "Your browser cannot rotate the screen automatically on this page.";
      orientationHint.textContent = "Turn your device sideways. The game will unlock when the screen is in landscape.";
    }

    return fullscreenEntered || orientationLocked;
  }

  function syncVisualViewport() {
    const viewport = window.visualViewport;
    const viewportWidth = Math.max(1, viewport ? viewport.width : window.innerWidth);
    const viewportHeight = Math.max(1, viewport ? viewport.height : window.innerHeight);

    document.documentElement.style.setProperty("--game-vw", `${viewportWidth}px`);
    document.documentElement.style.setProperty("--game-vh", `${viewportHeight}px`);
  }

  function resizeCanvas() {
    syncVisualViewport();

    const rect = canvas.getBoundingClientRect();

    // DPR menor em touch reduz bastante a carga de renderização em aparelhos
    // compactos sem deixar a mesa visualmente borrada.
    const maxDpr = isTouchMobileLayout() ? 1.5 : 2;
    DPR = Math.min(window.devicePixelRatio || 1, maxDpr);
    canvas.width = Math.max(1, Math.round(rect.width * DPR));
    canvas.height = Math.max(1, Math.round(rect.height * DPR));
    W = rect.width;
    H = rect.height;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    table.x = W * 0.073;
    table.y = H * 0.12;
    table.w = W * 0.854;
    table.h = H * 0.76;
    table.rail = Math.max(20, W * 0.03);
    table.pocketR = Math.max(12, W * 0.019);

    if (balls.length) {
      // Balls are stored in normalized table coordinates, so visual resize is automatic.
      draw();
    }
  }

  window.addEventListener("resize", () => {
    syncVisualViewport();
    resizeCanvas();
    updateOrientationGate();
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
      syncVisualViewport();
      resizeCanvas();
      updateOrientationGate();
    });

    window.visualViewport.addEventListener("scroll", () => {
      syncVisualViewport();
    });
  }
  window.addEventListener("orientationchange", () => {
    setTimeout(updateOrientationGate, 80);
    setTimeout(resizeCanvas, 140);
  });
  document.addEventListener("fullscreenchange", () => {
    setTimeout(updateOrientationGate, 60);
    setTimeout(resizeCanvas, 100);
  });
  if (screen.orientation && typeof screen.orientation.addEventListener === "function") {
    screen.orientation.addEventListener("change", () => {
      setTimeout(updateOrientationGate, 60);
      setTimeout(resizeCanvas, 100);
    });
  }

  function normToPx(ball) {
    return {
      x: table.x + ball.x * table.w,
      y: table.y + ball.y * table.h,
      r: ball.r * Math.min(table.w, table.h)
    };
  }

  function pxToNorm(x, y) {
    return {
      x: (x - table.x) / table.w,
      y: (y - table.y) / table.h
    };
  }

  function createBall(num, x, y) {
    return {
      num,
      x,
      y,
      vx: 0,
      vy: 0,
      r: 0.0325,
      pocketed: false
    };
  }

  function rackBalls() {
    const result = [];
    const cueX = 0.25;
    const rackX = 0.70;
    const rackY = 0.5;
    const gap = 0.0015;
    const r = 0.0325;
    const dx = r * 1.74 + gap;
    const dy = r * 2 + gap;

    result.push(createBall(0, cueX, rackY));

    // 8-ball style rack: 8 in the center, one solid and one stripe in back corners.
    const rackNums = [
      [1],
      [10, 2],
      [3, 8, 12],
      [14, 4, 6, 11],
      [7, 9, 13, 5, 15]
    ];

    for (let col = 0; col < rackNums.length; col++) {
      const nums = rackNums[col];
      const x = rackX + col * dx;
      const startY = rackY - (nums.length - 1) * dy / 2;
      nums.forEach((num, i) => {
        result.push(createBall(num, x, startY + i * dy));
      });
    }

    return result;
  }

  function startGame(level) {
    if (level === "hardcore" && !progress.hardcoreUnlocked) {
      showModal(
        "🔒",
        "HARDCORE locked",
        "Win one match on Easy, Medium and Hard to unlock the ultimate challenge.",
        [{ label: "Entendi", primary: true, action: hideModal }]
      );
      return;
    }

    currentDifficulty = level;
    balls = rackBalls();
    turn = "player";
    groups = { player: null, cpu: null };
    shotInProgress = false;
    firstHit = null;
    pocketedThisShot = [];
    scratchThisShot = false;
    gameOver = false;
    clearTimeout(cpuTimer);

    const cue = getCueBall();
    aim.angle = 0;
    aim.pointX = cue.x + 0.2;
    aim.pointY = cue.y;

    resetCueGesture();
    setPowerDisplay(0);
    difficultyBadge.textContent = LEVELS[level].name;

    menuScreen.classList.remove("active");
    gameScreen.classList.add("active");
    document.body.classList.add("game-active");
    updateOrientationGate();
    resizeCanvas();
    updateHUD();
    draw();
  }

  function showMenu() {
    clearTimeout(cpuTimer);
    cpuThinking.classList.add("hidden");
    gameScreen.classList.remove("active");
    menuScreen.classList.add("active");
    document.body.classList.remove("game-active");
    orientationGate.classList.add("hidden");
    updateProgressUI();
  }

  function getCueBall() {
    return balls.find(b => b.num === 0);
  }

  function getBall(num) {
    return balls.find(b => b.num === num);
  }

  function activeBalls() {
    return balls.filter(b => !b.pocketed);
  }

  function groupOfBall(num) {
    if (num >= 1 && num <= 7) return "solids";
    if (num >= 9 && num <= 15) return "stripes";
    if (num === 8) return "eight";
    return "cue";
  }

  function otherGroup(group) {
    return group === "solids" ? "stripes" : "solids";
  }

  function groupLabel(group) {
    if (group === "solids") return "Solids";
    if (group === "stripes") return "Stripes";
    return "Open table";
  }

  function remaining(group) {
    if (!group) return 7;
    return balls.filter(b => !b.pocketed && groupOfBall(b.num) === group).length;
  }

  function canShootEight(side) {
    return groups[side] && remaining(groups[side]) === 0;
  }

  function updateHUD(message) {
    const pRem = groups.player ? remaining(groups.player) : null;
    const cRem = groups.cpu ? remaining(groups.cpu) : null;

    playerGroup.textContent = groupLabel(groups.player);
    cpuGroup.textContent = groupLabel(groups.cpu);
    playerBalls.textContent = groups.player ? (pRem === 0 ? "8-ball" : `${pRem} restantes`) : "—";
    cpuBalls.textContent = groups.cpu ? (cRem === 0 ? "8-ball" : `${cRem} restantes`) : "—";

    const isPlayer = turn === "player";
    playerCard.classList.toggle("active-turn", isPlayer);
    cpuCard.classList.toggle("active-turn", !isPlayer);

    turnLabel.textContent = isPlayer ? "Your turn" : "CPU turn";
    messageLabel.textContent = message || (isPlayer
      ? "Aim and hold: pull the cue backwards and release."
      : "The CPU is lining up its shot.");

    const enabled = isPlayer && !shotInProgress && !gameOver && !isAnyBallMoving();
    canvas.classList.toggle("can-shoot", enabled);
    if (!enabled && cueGesture.active) resetCueGesture();
  }

  function tableBounds() {
    return {
      left: table.x,
      right: table.x + table.w,
      top: table.y,
      bottom: table.y + table.h
    };
  }

  function pocketPositionsPx() {
    const b = tableBounds();
    return [
      { x: b.left, y: b.top },
      { x: (b.left + b.right) / 2, y: b.top },
      { x: b.right, y: b.top },
      { x: b.left, y: b.bottom },
      { x: (b.left + b.right) / 2, y: b.bottom },
      { x: b.right, y: b.bottom }
    ];
  }

  function pocketPositionsNorm() {
    return [
      { x: 0, y: 0 },
      { x: .5, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: .5, y: 1 },
      { x: 1, y: 1 }
    ];
  }

  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function drawTable() {
    ctx.clearRect(0, 0, W, H);

    // Ambient shadow.
    const outerPad = table.rail * 1.12;
    const ox = table.x - outerPad;
    const oy = table.y - outerPad;
    const ow = table.w + outerPad * 2;
    const oh = table.h + outerPad * 2;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.55)";
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 16;
    const wood = ctx.createLinearGradient(ox, oy, ox, oy + oh);
    wood.addColorStop(0, "#9b4936");
    wood.addColorStop(.35, "#6c261f");
    wood.addColorStop(1, "#3b1412");
    ctx.fillStyle = wood;
    drawRoundedRect(ox, oy, ow, oh, 26);
    ctx.fill();
    ctx.restore();

    // Chrome trim.
    ctx.strokeStyle = "rgba(220, 245, 255, .45)";
    ctx.lineWidth = 2;
    drawRoundedRect(ox + 5, oy + 5, ow - 10, oh - 10, 22);
    ctx.stroke();

    // Inner rail.
    ctx.fillStyle = "#1b4350";
    drawRoundedRect(table.x - 8, table.y - 8, table.w + 16, table.h + 16, 16);
    ctx.fill();

    // Felt.
    const felt = ctx.createLinearGradient(table.x, table.y, table.x, table.y + table.h);
    felt.addColorStop(0, "#23a5c2");
    felt.addColorStop(.5, "#14809a");
    felt.addColorStop(1, "#0d687e");
    ctx.fillStyle = felt;
    drawRoundedRect(table.x, table.y, table.w, table.h, 12);
    ctx.fill();

    // Subtle felt lines.
    ctx.globalAlpha = .12;
    ctx.strokeStyle = "#d7fbff";
    ctx.lineWidth = 1;
    for (let i = 1; i < 7; i++) {
      const x = table.x + table.w * i / 7;
      ctx.beginPath();
      ctx.moveTo(x, table.y + 8);
      ctx.lineTo(x, table.y + table.h - 8);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Head string.
    ctx.setLineDash([5, 8]);
    ctx.strokeStyle = "rgba(255,255,255,.16)";
    ctx.beginPath();
    ctx.moveTo(table.x + table.w * .25, table.y);
    ctx.lineTo(table.x + table.w * .25, table.y + table.h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pockets.
    for (const p of pocketPositionsPx()) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.85)";
      ctx.shadowBlur = 13;
      ctx.fillStyle = "#030506";
      ctx.beginPath();
      ctx.arc(p.x, p.y, table.pocketR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = "rgba(255,255,255,.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, table.pocketR * .84, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawBall(ball) {
    if (ball.pocketed) return;
    const p = normToPx(ball);
    const r = p.r;
    const num = ball.num;

    ctx.save();
    ctx.translate(p.x, p.y);

    ctx.shadowColor = "rgba(0,0,0,.42)";
    ctx.shadowBlur = r * .9;
    ctx.shadowOffsetY = r * .45;

    if (num === 0) {
      const g = ctx.createRadialGradient(-r * .35, -r * .4, r * .1, 0, 0, r);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(1, "#d9e5e8");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const color = BALL_COLORS[num];
      const isStripe = num >= 9;

      ctx.fillStyle = isStripe ? "#f7f4e9" : color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      if (isStripe) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.rect(-r, -r * .46, r * 2, r * .92);
        ctx.clip();
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(p.x, p.y);
      }

      const gloss = ctx.createRadialGradient(-r * .38, -r * .42, 1, 0, 0, r);
      gloss.addColorStop(0, "rgba(255,255,255,.54)");
      gloss.addColorStop(.34, "rgba(255,255,255,.08)");
      gloss.addColorStop(1, "rgba(0,0,0,.22)");
      ctx.fillStyle = gloss;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f7f7f4";
      ctx.beginPath();
      ctx.arc(0, 0, r * .42, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#111";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `800 ${Math.max(8, r * .62)}px system-ui`;
      ctx.fillText(String(num), 0, .5);
    }

    // Highlight.
    ctx.fillStyle = "rgba(255,255,255,.65)";
    ctx.beginPath();
    ctx.arc(-r * .32, -r * .36, r * .12, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawAimGuide() {
    if (turn !== "player" || shotInProgress || gameOver || isAnyBallMoving()) return;
    const cue = getCueBall();
    if (!cue || cue.pocketed) return;

    const cp = normToPx(cue);
    const angle = aim.angle;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const maxDist = Math.max(W, H) * 1.5;

    // Approximate first intersection for guideline.
    let hitDist = maxDist;
    const ballRadiusPx = normToPx(cue).r;
    for (const b of balls) {
      if (b.num === 0 || b.pocketed) continue;
      const bp = normToPx(b);
      const ox = bp.x - cp.x;
      const oy = bp.y - cp.y;
      const proj = ox * dx + oy * dy;
      if (proj <= 0) continue;
      const perp2 = ox * ox + oy * oy - proj * proj;
      const rr = ballRadiusPx + bp.r;
      if (perp2 <= rr * rr) {
        const entry = proj - Math.sqrt(Math.max(0, rr * rr - perp2));
        if (entry < hitDist) hitDist = entry;
      }
    }

    const bounds = tableBounds();
    const candidates = [];
    if (dx > 0) candidates.push((bounds.right - cp.x) / dx);
    if (dx < 0) candidates.push((bounds.left - cp.x) / dx);
    if (dy > 0) candidates.push((bounds.bottom - cp.y) / dy);
    if (dy < 0) candidates.push((bounds.top - cp.y) / dy);
    const wallDist = Math.min(...candidates.filter(v => v > 0));
    hitDist = Math.min(hitDist, wallDist);

    ctx.save();
    ctx.setLineDash([8, 9]);
    ctx.strokeStyle = "rgba(255,255,255,.68)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cp.x, cp.y);
    ctx.lineTo(cp.x + dx * hitDist, cp.y + dy * hitDist);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.beginPath();
    ctx.arc(cp.x + dx * hitDist, cp.y + dy * hitDist, 3, 0, Math.PI * 2);
    ctx.fill();

    // Cue stick behind cue ball. While the pointer/finger is held, the cue
    // physically follows the pull-back distance before being released.
    const pullback = cueGesture.active ? cueGesture.pull : 0;
    const cueStart = ballRadiusPx + 12 + pullback;
    const cueEnd = cueStart + Math.max(120, W * .16);

    ctx.strokeStyle = "#e1bd73";
    ctx.lineWidth = Math.max(5, W * .006);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cp.x - dx * cueStart, cp.y - dy * cueStart);
    ctx.lineTo(cp.x - dx * cueEnd, cp.y - dy * cueEnd);
    ctx.stroke();

    ctx.strokeStyle = "#335f80";
    ctx.lineWidth = Math.max(2, W * .002);
    ctx.beginPath();
    ctx.moveTo(cp.x - dx * cueStart, cp.y - dy * cueStart);
    ctx.lineTo(cp.x - dx * (cueStart + 24), cp.y - dy * (cueStart + 24));
    ctx.stroke();

    ctx.restore();
  }

  function draw() {
    drawTable();
    balls.forEach(drawBall);
    drawAimGuide();
  }

  function canPlayerControlCue() {
    return turn === "player" && !shotInProgress && !gameOver && !isAnyBallMoving();
  }

  function clientToCanvas(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function setAimFromClient(clientX, clientY) {
    if (!canPlayerControlCue() || cueGesture.active) return;
    const pos = clientToCanvas(clientX, clientY);
    const cue = getCueBall();
    if (!cue || cue.pocketed) return;
    const cp = normToPx(cue);
    if (Math.hypot(pos.x - cp.x, pos.y - cp.y) < 4) return;
    aim.angle = Math.atan2(pos.y - cp.y, pos.x - cp.x);
    aim.pointX = pos.x;
    aim.pointY = pos.y;
    draw();
  }

  function setPowerDisplay(power01) {
    const value = Math.round(Math.max(0, Math.min(1, power01)) * 100);
    powerValue.textContent = `${value}%`;
    const landscapeSideMeter = window.matchMedia("(min-width: 981px), (orientation: landscape) and (max-height: 520px)").matches;
    if (landscapeSideMeter) {
      powerFill.style.height = `${value}%`;
      powerFill.style.width = "100%";
    } else {
      powerFill.style.width = `${value}%`;
      powerFill.style.height = "100%";
    }
  }

  function resetCueGesture() {
    cueGesture.active = false;
    cueGesture.mode = null;
    cueGesture.pointerId = null;
    cueGesture.pull = 0;
    canvas.classList.remove("pulling");
    canvas.classList.remove("aiming-touch");
    dragState.textContent = "READY";
    dragState.classList.remove("charging");
    setPowerDisplay(0);
  }

  function updateTouchAimFromPosition(pos) {
    const cue = getCueBall();
    if (!cue || cue.pocketed) return false;

    const cp = normToPx(cue);
    const dx = pos.x - cp.x;
    const dy = pos.y - cp.y;

    // Evita instabilidade quando o dedo fica praticamente sobre a bola branca.
    if (Math.hypot(dx, dy) < Math.max(10, normToPx(cue).r * 0.85)) {
      return false;
    }

    aim.angle = Math.atan2(dy, dx);
    aim.pointX = pos.x;
    aim.pointY = pos.y;
    return true;
  }

  function isTouchInCuePullZone(pos, cue) {
    const cp = normToPx(cue);
    const dx = Math.cos(aim.angle);
    const dy = Math.sin(aim.angle);

    const vx = pos.x - cp.x;
    const vy = pos.y - cp.y;

    // Coordenada ao longo da direção da tacada.
    // Valor negativo = lado onde o taco já está desenhado.
    const longitudinal = vx * dx + vy * dy;

    // Distância perpendicular até o eixo do taco.
    const lateral = Math.abs(vx * dy - vy * dx);

    const cueBallRadius = normToPx(cue).r;
    const rearDistance = -longitudinal;
    const maxRearDistance = Math.max(230, Math.min(W, H) * .78);
    const touchTolerance = Math.max(34, cueBallRadius * 3.2);

    return (
      longitudinal < -cueBallRadius * .35 &&
      rearDistance <= maxRearDistance &&
      lateral <= touchTolerance
    );
  }

  function startCueGesture(e) {
    if (!canPlayerControlCue()) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const cue = getCueBall();
    if (!cue || cue.pocketed) return;

    const pos = clientToCanvas(e.clientX, e.clientY);
    const isTouch = e.pointerType !== "mouse";

    cueGesture.active = true;
    cueGesture.pointerId = e.pointerId;
    cueGesture.pointerType = e.pointerType;
    cueGesture.startX = pos.x;
    cueGesture.startY = pos.y;
    cueGesture.pull = 0;
    cueGesture.maxPull = Math.max(90, Math.min(190, Math.min(W, H) * .34));

    /*
      V11 — MOBILE COM DOIS GESTOS DISTINTOS

      1) AIMING:
         tocar/segurar fora da região do taco e mover o dedo gira a mira
         continuamente, como o hover do mouse no desktop.

      2) CHARGING:
         tocar na região do taco atrás da bola branca mantém o ângulo
         totalmente travado; puxar para trás altera somente a força.

      Assim, movimentar a mira nunca interfere na potência, e puxar o taco
      nunca altera a direção escolhida.
    */
    if (isTouch && !isTouchInCuePullZone(pos, cue)) {
      cueGesture.mode = "aiming";
      updateTouchAimFromPosition(pos);

      try { canvas.setPointerCapture(e.pointerId); } catch {}
      canvas.classList.add("aiming-touch");
      dragState.textContent = "AIMING";
      dragState.classList.remove("charging");
      setPowerDisplay(0);
      messageLabel.textContent = "Hold and move your finger to aim.";
      draw();
      e.preventDefault();
      return;
    }

    // Desktop mantém a mecânica existente; no touch este modo começa apenas
    // quando o jogador toca na região do taco.
    cueGesture.mode = "charging";
    cueGesture.lockedAngle = aim.angle;

    try { canvas.setPointerCapture(e.pointerId); } catch {}
    canvas.classList.add("pulling");
    dragState.textContent = "PULL";
    dragState.classList.add("charging");
    messageLabel.textContent = isTouch
      ? "Aim locked. Pull the cue backwards and release."
      : "Pull the cue backwards and release.";
    setPowerDisplay(0);
    draw();
    e.preventDefault();
  }

  function updateCueGesture(e) {
    if (!cueGesture.active || e.pointerId !== cueGesture.pointerId) return;

    const pos = clientToCanvas(e.clientX, e.clientY);

    if (cueGesture.mode === "aiming") {
      // O dedo funciona como o mouse: enquanto estiver pressionado e se mover,
      // a linha de mira e o taco acompanham continuamente a posição.
      if (updateTouchAimFromPosition(pos)) {
        dragState.textContent = "AIMING";
        messageLabel.textContent = "Move your finger to adjust your aim • release when ready.";
        draw();
      }
      e.preventDefault();
      return;
    }

    if (cueGesture.mode !== "charging") return;

    const moveX = pos.x - cueGesture.startX;
    const moveY = pos.y - cueGesture.startY;

    // No carregamento usamos APENAS o ângulo congelado no pointerdown.
    // Movimento lateral do dedo não muda a mira.
    const dx = Math.cos(cueGesture.lockedAngle);
    const dy = Math.sin(cueGesture.lockedAngle);

    const backwards = -(moveX * dx + moveY * dy);
    cueGesture.pull = Math.max(0, Math.min(cueGesture.maxPull, backwards));

    const power = cueGesture.pull / cueGesture.maxPull;
    setPowerDisplay(power);
    dragState.textContent = power < .08 ? "PULL" : "RELEASE";
    messageLabel.textContent = power < .08
      ? "Aim locked • keep pulling backwards."
      : `Aim locked • power ${Math.round(power * 100)}% • release to shoot.`;

    draw();
    e.preventDefault();
  }

  function finishCueGesture(e, cancelled = false) {
    if (!cueGesture.active || e.pointerId !== cueGesture.pointerId) return;

    const mode = cueGesture.mode;
    const pull = cueGesture.pull;
    const maxPull = cueGesture.maxPull;
    const angle = cueGesture.lockedAngle;

    try { canvas.releasePointerCapture(e.pointerId); } catch {}
    resetCueGesture();

    if (cancelled || !canPlayerControlCue()) {
      updateHUD();
      draw();
      return;
    }

    // Finalizar a mira nunca dispara a bola.
    if (mode === "aiming") {
      updateHUD("Aim set. Now touch the cue, pull backwards and release.");
      draw();
      e.preventDefault();
      return;
    }

    if (mode !== "charging") {
      updateHUD();
      draw();
      return;
    }

    // Um toque curto no taco não dispara acidentalmente.
    const minPull = Math.max(10, maxPull * .07);
    if (pull < minPull) {
      updateHUD("Aim held. Pull the cue further back to take your shot.");
      draw();
      return;
    }

    const linearPower = Math.min(1, pull / maxPull);
    const power = Math.max(.10, Math.pow(linearPower, .88));
    shoot(angle, power, "player");
    e.preventDefault();
  }

  canvas.addEventListener("pointermove", e => {
    if (cueGesture.active) {
      updateCueGesture(e);
    } else if (e.pointerType === "mouse") {
      setAimFromClient(e.clientX, e.clientY);
    }
  });

  canvas.addEventListener("pointerdown", startCueGesture);
  canvas.addEventListener("pointerup", e => finishCueGesture(e, false));
  canvas.addEventListener("pointercancel", e => finishCueGesture(e, true));
  canvas.addEventListener("lostpointercapture", e => {
    if (cueGesture.active && e.pointerId === cueGesture.pointerId) finishCueGesture(e, true);
  });
  canvas.addEventListener("contextmenu", e => e.preventDefault());

  function visualAngleToVelocity(angle, speed) {
    // x/y das bolas são normalizados separadamente pelo tamanho da mesa.
    // Sem esta compensação, uma mira visual de 45° não produz uma tacada
    // visual de 45° em uma mesa retangular. Converter primeiro a direção
    // da tela para o espaço físico da mesa mantém taco, guia e bola alinhados.
    const aspect = table.w / table.h;
    return {
      vx: Math.cos(angle) * speed / aspect,
      vy: Math.sin(angle) * speed
    };
  }

  function shoot(angle, power, shooter) {
    const cue = getCueBall();
    if (!cue || cue.pocketed || gameOver) return;

    shotInProgress = true;
    firstHit = null;
    pocketedThisShot = [];
    scratchThisShot = false;

    // Potência calibrada para que 100% continue realmente sendo uma
    // tacada forte mesmo em trajetórias longas.
    /*
      V10 — curva de potência de taco.

      A V9 ainda era muito linear: 100% não se destacava o suficiente de uma
      tacada média. Agora a parte final da puxada cresce de forma progressiva:
      - pouca força continua controlável;
      - 50% permanece próximo do comportamento anterior;
      - 80–100% recebe bastante energia extra para abertura do rack.
    */
    const clampedPower = Math.max(.08, Math.min(1, power));
    const speed = 0.10 + 2.75 * Math.pow(clampedPower, 1.70);
    const velocity = visualAngleToVelocity(angle, speed);
    cue.vx = velocity.vx;
    cue.vy = velocity.vy;

    playSound("cue", shooter === "player" ? 1 : 0.88, shooter === "player" ? 1 : 0.96);
    updateHUD(shooter === "player" ? "Shot in motion…" : "The CPU took its shot.");
  }

  function isAnyBallMoving() {
    // 0.016 em unidades visuais corresponde a apenas alguns pixels/segundo
    // numa tela mobile. Abaixo disso o movimento já é imperceptível.
    return balls.some(b => !b.pocketed && getVisualSpeed(b) > 0.018);
  }

  function getVisualSpeed(ball) {
    // Retorna a velocidade equivalente na tela em "alturas de mesa por segundo".
    // Isso evita diferenças de desaceleração entre tacadas horizontais,
    // verticais e diagonais em uma mesa retangular.
    const aspect = table.w / table.h;
    return Math.hypot(ball.vx * aspect, ball.vy);
  }

  function frictionForVisualSpeed(speed, dt) {
    /*
      Atrito dinâmico:
      - alta velocidade: conserva energia para jogadas longas;
      - média velocidade: desacelera com naturalidade;
      - velocidade muito baixa: encerra rapidamente a "cauda" quase invisível.

      Isso resolve a demora entre uma tacada terminar e o próximo turno começar,
      sem voltar ao problema antigo de uma tacada a 100% morrer no meio da mesa.
    */
    let base;

    if (speed > 0.55) {
      // Alta velocidade: conserva energia para abertura e espalhamento.
      base = 0.996;
    } else if (speed > 0.16) {
      // Média velocidade: mantém as bolas vivas sem parecer gelo.
      base = 0.980;
    } else {
      // Final da rolagem: encerra rapidamente movimentos imperceptíveis.
      base = 0.895;
    }

    return Math.pow(base, dt * 60);
  }

  function updatePhysics(dt) {
    const moving = balls.filter(b => !b.pocketed);

    for (const b of moving) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      const visualSpeed = getVisualSpeed(b);
      const rollingFriction = frictionForVisualSpeed(visualSpeed, dt);
      b.vx *= rollingFriction;
      b.vy *= rollingFriction;

      // Snap de repouso apenas quando a velocidade já é visualmente irrelevante.
      if (getVisualSpeed(b) < 0.018) {
        b.vx = 0;
        b.vy = 0;
      }

      handlePocket(b);
      if (!b.pocketed) handleRails(b);
    }

    // Ball-ball collisions, iterative enough for casual play.
    for (let i = 0; i < moving.length; i++) {
      const a = moving[i];
      if (a.pocketed) continue;
      for (let j = i + 1; j < moving.length; j++) {
        const b = moving[j];
        if (b.pocketed) continue;
        resolveBallCollision(a, b);
      }
    }
  }

  function handleRails(b) {
    const rX = b.r * (Math.min(table.w, table.h) / table.w);
    const rY = b.r * (Math.min(table.w, table.h) / table.h);
    const cushion = 0.003;

    if (b.x - rX < cushion) {
      b.x = rX + cushion;
      b.vx = Math.abs(b.vx) * .94;
      playRail();
    } else if (b.x + rX > 1 - cushion) {
      b.x = 1 - rX - cushion;
      b.vx = -Math.abs(b.vx) * .94;
      playRail();
    }

    if (b.y - rY < cushion) {
      b.y = rY + cushion;
      b.vy = Math.abs(b.vy) * .94;
      playRail();
    } else if (b.y + rY > 1 - cushion) {
      b.y = 1 - rY - cushion;
      b.vy = -Math.abs(b.vy) * .94;
      playRail();
    }
  }

  function handlePocket(b) {
    const pr = table.pocketR / Math.min(table.w, table.h);
    for (const p of pocketPositionsNorm()) {
      // compensate x scale
      const dx = (b.x - p.x) * (table.w / table.h);
      const dy = b.y - p.y;
      if (Math.hypot(dx, dy) < pr * 1.18) {
        b.pocketed = true;
        b.vx = 0;
        b.vy = 0;
        if (b.num === 0) {
          scratchThisShot = true;
        } else {
          pocketedThisShot.push(b.num);
        }
        playPocket();
        return;
      }
    }
  }

  function resolveBallCollision(a, b) {
    const sx = table.w / table.h;
    const ax = a.x * sx;
    const bx = b.x * sx;
    const ay = a.y;
    const by = b.y;
    const dx = bx - ax;
    const dy = by - ay;
    const dist = Math.hypot(dx, dy);
    const rr = a.r + b.r;

    if (dist <= 0 || dist >= rr) return;

    const nx = dx / dist;
    const ny = dy / dist;

    // First contact tracking.
    if (firstHit === null) {
      if (a.num === 0 && b.num !== 0) firstHit = b.num;
      else if (b.num === 0 && a.num !== 0) firstHit = a.num;
    }

    const overlap = rr - dist;
    const sepX = nx * overlap * .5;
    const sepY = ny * overlap * .5;

    a.x -= sepX / sx;
    a.y -= sepY;
    b.x += sepX / sx;
    b.y += sepY;

    const avx = a.vx * sx;
    const bvx = b.vx * sx;
    const rel = (avx - bvx) * nx + (a.vy - b.vy) * ny;
    if (rel <= 0) return;

    // Restituição maior para uma quebra de rack mais viva.
    // 0.985 aqui equivale aproximadamente a e=0.97 em massas iguais:
    // a energia passa melhor da branca para o conjunto sem ficar elástica demais.
    const impulse = rel * .985;
    a.vx -= (impulse * nx) / sx;
    a.vy -= impulse * ny;
    b.vx += (impulse * nx) / sx;
    b.vy += impulse * ny;

    playCollision(Math.min(1, rel));
  }

  let lastTime = performance.now();
  function loop(now) {
    const frameDt = Math.min(.04, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;

    if (gameScreen.classList.contains("active") && balls.length) {
      physicsAccumulator = Math.min(.08, physicsAccumulator + frameDt);
      let steps = 0;
      while (physicsAccumulator >= PHYSICS_STEP && steps < 10) {
        /*
          Em tacadas muito rápidas fazemos substeps somente quando necessário.
          O jogo continua leve em repouso/tacadas normais, mas uma quebra a
          100% recebe resolução física extra para evitar tunneling e melhorar
          a transferência de energia no rack.
        */
        const maxVisualSpeed = balls.reduce(
          (maxSpeed, ball) => ball.pocketed ? maxSpeed : Math.max(maxSpeed, getVisualSpeed(ball)),
          0
        );

        const collisionSubsteps =
          maxVisualSpeed > 2.10 ? 3 :
          maxVisualSpeed > 1.20 ? 2 : 1;

        const subDt = PHYSICS_STEP / collisionSubsteps;
        for (let sub = 0; sub < collisionSubsteps; sub++) {
          updatePhysics(subDt);
        }

        physicsAccumulator -= PHYSICS_STEP;
        steps++;
      }
      draw();

      if (shotInProgress && !isAnyBallMoving()) {
        shotInProgress = false;
        physicsAccumulator = 0;
        settleAfterShot();
      }
    } else {
      physicsAccumulator = 0;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  function settleAfterShot() {
    const shooter = turn;
    const opponent = shooter === "player" ? "cpu" : "player";

    /*
      REGRA V8 — a situação da mesa precisa ser avaliada como ela estava
      NO INÍCIO da tacada.

      Na versão anterior, o grupo (lisas/listradas) podia ser atribuído após
      uma bola cair e, logo em seguida, a mesma tacada era reavaliada usando
      esse grupo recém-criado. Isso podia transformar uma tacada válida em
      falta e passar a vez para a CPU mesmo depois de encaçapar.
    */
    const groupAtShotStart = groups[shooter];

    // Quantas bolas do grupo do jogador existiam antes desta tacada?
    // remaining() já vê a mesa depois das bolas terem caído, então somamos
    // de volta as bolas do próprio grupo encaçapadas nesta jogada.
    const ownBallsPocketedThisShot = groupAtShotStart
      ? pocketedThisShot.filter(n => groupOfBall(n) === groupAtShotStart).length
      : 0;

    const remainingAtShotStart = groupAtShotStart
      ? remaining(groupAtShotStart) + ownBallsPocketedThisShot
      : null;

    const tableWasOpen = !groups.player && !groups.cpu;

    // Em mesa aberta, a primeira bola válida encaçapada define os grupos.
    if (tableWasOpen && !scratchThisShot) {
      const firstGroupBall = pocketedThisShot.find(n => {
        const g = groupOfBall(n);
        return g === "solids" || g === "stripes";
      });

      if (firstGroupBall) {
        const g = groupOfBall(firstGroupBall);
        groups[shooter] = g;
        groups[opponent] = otherGroup(g);
      }
    }

    const eightPocketed = pocketedThisShot.includes(8);
    if (eightPocketed) {
      /*
        A bola 8 só é legal se o jogador JÁ tinha limpado seu grupo antes
        desta tacada. Encaçapar a última bola do grupo e a 8 na mesma tacada
        não transforma a 8 em uma finalização legal.
      */
      const wasAlreadyOnEight = !!groupAtShotStart && remainingAtShotStart === 0;
      const legalEight = wasAlreadyOnEight && !scratchThisShot;

      endGame(
        legalEight ? shooter : opponent,
        legalEight ? "The 8-ball was pocketed legally." : "The 8-ball was pocketed too early."
      );
      return;
    }

    // Regras de primeira colisão avaliadas com o estado anterior à tacada.
    let foul = scratchThisShot || firstHit === null;

    if (!foul) {
      const firstHitGroup = groupOfBall(firstHit);

      if (!groupAtShotStart) {
        // Mesa aberta: pode começar por lisa ou listrada, mas não pela bola 8.
        foul = firstHitGroup === "eight" || firstHitGroup === "cue";
      } else if (remainingAtShotStart === 0) {
        // O grupo já estava limpo: agora a primeira bola deve ser a 8.
        foul = firstHitGroup !== "eight";
      } else {
        // Durante a limpeza, a primeira bola deve pertencer ao próprio grupo.
        foul = firstHitGroup !== groupAtShotStart;
      }
    }

    /*
      O jogador mantém a vez sempre que:
      - não houve falta; e
      - uma bola válida do seu objetivo atual foi encaçapada.

      Portanto é possível limpar a mesa inteira em sequência sem a CPU jogar,
      desde que todas as tacadas sejam válidas e encaçapem pelo menos uma bola.
    */
    let scoredLegalBall = false;

    if (!foul) {
      if (!groupAtShotStart) {
        scoredLegalBall = pocketedThisShot.some(n => {
          const g = groupOfBall(n);
          return g === "solids" || g === "stripes";
        });
      } else if (remainingAtShotStart > 0) {
        scoredLegalBall = pocketedThisShot.some(
          n => groupOfBall(n) === groupAtShotStart
        );
      }
    }

    if (scratchThisShot) respotCueBall();

    if (foul) {
      turn = opponent;
      updateHUD(
        shooter === "player"
          ? "Foul. The CPU takes the turn."
          : "The CPU fouled. Your turn."
      );
    } else if (scoredLegalBall) {
      // NÃO muda turn: quem encaçapou legalmente continua jogando.
      updateHUD(
        shooter === "player"
          ? "Pocketed! You keep your turn."
          : "The CPU pocketed a ball and keeps its turn."
      );
    } else {
      // Só passa a vez quando não houve bola válida encaçapada.
      turn = opponent;
      updateHUD(
        shooter === "player"
          ? "No valid ball pocketed. CPU turn."
          : "The CPU missed. Your turn."
      );
    }

    if (turn === "cpu" && !gameOver) {
      scheduleCpuTurn();
    } else {
      cpuThinking.classList.add("hidden");
      resetCueGesture();
    }
  }

  function respotCueBall() {
    const cue = getCueBall();
    cue.pocketed = false;
    cue.x = .25;
    cue.y = .5;
    cue.vx = 0;
    cue.vy = 0;

    // Find a free nearby location if center is occupied.
    for (let step = 0; step < 24; step++) {
      const testY = .5 + ((step % 2 ? -1 : 1) * Math.ceil(step / 2) * .04);
      cue.y = Math.min(.9, Math.max(.1, testY));
      const clear = balls.every(b => b === cue || b.pocketed || distanceNorm(cue, b) > cue.r + b.r + .01);
      if (clear) break;
    }
  }

  function distanceNorm(a, b) {
    const sx = table.w / table.h;
    return Math.hypot((a.x - b.x) * sx, a.y - b.y);
  }

  function endGame(winner, reason) {
    gameOver = true;
    clearTimeout(cpuTimer);
    cpuThinking.classList.add("hidden");

    const playerWon = winner === "player";
    if (playerWon && currentDifficulty !== "hardcore") {
      progress[currentDifficulty] = true;
      saveProgress();
    }

    let extra = "";
    if (playerWon && progress.hardcoreUnlocked && currentDifficulty !== "hardcore") {
      extra = " HARDCORE mode is now unlocked.";
    } else if (playerWon && currentDifficulty === "hardcore") {
      extra = " You beat the ultimate challenge.";
    }

    playSound(playerWon ? "win" : "lose", 1);

    showModal(
      playerWon ? "🏆" : "🎱",
      playerWon ? "Victory!" : "Defeat",
      `${reason}${extra}`,
      [
        { label: "Play again", primary: true, action: () => { hideModal(); startGame(currentDifficulty); } },
        { label: "Back to menu", action: () => { hideModal(); showMenu(); } }
      ]
    );
  }

  function scheduleCpuTurn() {
    if (gameOver) return;
    resetCueGesture();
    cpuThinking.classList.remove("hidden");

    clearTimeout(cpuTimer);
    cpuTimer = setTimeout(() => {
      cpuThinking.classList.add("hidden");
      const shot = chooseCpuShot();
      shoot(shot.angle, shot.power, "cpu");
    }, LEVELS[currentDifficulty].think);
  }

  function chooseCpuShot() {
    const cfg = LEVELS[currentDifficulty];
    const cue = getCueBall();
    const targets = legalTargets("cpu");
    const pockets = pocketPositionsNorm();

    if (!targets.length) {
      return {
        angle: Math.random() * Math.PI * 2,
        power: .55
      };
    }

    const candidates = [];
    for (const target of targets) {
      for (const pocket of pockets) {
        const candidate = evaluateDirectShot(cue, target, pocket);
        if (candidate) candidates.push(candidate);
      }
    }

    candidates.sort((a, b) => b.score - a.score);

    let chosen;
    if (candidates.length && Math.random() < cfg.smartChance) {
      const pickWindow = currentDifficulty === "hardcore" ? 1 :
                         currentDifficulty === "hard" ? Math.min(2, candidates.length) :
                         currentDifficulty === "medium" ? Math.min(4, candidates.length) :
                         Math.min(8, candidates.length);
      chosen = candidates[Math.floor(Math.random() * pickWindow)];
    } else {
      const target = targets[Math.floor(Math.random() * targets.length)];
      chosen = {
        angle: Math.atan2(target.y - cue.y, (target.x - cue.x) * (table.w / table.h)),
        power: .48 + Math.random() * .25,
        score: 0
      };
    }

    const angleNoise = (Math.random() * 2 - 1) * cfg.aimError;
    const powerNoise = (Math.random() * 2 - 1) * cfg.powerError;

    let angle = chosen.angle + angleNoise;
    let power = Math.min(.98, Math.max(.20, chosen.power + powerNoise));

    // Hardcore gets a small deterministic compensation toward contact.
    if (currentDifficulty === "hardcore" && chosen.target) {
      const correction = directContactAngle(cue, chosen.target, chosen.pocket);
      if (Number.isFinite(correction)) angle = correction + angleNoise;
    }

    return { angle, power };
  }

  function legalTargets(side) {
    const group = groups[side];
    if (!group) {
      return balls.filter(b => !b.pocketed && b.num !== 0 && b.num !== 8);
    }
    if (remaining(group) === 0) {
      const eight = getBall(8);
      return eight && !eight.pocketed ? [eight] : [];
    }
    return balls.filter(b => !b.pocketed && groupOfBall(b.num) === group);
  }

  function evaluateDirectShot(cue, target, pocket) {
    const sx = table.w / table.h;
    const tx = target.x * sx;
    const ty = target.y;
    const px = pocket.x * sx;
    const py = pocket.y;
    const cx = cue.x * sx;
    const cy = cue.y;

    const vpx = px - tx;
    const vpy = py - ty;
    const pocketDist = Math.hypot(vpx, vpy);
    if (pocketDist < .001) return null;

    const ux = vpx / pocketDist;
    const uy = vpy / pocketDist;
    const contactX = tx - ux * (target.r + cue.r) * 1.01;
    const contactY = ty - uy * (target.r + cue.r) * 1.01;

    const toContactX = contactX - cx;
    const toContactY = contactY - cy;
    const cueDist = Math.hypot(toContactX, toContactY);
    if (cueDist < .01) return null;

    // Avoid shots where another ball blocks cue -> contact.
    if (pathBlocked(
      {x: cx, y: cy},
      {x: contactX, y: contactY},
      cue.r * .92,
      [cue.num, target.num]
    )) return null;

    // Avoid target -> pocket blockage.
    if (pathBlocked(
      {x: tx, y: ty},
      {x: px, y: py},
      target.r * .75,
      [cue.num, target.num]
    )) return null;

    // Pocket approach angle quality.
    const pocketAngle = Math.abs(Math.atan2(vpy, vpx));
    const distScore = 1 / (0.18 + cueDist + pocketDist * .65);
    const centerBias = 1 - Math.min(.75, Math.abs(target.y - .5) * .45);
    const score = distScore * centerBias + Math.random() * .025;

    const power = Math.min(.88, Math.max(.30, .28 + cueDist * .72 + pocketDist * .38));
    return {
      angle: Math.atan2(toContactY, toContactX),
      power,
      score,
      target,
      pocket
    };
  }

  function directContactAngle(cue, target, pocket) {
    const sx = table.w / table.h;
    const tx = target.x * sx;
    const ty = target.y;
    const px = pocket.x * sx;
    const py = pocket.y;
    const cx = cue.x * sx;
    const cy = cue.y;

    const dx = px - tx;
    const dy = py - ty;
    const len = Math.hypot(dx, dy);
    if (!len) return NaN;

    const ux = dx / len;
    const uy = dy / len;
    const contactX = tx - ux * (target.r + cue.r) * 1.01;
    const contactY = ty - uy * (target.r + cue.r) * 1.01;
    return Math.atan2(contactY - cy, contactX - cx);
  }

  function pathBlocked(start, end, radius, ignoreNums) {
    const sx = table.w / table.h;
    const vx = end.x - start.x;
    const vy = end.y - start.y;
    const len2 = vx * vx + vy * vy;
    if (len2 <= 0) return false;

    for (const b of balls) {
      if (b.pocketed || ignoreNums.includes(b.num)) continue;
      const bx = b.x * sx;
      const by = b.y;
      const t = Math.max(0, Math.min(1, ((bx - start.x) * vx + (by - start.y) * vy) / len2));
      const qx = start.x + vx * t;
      const qy = start.y + vy * t;
      const dist = Math.hypot(bx - qx, by - qy);
      if (dist < radius + b.r * .88) return true;
    }
    return false;
  }

  function showModal(icon, title, text, actions) {
    modalIcon.textContent = icon;
    modalTitle.textContent = title;
    modalText.textContent = text;
    modalActions.innerHTML = "";

    actions.forEach(item => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = item.label;
      if (item.primary) btn.classList.add("primary");
      btn.addEventListener("click", item.action);
      modalActions.appendChild(btn);
    });

    modalBackdrop.classList.remove("hidden");
  }

  function hideModal() {
    modalBackdrop.classList.add("hidden");
  }

  helpBtn.addEventListener("click", () => {
    showModal(
      "🎱",
      "How to play",
      "Move the mouse or touch the table to aim. Pull the cue backwards and release to shoot. The first valid ball pocketed assigns solids or stripes. Clear your group, then pocket the 8-ball. Pocketing the cue ball is a foul.",
      [{ label: "Play", primary: true, action: hideModal }]
    );
  });

  newGameBtn.addEventListener("click", () => {
    showModal(
      "↻",
      "Restart match?",
      "The table will be reset and re-racked.",
      [
        { label: "Restart", primary: true, action: () => { hideModal(); startGame(currentDifficulty); } },
        { label: "Cancel", action: hideModal }
      ]
    );
  });

  menuBtn.addEventListener("click", () => {
    showModal(
      "☰",
      "Return to menu?",
      "Progress on completed difficulties is saved in this browser.",
      [
        { label: "Return", primary: true, action: () => { hideModal(); showMenu(); } },
        { label: "Continue", action: hideModal }
      ]
    );
  });

  resetProgressBtn.addEventListener("click", () => {
    showModal(
      "🧹",
      "Reset progress?",
      "Your Easy, Medium and Hard wins will be erased and HARDCORE will be locked again.",
      [
        {
          label: "Reset",
          primary: true,
          action: () => {
            progress = { easy: false, medium: false, hard: false, hardcoreUnlocked: false };
            localStorage.removeItem(STORAGE_KEY);
            updateProgressUI();
            hideModal();
          }
        },
        { label: "Cancel", action: hideModal }
      ]
    );
  });

  function buildSoundPools() {
    if (Object.keys(soundPools).length) return;

    for (const [name, cfg] of Object.entries(SOUND_CONFIG)) {
      soundPools[name] = Array.from({ length: cfg.pool }, () => {
        const audio = new Audio(cfg.src);
        audio.preload = "auto";
        audio.volume = cfg.volume;
        audio.setAttribute("playsinline", "");
        return audio;
      });
      soundPoolCursor[name] = 0;
    }
  }

  async function unlockAudio() {
    if (!soundEnabled) return false;
    if (audioUnlocked) return true;
    if (audioUnlockPromise) return audioUnlockPromise;

    buildSoundPools();
    audioUnlockPromise = (async () => {
      try {
        // Browsers, especially mobile browsers, require the first playback to
        // happen as a direct result of a click/touch. This tiny UI sound unlocks
        // the audio session so collisions and CPU shots can play afterwards.
        const audio = soundPools.ui[0];
        const previousVolume = audio.volume;
        audio.volume = 0.015;
        audio.currentTime = 0;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        audio.volume = previousVolume;
        audioUnlocked = true;
        return true;
      } catch (err) {
        audioUnlocked = false;
        return false;
      } finally {
        audioUnlockPromise = null;
      }
    })();

    return audioUnlockPromise;
  }

  function playSound(name, volumeScale = 1, playbackRate = 1) {
    if (!soundEnabled || !SOUND_CONFIG[name]) return;

    if (!audioUnlocked) {
      unlockAudio().then(ok => {
        if (ok) playSound(name, volumeScale, playbackRate);
      });
      return;
    }

    buildSoundPools();
    const pool = soundPools[name];
    let index = pool.findIndex(audio => audio.paused || audio.ended);
    if (index < 0) {
      index = soundPoolCursor[name] % pool.length;
      soundPoolCursor[name] = (soundPoolCursor[name] + 1) % pool.length;
    }

    const audio = pool[index];
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = Math.max(0, Math.min(1, SOUND_CONFIG[name].volume * volumeScale));
      audio.playbackRate = Math.max(0.65, Math.min(1.6, playbackRate));
      const result = audio.play();
      if (result && typeof result.catch === "function") {
        result.catch(() => { audioUnlocked = false; });
      }
    } catch {
      audioUnlocked = false;
    }
  }

  difficultyGrid.addEventListener("click", e => {
    const btn = e.target.closest("[data-level]");
    if (!btn) return;

    const level = btn.dataset.level;
    if (level === "hardcore" && !progress.hardcoreUnlocked) {
      startGame(level);
      return;
    }

    unlockAudio().then(ok => { if (ok) playSound("ui", 0.85); });

    // A tentativa é disparada diretamente pelo clique/toque para cumprir
    // a exigência de "user gesture" dos navegadores mobile.
    if (isTouchMobileLayout()) {
      requestLandscapeExperience();
    }

    startGame(level);
  });

  landscapeBtn.addEventListener("click", async () => {
    unlockAudio();
    await requestLandscapeExperience();
  });

  soundBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundBtn.textContent = soundEnabled ? "🔊" : "🔇";
    soundBtn.title = soundEnabled ? "Som ligado" : "Som desligado";
    soundBtn.setAttribute("aria-label", soundEnabled ? "Desativar sons" : "Ativar sons");

    if (soundEnabled) {
      unlockAudio().then(ok => { if (ok) playSound("ui", 1); });
    } else {
      for (const pool of Object.values(soundPools)) {
        for (const audio of pool) {
          audio.pause();
          audio.currentTime = 0;
        }
      }
    }
  });

  // Unlock as early as possible on the first real user interaction. The capture
  // phase makes this happen before the cue gesture itself is processed.
  document.addEventListener("pointerdown", () => {
    if (soundEnabled && !audioUnlocked) unlockAudio();
  }, { capture: true });

  document.addEventListener("keydown", () => {
    if (soundEnabled && !audioUnlocked) unlockAudio();
  }, { capture: true });

  let lastCollisionSound = 0;
  function playCollision(force) {
    const now = performance.now();
    if (now - lastCollisionSound < 24) return;
    lastCollisionSound = now;
    const strength = Math.max(0.18, Math.min(1, force));
    playSound("collision", 0.58 + strength * 0.72, 0.92 + strength * 0.18);
  }

  let lastRailSound = 0;
  function playRail() {
    const now = performance.now();
    if (now - lastRailSound < 34) return;
    lastRailSound = now;
    playSound("rail", 0.95, 0.96 + Math.random() * 0.08);
  }

  function playPocket() {
    playSound("pocket", 1, 0.96 + Math.random() * 0.05);
  }

  // Prevent modal click-through.
  modalBackdrop.addEventListener("pointerdown", e => {
    if (e.target === modalBackdrop) hideModal();
  });

  syncVisualViewport();
  updateProgressUI();
  updateOrientationGate();
  resizeCanvas();
})();
