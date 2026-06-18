import * as THREE from "three";

export const PARTICLE_COUNT = 6500;

/** Put your profile PNG in public/textures/ and update this path. */
export const PARTICLE_PROFILE_IMAGE = "/textures/particle-profile.png";

export type ParticlePoint = { x: number; y: number; z: number; depth?: number };

export type ImageSample = { nx: number; ny: number; weight: number };

let cachedImageSamples: ImageSample[] | null = null;
let cachedImageUrl: string | null = null;

export function visibleSize(camera: THREE.PerspectiveCamera) {
  const vFov = (camera.fov * Math.PI) / 180;
  const vh = 2 * Math.tan(vFov / 2) * camera.position.z;
  const vw = vh * camera.aspect;
  return { vw, vh };
}

/**
 * Reads dark pixels from a black-on-white PNG and returns normalized sample points.
 * White background is ignored; each dark dot becomes a morph target position.
 */
export function loadImageCloudSamples(
  url: string,
  threshold = 0.82
): Promise<ImageSample[]> {
  if (cachedImageSamples && cachedImageUrl === url) {
    return Promise.resolve(cachedImageSamples);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const w = img.width;
      const h = img.height;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not read image pixels"));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, w, h).data;

      const raw: { x: number; y: number; weight: number }[] = [];
      let minX = w;
      let minY = h;
      let maxX = 0;
      let maxY = 0;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = data[i] / 255;
          const g = data[i + 1] / 255;
          const b = data[i + 2] / 255;
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          if (lum < threshold) {
            raw.push({ x, y, weight: 1 - lum });
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      if (raw.length === 0) {
        reject(new Error("No dark pixels found in image"));
        return;
      }

      const bw = maxX - minX || 1;
      const bh = maxY - minY || 1;

      const samples: ImageSample[] = raw.map((p) => ({
        nx: (p.x - minX) / bw - 0.5,
        ny: 0.5 - (p.y - minY) / bh,
        weight: p.weight,
      }));

      cachedImageSamples = samples;
      cachedImageUrl = url;
      resolve(samples);
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/** Maps image samples into world-space points matching the viewport. */
export function buildImageCloud(
  n: number,
  vw: number,
  vh: number,
  samples: ImageSample[]
): ParticlePoint[] {
  const pts: ParticlePoint[] = [];
  const scale = vh * 0.78;
  const offsetX = vw * 0.04;
  const offsetY = 0;

  for (let i = 0; i < n; i++) {
    const s = samples[Math.floor(Math.random() * samples.length)];
    const jitter = scale * 0.004;
    pts.push({
      x: offsetX + s.nx * scale + (Math.random() - 0.5) * jitter,
      y: offsetY + s.ny * scale + (Math.random() - 0.5) * jitter,
      z: 0,
      depth: s.weight,
    });
  }

  return pts;
}

/** Side-profile head point cloud (fallback if image fails to load). */
export function buildHeadCloud(n: number, vw: number, vh: number): ParticlePoint[] {
  const pts: ParticlePoint[] = [];

  const HX = vw * 0.22;
  const HY = vh * 0.02;
  const S = vh * 0.4;

  function sdf(nx: number, ny: number) {
    const skullA = 0.68;
    const skullB = 0.95;
    let d = (nx * nx) / (skullA * skullA) + (ny * ny) / (skullB * skullB);

    if (nx > 0.3) d += (nx - 0.3) * 0.6;
    if (nx < -0.1 && ny < -0.3 && ny > -0.75) d -= 0.06;

    const noseDist = Math.hypot(nx + 0.82, ny - 0.06);
    if (noseDist < 0.17) d -= (0.17 - noseDist) * 1.8;

    const lipDist = Math.hypot(nx + 0.77, ny - 0.22);
    if (lipDist < 0.1) d -= 0.04;

    const chinDist = Math.hypot(nx + 0.68, ny - 0.52);
    if (chinDist < 0.16) d -= (0.16 - chinDist) * 1.0;

    if (nx < -0.5 && nx > -0.75 && ny < -0.38 && ny > -0.52) d -= 0.05;

    return d;
  }

  function inNeck(nx: number, ny: number) {
    if (ny < 0.62 || ny > 1.05) return false;
    const neckW = 0.14 - (ny - 0.62) * 0.05;
    return nx > -0.12 - neckW && nx < -0.12 + neckW;
  }

  function inEar(nx: number, ny: number) {
    return Math.hypot(nx - 0.58, ny) < 0.14;
  }

  let attempts = 0;
  while (pts.length < n && attempts < n * 40) {
    attempts++;
    let nx: number;
    let ny: number;
    if (Math.random() < 0.55) {
      nx = -0.9 + Math.random() * 1.1;
      ny = -1.0 + Math.random() * 2.1;
    } else {
      nx = -0.9 + Math.random() * 1.65;
      ny = -1.0 + Math.random() * 2.1;
    }

    const inside = sdf(nx, ny) < 1.0 || inNeck(nx, ny) || inEar(nx, ny);
    if (!inside) continue;

    const depth = Math.max(0, Math.min(1, (-nx + 0.7) / 1.4));
    pts.push({
      x: HX + nx * S * 0.88,
      y: HY - ny * S,
      z: 0,
      depth,
    });
  }

  while (pts.length < n) {
    const r = pts[Math.floor(Math.random() * pts.length)];
    pts.push({
      x: r.x + (Math.random() - 0.5) * 0.05,
      y: r.y + (Math.random() - 0.5) * 0.05,
      z: 0,
      depth: r.depth,
    });
  }

  return pts;
}

/** Flowing wave band across the lower screen. */
export function buildWaveCloud(n: number, vw: number, vh: number): ParticlePoint[] {
  const pts: ParticlePoint[] = [];
  for (let i = 0; i < n; i++) {
    const x = (Math.random() - 0.5) * vw * 1.05;
    const yBase = -vh * 0.5 + Math.random() * vh * 0.58;
    const slope = (x / vw) * vh * 0.08;
    const y = yBase + slope + (Math.random() - 0.5) * vh * 0.08;
    pts.push({ x, y, z: (Math.random() - 0.5) * 0.3 });
  }
  return pts;
}

export function buildParticleBuffers(
  n: number,
  vw: number,
  vh: number,
  targetBuilder: (n: number, vw: number, vh: number) => ParticlePoint[] = buildHeadCloud
) {
  const wavePts = buildWaveCloud(n, vw, vh);
  const headPts = targetBuilder(n, vw, vh);

  const srcPos = new Float32Array(n * 3);
  const dstPos = new Float32Array(n * 3);
  const seeds = new Float32Array(n);
  const sizes = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const w = wavePts[i];
    const h = headPts[i];
    const s = Math.random();

    srcPos[i * 3] = w.x;
    srcPos[i * 3 + 1] = w.y;
    srcPos[i * 3 + 2] = w.z || 0;
    dstPos[i * 3] = h.x;
    dstPos[i * 3 + 1] = h.y;
    dstPos[i * 3 + 2] = 0;
    seeds[i] = s;

    const waveDepth = (w.y + vh * 0.5) / (vh * 0.58);
    sizes[i] = 0.32 + Math.max(0, waveDepth) * 0.5 + s * 0.28;
  }

  return { srcPos, dstPos, seeds, sizes };
}
