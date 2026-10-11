// A tiny damped spring, integrated in fixed sub-steps so it behaves the same
// at any frame rate. Pages use stiffness 170 and damping 26 (critically
// damped, no overshoot, settles in about 0.65 s); the cover uses damping 20
// (about 2% overshoot, so it lands with weight). Plan: Motion and timings.

export interface SpringConfig {
  stiffness: number
  damping: number
  mass?: number
}

export interface SpringState {
  /** Current value. */
  x: number
  /** Current velocity, in units per second. */
  v: number
  /** Where the spring is pulling towards. */
  target: number
}

export const PAGE_SPRING: SpringConfig = { stiffness: 170, damping: 26 }
export const COVER_SPRING: SpringConfig = { stiffness: 170, damping: 20 }
/** A released page settles faster (about 0.4 s). */
export const RELEASE_SPRING: SpringConfig = { stiffness: 420, damping: 41 }

/** Fixed integration step, in seconds. */
export const SPRING_STEP = 1 / 240
/** Distance and speed under which a spring counts as settled. */
export const SETTLE_DISTANCE = 1.5e-3
export const SETTLE_SPEED = 2e-2

/** Advance a spring by `dt` seconds. Returns a new state; the input is untouched. */
export function stepSpring(state: SpringState, config: SpringConfig, dt: number): SpringState {
  const mass = config.mass ?? 1
  let { x, v } = state
  let remaining = Math.max(0, dt)
  while (remaining > 0) {
    const h = Math.min(SPRING_STEP, remaining)
    const accel = (-config.stiffness * (x - state.target) - config.damping * v) / mass
    v += accel * h
    x += v * h
    remaining -= h
  }
  return { x, v, target: state.target }
}

export function isSettled(state: SpringState): boolean {
  return Math.abs(state.x - state.target) < SETTLE_DISTANCE && Math.abs(state.v) < SETTLE_SPEED
}

export interface SpringRun {
  /** Seconds until the spring settled (or `maxTime` if it never did). */
  settleTime: number
  /** Furthest the value went past the target, as a fraction of the distance travelled. */
  overshoot: number
  /** Final state. */
  state: SpringState
}

/** Run a spring to rest offline, for tests and tuning. */
export function simulateSpring(
  from: number,
  to: number,
  config: SpringConfig,
  initialVelocity = 0,
  maxTime = 5,
  frame = 1 / 60,
): SpringRun {
  const distance = to - from
  let state: SpringState = { x: from, v: initialVelocity, target: to }
  let overshoot = 0
  let time = 0
  while (time < maxTime) {
    state = stepSpring(state, config, frame)
    time += frame
    const past = distance === 0 ? 0 : ((state.x - to) * Math.sign(distance)) / Math.abs(distance)
    overshoot = Math.max(overshoot, past)
    if (isSettled(state)) return { settleTime: time, overshoot, state }
  }
  return { settleTime: maxTime, overshoot, state }
}
