import * as THREE from 'three';
import { fbm, makeRingTexture, mix3, smoothstep } from './procedural.js';

const bandPalette = (bands, stops) => {
  const t = 0.5 + 0.5 * Math.sin(bands);
  const seg = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(seg));
  return mix3(stops[i], stops[i + 1], seg - i);
};

const paintRocky = (seed, base, dark, light) => (u, v, x, y, z) => {
  const m = fbm(x * 1.6, y * 1.6, z * 1.6, 5, seed);
  const craters = fbm(x * 9, y * 9, z * 9, 4, seed + 5);
  let c = mix3(base, dark, smoothstep(0.35, 0.62, m));
  c = mix3(c, light, smoothstep(0.55, 0.8, craters) * 0.5);
  return c;
};

const paintVenus = (seed) => (u, v, x, y, z) => {
  const warp = fbm(x * 2 + 7, y * 4, z * 2, 4, seed);
  const bands = Math.sin((v + warp * 0.12) * Math.PI * 7) * 0.5 + 0.5;
  const swirl = fbm(x * 3, y * 3, z * 3, 5, seed + 9);
  return mix3([0.87, 0.74, 0.48], [0.72, 0.55, 0.3], bands * 0.6 + swirl * 0.4);
};

const paintEarth = (seed) => (u, v, x, y, z) => {
  const e = fbm(x * 2.1, y * 2.1, z * 2.1, 6, seed);
  const lat = Math.abs(y);
  let c;
  if (e > 0.52) {
    const h = smoothstep(0.52, 0.75, e);
    c = mix3([0.16, 0.36, 0.19], [0.48, 0.4, 0.26], h);
    c = mix3(c, [0.55, 0.55, 0.52], smoothstep(0.72, 0.85, e));
  } else {
    const d = smoothstep(0.3, 0.52, e);
    c = mix3([0.02, 0.07, 0.19], [0.05, 0.2, 0.4], d);
  }
  const iceEdge = 0.86 - fbm(x * 5, y * 5, z * 5, 3, seed + 3) * 0.1;
  c = mix3(c, [0.92, 0.94, 0.96], smoothstep(iceEdge, iceEdge + 0.08, lat));
  return c;
};

const paintEarthClouds = (seed) => (u, v, x, y, z) => {
  const w = fbm(x * 2.6 + 3, y * 2.6, z * 2.6, 5, seed);
  const band = 0.75 + 0.25 * Math.sin(v * Math.PI * 5);
  const a = smoothstep(0.5, 0.72, w * band + 0.12);
  return [1, 1, 1, a * 0.9];
};

const paintMars = (seed) => (u, v, x, y, z) => {
  const m = fbm(x * 2.4, y * 2.4, z * 2.4, 6, seed);
  let c = mix3([0.72, 0.42, 0.24], [0.9, 0.6, 0.38], smoothstep(0.35, 0.68, m));
  c = mix3(c, [0.42, 0.24, 0.15], smoothstep(0.55, 0.8, fbm(x * 1.4 + 4, y * 1.4, z * 1.4, 4, seed + 2)));
  const cap = 0.9 - fbm(x * 6, y * 6, z * 6, 3, seed + 8) * 0.07;
  c = mix3(c, [0.95, 0.95, 0.92], smoothstep(cap, cap + 0.05, Math.abs(y)));
  return c;
};

const paintBanded = (seed, bands, stops, spot) => (u, v, x, y, z) => {
  const turb = fbm(x * 3, y * 6, z * 3, 5, seed);
  const warp = fbm(x * 1.5, y * 3, z * 1.5, 3, seed + 4);
  let c = bandPalette(v * Math.PI * bands + turb * 2.6 + warp * 1.4, stops);
  c = mix3(c, mix3(c, [1, 1, 1], 0.25), smoothstep(0.6, 0.85, turb) * 0.5);
  if (spot) {
    let du = Math.abs(u - spot.u);
    du = Math.min(du, 1 - du);
    const d = Math.hypot(du / spot.rw, (v - spot.v) / spot.rh);
    c = mix3(c, spot.color, smoothstep(1, 0.35, d) * spot.strength);
  }
  return c;
};

const paintMoon = (seed) => (u, v, x, y, z) => {
  const maria = fbm(x * 1.4, y * 1.4, z * 1.4, 4, seed);
  let c = mix3([0.62, 0.61, 0.6], [0.36, 0.35, 0.36], smoothstep(0.42, 0.6, maria));
  const craters = fbm(x * 11, y * 11, z * 11, 4, seed + 6);
  c = mix3(c, [0.78, 0.77, 0.75], smoothstep(0.62, 0.75, craters) * 0.6);
  c = mix3(c, [0.28, 0.28, 0.29], smoothstep(0.32, 0.2, craters) * 0.4);
  return c;
};

export const SUN_DATA = {
  name: 'sun',
  diameter: '1,391,000 km',
  orbit: 'galactic center, 225 Myr',
  day: '25.4 Earth days',
  moons: '8 planets',
  note: 'A G-type star holding 99.8% of the system’s mass.',
};

export const PLANETS = [
  {
    key: 'mercury', radius: 0.6, dist: 16, orbitDays: 88, spinHours: 1408, tilt: 0.03, incline: 7, seed: 11, bump: 0.02,
    size: [512, 256], paint: paintRocky(11, [0.55, 0.53, 0.5], [0.33, 0.32, 0.31], [0.72, 0.7, 0.68]),
    data: { name: 'mercury', diameter: '4,879 km', orbit: '88 days', day: '58.6 Earth days', moons: '0', note: 'Airless, scorched by day, frozen by night.' },
  },
  {
    key: 'venus', radius: 0.95, dist: 22, orbitDays: 225, spinHours: -5832, tilt: 177.4, incline: 3.4, seed: 22, bump: 0.008,
    size: [512, 256], paint: paintVenus(22),
    data: { name: 'venus', diameter: '12,104 km', orbit: '225 days', day: '243 Earth days, retrograde', moons: '0', note: 'A runaway greenhouse under sulphuric cloud.' },
  },
  {
    key: 'earth', radius: 1, dist: 29, orbitDays: 365, spinHours: 24, tilt: 23.4, incline: 0, seed: 33, bump: 0.015,
    size: [1024, 512], paint: paintEarth(33), atmosphere: true,
    clouds: { size: [1024, 512], paint: paintEarthClouds(33) },
    moon: { radius: 0.27, dist: 2.4, orbitDays: 27.3, size: [512, 256], paint: paintMoon(44) },
    data: { name: 'earth', diameter: '12,742 km', orbit: '365.25 days', day: '23h 56m', moons: '1', note: 'The only world known to carry life.' },
  },
  {
    key: 'mars', radius: 0.75, dist: 37, orbitDays: 687, spinHours: 24.6, tilt: 25.2, incline: 1.9, seed: 55, bump: 0.02,
    size: [512, 256], paint: paintMars(55),
    data: { name: 'mars', diameter: '6,779 km', orbit: '687 days', day: '24h 37m', moons: '2', note: 'Rust-red deserts and the tallest volcano here.' },
  },
  {
    key: 'jupiter', radius: 3.4, dist: 56, orbitDays: 4333, spinHours: 9.9, tilt: 3.1, incline: 1.3, seed: 66,
    size: [1024, 512],
    paint: paintBanded(66, 13, [[0.86, 0.76, 0.6], [0.7, 0.52, 0.36], [0.93, 0.87, 0.78], [0.56, 0.4, 0.3]],
      { u: 0.34, v: 0.63, rw: 0.05, rh: 0.035, color: [0.72, 0.34, 0.24], strength: 0.9 }),
    data: { name: 'jupiter', diameter: '139,820 km', orbit: '11.9 years', day: '9h 56m', moons: '95', note: 'The Great Red Storm is wider than Earth.' },
  },
  {
    key: 'saturn', radius: 2.9, dist: 76, orbitDays: 10759, spinHours: 10.7, tilt: 26.7, incline: 2.5, seed: 77,
    size: [1024, 512],
    paint: paintBanded(77, 10, [[0.9, 0.82, 0.62], [0.78, 0.66, 0.44], [0.95, 0.9, 0.76]], null),
    rings: { inner: 3.9, outer: 6.6, seed: 77 },
    data: { name: 'saturn', diameter: '116,460 km', orbit: '29.4 years', day: '10h 42m', moons: '146', note: 'Rings of ice, barely tens of metres thick.' },
  },
  {
    key: 'uranus', radius: 1.9, dist: 96, orbitDays: 30687, spinHours: -17.2, tilt: 97.8, incline: 0.8, seed: 88,
    size: [512, 256],
    paint: paintBanded(88, 6, [[0.55, 0.79, 0.8], [0.63, 0.84, 0.84]], null),
    data: { name: 'uranus', diameter: '50,724 km', orbit: '84 years', day: '17h 14m, retrograde', moons: '28', note: 'Rolls around the Sun tipped on its side.' },
  },
  {
    key: 'neptune', radius: 1.85, dist: 114, orbitDays: 60190, spinHours: 16.1, tilt: 28.3, incline: 1.8, seed: 99,
    size: [512, 256],
    paint: paintBanded(99, 6, [[0.16, 0.3, 0.72], [0.24, 0.4, 0.82], [0.12, 0.22, 0.6]],
      { u: 0.6, v: 0.6, rw: 0.045, rh: 0.03, color: [0.05, 0.1, 0.32], strength: 0.85 }),
    data: { name: 'neptune', diameter: '49,244 km', orbit: '165 years', day: '16h 6m', moons: '16', note: 'Supersonic winds tear across the deep blue.' },
  },
];



export function buildPlanetMesh(def, texture) {
  const geo = new THREE.SphereGeometry(def.radius, 48, 32);
  const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, metalness: 0.02 });
  if (def.bump) {
    mat.bumpMap = texture;
    mat.bumpScale = def.bump;
  }
  return new THREE.Mesh(geo, mat);
}

export function buildCloudsMesh(def) {
  const tex = def.clouds.texture;
  const geo = new THREE.SphereGeometry(def.radius * 1.02, 48, 32);
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 1, metalness: 0, depthWrite: false });
  return new THREE.Mesh(geo, mat);
}

export function buildAtmosphereMesh(def) {
  const geo = new THREE.SphereGeometry(def.radius * 1.06, 48, 32);
  const mat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vWorld;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vWorld;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorld);
        float rim = pow(1.0 - abs(dot(vNormal, viewDir)), 2.6);
        vec3 sunDir = normalize(-vWorld);
        vec3 n = normalize(vNormal);
        float lit = 0.25 + 0.75 * max(dot(n, sunDir), 0.0);
        vec3 col = vec3(0.36, 0.6, 1.0) * rim * lit;
        gl_FragColor = vec4(col, rim * lit);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
  });
  return new THREE.Mesh(geo, mat);
}

export function buildRingsMesh(def) {
  const geo = new THREE.RingGeometry(def.rings.inner, def.rings.outer, 256, 1);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = v.length();
    uv.setXY(i, (r - def.rings.inner) / (def.rings.outer - def.rings.inner), 0.5);
  }
  const tex = makeRingTexture(def.rings.seed);
  const mat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, side: THREE.DoubleSide,
    roughness: 0.9, metalness: 0, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function buildOrbitLine(dist, inclineDeg, color) {
  const points = [];
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(a) * dist, 0, Math.sin(a) * dist));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.22 });
  const line = new THREE.LineLoop(geo, mat);
  line.rotation.x = THREE.MathUtils.degToRad(inclineDeg);
  return line;
}
