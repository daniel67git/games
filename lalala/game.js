// =============================================================
// Lalala — un juego en 3D con Three.js
// =============================================================

// ---------- Configuración base ----------
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 60, 200);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Luces ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(40, 80, 30);
scene.add(sun);

const playerLight = new THREE.PointLight(0xff7700, 1.4, 12);
scene.add(playerLight);

// =============================================================
// Generación de texturas / sprites en canvas
// =============================================================
function mkCanvas(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}
function toTex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.encoding = THREE.sRGBEncoding;
  return t;
}

function drawFireCharacter() {
  const c = mkCanvas(128);
  const ctx = c.getContext('2d');

  // Cuerpo de llama (gradiente)
  const grad = ctx.createRadialGradient(64, 75, 6, 64, 65, 55);
  grad.addColorStop(0, '#fff7aa');
  grad.addColorStop(0.3, '#ffcc00');
  grad.addColorStop(0.65, '#ff5500');
  grad.addColorStop(1, '#aa1100');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(64, 8);
  ctx.bezierCurveTo(36, 22, 22, 60, 30, 95);
  ctx.bezierCurveTo(36, 115, 92, 115, 98, 95);
  ctx.bezierCurveTo(106, 60, 92, 22, 64, 8);
  ctx.closePath();
  ctx.fill();

  // Llama interior
  const inner = ctx.createRadialGradient(64, 80, 4, 64, 70, 30);
  inner.addColorStop(0, '#ffffff');
  inner.addColorStop(0.5, '#ffee44');
  inner.addColorStop(1, 'rgba(255, 170, 0, 0)');
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.moveTo(64, 30);
  ctx.bezierCurveTo(50, 45, 47, 75, 54, 95);
  ctx.bezierCurveTo(58, 105, 70, 105, 74, 95);
  ctx.bezierCurveTo(81, 75, 78, 45, 64, 30);
  ctx.fill();

  // Cara
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(54, 65, 7.5, 0, Math.PI * 2);
  ctx.arc(74, 65, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a0a00';
  ctx.beginPath();
  ctx.arc(55, 66, 3.5, 0, Math.PI * 2);
  ctx.arc(75, 66, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(56.2, 64.5, 1.3, 0, Math.PI * 2);
  ctx.arc(76.2, 64.5, 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Sonrisa
  ctx.strokeStyle = '#1a0a00';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(64, 80, 9, 0.2, Math.PI - 0.2);
  ctx.stroke();

  return toTex(c);
}

function drawSandIron() {
  const c = mkCanvas(256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d6b377';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 800; i++) {
    const r = 180 + Math.random() * 60;
    const g = 140 + Math.random() * 60;
    const b = 90 + Math.random() * 40;
    ctx.fillStyle = `rgba(${r|0}, ${g|0}, ${b|0}, 0.55)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  for (let i = 0; i < 35; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 6 + Math.random() * 14;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, '#7a7a82');
    g.addColorStop(0.6, '#4a4a52');
    g.addColorStop(1, 'rgba(74,74,82,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTex(c);
}

function drawDiamond() {
  const c = mkCanvas(256);
  const ctx = c.getContext('2d');
  const bg = ctx.createLinearGradient(0, 0, 256, 256);
  bg.addColorStop(0, '#bce8ff');
  bg.addColorStop(1, '#5fa8d8');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const size = 6 + Math.random() * 18;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.random() * Math.PI);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.25 + Math.random() * 0.45})`;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.7, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  return toTex(c);
}

function drawLava() {
  const c = mkCanvas(256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2a0805';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 4 + Math.random() * 22;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, '#fff7aa');
    g.addColorStop(0.3, '#ff8800');
    g.addColorStop(0.7, '#aa2200');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(${15 + Math.random() * 25 | 0}, 0, 0, 0.6)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  return toTex(c);
}

function drawPortal() {
  const c = mkCanvas(128);
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.25, '#ddaaff');
  grad.addColorStop(0.55, '#8833ff');
  grad.addColorStop(1, 'rgba(40, 0, 80, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 62, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    for (let t = 0; t < Math.PI * 4; t += 0.08) {
      const r = 4 + t * 4.5;
      const a = t + i * (Math.PI * 2 / 3);
      const x = 64 + Math.cos(a) * r;
      const y = 64 + Math.sin(a) * r;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return toTex(c);
}

function drawLion() {
  const c = mkCanvas(128);
  const ctx = c.getContext('2d');
  // Melena exterior con picos
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 14) {
    ctx.fillStyle = '#8a3d00';
    ctx.beginPath();
    ctx.moveTo(64 + Math.cos(a + 0.08) * 46, 62 + Math.sin(a + 0.08) * 46);
    ctx.lineTo(64 + Math.cos(a) * 60, 62 + Math.sin(a) * 60);
    ctx.lineTo(64 + Math.cos(a - 0.08) * 46, 62 + Math.sin(a - 0.08) * 46);
    ctx.closePath();
    ctx.fill();
  }
  // Melena (círculo principal)
  ctx.fillStyle = '#c46a18';
  ctx.beginPath();
  ctx.arc(64, 62, 48, 0, Math.PI * 2);
  ctx.fill();
  // Cara
  ctx.fillStyle = '#f5c47a';
  ctx.beginPath();
  ctx.arc(64, 66, 33, 0, Math.PI * 2);
  ctx.fill();
  // Ojos
  ctx.fillStyle = '#ffee00';
  ctx.beginPath();
  ctx.arc(52, 60, 6, 0, Math.PI * 2);
  ctx.arc(76, 60, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a0a00';
  ctx.beginPath();
  ctx.arc(52, 61, 3, 0, Math.PI * 2);
  ctx.arc(76, 61, 3, 0, Math.PI * 2);
  ctx.fill();
  // Hocico
  ctx.fillStyle = '#a8722a';
  ctx.beginPath();
  ctx.arc(64, 80, 11, 0, Math.PI * 2);
  ctx.fill();
  // Nariz
  ctx.fillStyle = '#1a0a00';
  ctx.beginPath();
  ctx.moveTo(64, 73);
  ctx.lineTo(58, 80);
  ctx.lineTo(70, 80);
  ctx.closePath();
  ctx.fill();
  // Boca abierta
  ctx.fillStyle = '#5a0a00';
  ctx.beginPath();
  ctx.moveTo(54, 88);
  ctx.quadraticCurveTo(64, 102, 74, 88);
  ctx.lineTo(74, 92);
  ctx.quadraticCurveTo(64, 105, 54, 92);
  ctx.closePath();
  ctx.fill();
  // Colmillos
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(58, 88);
  ctx.lineTo(56, 100);
  ctx.lineTo(61, 88);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(70, 88);
  ctx.lineTo(72, 100);
  ctx.lineTo(67, 88);
  ctx.fill();
  return toTex(c);
}

function drawKey() {
  const c = mkCanvas(64);
  const ctx = c.getContext('2d');
  // Aro
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(18, 32, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a0a00';
  ctx.beginPath();
  ctx.arc(18, 32, 6, 0, Math.PI * 2);
  ctx.fill();
  // Vástago
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(28, 28, 30, 8);
  // Dientes
  ctx.fillRect(48, 36, 4, 8);
  ctx.fillRect(54, 36, 4, 8);
  // Brillo
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.arc(15, 28, 3, 0, Math.PI * 2);
  ctx.fill();
  return toTex(c);
}

const TEX = {
  fire: drawFireCharacter(),
  sandIron: drawSandIron(),
  diamond: drawDiamond(),
  lava: drawLava(),
  portal: drawPortal(),
  lion: drawLion(),
  key: drawKey(),
};

// =============================================================
// Jugador
// =============================================================
const playerSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.fire, transparent: true }));
playerSprite.scale.set(2.2, 2.2, 1);
scene.add(playerSprite);

const player = {
  pos: new THREE.Vector3(0, 1.6, 12),
  speed: 9,
  alive: true,
  invincible: false,
};

// =============================================================
// Input
// =============================================================
const input = {};
window.addEventListener('keydown', (e) => { input[e.key.toLowerCase()] = true; });
window.addEventListener('keyup',   (e) => { input[e.key.toLowerCase()] = false; });

// =============================================================
// Helpers de escena
// =============================================================
function makePortal(color = 0xaa44ff) {
  const group = new THREE.Group();
  const portalMat = new THREE.MeshBasicMaterial({
    map: TEX.portal, transparent: true, side: THREE.DoubleSide, depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.8, 3, 40), portalMat);
  group.add(ring);

  const glowMat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false,
  });
  const glow = new THREE.Mesh(new THREE.RingGeometry(2.9, 3.6, 40), glowMat);
  group.add(glow);

  const torusMat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.3,
  });
  const torus = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.15, 12, 40), torusMat);
  group.add(torus);

  return { group, ring, glow, torus };
}

function makeIsland(radius, texture) {
  const geom = new THREE.CylinderGeometry(radius, radius + 1.5, 2, 48);
  const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.y = 0;
  return mesh;
}

function makeBridge(length, color = 0x8b6f3a) {
  const geom = new THREE.BoxGeometry(6, 0.8, length);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
  const mesh = new THREE.Mesh(geom, mat);
  return mesh;
}

// =============================================================
// Estado de juego y niveles
// =============================================================
const STATE = { TITLE: 'title', LEVEL1: 'l1', LEVEL2: 'l2', LEVEL3: 'l3', PAUSED: 'paused' };
let state = STATE.TITLE;
let level = {}; // datos del nivel actual

const ui = {
  title: document.getElementById('level-title'),
  hint: document.getElementById('hint'),
  keys: document.getElementById('keys-display'),
  message: document.getElementById('message'),
  messageText: document.getElementById('message-text'),
  messageBtn: document.getElementById('message-button'),
  titleScreen: document.getElementById('title-screen'),
};

function setLevelInfo(title, hint, keysText = '') {
  ui.title.textContent = title;
  ui.hint.textContent = hint;
  ui.keys.textContent = keysText;
}

function showMessage(html, btnText, onClick) {
  state = STATE.PAUSED;
  ui.messageText.innerHTML = html;
  ui.messageBtn.textContent = btnText;
  ui.messageBtn.onclick = () => {
    ui.message.style.display = 'none';
    onClick();
  };
  ui.message.style.display = 'block';
}

function clearScene() {
  const remove = [];
  scene.traverse((o) => {
    if (o === scene || o === playerSprite || o === playerLight) return;
    if (o.isLight && (o === sun || o.type === 'AmbientLight')) return;
    if (o.parent === scene && o !== playerSprite && o !== playerLight && o !== sun) {
      remove.push(o);
    }
  });
  remove.forEach((o) => {
    scene.remove(o);
    if (o.geometry) o.geometry.dispose && o.geometry.dispose();
  });
  level = {};
}

// ---------- NIVEL 1: arena y hierro ----------
function startLevel1() {
  state = STATE.LEVEL1;
  clearScene();
  scene.background = new THREE.Color(0x6fa8d6);
  scene.fog = new THREE.Fog(0x6fa8d6, 50, 180);
  setLevelInfo('Nivel 1: Arena y hierro', 'Cruza al otro lado y elige bien tu camino');

  // Isla principal
  const island1 = makeIsland(15, TEX.sandIron);
  scene.add(island1);

  // Puente
  const bridge = makeBridge(16);
  bridge.position.set(0, 0.4, -22);
  scene.add(bridge);

  // Segunda isla (más pequeña, donde se bifurca)
  const island2 = makeIsland(8, TEX.sandIron);
  island2.position.set(0, 0, -38);
  scene.add(island2);

  // Decisión: lado correcto aleatorio
  const correctSide = Math.random() < 0.5 ? -1 : 1;

  // Caminos en Y (más anchos)
  const pathA = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.8, 16),
    new THREE.MeshStandardMaterial({ color: 0x8b6f3a, roughness: 0.95 }),
  );
  pathA.position.set(7, 0.4, -50);
  pathA.rotation.y = -0.4;
  scene.add(pathA);

  const pathB = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.8, 16),
    new THREE.MeshStandardMaterial({ color: 0x8b6f3a, roughness: 0.95 }),
  );
  pathB.position.set(-7, 0.4, -50);
  pathB.rotation.y = 0.4;
  scene.add(pathB);

  // Plataformitas finales con portales
  const ends = [
    { side: 1, x: 13, z: -57 },
    { side: -1, x: -13, z: -57 },
  ];
  const portals = [];
  for (const e of ends) {
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(4, 4.5, 1.8, 24),
      new THREE.MeshStandardMaterial({ map: TEX.sandIron, roughness: 0.9 }),
    );
    pad.position.set(e.x, 0.3, e.z);
    scene.add(pad);

    const isCorrect = e.side === correctSide;
    const portal = makePortal(0xaa44ff);
    portal.group.position.set(e.x, 4, e.z);
    portal.group.rotation.y = -e.side * 0.3;
    scene.add(portal.group);

    portals.push({ ...portal, isCorrect, x: e.x, z: e.z });
  }

  // Adornos: rocas de hierro en la primera isla
  for (let i = 0; i < 10; i++) {
    const rock = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.5 + Math.random() * 0.4, 0),
      new THREE.MeshStandardMaterial({ color: 0x6a6a72, metalness: 0.7, roughness: 0.4 }),
    );
    const a = Math.random() * Math.PI * 2;
    const r = 5 + Math.random() * 8;
    rock.position.set(Math.cos(a) * r, 1.2, Math.sin(a) * r);
    scene.add(rock);
  }

  // Posición inicial
  player.pos.set(0, 1.6, 11);
  player.alive = true;

  level = { portals };
}

// ---------- NIVEL 2: diamante ----------
function startLevel2() {
  state = STATE.LEVEL2;
  clearScene();
  scene.background = new THREE.Color(0x88c8ff);
  scene.fog = new THREE.Fog(0x88c8ff, 60, 180);
  setLevelInfo('Nivel 2: Isla de diamante', 'Encuentra el portal correcto. ¡Cuidado con el león!');

  const island = makeIsland(20, TEX.diamond);
  island.material.metalness = 0.4;
  island.material.roughness = 0.3;
  scene.add(island);

  // Pilares decorativos de diamante
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const dia = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.1 + Math.random() * 0.3, 0),
      new THREE.MeshStandardMaterial({
        color: 0xaaeeff, transparent: true, opacity: 0.7,
        metalness: 0.85, roughness: 0.15, emissive: 0x224488, emissiveIntensity: 0.4,
      }),
    );
    dia.position.set(Math.cos(a) * 15, 2.4, Math.sin(a) * 15);
    scene.add(dia);
  }

  // Dos portales: uno correcto, uno = jaula con león
  const correctSide = Math.random() < 0.5 ? -1 : 1;
  const portals = [];
  const slots = [
    { x: -14, z: -6 },
    { x: 11, z: 6 },
  ];
  slots.forEach((s, idx) => {
    const portal = makePortal(0xaa44ff);
    portal.group.position.set(s.x, 4, s.z);
    scene.add(portal.group);
    const isCorrect = (idx === 0 && correctSide === -1) || (idx === 1 && correctSide === 1);
    portals.push({ ...portal, isCorrect, x: s.x, z: s.z });
  });

  player.pos.set(0, 1.6, 14);
  player.alive = true;

  level = { portals };
}

// ---------- NIVEL 3: lava y magma ----------
function startLevel3() {
  state = STATE.LEVEL3;
  clearScene();
  scene.background = new THREE.Color(0x330000);
  scene.fog = new THREE.Fog(0x330000, 40, 130);
  setLevelInfo('Nivel 3: Lava y magma', 'Encuentra las 3 llaves del árbol', 'Llaves: 0/3');

  // Isla de lava
  const island = makeIsland(22, TEX.lava);
  island.material.emissive = new THREE.Color(0xff3300);
  island.material.emissiveIntensity = 0.25;
  scene.add(island);

  // Luz de lava (rojo) ambiental
  const lavaLight = new THREE.PointLight(0xff3300, 1.0, 60);
  lavaLight.position.set(0, 8, 0);
  scene.add(lavaLight);

  // Árbol: tronco + copa
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.9, 9, 18),
    new THREE.MeshStandardMaterial({ color: 0x3a1f0a, roughness: 0.9 }),
  );
  trunk.position.set(0, 5.5, 0);
  scene.add(trunk);

  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(5.5, 8, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a0a05, roughness: 1 }),
  );
  crown.position.set(0, 12, 0);
  scene.add(crown);

  // Cerraduras en el tronco
  const locks = [];
  for (let i = 0; i < 3; i++) {
    const lock = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.4),
      new THREE.MeshStandardMaterial({
        color: 0x666666, metalness: 0.85, roughness: 0.3,
      }),
    );
    const a = (i / 3) * Math.PI * 2;
    lock.position.set(Math.cos(a) * 1.7, 4 + i * 1.6, Math.sin(a) * 1.7);
    lock.lookAt(lock.position.clone().add(new THREE.Vector3(Math.cos(a), 0, Math.sin(a))));
    scene.add(lock);
    locks.push(lock);
  }

  // Llaves repartidas
  const keyPositions = [
    { x: 14, z: 6 },
    { x: -12, z: 8 },
    { x: 4, z: -16 },
  ];
  const keys = keyPositions.map((p) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.key, transparent: true }));
    sprite.scale.set(1.6, 1.6, 1);
    sprite.position.set(p.x, 1.8, p.z);
    scene.add(sprite);
    // Pequeño pedestal
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.7, 0.4, 12),
      new THREE.MeshStandardMaterial({ color: 0x2a0805, emissive: 0xff5500, emissiveIntensity: 0.3 }),
    );
    ped.position.set(p.x, 1.2, p.z);
    scene.add(ped);
    return { sprite, ped, collected: false, baseY: 1.8 };
  });

  // Portal final (oculto al inicio)
  const portal = makePortal(0xff8800);
  portal.group.position.set(0, 4, -14);
  portal.group.visible = false;
  scene.add(portal.group);

  player.pos.set(0, 1.6, 18);
  player.alive = true;

  level = { keys, locks, portal, portalAppeared: false };
}

// =============================================================
// Muerte / victoria
// =============================================================
function dieFalling() {
  if (!player.alive || player.invincible) return;
  player.alive = false;
  showMessage('💫 Has caído al espacio.<br>Vuelves al inicio del nivel.', 'Reintentar', restartCurrent);
}

function dieByLion() {
  if (!player.alive || player.invincible) return;
  player.alive = false;

  const lionSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.lion, transparent: true }));
  lionSprite.scale.set(5, 5, 1);
  lionSprite.position.copy(player.pos);
  lionSprite.position.y = 3;
  scene.add(lionSprite);
  level.tempLion = lionSprite;

  // Jaula
  const cage = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 7, 6),
      new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.3 }),
    );
    const a = (i / 10) * Math.PI * 2;
    bar.position.set(Math.cos(a) * 3.5, 3.5, Math.sin(a) * 3.5);
    cage.add(bar);
  }
  cage.position.copy(player.pos);
  cage.position.y = 0;
  scene.add(cage);
  level.tempCage = cage;

  setTimeout(() => {
    showMessage('🦁 ¡El león te ha devorado!<br>Elige otro portal.', 'Reintentar', restartCurrent);
  }, 1400);
}

function restartCurrent() {
  if (state === STATE.LEVEL1) startLevel1();
  else if (state === STATE.LEVEL2) startLevel2();
  else if (state === STATE.LEVEL3) startLevel3();
  else startLevel1();
}

function win() {
  player.alive = false;
  showMessage(
    '🔥 ¡Has superado Lalala! 🔥<br><br>Has cruzado las tres islas y escapado.',
    'Volver a jugar',
    () => startLevel1(),
  );
}

// =============================================================
// Bucle principal
// =============================================================
const clock = new THREE.Clock();

// Define las áreas seguras de cada nivel
function isOnSafeGround(p) {
  if (state === STATE.LEVEL1) {
    if (Math.hypot(p.x, p.z) < 16) return true;                    // isla 1
    if (Math.abs(p.x) < 3.4 && p.z > -31 && p.z < -13) return true; // puente (más ancho)
    if (Math.hypot(p.x, p.z + 38) < 9) return true;                // isla 2
    // caminos en diagonal (más anchos y con solape extra)
    const onPath = (cx, cz, ang, len = 8.5, w = 3) => {
      const dx = p.x - cx, dz = p.z - cz;
      const lx =  dx * Math.cos(-ang) - dz * Math.sin(-ang);
      const lz =  dx * Math.sin(-ang) + dz * Math.cos(-ang);
      return Math.abs(lx) < w && Math.abs(lz) < len;
    };
    if (onPath(7, -50, -0.4)) return true;
    if (onPath(-7, -50, 0.4)) return true;
    if (Math.hypot(p.x - 13, p.z + 57) < 4.5) return true;
    if (Math.hypot(p.x + 13, p.z + 57) < 4.5) return true;
    return false;
  }
  if (state === STATE.LEVEL2) {
    return Math.hypot(p.x, p.z) < 20.5;
  }
  if (state === STATE.LEVEL3) {
    // No se puede atravesar el árbol
    if (Math.hypot(p.x, p.z) < 2.5) return false;
    return Math.hypot(p.x, p.z) < 22.5;
  }
  return true;
}

function update(dt) {
  if (state === STATE.TITLE || state === STATE.PAUSED || !player.alive) return;

  // Movimiento (relativo a la cámara mirando -Z)
  const move = new THREE.Vector3();
  if (input['w'] || input['arrowup'])    move.z -= 1;
  if (input['s'] || input['arrowdown'])  move.z += 1;
  if (input['a'] || input['arrowleft'])  move.x -= 1;
  if (input['d'] || input['arrowright']) move.x += 1;
  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(player.speed * dt);
    player.pos.x += move.x;
    player.pos.z += move.z;
  }

  // Comprobar suelo seguro
  if (!isOnSafeGround(player.pos)) {
    // En nivel 3 el árbol bloquea: empuja hacia fuera
    if (state === STATE.LEVEL3 && Math.hypot(player.pos.x, player.pos.z) < 2.5) {
      const a = Math.atan2(player.pos.z, player.pos.x);
      player.pos.x = Math.cos(a) * 2.6;
      player.pos.z = Math.sin(a) * 2.6;
    } else {
      // Caer
      player.pos.y -= 22 * dt;
      if (player.pos.y < -8) {
        player.pos.y = -8;
        dieFalling();
        return;
      }
    }
  } else {
    player.pos.y = 1.6;
  }

  // Sincronizar sprite/luz
  playerSprite.position.copy(player.pos);
  playerLight.position.set(player.pos.x, player.pos.y + 1, player.pos.z);

  // Animación de la llama (ligero rebote)
  playerSprite.scale.y = 2.2 + Math.sin(performance.now() * 0.012) * 0.08;

  // Cámara — perspectiva tercera persona fija
  const camOff = new THREE.Vector3(0, 11, 13);
  camera.position.copy(player.pos).add(camOff);
  camera.lookAt(player.pos.x, player.pos.y, player.pos.z - 4);

  // Lógica específica por nivel
  if (state === STATE.LEVEL1) updateLevel1(dt);
  else if (state === STATE.LEVEL2) updateLevel2(dt);
  else if (state === STATE.LEVEL3) updateLevel3(dt);
}

function pulsePortal(p, t, baseScale = 1) {
  const s = baseScale + Math.sin(t * 3) * 0.12;
  p.glow.scale.set(s, s, 1);
  p.ring.material.rotation = t * 0.6;
  p.torus.rotation.z = t * 1.4;
}

function updateLevel1(dt) {
  const t = performance.now() * 0.001;
  for (const p of level.portals) {
    pulsePortal(p, t);
    const dx = player.pos.x - p.x, dz = player.pos.z - p.z;
    if (dx * dx + dz * dz < 5) {
      if (p.isCorrect) {
        startLevel2();
      } else {
        showMessage('💫 Ese portal te lleva al espacio…<br>Vuelves al inicio.', 'Reintentar', restartCurrent);
      }
      return;
    }
  }
}

function updateLevel2(dt) {
  const t = performance.now() * 0.001;
  for (const p of level.portals) {
    pulsePortal(p, t);
    const dx = player.pos.x - p.x, dz = player.pos.z - p.z;
    if (dx * dx + dz * dz < 5) {
      if (p.isCorrect) startLevel3();
      else dieByLion();
      return;
    }
  }
}

function updateLevel3(dt) {
  const t = performance.now() * 0.001;

  // Llaves flotando
  let collected = 0;
  for (let i = 0; i < level.keys.length; i++) {
    const k = level.keys[i];
    if (k.collected) { collected++; continue; }
    k.sprite.position.y = k.baseY + Math.sin(t * 2 + i) * 0.25;
    k.sprite.material.rotation = Math.sin(t * 0.8 + i) * 0.2;

    const dx = player.pos.x - k.sprite.position.x;
    const dz = player.pos.z - k.sprite.position.z;
    if (dx * dx + dz * dz < 2.4) {
      k.collected = true;
      scene.remove(k.sprite);
      scene.remove(k.ped);
      collected++;
      // Ilumina la cerradura correspondiente
      const lock = level.locks[collected - 1];
      if (lock) {
        lock.material.color.setHex(0xffaa00);
        lock.material.emissive = new THREE.Color(0xffaa00);
        lock.material.emissiveIntensity = 0.8;
      }
    }
  }
  ui.keys.textContent = `Llaves: ${collected}/3`;

  // Aparece el portal cuando hay 3
  if (collected === 3 && !level.portalAppeared) {
    level.portalAppeared = true;
    level.portal.group.visible = true;
  }

  if (level.portalAppeared) {
    pulsePortal(level.portal, t);
    const dx = player.pos.x - level.portal.group.position.x;
    const dz = player.pos.z - level.portal.group.position.z;
    if (dx * dx + dz * dz < 5) win();
  }
}

function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// =============================================================
// Pantalla de título / arranque
// =============================================================
document.getElementById('start-btn').addEventListener('click', () => {
  ui.titleScreen.style.display = 'none';
  startLevel1();
});

// Arranque automático — la pantalla de título sólo se ve un instante
camera.position.set(0, 14, 18);
camera.lookAt(0, 1, 0);
ui.titleScreen.style.display = 'none';
startLevel1();
loop();
