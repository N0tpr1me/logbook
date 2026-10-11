// Loads everything before the desk appears (plan: Loading and performance):
// models, sound effects, page images and clips, with byte progress, then the
// GPU warm-up. Page images that are missing fall back to drawn placeholders
// so the book still works before `npm run build:pages` has run.

import { useEffect, useMemo, useRef, useState } from 'react'
import { createBookAudio, EFFECT_URLS, type AudioEngine } from '@/book/audio'
import { DRONE_MODEL_URL, preloadDroneModel } from '@/book/desk/objects/DroneModel'
import { allDeskTextures } from '@/book/desk/textures'
import type { BookEndpapers } from '@/book/engine/Book'
import { loadPageTextures, makePlaceholderTexture, type PageTextures } from '@/book/engine/pageTextures'
import { preloadAll, warmGpu, type Assets, type GpuWarm } from '@/book/loading/preload'
import { allPageImages, pageImage } from '@/book/spreads'
import type { BookStore } from '@/book/state'
import { chapters } from '@/content/content'

export interface BookAssets {
  progress: number
  ready: boolean
  pages: PageTextures[] | null
  /** Inside front cover (contents left page) and inside back cover. */
  endpapers: BookEndpapers | null
  audio: AudioEngine | null
  /** Resolve once the scene is mounted so shaders compile and textures upload before the reveal. */
  resolveGpu: (gpu: GpuWarm) => void
}

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const CLIP_URLS = chapters.flatMap((c) => (c.media.kind === 'clip' ? [c.media.src] : []))

/** Engine sheets: sheet k carries spread k's right page and spread k+1's left page. */
function sheetUrls() {
  return chapters.map((c, i) => ({
    front: pageImage(`${c.id}-right`),
    back: i + 1 < chapters.length ? pageImage(`${chapters[i + 1].id}-left`) : '',
    inkMask: false,
  }))
}

/** The inside front cover carries the contents spread's left page; the inside back cover the closing note. */
async function loadEndpapers(missing: readonly string[]): Promise<BookEndpapers> {
  const front = pageImage(`${chapters[0].id}-left`)
  const back = pageImage('back')
  if (missing.includes(front) && missing.includes(back)) {
    return { front: makePlaceholderTexture(chapters[0].title), back: makePlaceholderTexture('') }
  }
  const [pair] = await loadPageTextures([{ front, back, inkMask: false }])
  return {
    front: missing.includes(front) ? makePlaceholderTexture(chapters[0].title) : pair.front,
    back: missing.includes(back) ? makePlaceholderTexture('') : pair.back,
  }
}

async function loadPages(missing: readonly string[]): Promise<PageTextures[]> {
  const urls = sheetUrls()
  const blank = makePlaceholderTexture('')
  const placeholder = (label: string) => makePlaceholderTexture(label)
  const allMissing = urls.every((u) => missing.includes(u.front))
  if (allMissing) {
    return chapters.map((c, i) => ({
      front: placeholder(c.title),
      back: i + 1 < chapters.length ? placeholder(chapters[i + 1].title) : blank,
    }))
  }
  const loaded = await loadPageTextures(urls.map((u) => ({ ...u, back: u.back || u.front })))
  return loaded.map((p, i) => ({
    front: missing.includes(urls[i].front) ? placeholder(chapters[i].title) : p.front,
    back: urls[i].back ? (missing.includes(urls[i].back) ? placeholder(chapters[i + 1].title) : p.back) : blank,
  }))
}

export function useBookAssets(store: BookStore): BookAssets {
  const [progress, setProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const [pages, setPages] = useState<PageTextures[] | null>(null)
  const [endpapers, setEndpapers] = useState<BookEndpapers | null>(null)
  const [audio, setAudio] = useState<AudioEngine | null>(null)
  const gpu = useRef(deferred<GpuWarm>())

  useEffect(() => {
    let cancelled = false
    let engine: AudioEngine | null = null
    preloadDroneModel()
    const warm = async () => {
      const g = await gpu.current.promise
      await warmGpu({ ...g, textures: allDeskTextures() })
    }
    const manifest = { models: [DRONE_MODEL_URL], sounds: EFFECT_URLS, pages: allPageImages(), clips: CLIP_URLS }
    // Downloads first; then the page textures so the book can mount; then the
    // GPU warm-up, which needs the mounted scene, before the reveal.
    preloadAll(manifest, (p) => setProgress(p.fraction * 0.95))
      .then(async (assets: Assets) => {
        const [textures, covers] = await Promise.all([loadPages(assets.missing), loadEndpapers(assets.missing)])
        if (cancelled) return
        engine = createBookAudio(store, assets.buffers)
        setAudio(engine)
        setEndpapers(covers)
        setPages(textures)
        await warm()
        if (cancelled) return
        setProgress(1)
        setReady(true)
      })
      .catch(() => {
        if (cancelled) return
        // A failed preload still shows the book, with placeholders.
        void Promise.all([loadPages(allPageImages()), loadEndpapers(allPageImages())]).then(([textures, covers]) => {
          if (cancelled) return
          setEndpapers(covers)
          setPages(textures)
          setReady(true)
        })
      })
    return () => {
      cancelled = true
      engine?.dispose()
    }
  }, [store])

  return useMemo(
    () => ({ progress, ready, pages, endpapers, audio, resolveGpu: gpu.current.resolve }),
    [progress, ready, pages, endpapers, audio],
  )
}
