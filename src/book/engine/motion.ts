// The book controller: implements BookCommands from state.ts on top of a
// spring integrator (page turns, cover landings, released drags) and GSAP
// timed moves (open, jump, close). Plan: Navigating the book; Motion and
// timings; Rules for all motion.
//
// Rules
//   A page turn asked for during any move queues one more at most.
//   Any other new action takes over from wherever things are.
//   A drag is refused while something moves; the input waits and retries.
//   In reducedMotion or testMode every move jumps to its end state.

import type { BookCommands, BookMode, BookStore } from '@/book/state'
import { COVER_SPRING, PAGE_SPRING, RELEASE_SPRING, isSettled, stepSpring, type SpringConfig, type SpringState } from './spring'
import { gsapTimedMove, positionAlongPath, sweepPath, type TimedMove, type TimedMoveFactory } from './timed'

export { PAGE_SPRING, COVER_SPRING, RELEASE_SPRING, stepSpring, isSettled, simulateSpring } from './spring'
export type { SpringConfig, SpringState } from './spring'

export const OPEN_DURATION = 1.4
/** The cover starts opening this long into the open move. */
export const OPEN_COVER_DELAY = 0.6
export const CLOSE_DURATION = 0.9
export const JUMP_MAX_DURATION = 1
/** A jump flicks at most this many sheets past, whatever the distance. */
export const JUMP_MAX_SHEETS = 4
/** Release faster than this (positions per second) carries the page through. */
export const FLICK_SPEED = 0.5
/** A held key turns one page this often, in seconds. */
export const HOLD_REPEAT = 0.65
/** Longest frame the integrator will swallow, in seconds (tab switches). */
const MAX_FRAME = 0.1
/** How far back the drag velocity is measured, in milliseconds. */
const VELOCITY_WINDOW = 100

export type MoveKind = 'idle' | 'turn' | 'open' | 'jump' | 'close' | 'drag' | 'release'

export interface MoveState {
  kind: MoveKind
  /** The sheet in hand, for drags and releases. */
  sheet: number | null
  /** Direction of travel for drags and releases. */
  direction: 1 | -1
  /** Grab point along the free edge, 0 = bottom, 1 = top. */
  grabY: number
  /** Fold tilt in radians, positive when grabbed near the top corner. */
  tilt: number
}

export interface DragGrab {
  /** Sheet index: 0 is the cover, 1..N the pages. */
  sheet: number
  /** 1 turns the sheet forward (right to left), -1 back. */
  direction: 1 | -1
  grabY?: number
  tilt?: number
}

export interface DragRelease {
  /** Release velocity in positions per second; measured from the drag when omitted. */
  velocity?: number
}

export type FrameScheduler = (callback: (now: number) => void) => () => void

export interface ControllerOptions {
  timed?: TimedMoveFactory
  schedule?: FrameScheduler
  now?: () => number
}

export interface BookController extends BookCommands {
  beginDrag(grab: DragGrab): boolean
  /** Move the held sheet to `turn` (0 flat right, 1 flat left). */
  updateDrag(turn: number): void
  endDrag(release?: DragRelease): void
  /** Drop the drag without a turn, snapping the sheet to its nearest side. */
  cancelDrag(): void
  /** Advance the spring integrator by `dt` seconds; the frame loop does this, tests call it directly. */
  step(dt: number): void
  getMove(): Readonly<MoveState>
  dispose(): void
}

const IDLE: MoveState = { kind: 'idle', sheet: null, direction: 1, grabY: 0.5, tilt: 0 }

interface DragSample {
  position: number
  time: number
}

const rafScheduler: FrameScheduler = (callback) => {
  const id = requestAnimationFrame(callback)
  return () => cancelAnimationFrame(id)
}
const manualScheduler: FrameScheduler = () => () => undefined

function defaultScheduler(): FrameScheduler {
  return typeof requestAnimationFrame === 'function' ? rafScheduler : manualScheduler
}

function defaultNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function measureVelocity(samples: readonly DragSample[]): number {
  if (samples.length < 2) return 0
  const first = samples[0]
  const last = samples[samples.length - 1]
  const seconds = (last.time - first.time) / 1000
  return seconds > 0 ? (last.position - first.position) / seconds : 0
}

export function createBookController(store: BookStore, options: ControllerOptions = {}): BookController {
  const timed = options.timed ?? gsapTimedMove
  const schedule = options.schedule ?? defaultScheduler()
  const now = options.now ?? defaultNow

  let spring: SpringState | null = null
  let springConfig: SpringConfig = PAGE_SPRING
  let timedMove: TimedMove | null = null
  let queued: 1 | -1 | null = null
  let move: MoveState = IDLE
  let dragSamples: DragSample[] = []
  let cancelFrame: (() => void) | null = null
  let lastFrame = 0

  const position = () => store.get().position
  const maxPosition = () => store.get().spreads + 1
  const isInstant = () => store.get().reducedMotion || store.get().testMode
  const isClosed = () => store.get().mode === 'desk'
  const isMoving = () => spring !== null || timedMove !== null
  /** The mode a landing at `target` implies; the reading sheet keeps its mode while the book stays open. */
  const modeFor = (target: number): BookMode => {
    if (target <= 0 || target >= maxPosition()) return 'desk'
    return store.get().mode === 'sheet' ? 'sheet' : 'open'
  }

  const stopFrameLoop = () => {
    cancelFrame?.()
    cancelFrame = null
  }

  const stopMoves = () => {
    timedMove?.kill()
    timedMove = null
    spring = null
    stopFrameLoop()
  }

  /** Called when a move lands: settle the store, then run the queued turn if any. */
  const finish = () => {
    const landed = position()
    move = IDLE
    store.set({ target: landed, animating: false, mode: modeFor(landed) })
    if (queued !== null) {
      const direction = queued
      queued = null
      controller.turn(direction)
    }
  }

  const jumpInstantly = (target: number) => {
    stopMoves()
    store.set({ position: target, target })
    finish()
  }

  const frame = (time: number) => {
    cancelFrame = null
    const dt = Math.min(Math.max((time - lastFrame) / 1000, 0), MAX_FRAME)
    lastFrame = time
    controller.step(dt)
    if (spring && !cancelFrame) cancelFrame = schedule(frame)
  }

  const startFrameLoop = () => {
    if (cancelFrame) return
    lastFrame = now()
    cancelFrame = schedule(frame)
  }

  const startSpring = (target: number, config: SpringConfig, kind: MoveKind, velocity = 0) => {
    stopMoves()
    if (isInstant()) {
      store.set({ animating: true, target })
      jumpInstantly(target)
      return
    }
    spring = { x: position(), v: velocity, target }
    springConfig = config
    move = { ...move, kind, sheet: kind === 'release' ? move.sheet : null }
    store.set({ target, animating: true })
    startFrameLoop()
  }

  interface SweepOptions {
    duration: number
    delay?: number
    keepStart?: number
  }

  const startSweep = (target: number, kind: MoveKind, sweep: SweepOptions) => {
    stopMoves()
    store.set({ target, animating: true })
    if (isInstant()) {
      jumpInstantly(target)
      return
    }
    const path = sweepPath(position(), target, JUMP_MAX_SHEETS, sweep.keepStart ?? 0)
    move = { ...IDLE, kind }
    timedMove = timed({
      from: 0,
      to: 1,
      duration: sweep.duration,
      delay: sweep.delay,
      onUpdate: (p) => store.set({ position: positionAlongPath(path, p) }),
      onComplete: () => {
        timedMove = null
        store.set({ position: target })
        finish()
      },
    })
  }

  /** The cover lands with a spring, started part-way through the open move. */
  const openWithCoverSpring = (target: number) => {
    stopMoves()
    store.set({ target, animating: true })
    if (isInstant()) {
      jumpInstantly(target)
      return
    }
    move = { ...IDLE, kind: 'open' }
    timedMove = timed({
      from: 0,
      to: 0,
      duration: 0,
      delay: OPEN_COVER_DELAY,
      onUpdate: () => undefined,
      onComplete: () => {
        timedMove = null
        startSpring(target, COVER_SPRING, 'open')
      },
    })
  }

  const closeTowards = (side: number) => {
    store.set({ mode: 'desk' })
    startSweep(side, 'close', { duration: CLOSE_DURATION })
  }

  const turnFromRest = (direction: 1 | -1) => {
    const at = Math.round(position())
    const max = maxPosition()
    if (isClosed()) {
      if (at <= 0 && direction > 0) controller.open()
      else if (at >= max && direction < 0) controller.open(max - 1)
      return
    }
    const target = at + direction
    if (target <= 0 || target >= max) {
      closeTowards(target <= 0 ? 0 : max)
      return
    }
    startSpring(target, PAGE_SPRING, 'turn')
  }

  const controller: BookController = {
    open(spread) {
      if (store.get().dragging) controller.cancelDrag()
      const max = maxPosition()
      if (!isClosed()) {
        if (spread !== undefined) controller.jumpTo(spread)
        return
      }
      const fromBack = position() > max / 2
      const nearest = fromBack ? max - 1 : 1
      const target = spread === undefined ? nearest : Math.min(Math.max(Math.round(spread), 1), max - 1)
      queued = null
      store.set({ mode: 'open' })
      if (target === nearest) {
        openWithCoverSpring(target)
        return
      }
      startSweep(target, 'open', {
        duration: OPEN_DURATION - OPEN_COVER_DELAY,
        delay: OPEN_COVER_DELAY,
        keepStart: 1,
      })
    },

    turn(direction) {
      if (store.get().dragging) return
      if (isMoving()) {
        if (queued === null) queued = direction
        return
      }
      turnFromRest(direction)
    },

    jumpTo(spread) {
      if (store.get().dragging) controller.cancelDrag()
      const max = maxPosition()
      const target = Math.min(Math.max(Math.round(spread), 1), max - 1)
      if (isClosed()) {
        controller.open(target)
        return
      }
      queued = null
      if (!isMoving() && Math.abs(position() - target) < 1e-9) return
      const distance = Math.min(Math.abs(target - position()), JUMP_MAX_SHEETS)
      const duration = Math.min(JUMP_MAX_DURATION, 0.4 + 0.15 * distance)
      startSweep(target, 'jump', { duration })
    },

    close() {
      if (store.get().dragging) controller.cancelDrag()
      const max = maxPosition()
      if (isClosed() && !isMoving()) return
      queued = null
      closeTowards(position() <= max / 2 ? 0 : max)
    },

    beginDrag(grab) {
      const state = store.get()
      if (state.dragging || isMoving() || state.animating) return false
      if (grab.sheet < 0 || grab.sheet > state.spreads) return false
      queued = null
      dragSamples = []
      move = {
        kind: 'drag',
        sheet: grab.sheet,
        direction: grab.direction,
        grabY: grab.grabY ?? 0.5,
        tilt: grab.tilt ?? 0,
      }
      store.set({ dragging: true, target: grab.sheet + (grab.direction > 0 ? 1 : 0) })
      return true
    },

    updateDrag(turn) {
      if (move.kind !== 'drag' || move.sheet === null) return
      const next = move.sheet + Math.min(Math.max(turn, 0), 1)
      const time = now()
      dragSamples = [...dragSamples.filter((s) => time - s.time <= VELOCITY_WINDOW), { position: next, time }]
      store.set({ position: next })
    },

    endDrag(release) {
      if (move.kind !== 'drag' || move.sheet === null) return
      const sheet = move.sheet
      const velocity = release?.velocity ?? measureVelocity(dragSamples)
      const progress = position() - sheet
      const forward = velocity > FLICK_SPEED || (Math.abs(velocity) <= FLICK_SPEED && progress >= 0.5)
      const target = forward ? sheet + 1 : sheet
      dragSamples = []
      store.set({ dragging: false, mode: modeFor(target) === 'desk' ? store.get().mode : modeFor(target) })
      startSpring(target, RELEASE_SPRING, 'release', velocity)
    },

    cancelDrag() {
      if (move.kind !== 'drag') return
      const snapped = Math.round(position())
      dragSamples = []
      store.set({ dragging: false, position: snapped })
      finish()
    },

    step(dt) {
      if (!spring) return
      const next = stepSpring(spring, springConfig, dt)
      if (isSettled(next)) {
        spring = null
        stopFrameLoop()
        store.set({ position: next.target })
        finish()
        return
      }
      spring = next
      store.set({ position: next.x })
    },

    getMove: () => move,

    dispose() {
      stopMoves()
      queued = null
      dragSamples = []
      move = IDLE
    },
  }

  return controller
}
