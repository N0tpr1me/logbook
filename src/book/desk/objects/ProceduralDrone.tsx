// Fallback quadcopter built from primitives, used if drone.glb fails to load:
// a body, four arms with motor pucks and two skids, as one vertex-coloured
// mesh. The rotors and cargo pod are added by the Drone component either way.

import { useLayoutEffect, useMemo } from 'react'
import { BoxGeometry, CylinderGeometry, MeshStandardMaterial } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { useDesk } from '../DeskContext'
import { cylinderBetween, merge, moved, withColor } from '../geometry'
import type { Vec3 } from '../layout'
import { Outline } from '../Outline'
import type { DeskObjectBinding } from '../useDeskObject'

export interface ProceduralDroneProps {
  rotorPositions: readonly Vec3[]
  bind: DeskObjectBinding['bind']
  outlined: boolean
}

const BODY = '#2B2E33'
const ARM = '#3A3E44'
const ACCENT = '#ECEAE4'

function droneGeometry(rotors: readonly Vec3[]) {
  const bodyY = 0.03
  const parts = [
    withColor(moved(new RoundedBoxGeometry(0.062, 0.02, 0.05, 2, 0.005), 0, bodyY, 0), BODY),
    withColor(moved(new RoundedBoxGeometry(0.03, 0.008, 0.02, 1, 0.002), 0.02, bodyY + 0.012, 0), ACCENT),
    // Skids.
    withColor(moved(new BoxGeometry(0.07, 0.004, 0.006), 0, 0.002, 0.02), ARM),
    withColor(moved(new BoxGeometry(0.07, 0.004, 0.006), 0, 0.002, -0.02), ARM),
    withColor(cylinderBetween([0.02, 0.004, 0.02], [0.02, bodyY, 0.015], 0.002, 8), ARM),
    withColor(cylinderBetween([-0.02, 0.004, 0.02], [-0.02, bodyY, 0.015], 0.002, 8), ARM),
    withColor(cylinderBetween([0.02, 0.004, -0.02], [0.02, bodyY, -0.015], 0.002, 8), ARM),
    withColor(cylinderBetween([-0.02, 0.004, -0.02], [-0.02, bodyY, -0.015], 0.002, 8), ARM),
  ]
  rotors.forEach((r) => {
    parts.push(withColor(cylinderBetween([r[0] * 0.3, bodyY, r[2] * 0.3], [r[0], r[1] - 0.006, r[2]], 0.0035, 10), ARM))
    parts.push(withColor(moved(new CylinderGeometry(0.007, 0.008, 0.008, 16), r[0], r[1] - 0.004, r[2]), BODY))
  })
  return merge(parts)
}

export function ProceduralDrone({ rotorPositions, bind, outlined }: ProceduralDroneProps) {
  const { modelReady } = useDesk()
  const geometry = useMemo(() => droneGeometry(rotorPositions), [rotorPositions])
  const material = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.25 }), [])
  useLayoutEffect(() => modelReady(), [modelReady])
  return (
    <>
      <mesh geometry={geometry} material={material} {...bind} />
      <Outline geometry={geometry} visible={outlined} thickness={0.0025} />
    </>
  )
}
