// Page textures: loading the real page images, and canvas placeholders so
// the harness works before any page image exists.
//
// Real pages are lossless greyscale ink layers (plan: Loading and
// performance); the shader draws the paper and grid itself, so the ink stays
// sharp. A plain RGBA image works too and is composited by its alpha.

import * as THREE from 'three'
import { GRID_COLOUR, INK_COLOUR, PAPER_COLOUR, type PageSide } from './PageMaterial'
import { PAGE_HEIGHT, PAGE_WIDTH } from './layout'

/** Anisotropic filtering level for page textures (plan: 8x). */
export const PAGE_ANISOTROPY = 8

export interface PageTextures {
  /** The right page of this sheet's spread. */
  front: PageSide
  /** The left page of the next spread (the sheet's other side). */
  back: PageSide
}

export interface PageTextureUrls {
  front: string
  back: string
  /** True when both images are greyscale ink masks (the default for real pages). */
  inkMask?: boolean
}

function prepareTexture(texture: THREE.Texture, inkMask: boolean, anisotropy: number): THREE.Texture {
  texture.colorSpace = inkMask ? THREE.NoColorSpace : THREE.SRGBColorSpace
  texture.anisotropy = anisotropy
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true
  return texture
}

export interface LoadOptions {
  anisotropy?: number
  loader?: THREE.TextureLoader
}

/** Load every page image with mipmaps, anisotropy and the right colour space. */
export async function loadPageTextures(urls: readonly PageTextureUrls[], options: LoadOptions = {}): Promise<PageTextures[]> {
  const loader = options.loader ?? new THREE.TextureLoader()
  const anisotropy = options.anisotropy ?? PAGE_ANISOTROPY
  const load = async (url: string, inkMask: boolean): Promise<PageSide> => {
    const texture = await loader.loadAsync(url)
    return { texture: prepareTexture(texture, inkMask, anisotropy), inkMask }
  }
  return Promise.all(
    urls.map(async ({ front, back, inkMask = true }) => {
      const [frontSide, backSide] = await Promise.all([load(front, inkMask), load(back, inkMask)])
      return { front: frontSide, back: backSide }
    }),
  )
}

export interface PlaceholderOptions {
  /** Canvas width in pixels; height follows the A4 ratio. */
  width?: number
  /** Small text at the top corner, such as a page number. */
  corner?: string
  /** Which top corner the text sits in; a sheet's back is mirrored, so its outer corner is the left. */
  cornerSide?: 'left' | 'right'
  anisotropy?: number
}

const PLACEHOLDER_WIDTH = 1024

/** A page drawn on a canvas: paper colour, 5 mm grid and a big label. */
export function makePlaceholderTexture(label: string, options: PlaceholderOptions = {}): PageSide {
  const width = options.width ?? PLACEHOLDER_WIDTH
  const height = Math.round((width * PAGE_HEIGHT) / PAGE_WIDTH)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not available for placeholder pages')

  ctx.fillStyle = PAPER_COLOUR
  ctx.fillRect(0, 0, width, height)
  drawGrid(ctx, width, height)
  drawLabel(ctx, label, width, height)
  if (options.corner) {
    ctx.fillStyle = INK_COLOUR
    ctx.font = `500 ${Math.round(width * 0.028)}px "IBM Plex Sans", system-ui, sans-serif`
    const left = options.cornerSide === 'left'
    ctx.textAlign = left ? 'left' : 'right'
    ctx.textBaseline = 'top'
    ctx.fillText(options.corner, width * (left ? 0.08 : 0.92), height * 0.045)
  }

  const texture = new THREE.CanvasTexture(canvas)
  return { texture: prepareTexture(texture, false, options.anisotropy ?? PAGE_ANISOTROPY), inkMask: false }
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const step = (width / PAGE_WIDTH) * 0.005
  ctx.strokeStyle = GRID_COLOUR
  ctx.lineWidth = Math.max(1, width / 1024)
  ctx.beginPath()
  for (let x = step; x < width; x += step) {
    ctx.moveTo(Math.round(x) + 0.5, 0)
    ctx.lineTo(Math.round(x) + 0.5, height)
  }
  for (let y = step; y < height; y += step) {
    ctx.moveTo(0, Math.round(y) + 0.5)
    ctx.lineTo(width, Math.round(y) + 0.5)
  }
  ctx.stroke()
}

function drawLabel(ctx: CanvasRenderingContext2D, label: string, width: number, height: number): void {
  ctx.fillStyle = INK_COLOUR
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lines = label.split('\n')
  const size = Math.round(width * 0.075)
  ctx.font = `600 ${size}px "IBM Plex Sans", system-ui, sans-serif`
  const lineHeight = size * 1.25
  const top = height / 2 - ((lines.length - 1) * lineHeight) / 2
  lines.forEach((line, i) => ctx.fillText(line, width / 2, top + i * lineHeight, width * 0.84))
}

/** Textures for `spreads` placeholder sheets. Sheet k shows labels[k - 1] on its front. */
export function makePlaceholderSpreads(labels: readonly string[]): PageTextures[] {
  return labels.map((label, i) => {
    const next = labels[i + 1]
    return {
      front: makePlaceholderTexture(label, { corner: `${2 * i + 1}` }),
      back: makePlaceholderTexture(next ? `${next}\n(left page)` : 'The end', { corner: `${2 * i + 2}`, cornerSide: 'left' }),
    }
  })
}
