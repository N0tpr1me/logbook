// The pencil: a painted hexagonal prism with a sharpened tip, brass ferrule
// and pink eraser, built as one vertex-coloured mesh. Hover rolls it a little;
// a click rolls it a few millimetres (0.6s) and then opens the contact page.

import { useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { ConeGeometry, CylinderGeometry, type Group, MeshStandardMaterial, SphereGeometry } from 'three'
import { useDesk } from '../DeskContext'
import { merge, moved, turned, withColor } from '../geometry'
import { PLACEMENTS } from '../layout'
import { EXPO_OUT, HOVER_DURATION, SHORT_DURATION } from '../motion'
import { ObjectLabel } from '../ObjectLabel'
import { Outline } from '../Outline'
import { ShadowBlob } from '../ShadowBlob'
import { useDeskObject } from '../useDeskObject'

const placement = PLACEMENTS.pencil
const RADIUS = 0.0036
const BODY_LENGTH = 0.142
/** Height of the axis when a flat face rests on the desk. */
const REST_Y = RADIUS * Math.cos(Math.PI / 6)
const ROLL_DURATION = 0.6
const CLICK_ROLL = 0.005
const HOVER_ROLL = 0.0015

function pencilGeometry() {
  const half = BODY_LENGTH / 2
  type Part = ConeGeometry | CylinderGeometry | SphereGeometry
  /** Turn a +y geometry to point along +x and move it to x. */
  const alongX = (g: Part, x: number) => moved(turned(g, 0, 0, -Math.PI / 2), x, 0, 0)
  /** Turn a +y geometry to point along -x (cones: tip towards -x) and move it to x. */
  const alongMinusX = (g: Part, x: number) => moved(turned(g, 0, 0, Math.PI / 2), x, 0, 0)
  const tipLength = 0.017
  const graphiteLength = 0.004
  return merge([
    // Painted hexagonal body; with thetaStart 0 a flat face rests on the desk.
    withColor(alongX(new CylinderGeometry(RADIUS, RADIUS, BODY_LENGTH, 6, 1, false), 0), '#2D5A3F'),
    // Sharpened wood and the graphite point at the -x end.
    withColor(alongMinusX(new ConeGeometry(RADIUS * 0.98, tipLength, 6, 1, false), -half - tipLength / 2), '#D8B98A'),
    withColor(alongMinusX(new ConeGeometry(0.0009, graphiteLength, 8), -half - tipLength + graphiteLength / 2), '#2A2A2A'),
    // Brass ferrule and pink eraser at the +x end.
    withColor(alongX(new CylinderGeometry(RADIUS * 1.02, RADIUS * 1.02, 0.011, 14), half + 0.0055), '#B59A5A'),
    withColor(alongX(new CylinderGeometry(RADIUS * 0.95, RADIUS * 0.95, 0.007, 14), half + 0.011 + 0.0035), '#D98A8E'),
    withColor(moved(new SphereGeometry(RADIUS * 0.95, 14, 8), half + 0.011 + 0.007, 0, 0), '#D98A8E'),
  ])
}

export function Pencil() {
  const { onObjectClick, interaction } = useDesk()
  const invalidate = useThree((s) => s.invalidate)
  const geometry = useMemo(pencilGeometry, [])
  const material = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.05 }), [])
  const roller = useRef<Group>(null)
  const roll = useRef({ distance: 0, tween: null as gsap.core.Tween | null })

  const apply = () => {
    const g = roller.current
    if (!g) return
    const d = roll.current.distance
    g.position.z = d
    g.rotation.x = d / RADIUS
    invalidate()
  }
  const rollTo = (distance: number, duration: number, onComplete?: () => void) => {
    roll.current.tween?.kill()
    roll.current.tween = gsap.to(roll.current, { distance, duration, ease: EXPO_OUT, onUpdate: apply, onComplete })
  }

  const { highlighted, label, bind } = useDeskObject('pencil', {
    onClick: ({ full, instant }) => {
      const finish = () => {
        onObjectClick('pencil')
        interaction.release('pencil')
      }
      if (instant) {
        roll.current.distance = CLICK_ROLL
        apply()
        finish()
        return
      }
      rollTo(roll.current.distance + CLICK_ROLL, full ? ROLL_DURATION : SHORT_DURATION, finish)
    },
    onCancel: () => rollTo(0, SHORT_DURATION),
    onHighlight: (on) => {
      if (interaction.get().active === 'pencil') return
      rollTo(on ? HOVER_ROLL : 0, HOVER_DURATION)
    },
  })

  return (
    <group position={[placement.position[0], REST_Y, placement.position[2]]} rotation={[0, placement.yaw, 0]}>
      <group ref={roller}>
        <mesh geometry={geometry} material={material} {...bind} />
        <Outline geometry={geometry} visible={highlighted} thickness={0.0018} />
      </group>
      <ShadowBlob size={[0.2, 0.03]} opacity={0.5} position={[0, -REST_Y + 0.0005, 0]} />
      <ObjectLabel text={label} visible={highlighted} position={placement.labelOffset} />
    </group>
  )
}
