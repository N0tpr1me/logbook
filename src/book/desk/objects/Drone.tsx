// The drone on its landing pad, front right. Hover starts the rotors turning
// slowly; a click spins them up, lifts the drone 3cm with a slight wobble,
// banks it towards the book while the book opens at DroneMedic, then lands
// it back on the pad. Navigation starts at once, the flight runs alongside
// (plan: Desk objects, Feature risk review).

import { Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { BoxGeometry, type Group, type Material, type Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { useDesk } from '../DeskContext'
import { PLACEMENTS, type Vec3 } from '../layout'
import { EXPO_OUT, HOVER_DURATION, SHORT_DURATION } from '../motion'
import { ObjectLabel } from '../ObjectLabel'
import { ShadowBlob } from '../ShadowBlob'
import { podCrossTexture } from '../textures'
import { useDeskObject } from '../useDeskObject'
import { DroneModel } from './DroneModel'
import { ModelBoundary } from './ModelBoundary'
import { ProceduralDrone } from './ProceduralDrone'
import { Rotors, type RotorsHandle } from './Rotors'

const placement = PLACEMENTS.drone
const PAD_TOP = 0.004
const WIDTH = 0.17
const LIFT = 0.03
const BANK = 0.2
const HOVER_ROTOR_SPEED = 7
const FLIGHT_ROTOR_SPEED = 70
const ROTOR_SPAN = 0.052

/** Rotor hubs in drone space (metres), set from the model's measured size. */
function rotorLayout(size: Vector3): Vec3[] {
  const x = size.x * 0.36
  const z = size.z * 0.36
  const y = size.y * 0.72
  return [
    [x, y, z],
    [-x, y, z],
    [-x, y, -z],
    [x, y, -z],
  ]
}

interface Flight {
  lift: number
  bank: number
  towards: number
  wobble: number
  rotor: number
}

export function Drone() {
  const { onObjectClick, interaction } = useDesk()
  const invalidate = useThree((s) => s.invalidate)
  const [size, setSize] = useState(() => new Vector3(WIDTH, 0.07, WIDTH * 0.78))
  const rotorPositions = useMemo(() => rotorLayout(size), [size])
  const rotors = useRef<RotorsHandle>(null)
  const body = useRef<Group>(null)
  const shadow = useRef<Mesh>(null)
  const flight = useRef<Flight>({ lift: 0, bank: 0, towards: 0, wobble: 0, rotor: 0 })
  const animation = useRef<gsap.core.Timeline | gsap.core.Tween | null>(null)
  const pod = useMemo(
    () => ({
      geometry: new BoxGeometry(0.046, 0.024, 0.034),
      material: new MeshStandardMaterial({ map: podCrossTexture(), roughness: 0.6, metalness: 0.05 }),
    }),
    [],
  )
  const onMeasured = useCallback((s: Vector3) => setSize(s.clone()), [])

  // The book is at the origin; bank and drift towards it in the drone's own frame.
  const towardsBook = useMemo(() => {
    const yaw = placement.yaw
    const wx = -placement.position[0]
    const wz = -placement.position[2]
    const length = Math.hypot(wx, wz) || 1
    const x = (wx * Math.cos(yaw) - wz * Math.sin(yaw)) / length
    const z = (wx * Math.sin(yaw) + wz * Math.cos(yaw)) / length
    return new Vector3(x, 0, z)
  }, [])

  useFrame(() => {
    const g = body.current
    if (!g) return
    const f = flight.current
    const t = performance.now() / 1000
    const wobble = f.wobble * 0.05
    g.position.set(towardsBook.x * f.towards, f.lift + Math.sin(t * 9) * wobble * 0.15, towardsBook.z * f.towards)
    // Bank: tip the airframe down towards the book.
    g.rotation.set(
      towardsBook.z * f.bank + Math.sin(t * 7) * wobble,
      0,
      -towardsBook.x * f.bank + Math.cos(t * 6) * wobble,
    )
    rotors.current?.setSpeed(f.rotor)
    const s = shadow.current
    if (s) {
      const spread = 1 + f.lift * 8
      s.scale.set(0.2 * spread, 0.2 * spread, 1)
      s.position.set(g.position.x, 0.0006, g.position.z)
      ;(s.material as Material).opacity = 0.6 / spread
    }
  })

  const settle = (duration: number, onComplete?: () => void) => {
    animation.current?.kill()
    animation.current = gsap.to(flight.current, {
      lift: 0,
      bank: 0,
      towards: 0,
      wobble: 0,
      rotor: 0,
      duration,
      ease: EXPO_OUT,
      onUpdate: invalidate,
      onComplete,
    })
  }

  const fly = (full: boolean) => {
    animation.current?.kill()
    const f = flight.current
    const done = () => interaction.release('drone')
    if (!full) {
      const tl = gsap.timeline({ onUpdate: invalidate, onComplete: done })
      tl.to(f, { rotor: 40, lift: 0.01, duration: SHORT_DURATION * 0.5, ease: 'power2.out' })
      tl.to(f, { rotor: 0, lift: 0, duration: SHORT_DURATION * 0.5, ease: 'power2.in' })
      animation.current = tl
      return
    }
    const tl = gsap.timeline({ onUpdate: invalidate, onComplete: done })
    tl.to(f, { rotor: FLIGHT_ROTOR_SPEED, duration: 0.5, ease: 'power2.in' }, 0)
    tl.to(f, { lift: LIFT, wobble: 1, duration: 0.7, ease: 'power2.out' }, 0.25)
    tl.to(f, { bank: BANK, towards: 0.03, duration: 0.6, ease: 'power2.inOut' }, 0.9)
    tl.to(f, { bank: 0, towards: 0, duration: 0.6, ease: 'power2.inOut' }, 1.9)
    tl.to(f, { lift: 0, wobble: 0, duration: 0.7, ease: 'power2.in' }, 2.5)
    tl.to(f, { rotor: 0, duration: 0.8, ease: 'power2.out' }, 3.0)
    animation.current = tl
  }

  const { highlighted, label, bind } = useDeskObject('drone', {
    onClick: ({ full, instant }) => {
      onObjectClick('drone')
      if (instant) {
        interaction.release('drone')
        return
      }
      fly(full)
    },
    onCancel: () => settle(SHORT_DURATION),
    onHighlight: (on) => {
      if (interaction.get().active === 'drone') return
      animation.current?.kill()
      animation.current = gsap.to(flight.current, { rotor: on ? HOVER_ROTOR_SPEED : 0, duration: HOVER_DURATION, ease: EXPO_OUT, onUpdate: invalidate })
    },
  })

  const fallback = <ProceduralDrone rotorPositions={rotorPositions} bind={bind} outlined={highlighted} />

  return (
    <group position={[placement.position[0], PAD_TOP, placement.position[2]]} rotation={[0, placement.yaw, 0]}>
      <group ref={body}>
        <ModelBoundary fallback={fallback}>
          <Suspense fallback={null}>
            <DroneModel width={WIDTH} onMeasured={onMeasured} bind={bind} outlined={highlighted} />
          </Suspense>
        </ModelBoundary>
        <Rotors ref={rotors} positions={rotorPositions} span={ROTOR_SPAN} />
        <mesh geometry={pod.geometry} material={pod.material} position={[0, size.y * 0.22, 0]} {...bind} />
      </group>
      <ShadowBlob ref={shadow} size={[0.2, 0.2]} opacity={0.6} />
      <ObjectLabel text={label} visible={highlighted} position={placement.labelOffset} />
    </group>
  )
}
