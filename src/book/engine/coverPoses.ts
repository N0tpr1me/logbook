// Where the covers and the spine strip sit for a given cover angle.
//
// The spine strip joins the back cover's centre plane to the front cover's.
// Closed, it stands up at the spine; open, it lies flat to the left of the
// pages, with the front cover beyond it. When the book closes on the back
// cover (position N+1) the strip stands up at its far end and the back cover
// swings over onto the left stack. Only one cover moves at a time, and both
// branches agree where they meet, so the motion is continuous.

import type { BookLayout } from './layout'

export interface Pose {
  x: number
  z: number
  /** Rotation about the y axis, radians (negative turns +x towards +z). */
  angle: number
}

export interface CoverPoses {
  strip: Pose
  front: Pose
  back: Pose
}

/** Poses for the front cover turn and the back cover turn (each 0..1). */
export function coverPoses(layout: BookLayout, frontTurn: number, backTurn: number): CoverPoses {
  const length = layout.spineWidth
  const base = -layout.coverThickness / 2
  if (backTurn <= 0) {
    const thetaF = frontTurn * Math.PI
    const angle = -(Math.PI / 2 + thetaF / 2)
    const end = stripEnd(0, base, length, angle)
    return {
      strip: { x: 0, z: base, angle },
      front: { x: end.x, z: end.z, angle: -thetaF },
      back: { x: 0, z: base, angle: 0 },
    }
  }
  const thetaB = backTurn * Math.PI
  const angle = -thetaB / 2
  const end = stripEnd(-length, base, length, angle)
  return {
    strip: { x: -length, z: base, angle },
    front: { x: -length, z: base, angle: -Math.PI },
    back: { x: end.x, z: end.z, angle: -thetaB },
  }
}

function stripEnd(x: number, z: number, length: number, angle: number): { x: number; z: number } {
  return { x: x + length * Math.cos(angle), z: z - length * Math.sin(angle) }
}
