import * as THREE from "three"

/** Put your full-color profile PNG in public/textures/ and bump the version when replacing it. */
export const PARTICLE_PROFILE_IMAGE = "/textures/particle-profile.png?v=4"

export type ParticlePoint = {
  x: number
  y: number
  z: number
  depth?: number
  r?: number
  g?: number
  b?: number
  jitterX?: number
  jitterY?: number
  cellArea?: number
}

export type HalftoneCell = {
  nx: number
  ny: number
  weight: number
  r: number
  g: number
  b: number
  edge: number
}

export type ProcessedPortrait = {
  cells: HalftoneCell[]
  cols: number
  rows: number
  bboxAspect: number
  /** True when the source is already dot-art — skip re-halftoning and keep pixel colors. */
  directSample?: boolean
}

let cachedPortrait: ProcessedPortrait | null = null
let cachedImageUrl: string | null = null

/** Adaptive particle count — scales with viewport and caps for performance. */
export const getAdaptiveParticleCount = (): number => {
  const w = window.innerWidth
  const h = window.innerHeight
  const dpr = Math.min(window.devicePixelRatio, 1.5)
  const imagePixels = w * h * dpr * dpr

  if (w < 640) return Math.min(6000, Math.max(4000, Math.floor(imagePixels * 0.1)))
  if (w < 1024) return Math.min(9000, Math.max(6000, Math.floor(imagePixels * 0.11)))
  return Math.min(12000, Math.max(8000, Math.floor(imagePixels * 0.12)))
}

/** Warm portrait CPU pipeline during idle time so scroll never blocks on it. */
export const prefetchParticlePortrait = () =>
  loadImageCloudSamples(PARTICLE_PROFILE_IMAGE)

export function visibleSize(camera: THREE.PerspectiveCamera) {
  const vFov = (camera.fov * Math.PI) / 180
  const vh = 2 * Math.tan(vFov / 2) * camera.position.z
  const vw = vh * camera.aspect
  return { vw, vh }
}

const isBackgroundPixel = (
  r: number,
  g: number,
  b: number,
  a: number
) => {
  if (a < 0.12) return true

  const whiteDist = Math.hypot(1 - r, 1 - g, 1 - b)
  if (whiteDist < 0.06) return true

  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  const maxC = Math.max(r, g, b)
  const minC = Math.min(r, g, b)
  const sat = maxC > 0.001 ? (maxC - minC) / maxC : 0
  if (lum > 0.97 && sat < 0.04) return true

  // Strip warm sunburst / flat backdrop tones that are not part of the character.
  const isWarmBackdrop =
    r > 0.72 && g > 0.55 && b < 0.45 && lum > 0.62 && sat > 0.18
  if (isWarmBackdrop) return true

  return false
}

/** Evenly subsample pre-made dot cells without re-gridding positions. */
const subsampleCells = (cells: HalftoneCell[], target: number): HalftoneCell[] => {
  if (cells.length <= target) return cells

  const out: HalftoneCell[] = []
  const step = cells.length / target
  for (let i = 0; i < target; i++) {
    out.push(cells[Math.floor(i * step)])
  }
  return out
}

/** 3×3 box blur on RGBA image data. */
const boxBlur = (src: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(src.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const px = x + dx
          const py = y + dy
          if (px < 0 || py < 0 || px >= w || py >= h) continue
          const i = (py * w + px) * 4
          r += src[i]
          g += src[i + 1]
          b += src[i + 2]
          a += src[i + 3]
          n++
        }
      }
      const o = (y * w + x) * 4
      out[o] = r / n
      out[o + 1] = g / n
      out[o + 2] = b / n
      out[o + 3] = a / n
    }
  }
  return out
}

/** Unsharp mask — restores edge definition after blur. */
const unsharpMask = (
  blurred: Uint8ClampedArray,
  original: Uint8ClampedArray,
  _w: number,
  _h: number,
  amount = 0.45
): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(original.length)
  for (let i = 0; i < original.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const o = original[i + c]
      const b = blurred[i + c]
      out[i + c] = Math.max(0, Math.min(255, o + (o - b) * amount))
    }
    out[i + 3] = original[i + 3]
  }
  return out
}

type Rgb = { r: number; g: number; b: number }

/** Build a reduced palette via median-cut style bucketing. */
const buildPalette = (pixels: Rgb[], k = 48): Rgb[] => {
  if (pixels.length === 0) return [{ r: 0.5, g: 0.5, b: 0.5 }]

  const bucket = [...pixels]
  const palette: Rgb[] = []

  const split = (arr: Rgb[], depth: number) => {
    if (arr.length === 0 || palette.length >= k) return
    if (depth >= 5 || arr.length <= 2) {
      let r = 0
      let g = 0
      let b = 0
      for (const p of arr) {
        r += p.r
        g += p.g
        b += p.b
      }
      palette.push({ r: r / arr.length, g: g / arr.length, b: b / arr.length })
      return
    }

    let minR = 1
    let maxR = 0
    let minG = 1
    let maxG = 0
    let minB = 1
    let maxB = 0
    for (const p of arr) {
      minR = Math.min(minR, p.r)
      maxR = Math.max(maxR, p.r)
      minG = Math.min(minG, p.g)
      maxG = Math.max(maxG, p.g)
      minB = Math.min(minB, p.b)
      maxB = Math.max(maxB, p.b)
    }
    const rangeR = maxR - minR
    const rangeG = maxG - minG
    const rangeB = maxB - minB

    const channel: "r" | "g" | "b" =
      rangeR >= rangeG && rangeR >= rangeB ? "r" : rangeG >= rangeB ? "g" : "b"

    arr.sort((a, b) => a[channel] - b[channel])
    const mid = Math.floor(arr.length / 2)
    split(arr.slice(0, mid), depth + 1)
    split(arr.slice(mid), depth + 1)
  }

  split(bucket, 0)
  return palette.length > 0 ? palette : [{ r: 0.5, g: 0.5, b: 0.5 }]
}

const nearestPaletteColor = (r: number, g: number, b: number, palette: Rgb[]): Rgb => {
  let best = palette[0]
  let bestD = Infinity
  for (const p of palette) {
    const d = (p.r - r) ** 2 + (p.g - g) ** 2 + (p.b - b) ** 2
    if (d < bestD) {
      bestD = d
      best = p
    }
  }
  return best
}

/** Portrait scale and vertical offset tuned per breakpoint. */
const getPortraitFraming = (vw: number, vh: number) => {
  const w = window.innerWidth
  let scaleFactor = 0.82
  let offsetYFactor = -0.02

  if (w < 640) {
    scaleFactor = 0.94
    offsetYFactor = -0.005
  } else if (w >= 1400) {
    scaleFactor = 0.86
    offsetYFactor = -0.025
  }

  const aspect = vw / Math.max(vh, 1)
  const aspectScale = aspect > 1.2 ? 0.96 : aspect < 0.75 ? 0.98 : 1

  // Portrait bbox is square in world space — contain within both axes so
  // narrow mobile viewports don't clip the sides.
  const fitDim = Math.min(vh, vw)

  return {
    scale: fitDim * scaleFactor * aspectScale,
    offsetX: 0,
    offsetY: vh * offsetYFactor,
  }
}

/**
 * CPU pipeline: downscale → box-blur → unsharp → palette quantize → grid cells.
 * Returns a fine grid that buildImageCloud subsamples to the adaptive particle count.
 */
export function loadImageCloudSamples(url: string): Promise<ProcessedPortrait> {
  if (cachedPortrait && cachedImageUrl === url) {
    return Promise.resolve(cachedPortrait)
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const srcW = img.width
      const srcH = img.height

      const bboxCanvas = document.createElement("canvas")
      bboxCanvas.width = srcW
      bboxCanvas.height = srcH
      const bboxCtx = bboxCanvas.getContext("2d")
      if (!bboxCtx) {
        reject(new Error("Could not read image pixels"))
        return
      }
      bboxCtx.drawImage(img, 0, 0)
      const srcData = bboxCtx.getImageData(0, 0, srcW, srcH).data

      let minX = srcW
      let minY = srcH
      let maxX = 0
      let maxY = 0

      for (let y = 0; y < srcH; y++) {
        for (let x = 0; x < srcW; x++) {
          const i = (y * srcW + x) * 4
          const r = srcData[i] / 255
          const g = srcData[i + 1] / 255
          const b = srcData[i + 2] / 255
          const a = srcData[i + 3] / 255
          if (isBackgroundPixel(r, g, b, a)) continue
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }

      if (maxX <= minX || maxY <= minY) {
        reject(new Error("No dark pixels found in image"))
        return
      }

      const bw = maxX - minX + 1
      const bh = maxY - minY + 1
      const bboxAspect = bw / bh

      const procW = Math.min(480, bw)
      const procH = Math.round(procW / bboxAspect)

      const procCanvas = document.createElement("canvas")
      procCanvas.width = procW
      procCanvas.height = procH
      const procCtx = procCanvas.getContext("2d")
      if (!procCtx) {
        reject(new Error("Could not create processing canvas"))
        return
      }

      procCtx.drawImage(
        bboxCanvas,
        minX,
        minY,
        bw,
        bh,
        0,
        0,
        procW,
        procH
      )

      const rawPixels = procCtx.getImageData(0, 0, procW, procH)
      const pixelData = rawPixels.data

      let coloredCount = 0
      for (let i = 0; i < pixelData.length; i += 4) {
        const r = pixelData[i] / 255
        const g = pixelData[i + 1] / 255
        const b = pixelData[i + 2] / 255
        const a = pixelData[i + 3] / 255
        if (isBackgroundPixel(r, g, b, a)) continue
        coloredCount++
      }

      const totalPixels = procW * procH
      const coloredRatio = coloredCount / Math.max(totalPixels, 1)
      const directSample = coloredRatio < 0.42 && coloredCount > 0

      const fineCols = procW
      const fineRows = procH
      const cells: HalftoneCell[] = []

      if (directSample) {
        for (let gy = 0; gy < fineRows; gy++) {
          for (let gx = 0; gx < fineCols; gx++) {
            const i = (gy * fineCols + gx) * 4
            const r0 = pixelData[i] / 255
            const g0 = pixelData[i + 1] / 255
            const b0 = pixelData[i + 2] / 255
            const a0 = pixelData[i + 3] / 255
            if (isBackgroundPixel(r0, g0, b0, a0)) continue

            const nx = (gx + 0.5) / fineCols - 0.5
            const ny = 0.5 - (gy + 0.5) / fineRows

            cells.push({
              nx,
              ny,
              weight: 0.44,
              r: r0,
              g: g0,
              b: b0,
              edge: 0,
            })
          }
        }
      } else {
        const blurred = boxBlur(pixelData, procW, procH)
        const sharpened = unsharpMask(blurred, pixelData, procW, procH)

        const palettePixels: Rgb[] = []
        for (let i = 0; i < sharpened.length; i += 4) {
          const r = sharpened[i] / 255
          const g = sharpened[i + 1] / 255
          const b = sharpened[i + 2] / 255
          const a = sharpened[i + 3] / 255
          if (isBackgroundPixel(r, g, b, a)) continue
          palettePixels.push({ r, g, b })
        }

        const palette = buildPalette(palettePixels, 48)

        const lumGrid = new Float32Array(procW * procH)
        for (let y = 0; y < procH; y++) {
          for (let x = 0; x < procW; x++) {
            const i = (y * procW + x) * 4
            const r = sharpened[i] / 255
            const g = sharpened[i + 1] / 255
            const b = sharpened[i + 2] / 255
            lumGrid[y * procW + x] = 0.299 * r + 0.587 * g + 0.114 * b
          }
        }

        for (let gy = 0; gy < fineRows; gy++) {
          for (let gx = 0; gx < fineCols; gx++) {
            const i = (gy * fineCols + gx) * 4
            const r0 = sharpened[i] / 255
            const g0 = sharpened[i + 1] / 255
            const b0 = sharpened[i + 2] / 255
            const a0 = sharpened[i + 3] / 255
            if (isBackgroundPixel(r0, g0, b0, a0)) continue

            const q = nearestPaletteColor(r0, g0, b0, palette)
            const lum = 0.299 * q.r + 0.587 * q.g + 0.114 * q.b
            const weight = Math.max(0.06, Math.pow(1 - lum * 0.92, 0.7))

            const lx = Math.max(0, Math.min(fineCols - 1, gx - 1))
            const rx = Math.max(0, Math.min(fineCols - 1, gx + 1))
            const ty = Math.max(0, Math.min(fineRows - 1, gy - 1))
            const by = Math.max(0, Math.min(fineRows - 1, gy + 1))
            const lumC = lumGrid[gy * fineCols + gx]
            const grad =
              Math.abs(lumGrid[gy * fineCols + lx] - lumC) +
              Math.abs(lumGrid[gy * fineCols + rx] - lumC) +
              Math.abs(lumGrid[ty * fineCols + gx] - lumC) +
              Math.abs(lumGrid[by * fineCols + gx] - lumC)
            const edge = Math.min(1, grad * 6)

            const nx = (gx + 0.5) / fineCols - 0.5
            const ny = 0.5 - (gy + 0.5) / fineRows

            cells.push({
              nx,
              ny,
              weight: weight * (1 + edge * 0.35),
              r: q.r,
              g: q.g,
              b: q.b,
              edge,
            })
          }
        }
      }

      if (cells.length === 0) {
        reject(new Error("No halftone cells found in image"))
        return
      }

      const result: ProcessedPortrait = {
        cells,
        cols: fineCols,
        rows: fineRows,
        bboxAspect,
        directSample,
      }

      cachedPortrait = result
      cachedImageUrl = url
      resolve(result)
    }
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

/** Maps portrait cells into world-space points — subsample only (O(n), no grid scan). */
export function buildImageCloud(
  n: number,
  vw: number,
  vh: number,
  portrait: ProcessedPortrait
): ParticlePoint[] {
  const grid = subsampleCells(portrait.cells, n)
  const pts: ParticlePoint[] = []
  const { scale, offsetX, offsetY } = getPortraitFraming(vw, vh)
  const cellArea = (scale / Math.sqrt(grid.length)) ** 2
  const jitterAmp = portrait.directSample ? scale * 0.00035 : scale * 0.00175

  for (const cell of grid) {
    const jx = (Math.random() - 0.5) * jitterAmp
    const jy = (Math.random() - 0.5) * jitterAmp

    pts.push({
      x: offsetX + cell.nx * scale,
      y: offsetY + cell.ny * scale,
      z: 0,
      depth: cell.weight,
      r: cell.r,
      g: cell.g,
      b: cell.b,
      jitterX: jx,
      jitterY: jy,
      cellArea,
    })
  }

  return pts
}

/** Side-profile head point cloud (fallback if image fails to load). */
export function buildHeadCloud(n: number, vw: number, vh: number): ParticlePoint[] {
  const pts: ParticlePoint[] = []

  const HX = vw * 0.22
  const HY = vh * 0.02
  const S = vh * 0.4

  const sdf = (nx: number, ny: number) => {
    const skullA = 0.68
    const skullB = 0.95
    let d = (nx * nx) / (skullA * skullA) + (ny * ny) / (skullB * skullB)

    if (nx > 0.3) d += (nx - 0.3) * 0.6
    if (nx < -0.1 && ny < -0.3 && ny > -0.75) d -= 0.06

    const noseDist = Math.hypot(nx + 0.82, ny - 0.06)
    if (noseDist < 0.17) d -= (0.17 - noseDist) * 1.8

    const lipDist = Math.hypot(nx + 0.77, ny - 0.22)
    if (lipDist < 0.1) d -= 0.04

    const chinDist = Math.hypot(nx + 0.68, ny - 0.52)
    if (chinDist < 0.16) d -= (0.16 - chinDist) * 1.0

    if (nx < -0.5 && nx > -0.75 && ny < -0.38 && ny > -0.52) d -= 0.05

    return d
  }

  const inNeck = (nx: number, ny: number) => {
    if (ny < 0.62 || ny > 1.05) return false
    const neckW = 0.14 - (ny - 0.62) * 0.05
    return nx > -0.12 - neckW && nx < -0.12 + neckW
  }

  const inEar = (nx: number, ny: number) => {
    return Math.hypot(nx - 0.58, ny) < 0.14
  }

  let attempts = 0
  while (pts.length < n && attempts < n * 40) {
    attempts++
    let nx: number
    let ny: number
    if (Math.random() < 0.55) {
      nx = -0.9 + Math.random() * 1.1
      ny = -1.0 + Math.random() * 2.1
    } else {
      nx = -0.9 + Math.random() * 1.65
      ny = -1.0 + Math.random() * 2.1
    }

    const inside = sdf(nx, ny) < 1.0 || inNeck(nx, ny) || inEar(nx, ny)
    if (!inside) continue

    const depth = Math.max(0, Math.min(1, (-nx + 0.7) / 1.4))
    const skin = { r: 0.86, g: 0.72, b: 0.62 }
    const hair = { r: 0.22, g: 0.16, b: 0.12 }
    const shade = depth < 0.45 ? hair : skin
    pts.push({
      x: HX + nx * S * 0.88,
      y: HY - ny * S,
      z: 0,
      depth,
      r: shade.r,
      g: shade.g,
      b: shade.b,
      jitterX: 0,
      jitterY: 0,
      cellArea: 1,
    })
  }

  while (pts.length < n) {
    const r = pts[Math.floor(Math.random() * pts.length)]
    pts.push({
      x: r.x + (Math.random() - 0.5) * 0.05,
      y: r.y + (Math.random() - 0.5) * 0.05,
      z: 0,
      depth: r.depth,
      r: r.r,
      g: r.g,
      b: r.b,
      jitterX: 0,
      jitterY: 0,
      cellArea: r.cellArea,
    })
  }

  return pts
}

/** Flowing wave field — spread across most of the viewport. */
export function buildWaveCloud(n: number, vw: number, vh: number): ParticlePoint[] {
  const pts: ParticlePoint[] = []
  for (let i = 0; i < n; i++) {
    const x = (Math.random() - 0.5) * vw * 1.15
    const band = Math.random()
    const yBase = -vh * 0.52 + band * vh * 0.92
    const slope = (x / vw) * vh * 0.1
    const ripple = Math.sin(x * 0.35 + band * 6.28) * vh * 0.04
    const y = yBase + slope + ripple + (Math.random() - 0.5) * vh * 0.06
    pts.push({ x, y, z: (Math.random() - 0.5) * 0.35 })
  }
  return pts
}

export function buildParticleBuffers(
  n: number,
  vw: number,
  vh: number,
  targetBuilder: (n: number, vw: number, vh: number) => ParticlePoint[] = buildHeadCloud
) {
  const headPts = targetBuilder(n, vw, vh)
  const actualN = headPts.length
  const wavePts = buildWaveCloud(actualN, vw, vh)

  const srcPos = new Float32Array(actualN * 3)
  const dstPos = new Float32Array(actualN * 3)
  const seeds = new Float32Array(actualN)
  const sizes = new Float32Array(actualN)
  const targetColors = new Float32Array(actualN * 3)
  const targetWeights = new Float32Array(actualN)
  const jitters = new Float32Array(actualN * 2)
  const cellAreas = new Float32Array(actualN)

  for (let i = 0; i < actualN; i++) {
    const w = wavePts[i]
    const h = headPts[i]
    const s = Math.random()

    srcPos[i * 3] = w.x
    srcPos[i * 3 + 1] = w.y
    srcPos[i * 3 + 2] = w.z || 0
    dstPos[i * 3] = h.x
    dstPos[i * 3 + 1] = h.y
    dstPos[i * 3 + 2] = 0
    seeds[i] = s

    targetColors[i * 3] = h.r ?? 0.8
    targetColors[i * 3 + 1] = h.g ?? 0.68
    targetColors[i * 3 + 2] = h.b ?? 1.0
    targetWeights[i] = h.depth ?? 0.5
    jitters[i * 2] = h.jitterX ?? 0
    jitters[i * 2 + 1] = h.jitterY ?? 0
    cellAreas[i] = h.cellArea ?? 1

    const waveDepth = (w.y + vh * 0.5) / (vh * 0.58)
    sizes[i] = 0.32 + Math.max(0, waveDepth) * 0.5 + s * 0.28
  }

  return {
    srcPos,
    dstPos,
    seeds,
    sizes,
    targetColors,
    targetWeights,
    jitters,
    cellAreas,
    count: actualN,
  }
}
