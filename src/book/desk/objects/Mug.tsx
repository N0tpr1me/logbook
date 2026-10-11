// The coffee mug: matte charcoal stoneware on a cork coaster, a teaspoon
// resting beside it, black coffee with a thin crema. Clicking stirs the
// coffee and shows the "Now" note (plan: The coffee mug, in detail).

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  CatmullRomCurve3,
  CircleGeometry,
  DoubleSide,
  type Group,
  LatheGeometry,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'
import { person } from '@/content/content'
import { useBookState } from '@/book/state'
import { useDesk } from '../DeskContext'
import { merge, moved, turned } from '../geometry'
import { useDeskState } from '../interaction'
import { PLACEMENTS } from '../layout'
import { ObjectLabel } from '../ObjectLabel'
import { Outline } from '../Outline'
import { ShadowBlob } from '../ShadowBlob'
import { useDeskObject } from '../useDeskObject'
import { createCoffeeMaterial } from './coffeeShader'
import { NowNote } from './NowNote'
import { Steam, type SteamHandle } from './Steam'
import { MUG, createStirSequencer, createStirTargets } from './stir'

const placement = PLACEMENTS.mug
const COASTER_TOP = 0.006
const NOTE_OFFSET = [0.02, 0.02, 0.1] as const

function mugGeometry() {
  const r = MUG.radius
  const profile = [
    [0, 0],
    [0.031, 0],
    [0.036, 0.003],
    [0.0385, 0.009],
    [r, 0.02],
    [r, 0.088],
    [0.0395, 0.097],
    [0.0375, 0.101],
    [0.0355, 0.0985],
    [0.0352, 0.09],
    [0.0352, 0.06],
    [0.034, 0.03],
    [0.03, 0.027],
    [0, 0.027],
  ].map(([x, y]) => new Vector2(x, y + COASTER_TOP))
  const body = new LatheGeometry(profile, 48)
  const handle = moved(turned(new TorusGeometry(0.0235, 0.0062, 10, 28, Math.PI), 0, 0, -Math.PI / 2), r - 0.002, 0.062 + COASTER_TOP, 0)
  return merge([body, handle])
}

function spoonGeometry() {
  const curve = new CatmullRomCurve3([
    new Vector3(0, 0, 0),
    new Vector3(0.035, 0.0012, 0),
    new Vector3(0.07, 0.0055, 0),
    new Vector3(0.087, 0.0035, 0),
  ])
  const handle = new TubeGeometry(curve, 20, 0.0022, 8, false)
  const bowl = new SphereGeometry(1, 18, 10)
  bowl.scale(0.0135, 0.0038, 0.0095)
  bowl.translate(0.098, 0, 0)
  const spoon = merge([handle, bowl])
  // Bowl at the origin, handle rising along +y.
  spoon.translate(-0.098, 0, 0)
  spoon.rotateZ(-Math.PI / 2)
  return spoon
}

export function Mug() {
  const { store, audio, interaction, onObjectClick, revealed } = useDesk()
  const invalidate = useThree((s) => s.invalidate)
  const readingLight = useBookState(store, (s) => s.readingLight)
  const noteOpen = useDeskState(interaction, (s) => s.noteOpen)

  const geometry = useMemo(() => ({ body: mugGeometry(), spoon: spoonGeometry(), coffee: new CircleGeometry(MUG.innerRadius, 48) }), [])
  const materials = useMemo(
    () => ({
      body: new MeshStandardMaterial({ color: '#2C2B29', roughness: 0.8, metalness: 0.02, side: DoubleSide }),
      spoon: new MeshStandardMaterial({ color: '#D9D9D6', roughness: 0.28, metalness: 0.95 }),
      coffee: createCoffeeMaterial(),
    }),
    [],
  )
  const spoon = useRef<Group>(null)
  const steam = useRef<SteamHandle>(null)
  const targets = useMemo(createStirTargets, [])

  const sequencer = useMemo(
    () =>
      createStirSequencer(targets, {
        invalidate,
        onTap: () => audio?.playEffect('clink'),
        onNote: () => {
          interaction.set({ noteOpen: true })
          steam.current?.burst()
        },
        onDone: () => interaction.release('mug'),
      }),
    [targets, invalidate, audio, interaction],
  )
  useEffect(() => () => sequencer.dispose(), [sequencer])

  useEffect(() => {
    materials.coffee.uniforms.uLight.value = readingLight ? 1 : 0
    invalidate()
  }, [readingLight, materials, invalidate])

  // Steam rises for 4 seconds after the desk appears.
  useEffect(() => {
    if (revealed && !store.get().testMode) steam.current?.burst()
  }, [revealed, store])

  useFrame(() => {
    const group = spoon.current
    if (!group) return
    const p = targets.pose
    group.position.set(p.x, p.y, p.z)
    group.rotation.set(0, p.rotY, p.rotZ, 'YXZ')
    materials.coffee.uniforms.uSwirl.value = targets.swirl
    materials.coffee.uniforms.uRipple.value = targets.ripple
  })

  const { highlighted, label, bind } = useDeskObject('mug', {
    alwaysFull: true,
    onClick: ({ instant }) => {
      onObjectClick('mug')
      if (sequencer.addCircle()) return
      sequencer.start(instant)
    },
    onCancel: () => sequencer.cancel(),
    onHighlight: (on) => steam.current?.setHover(on),
  })

  const closeNote = useCallback(() => interaction.set({ noteOpen: false }), [interaction])

  return (
    <group position={[placement.position[0], placement.position[1], placement.position[2]]} rotation={[0, placement.yaw, 0]}>
      <mesh geometry={geometry.body} material={materials.body} {...bind} />
      <mesh
        geometry={geometry.coffee}
        material={materials.coffee}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, MUG.coffeeY + COASTER_TOP, 0]}
        {...bind}
      />
      <group ref={spoon}>
        <mesh geometry={geometry.spoon} material={materials.spoon} {...bind} />
      </group>
      <Outline geometry={geometry.body} visible={highlighted} thickness={0.0025} />
      <Steam ref={steam} rimY={MUG.rim + COASTER_TOP} />
      <ShadowBlob size={[0.17, 0.17]} opacity={0.6} position={[0, COASTER_TOP + 0.0005, 0]} />
      <ObjectLabel text={label} visible={highlighted} position={placement.labelOffset} />
      <NowNote open={noteOpen} text={person.nowNote} position={NOTE_OFFSET} onClose={closeNote} />
    </group>
  )
}
