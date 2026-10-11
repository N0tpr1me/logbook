// Stand-in for the logbook while the page-turn engine is built elsewhere:
// a closed A4 block in cover cloth that lifts 3mm on hover and opens the book
// on click. The integrator swaps this for the real book.

import { useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { type Group, MeshStandardMaterial } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { useDesk } from '../DeskContext'
import { BOOK, PLACEMENTS } from '../layout'
import { EXPO_OUT, HOVER_DURATION } from '../motion'
import { ObjectLabel } from '../ObjectLabel'
import { Outline } from '../Outline'
import { ShadowBlob } from '../ShadowBlob'
import { useDeskObject } from '../useDeskObject'

const placement = PLACEMENTS.book
const HOVER_LIFT = 0.003

export function BookPlaceholder() {
  const { onObjectClick, interaction } = useDesk()
  const invalidate = useThree((s) => s.invalidate)
  const geometry = useMemo(() => new RoundedBoxGeometry(BOOK.width, BOOK.height, BOOK.depth, 2, 0.003), [])
  const pages = useMemo(() => new RoundedBoxGeometry(BOOK.width - 0.012, BOOK.height - 0.006, BOOK.depth - 0.006, 1, 0.001), [])
  const materials = useMemo(
    () => ({
      cover: new MeshStandardMaterial({ color: '#23402F', roughness: 0.88, metalness: 0.0 }),
      pages: new MeshStandardMaterial({ color: '#E6ECDF', roughness: 0.95, metalness: 0.0 }),
    }),
    [],
  )
  const lifter = useRef<Group>(null)

  const { highlighted, label, bind } = useDeskObject('book', {
    onClick: () => {
      onObjectClick('book')
      interaction.release('book')
    },
    onCancel: () => undefined,
    onHighlight: (on) => {
      const g = lifter.current
      if (!g) return
      gsap.to(g.position, { y: on ? HOVER_LIFT : 0, duration: HOVER_DURATION, ease: EXPO_OUT, onUpdate: invalidate })
    },
  })

  return (
    <group position={[placement.position[0], placement.position[1], placement.position[2]]}>
      <group ref={lifter}>
        <mesh geometry={geometry} material={materials.cover} position={[0, BOOK.height / 2, 0]} {...bind} />
        <mesh geometry={pages} material={materials.pages} position={[0.004, BOOK.height / 2, 0]} raycast={() => null} />
        <group position={[0, BOOK.height / 2, 0]}>
          <Outline geometry={geometry} visible={highlighted} thickness={0.003} />
        </group>
      </group>
      <ShadowBlob size={[0.3, 0.38]} opacity={0.55} />
      <ObjectLabel text={label} visible={highlighted} position={placement.labelOffset} />
    </group>
  )
}
