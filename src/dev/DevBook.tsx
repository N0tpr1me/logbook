// Development harness for the page-turn engine, reached with ?dev=book.
// A full-window canvas with the book on its own (no desk), placeholder
// pages, buttons for every command, and position, fps and frame-time
// readouts. Playwright drives it through the data-testid attributes.

import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { Book } from '@/book/engine/Book'
import { createBookController, type BookController } from '@/book/engine/motion'
import { makePlaceholderSpreads, type PageTextures } from '@/book/engine/pageTextures'
import { useBookInput } from '@/book/input/useBookInput'
import { createBookStore, type BookStore } from '@/book/state'

const BACKGROUND = '#1B1A18'
const SPREAD_LABELS = ['Contents', 'DroneMedic', 'IMC Prosperity', 'AMS', 'Chandrayaan-3', 'About', 'Contact', 'Notes'] as const
const CAMERA_POSITION: [number, number, number] = [0, 0.5, 0.26]
const CAMERA_TARGET: [number, number, number] = [0, 0, -0.01]

interface Readouts {
  position: RefObject<HTMLSpanElement | null>
  fps: RefObject<HTMLSpanElement | null>
  frameTime: RefObject<HTMLSpanElement | null>
  drawCalls: RefObject<HTMLSpanElement | null>
}

/** Measures rendered frames; the scene only draws while something moves, so idle shows a dash. */
function FrameMeter({ fps, frameTime, drawCalls }: Pick<Readouts, 'fps' | 'frameTime' | 'drawCalls'>) {
  const samples = useRef<{ times: number[]; lastReport: number; lastFrame: number }>({ times: [], lastReport: 0, lastFrame: 0 })
  const gl = useThree((s) => s.gl)
  useFrame(() => {
    if (drawCalls.current) drawCalls.current.textContent = String(gl.info.render.calls)
    const now = performance.now()
    const s = samples.current
    const frameMs = s.lastFrame ? now - s.lastFrame : 0
    s.lastFrame = now
    s.times = [...s.times.filter((t) => now - t < 1000), now]
    if (now - s.lastReport < 250) return
    s.lastReport = now
    const recent = s.times.length
    if (fps.current) fps.current.textContent = recent > 1 ? String(recent) : '-'
    if (frameTime.current) frameTime.current.textContent = frameMs > 0 && frameMs < 500 ? `${frameMs.toFixed(1)} ms` : '-'
  })
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = samples.current
      if (performance.now() - s.lastFrame > 600) {
        if (fps.current) fps.current.textContent = '-'
        if (frameTime.current) frameTime.current.textContent = '-'
      }
    }, 500)
    return () => window.clearInterval(id)
  }, [fps, frameTime])
  return null
}

function PositionReadout({ store, target }: { store: BookStore; target: RefObject<HTMLSpanElement | null> }) {
  useEffect(() => {
    const write = () => {
      const state = store.get()
      const el = target.current
      if (!el) return
      el.textContent = state.position.toFixed(2)
      const root = el.closest('[data-ready]')
      if (root instanceof HTMLElement) {
        root.dataset.animating = state.animating ? '1' : '0'
        root.dataset.dragging = state.dragging ? '1' : '0'
        root.dataset.mode = state.mode
      }
    }
    write()
    const unsubscribe = store.subscribe(write)
    return () => {
      unsubscribe()
    }
  }, [store, target])
  return null
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  top: 12,
  left: 12,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  alignItems: 'center',
  padding: 8,
  background: 'rgba(27, 26, 24, 0.85)',
  borderRadius: 6,
  color: '#ECEAE4',
  font: '500 15px/20px "IBM Plex Sans", system-ui, sans-serif',
  zIndex: 2,
}

const buttonStyle: CSSProperties = {
  minHeight: 44,
  minWidth: 44,
  padding: '0 12px',
  borderRadius: 6,
  border: '1px solid #4E5A57',
  background: '#23402F',
  color: '#ECEAE4',
  cursor: 'pointer',
}

const readoutStyle: CSSProperties = { fontVariantNumeric: 'tabular-nums', marginLeft: 8, color: '#A3A79F' }

interface ControlsProps {
  store: BookStore
  controller: BookController
  readouts: Readouts
  orbit: boolean
  onOrbitChange: (orbit: boolean) => void
  ready: boolean
}

function Controls({ store, controller, readouts, orbit, onOrbitChange, ready }: ControlsProps) {
  return (
    <div style={overlayStyle} data-ready={ready ? '1' : '0'}>
      <button type="button" style={buttonStyle} data-testid="prev" onClick={() => controller.turn(-1)}>
        Previous
      </button>
      <button type="button" style={buttonStyle} data-testid="next" onClick={() => controller.turn(1)}>
        Next
      </button>
      <button type="button" style={buttonStyle} data-testid="open" onClick={() => controller.open()}>
        Open
      </button>
      <button type="button" style={buttonStyle} data-testid="close" onClick={() => controller.close()}>
        Close
      </button>
      <button type="button" style={buttonStyle} data-testid="jump4" onClick={() => controller.jumpTo(4)}>
        Jump to 4
      </button>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 44 }}>
        <input type="checkbox" checked={orbit} onChange={(e) => onOrbitChange(e.target.checked)} data-testid="orbit" />
        Orbit
      </label>
      <span style={readoutStyle}>
        position <span data-testid="position" ref={readouts.position} />
      </span>
      <span style={readoutStyle}>
        fps <span data-testid="fps" ref={readouts.fps} />
      </span>
      <span style={readoutStyle}>
        frame <span data-testid="frame-time" ref={readouts.frameTime} />
      </span>
      <span style={readoutStyle}>
        draws <span data-testid="draw-calls" ref={readouts.drawCalls} />
      </span>
      <PositionReadout store={store} target={readouts.position} />
    </div>
  )
}

export default function DevBook() {
  const store = useMemo(() => createBookStore({ spreads: SPREAD_LABELS.length }), [])
  const controller = useMemo(() => createBookController(store), [store])
  useEffect(() => () => controller.dispose(), [controller])
  const pages = useMemo<PageTextures[]>(() => makePlaceholderSpreads(SPREAD_LABELS), [])
  const [orbit, setOrbit] = useState(false)
  const [ready, setReady] = useState(false)
  const onReady = useCallback(() => setReady(true), [])
  const input = useBookInput(store, controller, { enabled: !orbit, onEscape: () => controller.close() })
  const readouts = useMemo<Readouts>(
    () => ({ position: { current: null }, fps: { current: null }, frameTime: { current: null }, drawCalls: { current: null } }),
    [],
  )

  return (
    <div ref={input.setElement} style={{ position: 'fixed', inset: 0, background: BACKGROUND }}>
      <Canvas
        frameloop="demand"
        flat
        dpr={[1, 2]}
        camera={{ position: CAMERA_POSITION, fov: 35, near: 0.05, far: 10 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ camera }) => camera.lookAt(...CAMERA_TARGET)}
      >
        <color attach="background" args={[BACKGROUND]} />
        <ambientLight color="#A9B8D0" intensity={0.5} />
        <directionalLight color="#FFE3BD" intensity={2.2} position={[-1.2, 1.6, 0.9]} />
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <Book store={store} pages={pages} controller={controller} pointer={orbit ? undefined : input.pointer} onReady={onReady} />
        </group>
        <OrbitControls enabled={orbit} target={CAMERA_TARGET} makeDefault />
        <FrameMeter fps={readouts.fps} frameTime={readouts.frameTime} drawCalls={readouts.drawCalls} />
      </Canvas>
      <Controls store={store} controller={controller} readouts={readouts} orbit={orbit} onOrbitChange={setOrbit} ready={ready} />
    </div>
  )
}
