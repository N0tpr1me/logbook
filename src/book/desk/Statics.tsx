// Fixed desk parts: the oak slab, the slate mat, the cork coaster and the
// drone's landing pad. Each is one mesh with a procedural texture; nothing
// here ever moves.

import { useMemo } from 'react'
import { CylinderGeometry, MeshStandardMaterial, RepeatWrapping } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { MAT, PLACEMENTS, SLAB } from './layout'
import { corkTexture, landingPadTexture, oakGrainTexture, slateMatTexture } from './textures'

export const COASTER = { radius: 0.056, thickness: 0.006 } as const
export const PAD = { radius: 0.085, thickness: 0.004 } as const

function useStaticParts() {
  return useMemo(() => {
    const oak = oakGrainTexture()
    oak.wrapS = RepeatWrapping
    oak.wrapT = RepeatWrapping
    oak.repeat.set(2, 1)

    const slab = {
      geometry: new RoundedBoxGeometry(SLAB.width, SLAB.thickness, SLAB.depth, 2, 0.006),
      material: new MeshStandardMaterial({ map: oak, roughness: 0.7, metalness: 0.0, color: '#E4DCCE' }),
    }
    const mat = {
      geometry: new RoundedBoxGeometry(MAT.width, MAT.thickness, MAT.depth, 1, 0.0015),
      material: new MeshStandardMaterial({ map: slateMatTexture(), roughness: 0.92, metalness: 0.0 }),
    }
    const coaster = {
      geometry: new CylinderGeometry(COASTER.radius, COASTER.radius, COASTER.thickness, 40),
      material: new MeshStandardMaterial({ map: corkTexture(), roughness: 0.95, metalness: 0.0 }),
    }
    const pad = {
      geometry: new CylinderGeometry(PAD.radius, PAD.radius * 1.02, PAD.thickness, 48),
      material: new MeshStandardMaterial({ map: landingPadTexture(), roughness: 0.85, metalness: 0.0 }),
    }
    return { slab, mat, coaster, pad }
  }, [])
}

export function Statics() {
  const { slab, mat, coaster, pad } = useStaticParts()
  const mug = PLACEMENTS.mug
  const drone = PLACEMENTS.drone
  return (
    <group>
      <mesh geometry={slab.geometry} material={slab.material} position={[SLAB.position[0], SLAB.position[1], SLAB.position[2]]} />
      <mesh geometry={mat.geometry} material={mat.material} position={[MAT.position[0], MAT.thickness / 2, MAT.position[2]]} />
      <mesh
        geometry={coaster.geometry}
        material={coaster.material}
        position={[mug.position[0], COASTER.thickness / 2, mug.position[2]]}
        rotation={[0, mug.yaw, 0]}
      />
      <mesh
        geometry={pad.geometry}
        material={pad.material}
        position={[drone.position[0], PAD.thickness / 2, drone.position[2]]}
        rotation={[0, drone.yaw, 0]}
      />
    </group>
  )
}
