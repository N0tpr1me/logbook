// What the Book reports when a pointer touches a page. The Book turns raw
// pointer events into these (raycast, grab zone, unprojection onto the book
// plane); the drag input turns them into controller calls.

export type PageSideName = 'right' | 'left'

export interface PageGrabInfo {
  /** Which stack the touched page lies on. */
  side: PageSideName
  /** Distance from the spine to the grab point, as a fraction of the page width. */
  radius: number
  /** Grab point along the free edge, 0 = bottom, 1 = top. */
  grabY: number
  /** Fold tilt for this grab, in radians. */
  tilt: number
  /** True when the touch is in the outer 15% of the page (corners included). */
  inGrabZone: boolean
  /** Pointer x in the book plane, metres from the spine, right positive. */
  x: number
  pointerId: number
  /** Event timestamp in milliseconds. */
  time: number
}

export interface PagePointerHandlers {
  onGrab(info: PageGrabInfo): void
  /** The held pointer moved to book x (metres from the spine, right positive). */
  onMove(x: number, time: number): void
  onRelease(time: number): void
}

/** The outer 15% of a page, corners included, can be grabbed. */
export const GRAB_ZONE = 0.15

export function inGrabZone(radius: number, grabY: number): boolean {
  return radius >= 1 - GRAB_ZONE || grabY <= GRAB_ZONE || grabY >= 1 - GRAB_ZONE
}
