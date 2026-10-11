// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createBookController, OPEN_COVER_DELAY, type BookController } from '@/book/engine/motion'
import type { TimedMoveFactory, TimedMoveSpec } from '@/book/engine/timed'
import { createBookStore, type BookState, type BookStore } from '@/book/state'

interface FakeTimed {
  factory: TimedMoveFactory
  pending: () => readonly TimedMoveSpec[]
  killed: () => number
  /** Run every pending move to its end, visiting a few progress steps on the way. */
  finishAll: () => void
}

function fakeTimed(): FakeTimed {
  let pending: TimedMoveSpec[] = []
  let killed = 0
  return {
    factory: (spec) => {
      pending = [...pending, spec]
      return {
        kill: () => {
          if (pending.includes(spec)) killed += 1
          pending = pending.filter((p) => p !== spec)
        },
      }
    },
    pending: () => pending,
    killed: () => killed,
    finishAll: () => {
      const specs = pending
      pending = []
      specs.forEach((spec) => {
        ;[0.001, 0.25, 0.5, 0.75, 1].forEach((p) => spec.onUpdate(spec.from + (spec.to - spec.from) * p))
        spec.onComplete()
      })
    },
  }
}

interface Harness {
  store: BookStore
  controller: BookController
  timed: FakeTimed
  clock: { now: number }
  /** Advance frames until nothing animates (timed moves finish instantly). */
  settle: (seconds?: number) => number[]
}

function harness(initial: Partial<BookState> = {}): Harness {
  const store = createBookStore({ spreads: 8, ...initial })
  const timed = fakeTimed()
  const clock = { now: 0 }
  const controller = createBookController(store, { timed: timed.factory, schedule: () => () => undefined, now: () => clock.now })
  const settle = (seconds = 5) => {
    const trace: number[] = []
    const dt = 1 / 60
    for (let t = 0; t < seconds; t += dt) {
      if (timed.pending().length > 0) timed.finishAll()
      controller.step(dt)
      clock.now += dt * 1000
      trace.push(store.get().position)
      if (!store.get().animating && timed.pending().length === 0) break
    }
    return trace
  }
  return { store, controller, timed, clock, settle }
}

const OPEN_AT = { position: 1, target: 1, mode: 'open' as const }

describe('book controller: turns and queueing', () => {
  it('three rapid turn() calls from rest end at spread 2, not 3', () => {
    const { controller, store, settle } = harness()
    controller.turn(1)
    controller.turn(1)
    controller.turn(1)
    settle()
    expect(store.get().position).toBe(2)
    expect(store.get().mode).toBe('open')
    expect(store.get().animating).toBe(false)
  })

  it('a turn asked for during a turn queues one more at most', () => {
    const { controller, store, settle } = harness(OPEN_AT)
    controller.turn(1)
    controller.step(0.1)
    expect(store.get().animating).toBe(true)
    controller.turn(1)
    controller.turn(1)
    controller.turn(1)
    settle()
    expect(store.get().position).toBe(3)
  })

  it('a page turn is a spring that lands in about 0.65 s', () => {
    const { controller, store, settle } = harness(OPEN_AT)
    controller.turn(1)
    const trace = settle()
    expect(trace.length / 60).toBeLessThanOrEqual(0.75)
    expect(Math.max(...trace)).toBeLessThanOrEqual(2 + 1e-6)
    expect(store.get().position).toBe(2)
    expect(store.get().target).toBe(2)
  })

  it('turning back from spread 1 closes the book, and the closed book clamps at 0', () => {
    const { controller, store, settle } = harness(OPEN_AT)
    controller.turn(-1)
    expect(store.get().mode).toBe('desk')
    settle()
    expect(store.get().position).toBe(0)
    controller.turn(-1)
    settle()
    expect(store.get().position).toBe(0)
    expect(store.get().animating).toBe(false)
  })

  it('turning past the last spread closes on the back cover and clamps there', () => {
    const { controller, store, settle } = harness({ position: 8, target: 8, mode: 'open' })
    controller.turn(1)
    settle()
    expect(store.get().position).toBe(9)
    expect(store.get().mode).toBe('desk')
    controller.turn(1)
    settle()
    expect(store.get().position).toBe(9)
    controller.turn(-1)
    settle()
    expect(store.get().position).toBe(8)
    expect(store.get().mode).toBe('open')
  })
})

describe('book controller: open, jump and close', () => {
  it('open waits 0.6 s, then the cover lands with a slight overshoot', () => {
    const { controller, store, timed, settle } = harness()
    controller.open()
    expect(store.get().mode).toBe('open')
    expect(store.get().animating).toBe(true)
    expect(timed.pending()).toHaveLength(1)
    expect(timed.pending()[0].delay).toBe(OPEN_COVER_DELAY)
    const trace = settle()
    expect(Math.max(...trace)).toBeGreaterThan(1.005)
    expect(store.get().position).toBe(1)
    expect(store.get().animating).toBe(false)
  })

  it('jumpTo clamps to the spreads and flicks at most four sheets past', () => {
    const { controller, store, timed, settle } = harness(OPEN_AT)
    controller.jumpTo(99)
    expect(store.get().target).toBe(8)
    const visited: number[] = []
    const spec = timed.pending()[0]
    ;[0.01, 0.5, 0.99].forEach((p) => {
      spec.onUpdate(p)
      visited.push(store.get().position)
    })
    expect(Math.min(...visited)).toBeGreaterThanOrEqual(4)
    settle()
    expect(store.get().position).toBe(8)
    controller.jumpTo(-5)
    settle()
    expect(store.get().position).toBe(1)
  })

  it('jumpTo from the closed book overlaps the opening', () => {
    const { controller, store, settle } = harness()
    controller.jumpTo(3)
    expect(store.get().mode).toBe('open')
    settle()
    expect(store.get().position).toBe(3)
  })

  it('close goes to the nearer cover and any new action takes over a move in flight', () => {
    const { controller, store, timed, settle } = harness({ position: 6, target: 6, mode: 'open' })
    controller.jumpTo(2)
    expect(timed.pending()).toHaveLength(1)
    controller.close()
    expect(timed.killed()).toBe(1)
    expect(store.get().mode).toBe('desk')
    expect(store.get().target).toBe(9)
    settle()
    expect(store.get().position).toBe(9)
  })

  it('reduced motion jumps every move to its end state', () => {
    const { controller, store } = harness({ reducedMotion: true })
    controller.open()
    expect(store.get().position).toBe(1)
    expect(store.get().animating).toBe(false)
    controller.turn(1)
    expect(store.get().position).toBe(2)
    controller.jumpTo(7)
    expect(store.get().position).toBe(7)
    controller.close()
    expect(store.get().position).toBe(9)
    expect(store.get().mode).toBe('desk')
  })
})

describe('book controller: drags', () => {
  it('refuses a drag while a page turns, and ignores turns while a page is held', () => {
    const { controller, store, settle } = harness(OPEN_AT)
    controller.turn(1)
    expect(controller.beginDrag({ sheet: 2, direction: 1 })).toBe(false)
    settle()
    expect(controller.beginDrag({ sheet: 2, direction: 1 })).toBe(true)
    expect(store.get().dragging).toBe(true)
    controller.turn(1)
    expect(store.get().animating).toBe(false)
    controller.updateDrag(0.4)
    expect(store.get().position).toBeCloseTo(2.4)
    controller.endDrag({ velocity: 0 })
    settle()
    expect(store.get().position).toBe(2)
  })

  it('a slow release before halfway falls back; a fast one carries through', () => {
    const { controller, store, settle } = harness(OPEN_AT)
    controller.beginDrag({ sheet: 1, direction: 1 })
    controller.updateDrag(0.3)
    controller.endDrag({ velocity: 0.1 })
    settle()
    expect(store.get().position).toBe(1)
    controller.beginDrag({ sheet: 1, direction: 1 })
    controller.updateDrag(0.3)
    controller.endDrag({ velocity: 2 })
    settle()
    expect(store.get().position).toBe(2)
  })

  it('measures the release speed from the drag itself', () => {
    const { controller, store, clock, settle } = harness(OPEN_AT)
    controller.beginDrag({ sheet: 1, direction: 1 })
    controller.updateDrag(0.1)
    clock.now += 50
    controller.updateDrag(0.3)
    controller.endDrag()
    settle()
    expect(store.get().position).toBe(2)
  })

  it('a release past halfway settles forward and a cancelled drag snaps to the nearest side', () => {
    const { controller, store, settle } = harness({ position: 3, target: 3, mode: 'open' })
    controller.beginDrag({ sheet: 2, direction: -1 })
    controller.updateDrag(0.45)
    controller.endDrag({ velocity: 0 })
    settle()
    expect(store.get().position).toBe(2)
    controller.beginDrag({ sheet: 2, direction: 1 })
    controller.updateDrag(0.2)
    controller.cancelDrag()
    expect(store.get().position).toBe(2)
    expect(store.get().dragging).toBe(false)
  })
})
