import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { makeCoronaSprite, makeGlowSprite, textureJob } from './procedural.js';
import { PLANETS, SUN_DATA, buildPlanetMesh, buildCloudsMesh, buildAtmosphereMesh, buildRingsMesh, buildOrbitLine } from './bodies.js';

const SCENE_COLORS = {
  orbitLine: 0xb9b6c9,
  selection: 0xe2a64d,
  sunLight: 0xfff1dc,
};

const dom = {
  canvas: document.getElementById('scene'),
  state: document.getElementById('stateValue'),
  fps: document.getElementById('fpsValue'),
  days: document.getElementById('daysValue'),
  pauseBtn: document.getElementById('pauseBtn'),
  speed: document.getElementById('speed'),
  speedValue: document.getElementById('speedValue'),
  orbits: document.getElementById('orbits'),
  readout: document.getElementById('readout'),
  readoutName: document.getElementById('readoutName'),
  fields: {
    diameter: document.getElementById('rDiameter'),
    orbit: document.getElementById('rOrbit'),
    day: document.getElementById('rDay'),
    moons: document.getElementById('rMoons'),
  },
  note: document.getElementById('rNote'),
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DAYS_PER_SECOND = 6;

const state = {
  paused: reducedMotion,
  speed: 1,
  simDays: 0,
  selected: null,
  ready: false,
};

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: dom.canvas, antialias: true });
} catch {
  document.body.insertAdjacentHTML("beforeend",
    '<p class="noscript">This browser cannot create a WebGL context, so the orrery cannot render.</p>');
  throw new Error("WebGL unavailable");
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 6000);
camera.position.set(0, 86, 172);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.7, 0.55, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 12;
controls.maxDistance = 900;
controls.enablePan = false;

scene.add(new THREE.AmbientLight(0x8b93b8, 0.18));
const sunLight = new THREE.PointLight(SCENE_COLORS.sunLight, 2.6, 0, 0);
scene.add(sunLight);

const starUniforms = { uTime: { value: 0 }, uScale: { value: Math.min(window.devicePixelRatio, 2) } };
const starMaterial = new THREE.ShaderMaterial({
  uniforms: starUniforms,
  vertexShader: /* glsl */ `
    attribute vec3 color;
    attribute float aSize;
    attribute float aPhase;
    varying vec3 vColor;
    varying float vTw;
    uniform float uTime;
    uniform float uScale;
    void main() {
      vColor = color;
      vTw = 0.72 + 0.28 * sin(uTime * (0.6 + aPhase * 0.25) + aPhase * 7.0);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * uScale;
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec3 vColor;
    varying float vTw;
    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv) * 2.0;
      float a = smoothstep(1.0, 0.0, d);
      a *= a;
      gl_FragColor = vec4(vColor * vTw, a);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

function buildStarfield() {
  const group = new THREE.Group();
  const tints = [[1, 1, 1], [1, 0.86, 0.72], [0.74, 0.83, 1], [1, 0.95, 0.85]];

  const make = (count, size, radius, spread, band) => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      let x, y, z;
      if (band) {
        const a = Math.random() * Math.PI * 2;
        const g = (Math.random() + Math.random() + Math.random() - 1.5) * 0.16;
        x = Math.cos(a); z = Math.sin(a); y = g;
      } else {
        const u = Math.random() * 2 - 1;
        const a = Math.random() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        x = s * Math.cos(a); y = u; z = s * Math.sin(a);
      }
      const r = radius + (Math.random() - 0.5) * spread;
      positions[i * 3] = x * r;
      positions[i * 3 + 1] = y * r;
      positions[i * 3 + 2] = z * r;
      const t = tints[Math.floor(Math.random() * tints.length)];
      const b = 0.55 + Math.random() * 0.45;
      colors[i * 3] = t[0] * b;
      colors[i * 3 + 1] = t[1] * b;
      colors[i * 3 + 2] = t[2] * b;
      sizes[i] = size * (0.7 + Math.pow(Math.random(), 3) * 1.6);
      phases[i] = Math.random() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    return new THREE.Points(geo, starMaterial);
  };

  group.add(make(2600, 1.6, 1500, 300, false));
  group.add(make(420, 2.8, 1400, 200, false));
  const galaxy = make(1400, 1.4, 1500, 260, true);
  galaxy.rotation.set(0.9, 0.4, 0.3);
  group.add(galaxy);
  scene.add(group);
}

const bodies = [];
const pickTargets = [];
const orbitPivots = new THREE.Group();
const orbitLines = new THREE.Group();
scene.add(orbitPivots);
scene.add(orbitLines);
let sunMesh = null;

const sunUniforms = { uTime: { value: 0 } };
const SUN_SHADER = {
  vertexShader: /* glsl */ `
    varying vec3 vPos;
    void main() {
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    varying vec3 vPos;
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float noise(vec3 x) {
      vec3 i = floor(x), f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    float fbm(vec3 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
      return v;
    }
    void main() {
      vec3 p = normalize(vPos) * 4.0;
      float n = fbm(p + vec3(0.0, uTime * 0.12, uTime * 0.05));
      float n2 = fbm(p * 2.5 - vec3(uTime * 0.08));
      float v = n * 0.65 + n2 * 0.35;
      vec3 col = mix(vec3(0.75, 0.18, 0.02), vec3(1.0, 0.55, 0.12), smoothstep(0.25, 0.55, v));
      col = mix(col, vec3(1.0, 0.95, 0.75), smoothstep(0.55, 0.85, v));
      gl_FragColor = vec4(col * 1.9, 1.0);
    }
  `,
};

function buildSun() {
  const mat = new THREE.ShaderMaterial({
    uniforms: sunUniforms,
    vertexShader: SUN_SHADER.vertexShader,
    fragmentShader: SUN_SHADER.fragmentShader,
  });
  sunMesh = new THREE.Mesh(new THREE.SphereGeometry(7, 64, 48), mat);
  sunMesh.userData.data = SUN_DATA;
  sunMesh.userData.pickRadius = 7;
  pickTargets.push(sunMesh);
  scene.add(sunMesh);

  const corona = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeCoronaSprite(), blending: THREE.AdditiveBlending,
    depthWrite: false, transparent: true,
  }));
  corona.scale.setScalar(34);
  sunMesh.add(corona);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowSprite(), blending: THREE.AdditiveBlending,
    depthWrite: false, transparent: true,
  }));
  glow.scale.setScalar(160);
  sunMesh.add(glow);
}

function buildPlanet(def) {
  const orbit = new THREE.Group();
  orbit.rotation.x = THREE.MathUtils.degToRad(def.incline);
  orbit.rotation.y = Math.random() * Math.PI * 2;
  orbitPivots.add(orbit);

  const holder = new THREE.Group();
  holder.position.x = def.dist;
  orbit.add(holder);

  const tilt = new THREE.Group();
  tilt.rotation.z = THREE.MathUtils.degToRad(def.tilt);
  holder.add(tilt);

  const mesh = buildPlanetMesh(def, def.texture);
  tilt.add(mesh);
  mesh.userData.data = def.data;

  const hitRadius = def.rings ? def.rings.outer * 1.05 : def.radius * 1.9;
  const hit = new THREE.Mesh(
    new THREE.SphereGeometry(hitRadius, 16, 12),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.userData.data = def.data;
  hit.userData.pickRadius = def.radius;
  holder.add(hit);
  pickTargets.push(hit);

  const cloudsMesh = def.clouds ? buildCloudsMesh(def) : null;
  if (cloudsMesh) tilt.add(cloudsMesh);
  if (def.atmosphere) tilt.add(buildAtmosphereMesh(def));
  if (def.rings) tilt.add(buildRingsMesh(def));

  let moonPivot = null;
  if (def.moon) {
    moonPivot = new THREE.Group();
    holder.add(moonPivot);
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(def.moon.radius, 32, 24),
      new THREE.MeshStandardMaterial({
        map: def.moon.texture, bumpMap: def.moon.texture, bumpScale: 0.012,
        roughness: 0.95, metalness: 0,
      })
    );
    moonMesh.position.x = def.moon.dist;
    moonPivot.add(moonMesh);
  }

  orbitLines.add(buildOrbitLine(def.dist, def.incline, SCENE_COLORS.orbitLine));

  bodies.push({
    def, orbit, holder, mesh, cloudsMesh, moonPivot,
    orbitSpeed: (Math.PI * 2) / def.orbitDays,
    spinSpeed: (24 / Math.abs(def.spinHours)) * (Math.PI / 2) * Math.sign(def.spinHours),
  });
}

const selectionRing = new THREE.Mesh(
  new THREE.RingGeometry(0.92, 1, 64),
  new THREE.MeshBasicMaterial({ color: SCENE_COLORS.selection, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
);
selectionRing.visible = false;
scene.add(selectionRing);

function selectBody(mesh) {
  state.selected = mesh;
  if (!mesh) {
    selectionRing.visible = false;
    dom.readout.hidden = true;
    return;
  }
  const d = mesh.userData.data;
  dom.readoutName.textContent = d.name;
  dom.fields.diameter.textContent = d.diameter;
  dom.fields.orbit.textContent = d.orbit;
  dom.fields.day.textContent = d.day;
  dom.fields.moons.textContent = d.moons;
  dom.note.textContent = d.note;
  dom.readout.hidden = false;
  selectionRing.visible = true;
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downX = 0, downY = 0;

function pick(clientX, clientY) {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pickTargets, false)[0];
  return hit ? hit.object : null;
}

dom.canvas.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; });
dom.canvas.addEventListener('pointerup', (e) => {
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
  selectBody(pick(e.clientX, e.clientY));
});
dom.canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
  dom.canvas.style.cursor = pick(e.clientX, e.clientY) ? 'pointer' : 'grab';
});

function setPaused(paused) {
  state.paused = paused;
  dom.pauseBtn.textContent = paused ? 'resume' : 'pause';
  dom.pauseBtn.setAttribute('aria-pressed', String(paused));
  if (state.ready) dom.state.textContent = paused ? 'paused' : 'running';
}

dom.pauseBtn.addEventListener('click', () => setPaused(!state.paused));
dom.speed.addEventListener('input', () => {
  state.speed = parseFloat(dom.speed.value);
  dom.speedValue.textContent = `${state.speed.toFixed(1)}×`;
});
dom.orbits.addEventListener('change', () => {
  orbitLines.visible = dom.orbits.checked;
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && (e.target === document.body || e.target === dom.canvas)) {
    e.preventDefault();
    setPaused(!state.paused);
  }
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  starUniforms.uScale.value = Math.min(window.devicePixelRatio, 2);
});

const steps = [
  ['starfield', function* () { buildStarfield(); }],
  ['sun', function* () { buildSun(); }],
  ...PLANETS.map((def) => [`surface ${def.key}`, function* () {
    def.texture = yield* textureJob(def.size[0], def.size[1], def.paint);
    if (def.clouds) def.clouds.texture = yield* textureJob(def.clouds.size[0], def.clouds.size[1], def.clouds.paint, { alpha: true });
    if (def.moon) def.moon.texture = yield* textureJob(def.moon.size[0], def.moon.size[1], def.moon.paint);
  }]),
  ...PLANETS.map((def) => [`orbit ${def.key}`, function* () { buildPlanet(def); }]),
];

const SLICE_MS = 8;
let stepIndex = 0;
let currentGen = null;
function buildNextStep() {
  if (stepIndex >= steps.length) {
    state.ready = true;
    dom.state.textContent = state.paused ? 'paused' : 'running';
    setPaused(state.paused);
    requestAnimationFrame(animate);
    return;
  }
  if (!currentGen) {
    const [label, gen] = steps[stepIndex];
    dom.state.textContent = `building ${stepIndex + 1}/${steps.length}`;
    currentGen = gen();
  }
  const t0 = performance.now();
  let r;
  do {
    r = currentGen.next();
  } while (!r.done && performance.now() - t0 < SLICE_MS);
  if (r.done) {
    currentGen = null;
    stepIndex++;
  }
  setTimeout(buildNextStep, 0);
}

let lastTime = performance.now();
let frames = 0, fpsTime = 0;

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  frames++;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    dom.fps.textContent = String(Math.round(frames / fpsTime));
    frames = 0;
    fpsTime = 0;
  }

  if (!state.paused) {
    const days = dt * DAYS_PER_SECOND * state.speed;
    state.simDays += days;
    dom.days.textContent = state.simDays.toFixed(1);
    for (const b of bodies) {
      b.orbit.rotation.y += b.orbitSpeed * days;
      b.mesh.rotation.y += b.spinSpeed * days;
      if (b.cloudsMesh) b.cloudsMesh.rotation.y += b.spinSpeed * 1.18 * days;
      if (b.moonPivot) b.moonPivot.rotation.y += ((Math.PI * 2) / b.def.moon.orbitDays) * days;
    }
    if (sunMesh) {
      sunMesh.rotation.y += 0.02 * days;
      sunUniforms.uTime.value += days;
    }
    starUniforms.uTime.value += dt;
  }

  if (state.selected && selectionRing.visible) {
    const p = new THREE.Vector3();
    state.selected.getWorldPosition(p);
    selectionRing.position.copy(p);
    selectionRing.quaternion.copy(camera.quaternion);
    const r = (state.selected.userData.pickRadius || 7) * 1.5 + 0.4;
    selectionRing.scale.setScalar(r);
  }

  controls.update();
  composer.render();
}

buildNextStep();
