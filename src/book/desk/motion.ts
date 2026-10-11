// Shared timings from the plan's Motion table, plus small GSAP helpers that
// keep the demand-mode renderer drawing while something moves.

import gsap from 'gsap'

export const EXPO_OUT = 'expo.out'
export const POWER2_IN_OUT = 'power2.inOut'

/** Hover response on an object. */
export const HOVER_DURATION = 0.18
/** Short version of a click animation on repeat clicks. */
export const SHORT_DURATION = 0.3
/** Lamp switch. */
export const LAMP_DURATION = 0.4

export type Invalidate = () => void

export interface ClickContext {
  /** First click this visit: play the full animation. Later clicks play the 0.3s version. */
  full: boolean
  /** Reduced motion or test mode: jump straight to the end state. */
  instant: boolean
}

/** A timeline that redraws on every tick and can be jumped to its end. */
export function timeline(invalidate: Invalidate, vars: gsap.TimelineVars = {}): gsap.core.Timeline {
  return gsap.timeline({ ...vars, onUpdate: invalidate })
}

/** A tween that redraws on every tick. */
export function to<T extends object>(target: T, vars: gsap.TweenVars, invalidate: Invalidate): gsap.core.Tween {
  return gsap.to(target, { ...vars, onUpdate: invalidate })
}

/** Kill a running animation, if any, keeping the current values. */
export function kill(animation: gsap.core.Animation | null | undefined): void {
  animation?.kill()
}

/** Finish an animation instantly, firing its callbacks. */
export function finish(animation: gsap.core.Animation | null | undefined): void {
  if (!animation) return
  animation.progress(1)
}
