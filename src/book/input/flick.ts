// One scroll, one page. A gesture (as grouped by wheel-gestures: the flick
// plus the trackpad coasting it causes) fires once, when its movement has
// travelled a set distance mostly up or down. Anything else about the
// gesture is ignored until it ends: more coasting, a page settling mid-coast,
// a sideways swipe. Plan: Scrolling, one scroll, one page.

export interface FlickEvent {
  isStart: boolean
  isEnding: boolean
  isMomentum: boolean
  /** Cumulative movement since the gesture started: [x, y, z]. */
  axisMovement: readonly [number, number, number]
}

export interface FlickOptions {
  /** Distance a gesture must travel before it counts, in pixels. Tuned in testing. */
  threshold?: number
  /** Vertical movement must be at least this many times the horizontal to count. */
  verticalRatio?: number
}

export type FlickDirection = 1 | -1 | 0

export interface FlickDetector {
  /** Feed one gesture event; returns the page direction to turn, or 0. */
  feed(event: FlickEvent): FlickDirection
  /** Ignore the gesture in progress until it ends (a page settled, the sheet closed, a drag began). */
  suspend(): void
  reset(): void
  inGesture(): boolean
}

export const FLICK_THRESHOLD = 40
export const FLICK_VERTICAL_RATIO = 1.5

type Decision = 'pending' | 'fired' | 'ignored'

export function createFlickDetector(options: FlickOptions = {}): FlickDetector {
  const threshold = options.threshold ?? FLICK_THRESHOLD
  const ratio = options.verticalRatio ?? FLICK_VERTICAL_RATIO
  let active = false
  let decision: Decision = 'pending'

  const decide = (movement: readonly [number, number, number]): FlickDirection => {
    const [x, y] = movement
    if (Math.abs(y) < threshold && Math.abs(x) < threshold) return 0
    decision = Math.abs(y) >= ratio * Math.abs(x) ? 'fired' : 'ignored'
    return decision === 'fired' ? (y > 0 ? 1 : -1) : 0
  }

  return {
    feed(event) {
      if (event.isStart) {
        active = true
        decision = 'pending'
      }
      let result: FlickDirection = 0
      if (active && decision === 'pending') result = decide(event.axisMovement)
      if (event.isEnding) {
        active = false
        decision = 'pending'
      }
      return result
    },
    suspend() {
      if (active) decision = 'ignored'
    },
    reset() {
      active = false
      decision = 'pending'
    },
    inGesture: () => active,
  }
}
