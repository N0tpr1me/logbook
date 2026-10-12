// The 3D book site: loading screen, desk, book, reading sheet, controls,
// chapter addresses and the safety nets (plan: Experience storyboard,
// Definition of done and safety nets).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ACESFilmicToneMapping } from 'three'
import type { VersionDecision } from '@/app/version'
import { isTestMode } from '@/app/version'
import { CameraRig } from '@/book/CameraRig'
import { Controls } from '@/book/Controls'
import { BookStand } from '@/book/BookStand'
import { ReadingSheet } from '@/book/ReadingSheet'
import { SpreadA11y } from '@/book/SpreadA11y'
import { Desk } from '@/book/desk/Desk'
import { DeskA11y } from '@/book/desk/DeskA11y'
import { createDeskInteraction } from '@/book/desk/interaction'
import { MAT, type DeskObjectId } from '@/book/desk/layout'
import { Book } from '@/book/engine/Book'
import { createBookController } from '@/book/engine/motion'
import { useBookInput } from '@/book/input/useBookInput'
import { LoadingScreen } from '@/book/loading/LoadingScreen'
import { createFrameMonitor, type FrameMonitor } from '@/book/loading/perf'
import type { GpuWarm } from '@/book/loading/preload'
import { chapterForSpread, spreadCount, spreadForChapter } from '@/book/spreads'
import { createBookStore, useBookState } from '@/book/state'
import { useBookAssets } from '@/book/useBookAssets'
import { useBookRouting } from '@/book/useBookRouting'
import { features } from '@/config/features'
import { backCover, person, type Chapter } from '@/content/content'
import { navigateToChapter } from '@/routing'

export interface BookSiteProps {
  decision: VersionDecision
  onFallback: (reason: 'fallback' | 'simple') => void
}

const BOOK_POSITION = [0, MAT.thickness + 0.0005, 0] as const
const BOOK_ROTATION = [-Math.PI / 2, 0, 0] as const

const OBJECT_CHAPTERS: Partial<Record<DeskObjectId, Chapter['id']>> = {
  drone: 'dronemedic',
  cv: 'about',
  pencil: 'contact',
}

export default function BookSite({ decision, onFallback }: BookSiteProps) {
  const store = useMemo(
    () =>
      createBookStore({
        spreads: spreadCount,
        reducedMotion: decision.reducedMotion,
        testMode: isTestMode(),
      }),
    [decision.reducedMotion],
  )
  const controller = useMemo(() => createBookController(store), [store])
  useEffect(() => () => controller.dispose(), [controller])
  const interaction = useMemo(() => createDeskInteraction(), [])
  const assets = useBookAssets(store)
  const [revealed, setRevealed] = useState(false)
  const [deskMounted, setDeskMounted] = useState(false)
  const [bookReady, setBookReady] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetAnchor, setSheetAnchor] = useState<string | undefined>(undefined)
  const [hint, setHint] = useState(true)
  const readRef = useRef<HTMLButtonElement>(null)

  const mode = useBookState(store, (s) => s.mode)
  const sound = useBookState(store, (s) => s.sound)
  const position = useBookState(store, (s) => s.position)
  const spread = Math.round(position)
  const bookOpen = mode !== 'desk'
  const chapter = chapterForSpread(spread)
  const onBackCover = position >= spreadCount + 0.5

  const monitor = useMemo<FrameMonitor>(
    () =>
      createFrameMonitor({
        onSlow: () => {
          if (features.autoFallback) onFallback('fallback')
        },
        testMode: store.get().testMode,
        minDpr: () => (store.get().mode === 'desk' ? 0.75 : 1),
      }),
    [store, onFallback],
  )
  useEffect(() => () => monitor.dispose(), [monitor])

  // Frames count as animated while the book moves or a desk object plays.
  useEffect(
    () =>
      store.subscribe(() => {
        const s = store.get()
        monitor.setAnimating('book', s.animating || s.dragging)
      }),
    [store, monitor],
  )
  useEffect(() => {
    const unsubscribe = interaction.subscribe(() => {
      const s = interaction.get()
      monitor.setAnimating('desk', s.active !== null || s.hovered !== null)
    })
    return () => {
      unsubscribe()
    }
  }, [interaction, monitor])

  const routing = useBookRouting(store, controller, revealed)

  // The real book replaces the desk's stand-in, so the "Open the logbook"
  // keyboard button needs its handler here.
  useEffect(
    () =>
      interaction.register('book', {
        click: () => {
          if (store.get().mode === 'desk') controller.open()
        },
        cancel: () => undefined,
      }),
    [interaction, store, controller],
  )

  const openSheet = useCallback((anchor?: string) => {
    setSheetAnchor(anchor)
    setSheetOpen(true)
    store.set({ mode: 'sheet' })
  }, [store])
  const closeSheet = useCallback(() => {
    setSheetOpen(false)
    store.set((s) => ({ mode: s.mode === 'sheet' ? 'open' : s.mode }))
  }, [store])

  const onEscape = useCallback(() => {
    if (interaction.get().noteOpen) return // the desk closes its note first
    if (sheetOpen) closeSheet()
    else if (bookOpen) controller.close()
  }, [interaction, sheetOpen, closeSheet, bookOpen, controller])

  const input = useBookInput(store, controller, { enabled: revealed && !sheetOpen, onEscape })

  // The one-time hint disappears at the first scroll or click.
  useEffect(() => {
    if (!revealed) return
    const clear = () => setHint(false)
    window.addEventListener('wheel', clear, { once: true })
    window.addEventListener('pointerdown', clear, { once: true })
    window.addEventListener('keydown', clear, { once: true })
    return () => {
      window.removeEventListener('wheel', clear)
      window.removeEventListener('pointerdown', clear)
      window.removeEventListener('keydown', clear)
    }
  }, [revealed])

  // R opens the reading sheet while the book has focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'r' || e.metaKey || e.ctrlKey || e.altKey) return
      if (!bookOpen || sheetOpen) return
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      e.preventDefault()
      openSheet()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [bookOpen, sheetOpen, openSheet])

  const onObjectClick = useCallback(
    (id: DeskObjectId) => {
      if (id === 'book') {
        if (!bookOpen) controller.open()
        return
      }
      const target = OBJECT_CHAPTERS[id]
      if (target) routing.goTo(target)
    },
    [bookOpen, controller, routing],
  )

  const onSimple = useCallback(() => {
    assets.audio?.dispose()
    const current = chapter?.id ?? 'contents'
    navigateToChapter(current, { push: false })
    onFallback('simple')
  }, [assets.audio, chapter, onFallback])

  const audioBridge = useMemo(
    () => ({ playEffect: (name: 'page' | 'clink' | 'lampClick') => assets.audio?.playEffect(name) }),
    [assets.audio],
  )

  // A paper sound as each turn passes halfway, with Sound on.
  const lastHalf = useRef<number>(-1)
  useEffect(
    () =>
      store.subscribe(() => {
        const s = store.get()
        const half = Math.floor(s.position + 0.5)
        if (half !== lastHalf.current && s.mode !== 'desk' && lastHalf.current >= 0) assets.audio?.playEffect('page')
        lastHalf.current = half
      }),
    [store, assets.audio],
  )

  const onMounted = useCallback(() => setDeskMounted(true), [])
  const onBookReady = useCallback(() => setBookReady(true), [])
  const ribbons = useMemo(
    () =>
      (['contents', 'about', 'contact'] as const).map((id) => ({
        label: id === 'contents' ? 'Contents' : id === 'about' ? 'About' : 'Contact',
        active: chapter?.id === id,
        onClick: () => routing.goTo(id),
      })),
    [chapter, routing],
  )

  const sheetChapter = chapter ?? chapterForSpread(1)!

  return (
    <div ref={input.setElement} className="book-root" style={{ position: 'fixed', inset: 0, background: '#141311', overscrollBehaviorX: 'none' }}>
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
        camera={{ fov: 34, near: 0.05, far: 10, position: [0.1, 0.92, 0.62] }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping
          gl.toneMappingExposure = 1.05
          monitor.watchCanvas(gl.domElement)
        }}
        style={{ pointerEvents: sheetOpen ? 'none' : 'auto' }}
      >
        <GpuBridge ready={deskMounted && bookReady} resolve={assets.resolveGpu} />
        <CameraRig store={store} revealed={revealed} monitor={monitor} />
        <FrameBridge monitor={monitor} />
        <Desk
          store={store}
          interaction={interaction}
          audio={audioBridge}
          onObjectClick={onObjectClick}
          revealed={revealed}
          onMounted={onMounted}
          book={false}
        />
        {assets.pages && (
          <BookStand
            store={store}
            controller={controller}
            interaction={interaction}
            armed={revealed}
            position={BOOK_POSITION}
            rotation={BOOK_ROTATION}
          >
            <Book
              store={store}
              pages={assets.pages}
              endpapers={assets.endpapers ?? undefined}
              controller={controller}
              pointer={input.pointer}
              onReady={onBookReady}
            />
          </BookStand>
        )}
      </Canvas>

      <LoadingScreen progress={assets.progress} ready={assets.ready && bookReady} onRevealed={() => setRevealed(true)} />

      {revealed && !bookOpen && (
        <div className="desk-name">
          <h1>{person.name}</h1>
          <p>{person.strapline}</p>
        </div>
      )}
      {revealed && hint && !bookOpen && <div className="hint">Scroll or click the book to open it</div>}
      {onBackCover && (
        <div className="back-cover-note paper" role="note">
          <p>{backCover.closing}</p>
          <p className="quiet">
            {backCover.howBuilt}{' '}
            <a href={backCover.sourceUrl} target="_blank" rel="noopener noreferrer">{backCover.sourceLabel}</a>
          </p>
          <button type="button" className="sheet-btn" onClick={() => controller.close()}>Close book</button>
        </div>
      )}

      <DeskA11y interaction={interaction} />
      <SpreadA11y chapter={bookOpen ? chapter : undefined} spread={spread} onOpenSheet={openSheet} />

      {revealed && (
        <Controls
          ref={readRef}
          bookOpen={bookOpen}
          sound={sound}
          canPrevious={position > 1}
          canNext={position < spreadCount}
          onPrevious={() => controller.turn(-1)}
          onNext={() => controller.turn(1)}
          onRead={() => openSheet()}
          onCloseBook={() => controller.close()}
          onToggleSound={() => store.set((s) => ({ sound: !s.sound }))}
          onSimple={onSimple}
          ribbons={ribbons}
        />
      )}

      <ReadingSheet
        chapter={sheetChapter}
        open={sheetOpen}
        anchor={sheetAnchor}
        onClose={closeSheet}
        onNavigate={(c) => {
          navigateToChapter(c.id, { push: false })
          controller.jumpTo(spreadForChapter(c.id))
        }}
        returnFocusTo={readRef.current}
      />
    </div>
  )
}

interface GpuBridgeProps {
  ready: boolean
  resolve: (gpu: GpuWarm) => void
}

/** Hands the renderer, scene and camera to the preloader once the scene is complete. */
function GpuBridge({ ready, resolve }: GpuBridgeProps) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    if (ready) resolve({ renderer: gl, scene, camera })
  }, [ready, resolve, gl, scene, camera])
  return null
}

/** Feeds every rendered frame to the frame monitor and applies its sharpness. */
function FrameBridge({ monitor }: { monitor: FrameMonitor }) {
  const setDpr = useThree((s) => s.setDpr)
  useFrame(() => monitor.frame(performance.now()))
  useEffect(() => {
    const id = window.setInterval(() => setDpr(monitor.currentDpr()), 1000)
    return () => window.clearInterval(id)
  }, [monitor, setDpr])
  return null
}
