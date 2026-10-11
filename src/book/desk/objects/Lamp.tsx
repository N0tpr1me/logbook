// The desk lamp: base, stem, arm, shade and a warm bulb, plus the one warm
// spotlight that lights the desk from the upper left. The switch toggles
// `store.readingLight` between evening light (warm, dimmer) and reading light
// (brighter, slightly cooler) over 0.4s expo-out (plan: Desk objects).

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import {
  Color,
  CylinderGeometry,
  DoubleSide,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  type SpotLight,
  Vector3,
} from 'three'
import { useDesk } from '../DeskContext'
import { cylinderBetween, merge, moved } from '../geometry'
import { LAMP, PLACEMENTS, type Vec3 } from '../layout'
import { EXPO_OUT, HOVER_DURATION, LAMP_DURATION } from '../motion'
import { ObjectLabel } from '../ObjectLabel'
import { Outline } from '../Outline'
import { ShadowBlob } from '../ShadowBlob'
import { useBookState } from '@/book/state'
import { useDeskObject } from '../useDeskObject'

const placement = PLACEMENTS.lamp
const bulbLocal: Vec3 = [
  LAMP.bulb[0] - placement.position[0],
  LAMP.bulb[1] - placement.position[1],
  LAMP.bulb[2] - placement.position[2],
]
const aimLocal: Vec3 = [LAMP.aim[0] - placement.position[0], LAMP.aim[1] - placement.position[1], LAMP.aim[2] - placement.position[2]]
const SHADE_LENGTH = 0.1
const SHADE_RADIUS = 0.068
const BULB_INSET = 0.055

interface LightSetting {
  intensity: number
  color: string
  bulb: number
}

const EVENING: LightSetting = { intensity: 0.85, color: '#FFAE62', bulb: 1.3 }
const READING: LightSetting = { intensity: 1.4, color: '#FFD8AE', bulb: 2.1 }

function lampGeometry() {
  const direction = new Vector3(...aimLocal).sub(new Vector3(...bulbLocal)).normalize()
  const apex = new Vector3(...bulbLocal).addScaledVector(direction, -BULB_INSET)
  const shadeEnd = apex.clone().addScaledVector(direction, SHADE_LENGTH)
  const joint: Vec3 = [0.045, 0.31, 0.045]
  const body = merge([
    moved(new CylinderGeometry(0.072, 0.08, 0.014, 40), 0, 0.007, 0),
    moved(new CylinderGeometry(0.026, 0.03, 0.022, 24), 0, 0.025, 0),
    cylinderBetween([0, 0.03, 0], joint, 0.009, 16),
    moved(new SphereGeometry(0.014, 16, 12), joint[0], joint[1], joint[2]),
    cylinderBetween(joint, [apex.x, apex.y, apex.z], 0.0075, 12),
    moved(new SphereGeometry(0.015, 16, 12), apex.x, apex.y, apex.z),
    // The switch on the base.
    moved(new CylinderGeometry(0.007, 0.007, 0.008, 16), 0.05, 0.018, 0.04),
    moved(new SphereGeometry(0.007, 16, 8), 0.05, 0.022, 0.04),
  ])
  const shade = cylinderBetween([apex.x, apex.y, apex.z], [shadeEnd.x, shadeEnd.y, shadeEnd.z], 0.016, 40, SHADE_RADIUS, true)
  return { body, shade, bulb: new SphereGeometry(0.016, 20, 14) }
}

export function Lamp() {
  const { store, audio, onObjectClick, interaction } = useDesk()
  const invalidate = useThree((s) => s.invalidate)
  const readingLight = useBookState(store, (s) => s.readingLight)
  const geometry = useMemo(lampGeometry, [])
  const materials = useMemo(
    () => ({
      body: new MeshStandardMaterial({ color: '#2B2A28', metalness: 0.6, roughness: 0.42 }),
      shade: new MeshStandardMaterial({
        color: '#2B2A28',
        metalness: 0.6,
        roughness: 0.38,
        side: DoubleSide,
        emissive: new Color('#FF9A4A'),
        emissiveIntensity: 0.02,
      }),
      bulb: new MeshStandardMaterial({ color: '#FFE9CC', emissive: new Color('#FFC27A'), emissiveIntensity: EVENING.bulb }),
    }),
    [],
  )
  const light = useRef<SpotLight>(null)
  const target = useMemo(() => {
    const t = new Object3D()
    t.position.set(aimLocal[0], aimLocal[1], aimLocal[2])
    return t
  }, [])

  // Live light values: tweened by the switch, scaled a little by hover.
  const live = useRef({ ...EVENING, tint: new Color(EVENING.color), boost: 1 })
  const apply = useCallback(() => {
    const l = live.current
    if (light.current) {
      light.current.intensity = l.intensity * l.boost
      light.current.color.copy(l.tint)
    }
    materials.bulb.emissiveIntensity = l.bulb * l.boost
    materials.shade.emissiveIntensity = 0.012 + 0.01 * l.bulb * l.boost
    invalidate()
  }, [materials, invalidate])

  useEffect(() => {
    const next = readingLight ? READING : EVENING
    const { reducedMotion, testMode } = store.get()
    const l = live.current
    const tween = gsap.to(l, {
      intensity: next.intensity,
      bulb: next.bulb,
      duration: reducedMotion || testMode ? 0 : LAMP_DURATION,
      ease: EXPO_OUT,
      onUpdate: apply,
    })
    const tintTween = gsap.to(l.tint, {
      r: new Color(next.color).r,
      g: new Color(next.color).g,
      b: new Color(next.color).b,
      duration: reducedMotion || testMode ? 0 : LAMP_DURATION,
      ease: EXPO_OUT,
    })
    return () => {
      tween.kill()
      tintTween.kill()
    }
  }, [readingLight, store, apply])

  const { highlighted, label, bind } = useDeskObject('lamp', {
    onClick: () => {
      store.set((s) => ({ readingLight: !s.readingLight }))
      audio?.playEffect('lampClick')
      onObjectClick('lamp')
      interaction.release('lamp')
    },
    onCancel: () => undefined,
    onHighlight: (on) => {
      gsap.to(live.current, { boost: on ? 1.14 : 1, duration: HOVER_DURATION, ease: EXPO_OUT, onUpdate: apply })
    },
  })

  return (
    <group position={[placement.position[0], placement.position[1], placement.position[2]]} rotation={[0, placement.yaw, 0]}>
      <primitive object={target} />
      <spotLight
        ref={light}
        position={[bulbLocal[0], bulbLocal[1], bulbLocal[2]]}
        target={target}
        angle={0.78}
        penumbra={0.6}
        decay={2}
        distance={0}
        intensity={EVENING.intensity}
        color={EVENING.color}
      />
      <mesh geometry={geometry.body} material={materials.body} {...bind} />
      <mesh geometry={geometry.shade} material={materials.shade} {...bind} />
      <mesh geometry={geometry.bulb} material={materials.bulb} position={[bulbLocal[0], bulbLocal[1], bulbLocal[2]]} raycast={() => null} />
      <Outline geometry={geometry.body} visible={highlighted} thickness={0.003} />
      <Outline geometry={geometry.shade} visible={highlighted} thickness={0.003} />
      <ShadowBlob size={[0.24, 0.24]} opacity={0.5} />
      <ObjectLabel text={label} visible={highlighted} position={placement.labelOffset} />
    </group>
  )
}
