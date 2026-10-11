// Fake contact shadow: a soft radial-gradient plane just above the surface.
// No shadow maps anywhere on the desk (plan: Keeping it smooth).

import { forwardRef, useMemo } from 'react'
import { MeshBasicMaterial, type Mesh } from 'three'
import { shadowBlobTexture } from './textures'

export interface ShadowBlobProps {
  /** Footprint in metres, x and z. */
  size: readonly [number, number]
  opacity?: number
  /** Position of the blob centre; y should sit a hair above the surface. */
  position?: readonly [number, number, number]
  rotationY?: number
}

export const ShadowBlob = forwardRef<Mesh, ShadowBlobProps>(function ShadowBlob(
  { size, opacity = 0.55, position = [0, 0.0006, 0], rotationY = 0 },
  ref,
) {
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        map: shadowBlobTexture(),
        transparent: true,
        opacity,
        depthWrite: false,
        toneMapped: false,
        color: '#000000',
      }),
    [opacity],
  )
  return (
    <mesh
      ref={ref}
      material={material}
      position={[position[0], position[1], position[2]]}
      rotation={[-Math.PI / 2, 0, rotationY]}
      scale={[size[0], size[1], 1]}
      raycast={() => null}
      renderOrder={1}
    >
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
})
