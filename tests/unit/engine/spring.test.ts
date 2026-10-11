// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { COVER_SPRING, PAGE_SPRING, RELEASE_SPRING, simulateSpring, stepSpring } from '@/book/engine/spring'

describe('spring integrator', () => {
  it('settles a page turn within about 0.7 s with no overshoot at damping 26', () => {
    const run = simulateSpring(0, 1, PAGE_SPRING)
    expect(run.settleTime).toBeLessThanOrEqual(0.75)
    expect(run.settleTime).toBeGreaterThan(0.3)
    expect(run.overshoot).toBeLessThan(1e-4)
    expect(run.state.x).toBeCloseTo(1, 2)
  })

  it('overshoots slightly (about 2%) at damping 20 and still lands within a second', () => {
    const run = simulateSpring(0, 1, COVER_SPRING)
    expect(run.overshoot).toBeGreaterThan(0.01)
    expect(run.overshoot).toBeLessThan(0.04)
    expect(run.settleTime).toBeLessThanOrEqual(1)
  })

  it('carries a seeded release velocity through the turn', () => {
    const timeToNinetyPercent = (velocity: number) => {
      let state = { x: 0.3, v: velocity, target: 1 }
      let time = 0
      while (Math.abs(state.x - 1) > 0.07 && time < 2) {
        state = stepSpring(state, RELEASE_SPRING, 1 / 60)
        time += 1 / 60
      }
      return time
    }
    expect(timeToNinetyPercent(3)).toBeLessThan(timeToNinetyPercent(0))
    expect(simulateSpring(0.3, 1, RELEASE_SPRING, 3).settleTime).toBeLessThanOrEqual(0.5)
  })

  it('gives the same result whatever the frame length', () => {
    const at60 = simulateSpring(0, 1, PAGE_SPRING, 0, 2, 1 / 60)
    const at24 = simulateSpring(0, 1, PAGE_SPRING, 0, 2, 1 / 24)
    expect(Math.abs(at60.settleTime - at24.settleTime)).toBeLessThan(0.06)
  })

  it('returns a new state and leaves the input untouched', () => {
    const before = { x: 0, v: 0, target: 1 }
    const after = stepSpring(before, PAGE_SPRING, 1 / 60)
    expect(before).toEqual({ x: 0, v: 0, target: 1 })
    expect(after.x).toBeGreaterThan(0)
  })
})
