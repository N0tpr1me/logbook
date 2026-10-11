// The folded CV: an A4 sheet folded in three along two creases (a Z-fold).
// Hover lifts the top panel; a click unfolds it along its creases in 0.8s and
// shows two buttons, "Download CV" and "Open About" (plan: Desk objects).

import { useCallback, useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { DoubleSide, Float32BufferAttribute, type Group, MeshStandardMaterial, PlaneGeometry } from 'three'
import { person } from '@/content/content'
import { useDesk } from '../DeskContext'
import { useDeskState } from '../interaction'
import { PLACEMENTS } from '../layout'
import { EXPO_OUT, HOVER_DURATION, SHORT_DURATION } from '../motion'
import { ObjectLabel } from '../ObjectLabel'
import { FlatOutline } from '../Outline'
import { ShadowBlob } from '../ShadowBlob'
import { cvPaperTexture } from '../textures'
import { useDeskObject } from '../useDeskObject'

const placement = PLACEMENTS.cv
const WIDTH = 0.21
const PANEL = 0.099
const GAP = 0.0006
const UNFOLD_DURATION = 0.8
const HOVER_LIFT = 0.16

/** A flat panel showing one third of the CV page. Panel 0 is the bottom third. */
function panelGeometry(index: number) {
  const geometry = new PlaneGeometry(WIDTH, PANEL)
  geometry.rotateX(-Math.PI / 2)
  const v0 = index / 3
  const v1 = (index + 1) / 3
  // PlaneGeometry UVs run (0,1) (1,1) (0,0) (1,0) for its four corners.
  geometry.setAttribute('uv', new Float32BufferAttribute([0, v1, 1, v1, 0, v0, 1, v0], 2))
  return geometry
}

interface Folds {
  fold1: number
  fold2: number
  lift: number
}

export function FoldedCv() {
  const { interaction, onObjectClick } = useDesk()
  const invalidate = useThree((s) => s.invalidate)
  const cvOpen = useDeskState(interaction, (s) => s.cvOpen)
  const geometries = useMemo(() => [panelGeometry(0), panelGeometry(1), panelGeometry(2)], [])
  const material = useMemo(
    () => new MeshStandardMaterial({ map: cvPaperTexture(), roughness: 0.9, metalness: 0, side: DoubleSide }),
    [],
  )
  const hinge1 = useRef<Group>(null)
  const hinge2 = useRef<Group>(null)
  const folds = useRef<Folds>({ fold1: Math.PI, fold2: -Math.PI, lift: 0 })
  const tween = useRef<gsap.core.Tween | gsap.core.Timeline | null>(null)

  const apply = useCallback(() => {
    const f = folds.current
    const h1 = hinge1.current
    const h2 = hinge2.current
    if (!h1 || !h2) return
    h1.rotation.x = f.fold1
    h2.rotation.x = f.fold2 + f.lift
    // Keep the stacked panels a hair apart so they never z-fight.
    h1.position.y = GAP * Math.sin(f.fold1 / 2)
    h2.position.y = -GAP * Math.sin(Math.abs(f.fold2) / 2)
    invalidate()
  }, [invalidate])

  const unfold = useCallback(
    (duration: number, onComplete?: () => void) => {
      tween.current?.kill()
      const tl = gsap.timeline({ onUpdate: apply, onComplete })
      tl.to(folds.current, { lift: 0, duration: Math.min(0.1, duration), ease: EXPO_OUT }, 0)
      tl.to(folds.current, { fold2: 0, duration: duration * 0.75, ease: EXPO_OUT }, 0)
      tl.to(folds.current, { fold1: 0, duration, ease: EXPO_OUT }, duration * 0.15)
      tween.current = tl
    },
    [apply],
  )

  const fold = useCallback(
    (duration: number) => {
      tween.current?.kill()
      interaction.set({ cvOpen: false })
      tween.current = gsap.to(folds.current, { fold1: Math.PI, fold2: -Math.PI, lift: 0, duration, ease: EXPO_OUT, onUpdate: apply })
    },
    [apply, interaction],
  )

  const { highlighted, label, bind } = useDeskObject('cv', {
    onClick: ({ full, instant }) => {
      if (interaction.get().cvOpen) return
      const show = () => interaction.set({ cvOpen: true })
      if (instant) {
        folds.current = { fold1: 0, fold2: 0, lift: 0 }
        apply()
        show()
        return
      }
      unfold(full ? UNFOLD_DURATION : SHORT_DURATION, show)
    },
    onCancel: () => fold(SHORT_DURATION),
    onHighlight: (on) => {
      if (interaction.get().cvOpen || interaction.get().active === 'cv') return
      tween.current?.kill()
      tween.current = gsap.to(folds.current, { lift: on ? HOVER_LIFT : 0, duration: HOVER_DURATION, ease: EXPO_OUT, onUpdate: apply })
    },
  })

  const openAbout = () => {
    onObjectClick('cv')
    fold(SHORT_DURATION)
    interaction.release('cv')
  }

  return (
    <group position={[placement.position[0], placement.position[1] + GAP, placement.position[2]]} rotation={[0, placement.yaw, 0]}>
      <group position={[0, 0, PANEL]}>
        <mesh geometry={geometries[0]} material={material} {...bind} />
        <FlatOutline width={WIDTH} depth={PANEL} visible={highlighted} />
      </group>
      <group ref={hinge1} position={[0, 0, PANEL / 2]} rotation={[Math.PI, 0, 0]}>
        <group position={[0, 0, -PANEL / 2]}>
          <mesh geometry={geometries[1]} material={material} {...bind} />
          <FlatOutline width={WIDTH} depth={PANEL} visible={highlighted} />
        </group>
        <group ref={hinge2} position={[0, 0, -PANEL]} rotation={[-Math.PI, 0, 0]}>
          <group position={[0, 0, -PANEL / 2]}>
            <mesh geometry={geometries[2]} material={material} {...bind} />
            <FlatOutline width={WIDTH} depth={PANEL} visible={highlighted} />
          </group>
        </group>
      </group>
      <ShadowBlob size={[0.26, 0.15]} opacity={0.5} position={[0, -GAP + 0.0004, PANEL]} />
      <ObjectLabel text={label} visible={highlighted} position={placement.labelOffset} />
      {cvOpen ? (
        <Html position={[0, 0.02, -PANEL * 1.6]} center zIndexRange={[25, 15]}>
          <style>{'@keyframes desk-buttons-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }'}</style>
          <div style={buttonRowStyle}>
            <a href={person.cv} download style={buttonStyle} data-testid="cv-download">
              Download CV
            </a>
            <button type="button" onClick={openAbout} style={buttonStyle} data-testid="cv-open-about">
              Open About
            </button>
          </div>
        </Html>
      ) : null}
    </group>
  )
}

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  animation: 'desk-buttons-in 180ms cubic-bezier(0.16, 1, 0.3, 1) both',
}

const buttonStyle: React.CSSProperties = {
  font: '500 15px/20px var(--font, "IBM Plex Sans", system-ui, sans-serif)',
  color: '#1E2633',
  background: '#F3E25A',
  border: 'none',
  borderRadius: 6,
  padding: '10px 14px',
  minHeight: 44,
  display: 'inline-flex',
  alignItems: 'center',
  textDecoration: 'none',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}
