// Desk layout in metres, Y up. The desk top surface is the plane y = 0.
//
// The visitor sits in front of the desk, on the +z side, looking towards -z.
// The logbook is A4 portrait (0.21 wide along x, 0.297 deep along z) lying on
// a slate cutting mat centred at the origin, spine along +z on its left edge
// (x = -0.105). Everything else is placed around it; the integrator reads
// these positions to place labels and to move the camera.

export type Vec3 = readonly [number, number, number]

export interface CameraPose {
  position: Vec3
  target: Vec3
  /** Vertical field of view in degrees. */
  fov: number
}

/** Closed book footprint, metres. */
export const BOOK = { width: 0.21, height: 0.03, depth: 0.297 } as const
/** Open spread footprint, metres (two A4 pages side by side). */
export const SPREAD = { width: 0.42, depth: 0.297 } as const
/** The open spread fills this share of the window height (plan: Visual design). */
export const OPEN_BOOK_FILL = 0.88

/** Slate cutting mat under the book. */
export const MAT = { width: 0.52, depth: 0.40, thickness: 0.003, position: [0, 0, 0] as Vec3 } as const
/** Charcoal oak slab. Its top face is y = 0. */
export const SLAB = { width: 1.7, depth: 0.95, thickness: 0.04, position: [0, -0.02, 0.06] as Vec3 } as const

export interface ObjectPlacement {
  position: Vec3
  /** Rotation about y in radians. */
  yaw: number
  /** Approximate footprint radius, for the contact shadow and labels. */
  radius: number
  /** Where the hover label sits, relative to the object origin. */
  labelOffset: Vec3
}

/** Every desk object, keyed by id. The order of `DESK_OBJECT_ORDER` is left to right. */
export const PLACEMENTS = {
  book: { position: [0, MAT.thickness, 0], yaw: 0, radius: 0.19, labelOffset: [0, 0.07, 0] },
  lamp: { position: [-0.40, 0, -0.26], yaw: 0, radius: 0.085, labelOffset: [0.0, 0.16, 0.08] },
  cv: { position: [-0.38, 0, 0.0], yaw: 0.18, radius: 0.12, labelOffset: [0, 0.05, 0.1] },
  pencil: { position: [-0.16, 0, 0.175], yaw: -0.15, radius: 0.09, labelOffset: [0, 0.03, 0] },
  mug: { position: [0.33, 0, -0.17], yaw: -0.4, radius: 0.06, labelOffset: [0, 0.14, 0] },
  drone: { position: [0.36, 0, 0.19], yaw: -0.6, radius: 0.1, labelOffset: [0, 0.12, 0] },
} as const satisfies Record<string, ObjectPlacement>

export type DeskObjectId = keyof typeof PLACEMENTS

/** Keyboard order: left to right across the desk (plan: Accessibility). */
export const DESK_OBJECT_ORDER: readonly DeskObjectId[] = ['lamp', 'cv', 'pencil', 'book', 'mug', 'drone']

export const OBJECT_LABELS: Record<DeskObjectId, string> = {
  book: 'Open the logbook',
  lamp: 'Desk lamp',
  cv: 'Folded CV',
  pencil: 'Pencil: contact',
  mug: 'Coffee',
  drone: 'DroneMedic',
}

/** Lamp geometry: where the bulb sits and where the light points. */
export const LAMP = {
  bulb: [-0.26, 0.28, -0.13] as Vec3,
  aim: [0.02, 0.0, 0.0] as Vec3,
} as const

/** Three-quarter view that frames the whole desk at 1440 × 790. */
export const deskCamera: CameraPose = {
  position: [0.14, 0.74, 0.98],
  target: [0.02, 0.02, -0.05],
  fov: 36,
}

/** Where the camera starts during the 1.2s reveal before easing down to `deskCamera`. */
export const revealCamera: CameraPose = {
  position: [0.08, 1.0, 0.7],
  target: [0.02, 0.02, -0.05],
  fov: 36,
}

/**
 * The open-book view. The engine brings the book to the centre when it opens,
 * so the open spread is centred on the origin: x in [-0.21, 0.21], z in
 * [-0.1485, 0.1485], at the mat surface. The camera looks nearly straight down
 * (tilted 8 degrees towards the visitor so the far edge is at the top of the
 * window) from a distance where the spread's depth fills 88% of the window
 * height, or less when a narrow window makes the width the limit.
 */
export function cameraForOpenBook(aspect: number, fov = 30): CameraPose {
  const tilt = (8 * Math.PI) / 180
  const halfFov = ((fov / 2) * Math.PI) / 180
  const tanHalf = Math.tan(halfFov)
  const visibleDepth = SPREAD.depth / OPEN_BOOK_FILL
  const visibleWidth = SPREAD.width / 0.94
  const distanceForDepth = visibleDepth / 2 / tanHalf
  const distanceForWidth = visibleWidth / 2 / (tanHalf * Math.max(aspect, 0.1))
  const d = Math.max(distanceForDepth, distanceForWidth)
  const target: Vec3 = [0, MAT.thickness + BOOK.height / 2, 0]
  return {
    position: [target[0], target[1] + d * Math.cos(tilt), target[2] + d * Math.sin(tilt)],
    target,
    fov,
  }
}

/** The open-book camera for the reference window (1440 × 790). */
export const bookCamera: CameraPose = cameraForOpenBook(1440 / 790)
