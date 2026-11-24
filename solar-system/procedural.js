import * as THREE from 'three';

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
export const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

function hash3(x, y, z, seed) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 113.5) * 43758.5453123;
  return h - Math.floor(h);
}

function value3(x, y, z, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const c000 = hash3(xi, yi, zi, seed), c100 = hash3(xi + 1, yi, zi, seed);
  const c010 = hash3(xi, yi + 1, zi, seed), c110 = hash3(xi + 1, yi + 1, zi, seed);
  const c001 = hash3(xi, yi, zi + 1, seed), c101 = hash3(xi + 1, yi, zi + 1, seed);
  const c011 = hash3(xi, yi + 1, zi + 1, seed), c111 = hash3(xi + 1, yi + 1, zi + 1, seed);
  const x00 = lerp(c000, c100, u), x10 = lerp(c010, c110, u);
  const x01 = lerp(c001, c101, u), x11 = lerp(c011, c111, u);
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
}

export function fbm(x, y, z, octaves, seed) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * value3(x * freq, y * freq, z * freq, seed + i * 17.31);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

function sphereDir(u, v) {
  const theta = u * Math.PI * 2;
  const phi = v * Math.PI;
  const s = Math.sin(phi);
  return [Math.cos(theta) * s, Math.cos(phi), Math.sin(theta) * s];
}

export function* textureJob(width, height, paint, { alpha = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(width, height);
  const data = img.data;
  const BAND = 48;
  for (let y0 = 0; y0 < height; y0 += BAND) {
    const y1 = Math.min(height, y0 + BAND);
    for (let y = y0; y < y1; y++) {
      const v = (y + 0.5) / height;
      for (let x = 0; x < width; x++) {
        const u = (x + 0.5) / width;
        const [px, py, pz] = sphereDir(u, v);
        const out = paint(u, v, px, py, pz);
        const i = (y * width + x) * 4;
        data[i] = Math.round(clamp01(out[0]) * 255);
        data[i + 1] = Math.round(clamp01(out[1]) * 255);
        data[i + 2] = Math.round(clamp01(out[2]) * 255);
        data[i + 3] = alpha ? Math.round(clamp01(out[3]) * 255) : 255;
      }
    }
    yield;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function radialSprite(size, stops) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  for (const [offset, color] of stops) g.addColorStop(offset, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeCoronaSprite() {
  return radialSprite(256, [
    [0, 'rgba(255,214,140,0.9)'],
    [0.25, 'rgba(255,160,60,0.32)'],
    [0.6, 'rgba(255,110,35,0.08)'],
    [1, 'rgba(255,100,30,0)'],
  ]);
}

export function makeGlowSprite() {
  return radialSprite(256, [
    [0, 'rgba(255,236,205,0.5)'],
    [0.4, 'rgba(255,190,110,0.12)'],
    [1, 'rgba(255,180,100,0)'],
  ]);
}

export function makeRingTexture(seed) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(1024, 1);
  for (let x = 0; x < 1024; x++) {
    const u = x / 1023;
    const bands = 0.55 + 0.45 * Math.sin(u * 118 + fbm(u * 30, 0, 0, 3, seed) * 8);
    const fine = 0.8 + 0.2 * Math.sin(u * 460 + seed);
    let alpha = 0.5 + 0.45 * bands;
    alpha *= smoothstep(0, 0.06, u) * smoothstep(1, 0.9, u);
    if (u > 0.55 && u < 0.6) alpha *= 0.06;
    if (u > 0.81 && u < 0.83) alpha *= 0.3;
    if (u < 0.1) alpha *= smoothstep(0, 0.1, u) * 0.5;
    const shade = (0.72 + 0.28 * bands) * fine;
    const i = x * 4;
    img.data[i] = Math.round(clamp01(0.86 * shade) * 255);
    img.data[i + 1] = Math.round(clamp01(0.76 * shade) * 255);
    img.data[i + 2] = Math.round(clamp01(0.6 * shade) * 255);
    img.data[i + 3] = Math.round(clamp01(alpha) * 255);
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
