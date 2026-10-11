// Per-frame maths for the Book: where each sheet sits for a position, which
// sheet is turning, and how tightly it curls for its speed. Pure functions,
// so they can be tested without a renderer.

import { CURL_SPEED_REF, DRAG_CURL, clamp } from './bend'
import { sheetRestHeight, type BookLayout } from './layout'
import type { MoveState } from './motion'

/** How far the turning sheet lifts at the spine mid-turn, so it clears both stacks. */
export const LIFT_BUMP = 0.0012
/** Jumps curl harder, a motion-blur-ish boost. */
export const JUMP_CURL_BOOST = 1.4

export interface SheetPose {
  /** 0 flat right .. 1 flat left. */
  turn: number
  /** Rigid rotation about the spine, radians. */
  angle: number
  /** Height of the sheet's root above the desk. */
  z: number
}

export function sheetPose(layout: BookLayout, index: number, position: number): SheetPose {
  const turn = clamp(position - index, 0, 1)
  const right = sheetRestHeight(layout, index, 'right')
  const left = sheetRestHeight(layout, index, 'left')
  const lift = Math.sin(turn * Math.PI) * LIFT_BUMP
  return { turn, angle: -turn * Math.PI, z: right + (left - right) * turn + lift }
}

/** Index of the sheet mid-turn (0 is the cover), or -1 when every sheet is flat. */
export function turningSheet(position: number): number {
  const index = Math.floor(position)
  return position - index > 1e-6 ? index : -1
}

/**
 * The signed curl a sheet should show. Held pages are pulled from the edge
 * (tip leads); automatic turns are pushed from the spine (tip lags), tighter
 * the faster they go.
 */
export function targetCurl(move: Readonly<MoveState>, velocity: number): number {
  if (move.kind === 'drag' || move.kind === 'release') return DRAG_CURL * move.direction
  const boost = move.kind === 'jump' || move.kind === 'close' || move.kind === 'open' ? JUMP_CURL_BOOST : 1
  const speed = clamp((Math.abs(velocity) / CURL_SPEED_REF) * boost, 0, 1)
  return -Math.sign(velocity) * speed
}

/** Exponential approach: how far a smoothed value moves towards its target this frame. */
export function smoothTowards(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt))
}
