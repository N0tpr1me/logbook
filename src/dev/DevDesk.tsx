// Development harness for the desk, reached with /?dev=desk. Loading screen,
// reveal, the desk with a stand-in book, and an overlay with controls and
// render statistics. Add &test=1 for test mode (no animations, fixed camera)
// and &music=1 to try a music file at /assets/sounds/music.m4a.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { ACESFilmicToneMapping, type Camera, Vector3 } from 'three'
import { createBookAudio, EFFECT_URLS, type AudioEngine } from '@/book/audio'
import { Desk } from '@/book/desk/Desk'
import { DeskA11y } from '@/book/desk/DeskA11y'
import { createDeskInteraction } from '@/book/desk/interaction'
import { deskCamera, revealCamera, type CameraPose, type DeskObjectId } from '@/book/desk/layout'
import { DRONE_MODEL_URL, preloadDroneModel } from '@/book/desk/objects/DroneModel'
import { allDeskTextures } from '@/book/desk/textures'
import { LoadingScreen } from '@/book/loading/LoadingScreen'
import { createFrameMonitor, type FrameMonitor } from '@/book/loading/perf'
import { preloadAll, warmGpu, type Assets, type GpuWarm } from '@/book/loading/preload'
import { createBookStore, useBookState } from '@/book/state'

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

interface RenderStats {
  fps: number
  calls: number
  triangles: number
}

export default function DevDesk() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const store = useMemo(() => createBookStore({ testMode: params.has('test') }), [params])
  const interaction = useMemo(() => createDeskInteraction(), [])
  const [progress, setProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [lastClick, setLastClick] = useState<DeskObjectId | null>(null)
  const [stats, setStats] = useState<RenderStats>({ fps: 0, calls: 0, triangles: 0 })
  const [slow, setSlow] = useState(false)
  const [dpr, setDpr] = useState(1)
  const [deskReady, setDeskReady] = useState(false)
  const [showDesk, setShowDesk] = useState(false)
  const gpu = useRef(deferred<GpuWarm>())
  const engine = useRef<AudioEngine | null>(null)
  const readingLight = useBookState(store, (s) => s.readingLight)
  const sound = useBookState(store, (s) => s.sound)

  const monitor = useMemo<FrameMonitor>(
    () => createFrameMonitor({ onSlow: () => setSlow(true), onDpr: setDpr, testMode: store.get().testMode }),
    [store],
  )
  useEffect(() => () => monitor.dispose(), [monitor])

  // Frames count as animated while an object is active or hovered (rotors, steam).
  useEffect(() => {
    const unsubscribe = interaction.subscribe(() => {
      const s = interaction.get()
      monitor.setAnimating('desk', s.active !== null || s.hovered !== null)
    })
    return () => {
      unsubscribe()
    }
  }, [interaction, monitor])

  useEffect(() => {
    let cancelled = false
    // Downloads first (the model lands in three's file cache), then the desk
    // mounts and parses from that cache, then shaders compile and textures upload.
    const warm = async () => {
      preloadDroneModel()
      setShowDesk(true)
      const g = await gpu.current.promise
      await warmGpu({ ...g, textures: allDeskTextures() })
    }
    preloadAll({ models: [DRONE_MODEL_URL], sounds: EFFECT_URLS }, (p) => setProgress(p.fraction), warm).then((assets: Assets) => {
      if (cancelled) return
      engine.current = createBookAudio(store, assets.buffers)
      setReady(true)
    })
    return () => {
      cancelled = true
      engine.current?.dispose()
    }
  }, [store])

  useEffect(() => {
    if (revealed && params.has('music')) void engine.current?.loadMusic('/assets/sounds/music.m4a')
  }, [revealed, params])

  const audio = useMemo(() => ({ playEffect: (name: 'page' | 'clink' | 'lampClick') => engine.current?.playEffect(name) }), [])
  const onObjectClick = useCallback((id: DeskObjectId) => setLastClick(id), [])
  const onMounted = useCallback(() => setDeskReady(true), [])

  const reset = () => {
    interaction.cancelActive()
    interaction.set({ hovered: null, focused: null, active: null, noteOpen: false, cvOpen: false })
    store.set({ readingLight: false, sound: false })
    setLastClick(null)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#141311' }}>
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
        camera={{ fov: revealCamera.fov, near: 0.05, far: 10, position: [...revealCamera.position] }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping
          gl.toneMappingExposure = 1.05
          monitor.watchCanvas(gl.domElement)
        }}
      >
        <GpuBridge ready={deskReady} resolve={gpu.current.resolve} />
        <CameraRig revealed={revealed} instant={store.get().testMode} monitor={monitor} />
        <StatsBridge onStats={setStats} monitor={monitor} dpr={dpr} />
        {showDesk ? (
          <Desk
            store={store}
            interaction={interaction}
            audio={audio}
            onObjectClick={onObjectClick}
            revealed={revealed}
            onMounted={onMounted}
          />
        ) : null}
      </Canvas>
      <LoadingScreen progress={progress} ready={ready} onRevealed={() => setRevealed(true)} />
      <div style={overlayStyle}>
        <button type="button" style={controlStyle} onClick={() => store.set((s) => ({ readingLight: !s.readingLight }))} data-testid="toggle-lamp">
          {readingLight ? 'Reading light' : 'Evening light'}
        </button>
        <button type="button" style={controlStyle} onClick={() => store.set((s) => ({ sound: !s.sound }))} data-testid="toggle-sound" aria-pressed={sound}>
          {sound ? 'Sound on' : 'Sound off'}
        </button>
        <button type="button" style={controlStyle} onClick={reset} data-testid="reset">
          Reset
        </button>
        <span style={readoutStyle} data-testid="stats">
          {stats.fps} fps · {stats.calls} draw calls · {Math.round(stats.triangles / 1000)}k tris · dpr {dpr.toFixed(2)}
          {slow ? ' · slow' : ''}
        </span>
        <span style={readoutStyle} data-testid="last-click">
          {lastClick ? `clicked: ${lastClick}` : 'clicked: none'}
        </span>
      </div>
      <DeskA11y interaction={interaction} />
    </div>
  )
}

interface CameraRigProps {
  revealed: boolean
  instant: boolean
  monitor: FrameMonitor
}

function applyPose(camera: Camera, pose: CameraPose, target: Vector3) {
  camera.position.set(pose.position[0], pose.position[1], pose.position[2])
  target.set(pose.target[0], pose.target[1], pose.target[2])
  camera.lookAt(target)
}

/** Starts high over the desk and eases down to the three-quarter view on reveal (1.2s expo-out). */
function CameraRig({ revealed, instant, monitor }: CameraRigProps) {
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  const target = useMemo(() => new Vector3(), [])

  useEffect(() => {
    applyPose(camera, instant ? deskCamera : revealCamera, target)
    invalidate()
  }, [camera, instant, target, invalidate])

  useEffect(() => {
    if (!revealed || instant) return
    const live = { x: camera.position.x, y: camera.position.y, z: camera.position.z, tx: target.x, ty: target.y, tz: target.z }
    monitor.setAnimating('camera', true)
    const tween = gsap.to(live, {
      x: deskCamera.position[0],
      y: deskCamera.position[1],
      z: deskCamera.position[2],
      tx: deskCamera.target[0],
      ty: deskCamera.target[1],
      tz: deskCamera.target[2],
      duration: 1.2,
      ease: 'expo.out',
      onUpdate: () => {
        camera.position.set(live.x, live.y, live.z)
        target.set(live.tx, live.ty, live.tz)
        camera.lookAt(target)
        invalidate()
      },
      onComplete: () => monitor.setAnimating('camera', false),
    })
    return () => {
      tween.kill()
      monitor.setAnimating('camera', false)
    }
  }, [revealed, instant, camera, target, invalidate, monitor])

  return null
}

interface GpuBridgeProps {
  ready: boolean
  resolve: (gpu: GpuWarm) => void
}

/** Hands the renderer, scene and camera to the preloader once the desk is complete. */
function GpuBridge({ ready, resolve }: GpuBridgeProps) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    if (ready) resolve({ renderer: gl, scene, camera })
  }, [ready, resolve, gl, scene, camera])
  return null
}

interface StatsBridgeProps {
  onStats: (stats: RenderStats) => void
  monitor: FrameMonitor
  dpr: number
}

/** Feeds the frame monitor and reports renderer.info once a second. */
function StatsBridge({ onStats, monitor, dpr }: StatsBridgeProps) {
  const gl = useThree((s) => s.gl)
  const setDpr = useThree((s) => s.setDpr)
  const frames = useRef(0)
  const latest = useRef({ calls: 0, triangles: 0 })

  useEffect(() => {
    setDpr(dpr)
  }, [dpr, setDpr])

  useFrame(() => {
    frames.current += 1
    latest.current = { calls: gl.info.render.calls, triangles: gl.info.render.triangles }
    monitor.frame(performance.now())
  })

  useEffect(() => {
    const id = window.setInterval(() => {
      onStats({ fps: frames.current, ...latest.current })
      frames.current = 0
    }, 1000)
    return () => window.clearInterval(id)
  }, [onStats])

  return null
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  left: 12,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 8,
  zIndex: 40,
  font: '500 15px/20px var(--font, "IBM Plex Sans", system-ui, sans-serif)',
}

const controlStyle: React.CSSProperties = {
  font: 'inherit',
  color: '#ECEAE4',
  background: 'rgba(27, 26, 24, 0.85)',
  border: '1px solid rgba(236, 234, 228, 0.18)',
  borderRadius: 6,
  padding: '8px 12px',
  minHeight: 44,
  cursor: 'pointer',
}

const readoutStyle: React.CSSProperties = {
  color: '#A3A79F',
  background: 'rgba(27, 26, 24, 0.7)',
  borderRadius: 6,
  padding: '8px 10px',
  fontVariantNumeric: 'tabular-nums',
}
