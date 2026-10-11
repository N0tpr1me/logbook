// GSAP-timed moves (open, jump, close) and the sweep path they follow.
// Plan: Motion and timings. A jump flicks at most four pages past whatever
// the distance, so a long sweep snaps to four sheets before the target and
// sweeps those.

import gsap from 'gsap'

export interface TimedMoveSpec {
  from: number
  to: number
  /** Seconds. Zero with a delay acts as a delayed call. */
  duration: number
  delay?: number
  onUpdate(value: number): void
  onComplete(): void
}

export interface TimedMove {
  kill(): void
}

export type TimedMoveFactory = (spec: TimedMoveSpec) => TimedMove

export const EASE_POWER2_IN_OUT = 'power2.inOut'

/** The default factory: a GSAP tween on a proxy value. */
export const gsapTimedMove: TimedMoveFactory = (spec) => {
  const proxy = { value: spec.from }
  const tween = gsap.to(proxy, {
    value: spec.to,
    duration: spec.duration,
    delay: spec.delay ?? 0,
    ease: EASE_POWER2_IN_OUT,
    overwrite: false,
    onUpdate: () => spec.onUpdate(proxy.value),
    onComplete: spec.onComplete,
  })
  return { kill: () => tween.kill() }
}

/** A straight run of positions the sweep passes through. */
export type SweepSegment = readonly [from: number, to: number]

/**
 * The positions a sweep visits on its way from `from` to `to`, flicking at
 * most `cap` sheets. `keepStart` sheets at the start are always swept (the
 * cover, when opening from the desk).
 */
export function sweepPath(from: number, to: number, cap: number, keepStart = 0): SweepSegment[] {
  const distance = to - from
  const sign = Math.sign(distance)
  if (Math.abs(distance) <= cap || sign === 0) return [[from, to]]
  const tail: SweepSegment = [to - sign * cap, to]
  if (keepStart <= 0) return [tail]
  const head: SweepSegment = [from, from + sign * keepStart]
  // If the head runs into the tail, one straight sweep covers everything.
  if (Math.abs(tail[0] - head[1]) <= 1e-9 || sign * (tail[0] - head[1]) < 0) return [[from, to]]
  return [head, tail]
}

/** Position at progress `p` (0..1) along a sweep path, snapping between segments. */
export function positionAlongPath(path: readonly SweepSegment[], p: number): number {
  const lengths = path.map(([a, b]) => Math.abs(b - a))
  const total = lengths.reduce((sum, l) => sum + l, 0)
  if (total === 0) return path[path.length - 1]?.[1] ?? 0
  let remaining = Math.min(Math.max(p, 0), 1) * total
  for (let i = 0; i < path.length; i += 1) {
    const [a, b] = path[i]
    const length = lengths[i]
    if (remaining <= length || i === path.length - 1) {
      const t = length === 0 ? 1 : Math.min(remaining / length, 1)
      return a + (b - a) * t
    }
    remaining -= length
  }
  return path[path.length - 1][1]
}
