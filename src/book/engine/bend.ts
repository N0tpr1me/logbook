// The page bend, in plain maths, mirrored exactly by the vertex shader in
// PageMaterial.ts. The drag input uses this to keep the grabbed point of a
// bent page under the cursor.
//
// A sheet is a strip of paper bound at the spine (s = 0) and free at s = W.
// Its rigid rotation about the spine (uTurn, applied on the mesh) is separate
// from the bend. The bend gives the tangent an extra angle that grows along
// the sheet from the root, which the binding holds flat: phi(s) = k s, with
// the tip swung by `bend` radians. Integrating the tangent gives an arc, so
// the paper keeps its length. Because |bend| <= BEND_MAX sin(theta) < theta,
// the tip never dips through the stack it is leaving or landing on.
//
//   bend > 0  the tip is ahead of the root (a page pulled by the hand)
//   bend < 0  the tip lags behind the root (a page flicked from the spine)

/** Largest tangent change across a page at full curl, in radians. */
export const BEND_MAX = 0.55
/** Curl magnitude used while a page is held by the pointer. */
export const DRAG_CURL = 0.5
/** A corner grab tilts the fold by up to 15 degrees. */
export const TILT_MAX = (15 * Math.PI) / 180
/** Speed (positions per second) at which an automatic turn reaches full curl. */
export const CURL_SPEED_REF = 4

/** Total bend angle for a signed curl and a turn (0..1). Flat at both ends. */
export function bendAngle(curl: number, turn: number): number {
  return curl * BEND_MAX * Math.sin(turn * Math.PI)
}

export interface BentPoint {
  x: number
  z: number
}

/**
 * Where the point at arc-length `s` lands in the sheet's own frame, on the
 * row through the grab point (so the tilt term is zero). `width` is W.
 */
export function bentPoint(s: number, width: number, bend: number): BentPoint {
  const k = bend / width
  if (Math.abs(k) < 1e-5) return { x: s, z: 0 }
  return { x: Math.sin(k * s) / k, z: (1 - Math.cos(k * s)) / k }
}

function sinc(x: number): number {
  return Math.abs(x) < 1e-6 ? 1 : Math.sin(x) / x
}

/**
 * Solve the rigid turn (0..1) that puts the point at radius `r` (metres from
 * the spine, on the grab row) at book x = `x` (metres, right positive).
 * `curl` is the signed curl the renderer applies while the page is held.
 */
export function solveTurnForX(x: number, r: number, width: number, curl: number): number {
  const radius = Math.max(r, 1e-4)
  let turn = Math.acos(clamp(x / radius, -1, 1)) / Math.PI
  // The bend depends on the turn, so refine with a few fixed-point steps.
  for (let i = 0; i < 4; i += 1) {
    const b = bendAngle(curl, turn)
    // The point sits on a chord of the arc: at radius r sinc(kappa), swung by kappa.
    const kappa = (b * radius) / (2 * width)
    const effective = radius * sinc(kappa)
    const world = Math.acos(clamp(x / effective, -1, 1)) - kappa
    turn = clamp(world / Math.PI, 0, 1)
  }
  return turn
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi)
}
