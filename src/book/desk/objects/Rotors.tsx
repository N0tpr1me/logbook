// Four spinning rotors over the model's own props: a two-blade prop while
// turning slowly, a translucent disc at speed, nothing at rest (the model's
// static props show then). The parent drives `speed` through the handle.

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BoxGeometry, CircleGeometry, DoubleSide, type Group, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import type { Vec3 } from '../layout'

export interface RotorsHandle {
  setSpeed: (radiansPerSecond: number) => void
  speed: () => number
}

export interface RotorsProps {
  positions: readonly Vec3[]
  /** Blade span in metres. */
  span: number
}

const DISC_SPEED = 22

export const Rotors = forwardRef<RotorsHandle, RotorsProps>(function Rotors({ positions, span }, ref) {
  const groups = useRef<(Group | null)[]>([])
  const state = useRef({ speed: 0 })
  const blade = useMemo(() => new BoxGeometry(span, 0.0015, span * 0.11), [span])
  const disc = useMemo(() => new CircleGeometry(span / 2, 32), [span])
  const materials = useMemo(
    () => ({
      blade: new MeshStandardMaterial({ color: '#1F2124', roughness: 0.5, metalness: 0.2 }),
      disc: new MeshBasicMaterial({ color: '#2A2C30', transparent: true, opacity: 0.32, side: DoubleSide, depthWrite: false }),
    }),
    [],
  )

  useImperativeHandle(ref, () => ({
    setSpeed: (v) => {
      state.current.speed = v
    },
    speed: () => state.current.speed,
  }))

  useFrame(({ invalidate }, dt) => {
    const speed = state.current.speed
    const turning = speed > 0.001
    const spinning = speed > DISC_SPEED
    groups.current.forEach((g, i) => {
      if (!g) return
      if (turning) g.rotation.y += speed * Math.min(dt, 0.05) * (i % 2 === 0 ? 1 : -1)
      const [bladeMesh, discMesh] = g.children
      if (bladeMesh) bladeMesh.visible = turning && !spinning
      if (discMesh) discMesh.visible = spinning
    })
    if (turning) invalidate()
  })

  return (
    <>
      {positions.map((p, i) => (
        <group
          key={i}
          position={[p[0], p[1], p[2]]}
          rotation={[0, (i * Math.PI) / 3, 0]}
          ref={(el) => {
            groups.current[i] = el
          }}
        >
          <mesh geometry={blade} material={materials.blade} visible={false} raycast={() => null} />
          <mesh geometry={disc} material={materials.disc} rotation={[-Math.PI / 2, 0, 0]} visible={false} raycast={() => null} />
        </group>
      ))}
    </>
  )
})
