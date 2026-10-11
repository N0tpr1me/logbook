// Loads everything before the reveal (plan: Loading and performance). Every
// listed file is downloaded with byte-level progress, images are decoded,
// clips are buffered to their end, fonts are registered, and finally the
// scene's shaders are compiled and its textures uploaded. A missing file is
// reported and skipped so one bad path never blocks the desk.

import { Cache, type Camera, type Object3D, type Texture, type WebGLRenderer } from 'three'

export interface FontEntry {
  family: string
  url: string
  weight?: string
  style?: string
}

export interface AssetManifest {
  models?: readonly string[]
  textures?: readonly string[]
  pages?: readonly string[]
  clips?: readonly string[]
  sounds?: readonly string[]
  fonts?: readonly FontEntry[]
}

export interface PreloadProgress {
  /** 0 to 1, by bytes where sizes are known, by file count otherwise. */
  fraction: number
  loadedBytes: number
  /** Sum of known Content-Lengths so far. */
  totalBytes: number
  filesDone: number
  filesTotal: number
}

export interface Assets {
  /** Raw bytes of models, sounds and fonts, by URL. */
  buffers: ReadonlyMap<string, ArrayBuffer>
  /** Decoded textures and page images, by URL. */
  images: ReadonlyMap<string, ImageBitmap>
  /** Clips buffered to their end, by URL, with a blob source. */
  clips: ReadonlyMap<string, HTMLVideoElement>
  /** URLs that failed to download or decode. */
  missing: readonly string[]
}

export interface GpuWarm {
  renderer: WebGLRenderer
  scene: Object3D
  camera: Camera
  /** Extra textures not reachable from the scene's materials. */
  textures?: readonly Texture[]
}

export type ProgressCallback = (progress: PreloadProgress) => void

/** Waits for the scene, then compiles and uploads. Resolves when the GPU is warm. */
export type WarmStep = () => Promise<void>

interface FileState {
  url: string
  length: number | null
  loaded: number
  done: boolean
}

const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|avif|gif)(\?|$)/i
const CLIP_TIMEOUT_MS = 15000

function fraction(files: readonly FileState[]): PreloadProgress {
  const known = files.filter((f) => f.length !== null)
  const mean = known.length ? known.reduce((sum, f) => sum + (f.length ?? 0), 0) / known.length : 1
  let weight = 0
  let progress = 0
  for (const f of files) {
    const w = f.length ?? mean
    weight += w
    progress += f.done ? w : f.length ? (f.loaded / f.length) * w : 0
  }
  return {
    fraction: files.length === 0 ? 1 : weight === 0 ? 1 : Math.min(1, progress / weight),
    loadedBytes: files.reduce((sum, f) => sum + f.loaded, 0),
    totalBytes: known.reduce((sum, f) => sum + (f.length ?? 0), 0),
    filesDone: files.filter((f) => f.done).length,
    filesTotal: files.length,
  }
}

async function download(state: FileState, onChunk: () => void): Promise<ArrayBuffer | null> {
  const response = await fetch(state.url)
  if (!response.ok || !response.body) return null
  const header = response.headers.get('Content-Length')
  const length = header ? Number.parseInt(header, 10) : Number.NaN
  state.length = Number.isFinite(length) && length > 0 ? length : null
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    state.loaded += value.byteLength
    onChunk()
  }
  const total = chunks.reduce((sum, c) => sum + c.byteLength, 0)
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    bytes.set(c, offset)
    offset += c.byteLength
  }
  return bytes.buffer
}

async function decodeImage(buffer: ArrayBuffer, url: string): Promise<ImageBitmap | null> {
  try {
    const type = /\.png/i.test(url) ? 'image/png' : /\.webp/i.test(url) ? 'image/webp' : 'image/jpeg'
    return await createImageBitmap(new Blob([buffer], { type }), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })
  } catch {
    return null
  }
}

/** Buffer a clip to its end and decode its first frame. */
function bufferClip(buffer: ArrayBuffer, url: string): Promise<HTMLVideoElement | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const type = /\.webm/i.test(url) ? 'video/webm' : 'video/mp4'
    const objectUrl = URL.createObjectURL(new Blob([buffer], { type }))
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve(ok ? video : null)
    }
    const timer = window.setTimeout(() => finish(false), CLIP_TIMEOUT_MS)
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.addEventListener('canplaythrough', () => finish(true), { once: true })
    video.addEventListener('error', () => finish(false), { once: true })
    video.src = objectUrl
    video.load()
  })
}

async function registerFont(entry: FontEntry, buffer: ArrayBuffer): Promise<boolean> {
  try {
    const face = new FontFace(entry.family, buffer, { weight: entry.weight ?? '400', style: entry.style ?? 'normal' })
    await face.load()
    document.fonts.add(face)
    return true
  } catch {
    return false
  }
}

/** Compile every shader and upload every texture, so the first frame never hitches. */
export async function warmGpu({ renderer, scene, camera, textures = [] }: GpuWarm): Promise<void> {
  // compileAsync needs KHR_parallel_shader_compile; without it three warns and
  // falls back anyway, so compile synchronously there and keep the console clean.
  if (renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(scene, camera)
  else renderer.compile(scene, camera)
  const seen = new Set<Texture>(textures)
  scene.traverse((object) => {
    const material = (object as { material?: unknown }).material
    const list = Array.isArray(material) ? material : material ? [material] : []
    for (const m of list) {
      for (const value of Object.values(m as Record<string, unknown>)) {
        if ((value as Texture)?.isTexture) seen.add(value as Texture)
      }
      const uniforms = (m as { uniforms?: Record<string, { value: unknown }> }).uniforms
      if (uniforms) {
        for (const u of Object.values(uniforms)) {
          if ((u.value as Texture)?.isTexture) seen.add(u.value as Texture)
        }
      }
    }
  })
  seen.forEach((t) => renderer.initTexture(t))
}

/**
 * Download, decode and buffer every file in the manifest, reporting byte
 * progress, then run the GPU warm-up step (if given) before resolving.
 */
export async function preloadAll(manifest: AssetManifest, onProgress: ProgressCallback, warm?: WarmStep): Promise<Assets> {
  Cache.enabled = true
  const fonts = manifest.fonts ?? []
  const urls = [
    ...(manifest.models ?? []),
    ...(manifest.textures ?? []),
    ...(manifest.pages ?? []),
    ...(manifest.clips ?? []),
    ...(manifest.sounds ?? []),
    ...fonts.map((f) => f.url),
  ]
  const files: FileState[] = urls.map((url) => ({ url, length: null, loaded: 0, done: false }))
  const report = () => onProgress(fraction(files))

  const buffers = new Map<string, ArrayBuffer>()
  const images = new Map<string, ImageBitmap>()
  const clips = new Map<string, HTMLVideoElement>()
  const missing: string[] = []

  const isImage = (url: string) => (manifest.textures ?? []).includes(url) || (manifest.pages ?? []).includes(url)
  const isClip = (url: string) => (manifest.clips ?? []).includes(url)
  const isModel = (url: string) => (manifest.models ?? []).includes(url)

  report()
  await Promise.all(
    files.map(async (state) => {
      let buffer: ArrayBuffer | null = null
      try {
        buffer = await download(state, report)
      } catch {
        buffer = null
      }
      if (!buffer) {
        missing.push(state.url)
      } else if (isImage(state.url) && IMAGE_EXTENSIONS.test(state.url)) {
        const bitmap = await decodeImage(buffer, state.url)
        if (bitmap) images.set(state.url, bitmap)
        else missing.push(state.url)
      } else if (isClip(state.url)) {
        const video = await bufferClip(buffer, state.url)
        if (video) clips.set(state.url, video)
        else missing.push(state.url)
      } else {
        buffers.set(state.url, buffer)
        // Models go into three's file cache so the GLTF loader never fetches again.
        if (isModel(state.url)) Cache.add(state.url, buffer)
        const font = fonts.find((f) => f.url === state.url)
        if (font && !(await registerFont(font, buffer))) missing.push(state.url)
      }
      state.done = true
      report()
    }),
  )

  if (warm) await warm()
  report()
  return { buffers, images, clips, missing }
}
