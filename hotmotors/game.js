// HotMotors - 2D top-down racing game (Phaser 3)
// Two cars race on a winding mountain road. First to complete 3 laps wins.

const TOTAL_LAPS = 3;
const WORLD_W = 1600;
const WORLD_H = 900;
const ROAD_WIDTH = 95;

// Centerline waypoints (closed loop), inspired by the hand-drawn mountain road.
// Going clockwise: starts at bottom-left, runs along the bottom with wiggles,
// up the right side, across the top with wiggles, and down the left side.
const TRACK_WAYPOINTS = [
  [220, 720], [340, 745], [460, 715], [580, 745], [700, 710],
  [820, 745], [940, 715], [1060, 745], [1180, 715], [1300, 685],
  [1400, 615], [1455, 510], [1455, 395], [1395, 285], [1295, 215],
  [1175, 185], [1055, 220], [935, 195], [815, 235], [695, 195],
  [575, 235], [455, 195], [340, 225], [240, 285], [165, 380],
  [135, 495], [140, 605], [180, 690]
];

// Smooth a closed polyline using Catmull-Rom interpolation.
function smoothClosed(points, samplesPerSeg) {
  const n = points.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    for (let j = 0; j < samplesPerSeg; j++) {
      const t = j / samplesPerSeg;
      const t2 = t * t;
      const t3 = t2 * t;
      const x = 0.5 * ((2 * p1[0]) +
        (-p0[0] + p2[0]) * t +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y = 0.5 * ((2 * p1[1]) +
        (-p0[1] + p2[1]) * t +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      out.push([x, y]);
    }
  }
  return out;
}

// Distance from point (px,py) to the polyline (closed).
function nearestOnPath(px, py, path) {
  let bestD2 = Infinity;
  let bestIdx = 0;
  let bestT = 0;
  let bestX = 0, bestY = 0;
  const n = path.length;
  for (let i = 0; i < n; i++) {
    const a = path[i];
    const b = path[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-6) continue;
    let t = ((px - a[0]) * dx + (py - a[1]) * dy) / len2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const cx = a[0] + dx * t, cy = a[1] + dy * t;
    const d2 = (px - cx) * (px - cx) + (py - cy) * (py - cy);
    if (d2 < bestD2) {
      bestD2 = d2;
      bestIdx = i;
      bestT = t;
      bestX = cx;
      bestY = cy;
    }
  }
  return { dist: Math.sqrt(bestD2), idx: bestIdx, t: bestT, x: bestX, y: bestY };
}

// =====================================================================
// Title Screen logic (DOM)
// =====================================================================
let selectedMode = 'vs-ai';
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedMode = btn.dataset.mode;
  });
});

// Detect touch device — auto-pick vs-ai mode and show touch controls.
const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouchDevice) {
  // Hide the 2-player mode button (hard to do on touch)
  const twoPlayerBtn = document.querySelector('[data-mode="vs-human"]');
  if (twoPlayerBtn) twoPlayerBtn.style.display = 'none';
}

document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('title-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'flex';
  if (isTouchDevice) {
    document.getElementById('touch-controls').classList.add('show');
  }
  if (window.phaserGame) {
    window.phaserGame.scene.getScene('race').restartRace();
  } else {
    startGame();
  }
});

document.getElementById('restart-btn').addEventListener('click', () => {
  document.getElementById('win-screen').classList.remove('show');
  if (window.phaserGame) {
    window.phaserGame.scene.getScene('race').restartRace();
  }
});

document.getElementById('menu-btn').addEventListener('click', () => {
  document.getElementById('win-screen').classList.remove('show');
  document.getElementById('hud').style.display = 'none';
  document.getElementById('touch-controls').classList.remove('show');
  document.getElementById('title-screen').style.display = '';
});

// =====================================================================
// Phaser RaceScene
// =====================================================================
class RaceScene extends Phaser.Scene {
  constructor() {
    super('race');
  }

  create() {
    // Dense interpolated centerline.
    this.centerline = smoothClosed(TRACK_WAYPOINTS, 10);

    // Camera / world bounds
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // Background grass + terrain texture
    this.drawTerrain();

    // Draw track
    this.drawTrack();

    // Draw start/finish line + decorations
    this.drawStartLine();
    this.drawDecorations();

    // Cars
    this.spawnCars();

    // HUD
    this.redLapEl = document.getElementById('red-lap');
    this.blueLapEl = document.getElementById('blue-lap');

    // Controls
    this.setupControls();

    // Race state
    this.raceStarted = false;
    this.raceFinished = false;

    // Countdown
    this.runCountdown();

    // Resize handling
    this.scale.on('resize', this.handleResize, this);
    this.handleResize();
  }

  handleResize() {
    // Fit world into viewport with zoom.
    const w = this.scale.width;
    const h = this.scale.height;
    const zoom = Math.min(w / WORLD_W, h / WORLD_H);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(WORLD_W / 2, WORLD_H / 2);
  }

  drawTerrain() {
    // Mountain-themed background: dark green base with darker patches.
    const bg = this.add.graphics();
    bg.fillStyle(0x3a6b3a, 1);
    bg.fillRect(0, 0, WORLD_W, WORLD_H);
    // Random rocky / shaded patches
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * WORLD_W;
      const y = Math.random() * WORLD_H;
      const r = 15 + Math.random() * 50;
      const c = [0x2e5c2e, 0x4a7b4a, 0x335c33, 0x6b6b3a][Math.floor(Math.random() * 4)];
      bg.fillStyle(c, 0.5);
      bg.fillCircle(x, y, r);
    }
    // A handful of "mountain rocks" - grey blobs
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * WORLD_W;
      const y = Math.random() * WORLD_H;
      const r = 8 + Math.random() * 22;
      bg.fillStyle(0x6b6b6b, 0.7);
      bg.fillCircle(x, y, r);
      bg.fillStyle(0x4a4a4a, 0.5);
      bg.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.6);
    }
  }

  drawTrack() {
    const g = this.add.graphics();

    // Outer dark border (curb shadow)
    g.lineStyle(ROAD_WIDTH + 10, 0x1a1a1a, 1);
    this.tracePath(g, this.centerline);

    // Curb stripe (red-white pattern)
    this.drawCurbs(g);

    // Asphalt
    g.lineStyle(ROAD_WIDTH, 0x4a4a4a, 1);
    this.tracePath(g, this.centerline);

    // Dashed center line
    this.drawDashedCenter();
  }

  tracePath(g, points) {
    g.beginPath();
    g.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i][0], points[i][1]);
    }
    g.closePath();
    g.strokePath();
  }

  drawCurbs(g) {
    // Alternating red/white curb just inside the dark border
    const segLen = 12;
    let useRed = true;
    g.lineStyle(ROAD_WIDTH + 6, 0xffffff, 1);
    for (let i = 0; i < this.centerline.length; i++) {
      const a = this.centerline[i];
      const b = this.centerline[(i + 1) % this.centerline.length];
      g.lineStyle(ROAD_WIDTH + 6, useRed ? 0xdd3333 : 0xffffff, 1);
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.strokePath();
      useRed = !useRed;
    }
  }

  drawDashedCenter() {
    const g = this.add.graphics();
    g.lineStyle(2.5, 0xffee44, 0.85);
    const dashOn = 14;
    const dashOff = 16;
    const period = dashOn + dashOff;

    // Accumulate distance along path; draw dashes.
    let acc = 0;
    let drawing = true;
    for (let i = 0; i < this.centerline.length; i++) {
      const a = this.centerline[i];
      const b = this.centerline[(i + 1) % this.centerline.length];
      const segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let cursor = 0;
      while (cursor < segLen) {
        const inDash = ((acc + cursor) % period) < dashOn;
        const remainingInPeriod = inDash
          ? dashOn - ((acc + cursor) % period)
          : period - ((acc + cursor) % period);
        const step = Math.min(remainingInPeriod, segLen - cursor);
        if (inDash) {
          const t0 = cursor / segLen;
          const t1 = (cursor + step) / segLen;
          const x0 = a[0] + (b[0] - a[0]) * t0;
          const y0 = a[1] + (b[1] - a[1]) * t0;
          const x1 = a[0] + (b[0] - a[0]) * t1;
          const y1 = a[1] + (b[1] - a[1]) * t1;
          g.beginPath();
          g.moveTo(x0, y0);
          g.lineTo(x1, y1);
          g.strokePath();
        }
        cursor += step;
      }
      acc += segLen;
    }
  }

  drawStartLine() {
    // Use the first centerline segment for orientation.
    const a = this.centerline[0];
    const b = this.centerline[1];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const nx = -dy / len, ny = dx / len;  // perpendicular
    const half = ROAD_WIDTH / 2;
    const cx = a[0], cy = a[1];

    // Black-white checkered start line
    const g = this.add.graphics();
    const numTiles = 8;
    const tileW = ROAD_WIDTH / numTiles;
    for (let i = 0; i < numTiles; i++) {
      const t0 = -half + i * tileW;
      const t1 = t0 + tileW;
      const color = (i % 2 === 0) ? 0xffffff : 0x111111;
      g.fillStyle(color, 1);
      // Quad for this tile
      const tangentLen = 14;
      const p1x = cx + nx * t0, p1y = cy + ny * t0;
      const p2x = cx + nx * t1, p2y = cy + ny * t1;
      const tx = dx / len, ty = dy / len;
      const p3x = p2x + tx * tangentLen, p3y = p2y + ty * tangentLen;
      const p4x = p1x + tx * tangentLen, p4y = p1y + ty * tangentLen;
      g.fillPoints([
        { x: p1x, y: p1y },
        { x: p2x, y: p2y },
        { x: p3x, y: p3y },
        { x: p4x, y: p4y }
      ], true);
    }

    this.startLineCenter = { x: cx, y: cy };
    this.startLineTangent = { x: dx / len, y: dy / len };

    // Track centroid for lap-angle calculations.
    let sx = 0, sy = 0;
    for (const p of this.centerline) { sx += p[0]; sy += p[1]; }
    this.trackCentroid = {
      x: sx / this.centerline.length,
      y: sy / this.centerline.length
    };
  }

  drawDecorations() {
    // Trees / rocks placed off the road for atmosphere.
    const g = this.add.graphics();
    let placed = 0;
    let attempts = 0;
    while (placed < 50 && attempts < 600) {
      attempts++;
      const x = 30 + Math.random() * (WORLD_W - 60);
      const y = 30 + Math.random() * (WORLD_H - 60);
      const np = nearestOnPath(x, y, this.centerline);
      if (np.dist < ROAD_WIDTH / 2 + 30) continue;  // too close to road
      // Tree (pine)
      const r = 8 + Math.random() * 5;
      g.fillStyle(0x222222, 0.35);
      g.fillCircle(x + 3, y + 3, r);  // shadow
      g.fillStyle(0x1f5e2a, 1);
      g.fillCircle(x, y, r);
      g.fillStyle(0x2d7a3a, 1);
      g.fillCircle(x - 1.5, y - 1.5, r * 0.65);
      placed++;
    }
  }

  spawnCars() {
    const a = this.centerline[0];
    const b = this.centerline[1];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const tx = dx / len, ty = dy / len;
    const nx = -ty, ny = tx;  // perpendicular (towards "inside" of track)

    const baseAngle = Math.atan2(dy, dx);

    // Red on the left side, blue on the right (relative to track direction).
    const offset = ROAD_WIDTH / 4;
    const back = 25;  // start slightly behind the start line
    this.redCar = new Car(this,
      a[0] + nx * offset - tx * back,
      a[1] + ny * offset - ty * back,
      baseAngle, 0xff2222, 'red');
    this.blueCar = new Car(this,
      a[0] - nx * offset - tx * back,
      a[1] - ny * offset - ty * back,
      baseAngle, 0x2266ff, 'blue');

    // Track which segments cars have visited (for valid lap detection).
    this.redCar.angleAcc = 0;
    this.blueCar.angleAcc = 0;
    this.redCar.lastAngle = Math.atan2(
      this.redCar.y - this.trackCentroid.y,
      this.redCar.x - this.trackCentroid.x);
    this.blueCar.lastAngle = Math.atan2(
      this.blueCar.y - this.trackCentroid.y,
      this.blueCar.x - this.trackCentroid.x);
    this.redCar.lap = 1;
    this.blueCar.lap = 1;
  }

  setupControls() {
    this.keys = this.input.keyboard.addKeys({
      // Red: WASD
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      // Blue: arrows
      UP: Phaser.Input.Keyboard.KeyCodes.UP,
      DOWN: Phaser.Input.Keyboard.KeyCodes.DOWN,
      LEFT: Phaser.Input.Keyboard.KeyCodes.LEFT,
      RIGHT: Phaser.Input.Keyboard.KeyCodes.RIGHT
    });

    // Touch controls
    this.touch = { left: false, right: false, brake: false };
    if (isTouchDevice) {
      const touchLeft = document.getElementById('touch-left');
      const touchRight = document.getElementById('touch-right');
      const touchBrake = document.getElementById('touch-brake');
      const setTouchLeft = (v) => () => { this.touch.left = v; };
      const setTouchRight = (v) => () => { this.touch.right = v; };
      const setBrake = (v) => (e) => { e.preventDefault(); this.touch.brake = v; };
      touchLeft.addEventListener('touchstart', setTouchLeft(true), { passive: true });
      touchLeft.addEventListener('touchend', setTouchLeft(false), { passive: true });
      touchLeft.addEventListener('touchcancel', setTouchLeft(false), { passive: true });
      touchRight.addEventListener('touchstart', setTouchRight(true), { passive: true });
      touchRight.addEventListener('touchend', setTouchRight(false), { passive: true });
      touchRight.addEventListener('touchcancel', setTouchRight(false), { passive: true });
      touchBrake.addEventListener('touchstart', setBrake(true));
      touchBrake.addEventListener('touchend', setBrake(false));
      touchBrake.addEventListener('touchcancel', setBrake(false));
    }
  }

  runCountdown() {
    const el = document.getElementById('countdown');
    el.style.display = 'block';
    el.style.transition = 'transform 0.35s ease-out';
    const steps = ['3', '2', '1', '¡YA!'];
    let i = 0;
    const tick = () => {
      el.textContent = steps[i];
      el.style.transform = 'translate(-50%, -50%) scale(1.5)';
      this.time.delayedCall(50, () => {
        el.style.transform = 'translate(-50%, -50%) scale(1)';
      });
      i++;
      if (i < steps.length) {
        this.time.delayedCall(700, tick);
      } else {
        this.time.delayedCall(500, () => {
          el.style.display = 'none';
          this.raceStarted = true;
        });
      }
    };
    tick();
  }

  getRedInput() {
    return {
      up: this.keys.W.isDown,
      down: this.keys.S.isDown,
      left: this.keys.A.isDown,
      right: this.keys.D.isDown
    };
  }

  getBlueInput() {
    if (selectedMode === 'vs-ai') {
      return this.computeAIInput(this.blueCar);
    }
    return {
      up: this.keys.UP.isDown,
      down: this.keys.DOWN.isDown,
      left: this.keys.LEFT.isDown,
      right: this.keys.RIGHT.isDown
    };
  }

  // For touch device, the player controls the red car; gas is always on
  // (unless braking), and steering is via left/right halves of screen.
  getTouchInput() {
    return {
      up: !this.touch.brake,
      down: this.touch.brake,
      left: this.touch.left,
      right: this.touch.right
    };
  }

  computeAIInput(car) {
    const np = nearestOnPath(car.x, car.y, this.centerline);
    const lookahead = 18;  // look ~18 dense points ahead
    const targetIdx = (np.idx + lookahead) % this.centerline.length;
    const targetFarIdx = (np.idx + lookahead + 8) % this.centerline.length;
    const target = this.centerline[targetIdx];
    const targetFar = this.centerline[targetFarIdx];

    const dx = target[0] - car.x;
    const dy = target[1] - car.y;
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - car.angle;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    // Estimate upcoming curvature
    const curveDx = targetFar[0] - target[0];
    const curveDy = targetFar[1] - target[1];
    const curveAngle = Math.atan2(curveDy, curveDx);
    let curveDiff = curveAngle - targetAngle;
    while (curveDiff > Math.PI) curveDiff -= 2 * Math.PI;
    while (curveDiff < -Math.PI) curveDiff += 2 * Math.PI;

    const sharpTurnAhead = Math.abs(curveDiff) > 0.5;
    const offRoad = np.dist > ROAD_WIDTH / 2 - 5;

    const input = {
      up: true,
      down: false,
      left: diff < -0.04,
      right: diff > 0.04
    };
    if (sharpTurnAhead && car.speed > car.maxSpeed * 0.65) {
      input.up = false;
      input.down = true;
    }
    if (offRoad && car.speed > car.maxSpeed * 0.5) {
      input.up = false;
    }
    return input;
  }

  update(time, delta) {
    if (!this.raceStarted || this.raceFinished) return;
    const dt = Math.min(delta / 1000, 0.05);

    // Inputs
    let redInput, blueInput;
    if (isTouchDevice) {
      redInput = this.getTouchInput();
      blueInput = this.computeAIInput(this.blueCar);
    } else {
      redInput = this.getRedInput();
      blueInput = this.getBlueInput();
    }

    // Update cars
    const redNP = nearestOnPath(this.redCar.x, this.redCar.y, this.centerline);
    const blueNP = nearestOnPath(this.blueCar.x, this.blueCar.y, this.centerline);
    const redOnRoad = redNP.dist <= ROAD_WIDTH / 2;
    const blueOnRoad = blueNP.dist <= ROAD_WIDTH / 2;

    this.redCar.step(dt, redOnRoad, redInput);
    this.blueCar.step(dt, blueOnRoad, blueInput);

    // Car-vs-car soft collision
    this.handleCarCollision(this.redCar, this.blueCar);

    // Keep cars inside world bounds
    this.clampCar(this.redCar);
    this.clampCar(this.blueCar);

    // Lap tracking
    this.trackLap(this.redCar);
    this.trackLap(this.blueCar);

    // Update HUD
    this.redLapEl.textContent = Math.min(this.redCar.lap, TOTAL_LAPS);
    this.blueLapEl.textContent = Math.min(this.blueCar.lap, TOTAL_LAPS);

    // Check finish
    if (this.redCar.lap > TOTAL_LAPS) this.endRace('red');
    else if (this.blueCar.lap > TOTAL_LAPS) this.endRace('blue');
  }

  clampCar(car) {
    if (car.x < 10) { car.x = 10; car.speed *= 0.5; }
    if (car.x > WORLD_W - 10) { car.x = WORLD_W - 10; car.speed *= 0.5; }
    if (car.y < 10) { car.y = 10; car.speed *= 0.5; }
    if (car.y > WORLD_H - 10) { car.y = WORLD_H - 10; car.speed *= 0.5; }
  }

  handleCarCollision(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const minDist = 26;
    if (dist > 0 && dist < minDist) {
      const overlap = (minDist - dist) / 2;
      const nx = dx / dist, ny = dy / dist;
      a.x -= nx * overlap;
      a.y -= ny * overlap;
      b.x += nx * overlap;
      b.y += ny * overlap;
      // Damp speeds slightly
      a.speed *= 0.85;
      b.speed *= 0.85;
    }
  }

  trackLap(car) {
    // Track direction is clockwise in screen coords (CCW in cartesian-y-up).
    // Cars go through waypoints in order [0]->[1]->... and back to [0].
    // We measure angle from the centroid; in screen coords (y-down),
    // going clockwise around the centroid means the angle (atan2 in screen
    // coords) decreases monotonically.
    const angle = Math.atan2(
      car.y - this.trackCentroid.y,
      car.x - this.trackCentroid.x);
    let d = angle - car.lastAngle;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    car.angleAcc += d;
    car.lastAngle = angle;

    // Clockwise in screen coords yields negative accumulator.
    // 1 lap = -2π. Use lap = 1 + floor(|acc| / 2π) when going right way.
    const laps = Math.max(0, Math.floor(-car.angleAcc / (2 * Math.PI)));
    car.lap = 1 + laps;
  }

  endRace(winner) {
    this.raceFinished = true;
    const winnerText = document.getElementById('winner-text');
    const winDetail = document.getElementById('win-detail');
    if (winner === 'red') {
      winnerText.textContent = '¡ROJO GANA!';
      winnerText.className = 'red';
      winDetail.textContent = '3 vueltas completadas. ¡Reta a una revancha!';
    } else {
      winnerText.textContent = '¡AZUL GANA!';
      winnerText.className = 'blue';
      winDetail.textContent = '3 vueltas completadas. ¡Reta a una revancha!';
    }
    document.getElementById('win-screen').classList.add('show');
  }

  restartRace() {
    // Reset cars to start position and re-run countdown
    this.raceFinished = false;
    this.raceStarted = false;
    this.redCar.destroy();
    this.blueCar.destroy();
    this.spawnCars();
    this.redLapEl.textContent = '1';
    this.blueLapEl.textContent = '1';
    this.runCountdown();
  }
}

// =====================================================================
// Car class
// =====================================================================
class Car {
  constructor(scene, x, y, angle, color, name) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.color = color;
    this.name = name;
    this.speed = 0;

    // Physics constants
    this.maxSpeed = 340;
    this.acceleration = 420;
    this.brakingForce = 600;
    this.friction = 110;
    this.turnSpeed = 3.2;
    this.offRoadDrag = 2.6;        // friction multiplier off-road (keep < accel/friction)
    this.offRoadMaxFactor = 0.42;

    // Sprite
    this.container = scene.add.container(x, y);
    const w = 30, h = 18;
    const g = scene.add.graphics();
    // Shadow
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, 4);
    // Body
    g.fillStyle(this.color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 4);
    // Highlight stripe
    const lighter = Phaser.Display.Color.IntegerToColor(this.color).brighten(20);
    g.fillStyle(Phaser.Display.Color.GetColor(lighter.r, lighter.g, lighter.b), 0.8);
    g.fillRect(-w / 2 + 3, -h / 2 + 2, w - 6, 3);
    // Windshield
    g.fillStyle(0x1a1a33, 1);
    g.fillRect(2, -h / 2 + 3, 7, h - 6);
    // Headlights
    g.fillStyle(0xffee88, 1);
    g.fillRect(w / 2 - 3, -h / 2 + 2, 3, 3);
    g.fillRect(w / 2 - 3, h / 2 - 5, 3, 3);
    // Tail
    g.fillStyle(0x661111, 1);
    g.fillRect(-w / 2, -h / 2 + 2, 2, 3);
    g.fillRect(-w / 2, h / 2 - 5, 2, 3);

    this.container.add(g);
    this.container.setRotation(angle);
    this.container.setDepth(10);
  }

  step(dt, onRoad, input) {
    // Throttle
    if (input.up) {
      this.speed += this.acceleration * dt;
    }
    if (input.down) {
      if (this.speed > 0) {
        this.speed -= this.brakingForce * dt;
      } else {
        this.speed -= this.acceleration * 0.5 * dt;
      }
    }

    // Friction
    const fric = onRoad ? this.friction : this.friction * this.offRoadDrag;
    if (this.speed > 0) {
      this.speed = Math.max(0, this.speed - fric * dt);
    } else if (this.speed < 0) {
      this.speed = Math.min(0, this.speed + fric * dt);
    }

    // Cap speed
    const maxSpd = onRoad ? this.maxSpeed : this.maxSpeed * this.offRoadMaxFactor;
    if (this.speed > maxSpd) this.speed = maxSpd;
    const minSpd = onRoad ? -130 : -60;
    if (this.speed < minSpd) this.speed = minSpd;

    // Steering — allow rotation even at very low speed (helps recovery),
    // with a small minimum factor so cars don't spin freely while parked.
    const speedFactor = Math.min(1, Math.abs(this.speed) / 90 + 0.25);
    const dir = this.speed >= 0 ? 1 : -1;
    let steer = 0;
    if (input.left) steer -= 1;
    if (input.right) steer += 1;
    this.angle += steer * this.turnSpeed * speedFactor * dir * dt;

    // Move
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;

    this.container.setPosition(this.x, this.y);
    this.container.setRotation(this.angle);
  }

  destroy() {
    this.container.destroy();
  }
}

// =====================================================================
// Phaser bootstrap
// =====================================================================
function startGame() {
  if (window.phaserGame) return;  // already running
  const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game',
    backgroundColor: '#1a1a1a',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: [RaceScene]
  };
  window.phaserGame = new Phaser.Game(config);
}
