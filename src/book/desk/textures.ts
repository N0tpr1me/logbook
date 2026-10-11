// Procedural canvas textures for the desk (plan: Visual design). No Blender
// and no image downloads: every surface is drawn in code at 1024 px or less,
// once, and cached for the life of the page.

import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'

const cache = new Map<string, Texture>()

function cached(key: string, make: () => Texture): Texture {
  const existing = cache.get(key)
  if (existing) return existing
  const made = make()
  cache.set(key, made)
  return made
}

export interface CanvasSurface {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
}

export function makeCanvas(width: number, height: number): CanvasSurface {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')
  return { canvas, ctx }
}

function toTexture(canvas: HTMLCanvasElement, repeat = false): CanvasTexture {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  if (repeat) {
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
  }
  return texture
}

/** Deterministic hash noise in [0, 1). */
function hash(x: number, y: number, seed: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
  return s - Math.floor(s)
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

/** Value noise in [0, 1). */
export function valueNoise(x: number, y: number, seed = 0): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const tx = smooth(x - xi)
  const ty = smooth(y - yi)
  const a = hash(xi, yi, seed)
  const b = hash(xi + 1, yi, seed)
  const c = hash(xi, yi + 1, seed)
  const d = hash(xi + 1, yi + 1, seed)
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty
}

/** Fractal noise, four octaves, in [0, 1). */
export function fbm(x: number, y: number, seed = 0): number {
  let value = 0
  let amplitude = 0.5
  let frequency = 1
  for (let i = 0; i < 4; i += 1) {
    value += amplitude * valueNoise(x * frequency, y * frequency, seed + i)
    frequency *= 2
    amplitude *= 0.5
  }
  return value
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)))
}

/** Charcoal oak with a long grain along x. Average tone #1B1A18. */
export function oakGrainTexture(): Texture {
  return cached('oak', () => {
    const w = 1024
    const h = 512
    const { canvas, ctx } = makeCanvas(w, h)
    const image = ctx.createImageData(w, h)
    const data = image.data
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        // Long streaks along x: stretch the noise 14:1, plus fine pore noise.
        const grain = fbm(x / 160, y / 11, 3)
        const streak = valueNoise(x / 900 + grain * 1.6, y / 7, 9)
        const pores = valueNoise(x / 3, y / 1.5, 21)
        const tone = 0.62 + (streak - 0.5) * 0.55 + (grain - 0.5) * 0.3 + (pores - 0.5) * 0.14
        const r = 27 * tone + 3
        const g = 26 * tone + 2
        const b = 24 * tone + 1
        const i = (y * w + x) * 4
        data[i] = clamp255(r)
        data[i + 1] = clamp255(g)
        data[i + 2] = clamp255(b)
        data[i + 3] = 255
      }
    }
    ctx.putImageData(image, 0, 0)
    return toTexture(canvas, true)
  })
}

/** Slate cutting mat with a faint 1 cm grid. One texel is about 0.6 mm. */
export function slateMatTexture(): Texture {
  return cached('mat', () => {
    const w = 1024
    const h = 768
    const { canvas, ctx } = makeCanvas(w, h)
    const image = ctx.createImageData(w, h)
    const data = image.data
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const n = fbm(x / 40, y / 40, 5) * 0.5 + valueNoise(x / 2, y / 2, 6) * 0.5
        const tone = 0.86 + (n - 0.5) * 0.3
        const i = (y * w + x) * 4
        data[i] = clamp255(43 * tone)
        data[i + 1] = clamp255(47 * tone)
        data[i + 2] = clamp255(52 * tone)
        data[i + 3] = 255
      }
    }
    ctx.putImageData(image, 0, 0)
    // Grid: 62 × 46 cells over 0.62 × 0.46 m.
    ctx.strokeStyle = 'rgba(190, 200, 210, 0.11)'
    ctx.lineWidth = 1
    const cellX = w / 62
    const cellY = h / 46
    ctx.beginPath()
    for (let c = 0; c <= 62; c += 1) {
      const x = Math.round(c * cellX) + 0.5
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
    }
    for (let r = 0; r <= 46; r += 1) {
      const y = Math.round(r * cellY) + 0.5
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()
    // Heavier 5 cm lines and a border.
    ctx.strokeStyle = 'rgba(190, 200, 210, 0.2)'
    ctx.beginPath()
    for (let c = 1; c < 62; c += 5) {
      const x = Math.round(c * cellX) + 0.5
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
    }
    for (let r = 1; r < 46; r += 5) {
      const y = Math.round(r * cellY) + 0.5
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()
    ctx.strokeStyle = 'rgba(190, 200, 210, 0.28)'
    ctx.lineWidth = 3
    ctx.strokeRect(Math.round(cellX) + 1.5, Math.round(cellY) + 1.5, w - 2 * Math.round(cellX) - 3, h - 2 * Math.round(cellY) - 3)
    return toTexture(canvas)
  })
}

/** Cork coaster: warm speckles. */
export function corkTexture(): Texture {
  return cached('cork', () => {
    const size = 256
    const { canvas, ctx } = makeCanvas(size, size)
    const image = ctx.createImageData(size, size)
    const data = image.data
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const speck = valueNoise(x / 2.2, y / 2.2, 11)
        const blotch = fbm(x / 24, y / 24, 12)
        const tone = 0.78 + (speck - 0.5) * 0.5 + (blotch - 0.5) * 0.35
        const i = (y * size + x) * 4
        data[i] = clamp255(176 * tone)
        data[i + 1] = clamp255(134 * tone)
        data[i + 2] = clamp255(88 * tone)
        data[i + 3] = 255
      }
    }
    ctx.putImageData(image, 0, 0)
    return toTexture(canvas, true)
  })
}

/** Soft radial contact shadow: opaque black at the centre fading to clear. */
export function shadowBlobTexture(): Texture {
  return cached('shadow', () => {
    const size = 128
    const { canvas, ctx } = makeCanvas(size, size)
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)')
    gradient.addColorStop(0.35, 'rgba(0, 0, 0, 0.75)')
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.22)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    const texture = toTexture(canvas)
    texture.colorSpace = NoColorSpace
    return texture
  })
}

/** A soft steam puff for the sprites. */
export function steamPuffTexture(): Texture {
  return cached('steam', () => {
    const size = 128
    const { canvas, ctx } = makeCanvas(size, size)
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, 'rgba(236, 234, 228, 0.55)')
    gradient.addColorStop(0.4, 'rgba(236, 234, 228, 0.22)')
    gradient.addColorStop(1, 'rgba(236, 234, 228, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    return toTexture(canvas)
  })
}

/** The folded CV, a one-page CV drawn as grey lines on paper. 512 × 724 (A4). */
export function cvPaperTexture(): Texture {
  return cached('cv', () => {
    const w = 512
    const h = 724
    const { canvas, ctx } = makeCanvas(w, h)
    ctx.fillStyle = '#E9E6DC'
    ctx.fillRect(0, 0, w, h)
    // Paper fibre.
    const image = ctx.getImageData(0, 0, w, h)
    const data = image.data
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const n = (valueNoise(x / 3, y / 3, 31) - 0.5) * 10
        const i = (y * w + x) * 4
        data[i] = clamp255(data[i] + n)
        data[i + 1] = clamp255(data[i + 1] + n)
        data[i + 2] = clamp255(data[i + 2] + n)
      }
    }
    ctx.putImageData(image, 0, 0)
    const margin = 56
    ctx.fillStyle = '#1E2633'
    ctx.font = '600 30px "IBM Plex Sans", system-ui, sans-serif'
    ctx.fillText('Zain Ali', margin, margin + 30)
    ctx.font = '400 15px "IBM Plex Sans", system-ui, sans-serif'
    ctx.fillStyle = '#4E5A57'
    ctx.fillText('Software, AI and markets', margin, margin + 56)
    // Body lines in three blocks, as grey bars.
    ctx.fillStyle = 'rgba(30, 38, 51, 0.28)'
    let y = margin + 96
    const blocks = [6, 8, 7, 5]
    blocks.forEach((lines, b) => {
      ctx.fillStyle = 'rgba(30, 38, 51, 0.6)'
      ctx.fillRect(margin, y, 120, 8)
      y += 20
      for (let l = 0; l < lines; l += 1) {
        const width = w - margin * 2 - (l === lines - 1 ? 150 : (hash(l, b, 2) * 90) | 0)
        ctx.fillStyle = 'rgba(30, 38, 51, 0.24)'
        ctx.fillRect(margin, y, width, 5)
        y += 13
      }
      y += 18
    })
    // Highlighter mark on one line.
    ctx.fillStyle = 'rgba(243, 226, 90, 0.75)'
    ctx.fillRect(margin - 2, margin + 96 + 20 + 13, 210, 9)
    return toTexture(canvas)
  })
}

/** The drone's cargo pod: a white cross on first-aid green #2E7D4F, never red. */
export function podCrossTexture(): Texture {
  return cached('pod', () => {
    const size = 128
    const { canvas, ctx } = makeCanvas(size, size)
    ctx.fillStyle = '#2E7D4F'
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = '#F4F4F0'
    const arm = 14
    const len = 60
    ctx.fillRect(size / 2 - arm / 2, size / 2 - len / 2, arm, len)
    ctx.fillRect(size / 2 - len / 2, size / 2 - arm / 2, len, arm)
    return toTexture(canvas)
  })
}

/** Drone landing pad: dark rubber disc with a ring and an H. */
export function landingPadTexture(): Texture {
  return cached('pad', () => {
    const size = 256
    const { canvas, ctx } = makeCanvas(size, size)
    ctx.fillStyle = '#17181A'
    ctx.fillRect(0, 0, size, size)
    const image = ctx.getImageData(0, 0, size, size)
    const data = image.data
    for (let i = 0; i < data.length; i += 4) {
      const n = (hash(i, i >> 8, 44) - 0.5) * 8
      data[i] = clamp255(data[i] + n)
      data[i + 1] = clamp255(data[i + 1] + n)
      data[i + 2] = clamp255(data[i + 2] + n)
    }
    ctx.putImageData(image, 0, 0)
    ctx.strokeStyle = 'rgba(236, 234, 228, 0.55)'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size * 0.4, 0, Math.PI * 2)
    ctx.stroke()
    ctx.lineWidth = 9
    ctx.beginPath()
    const h = size * 0.17
    const wHalf = size * 0.1
    ctx.moveTo(size / 2 - wHalf, size / 2 - h)
    ctx.lineTo(size / 2 - wHalf, size / 2 + h)
    ctx.moveTo(size / 2 + wHalf, size / 2 - h)
    ctx.lineTo(size / 2 + wHalf, size / 2 + h)
    ctx.moveTo(size / 2 - wHalf, size / 2)
    ctx.lineTo(size / 2 + wHalf, size / 2)
    ctx.stroke()
    return toTexture(canvas)
  })
}

/** Every texture the desk uses, so the loader can upload them before the reveal. */
export function allDeskTextures(): Texture[] {
  return [
    oakGrainTexture(),
    slateMatTexture(),
    corkTexture(),
    shadowBlobTexture(),
    steamPuffTexture(),
    cvPaperTexture(),
    podCrossTexture(),
    landingPadTexture(),
  ]
}
