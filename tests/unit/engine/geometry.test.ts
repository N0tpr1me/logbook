// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { bendAngle, bentPoint, DRAG_CURL, solveTurnForX } from '@/book/engine/bend'
import { coverPoses } from '@/book/engine/coverPoses'
import { sheetPose, turningSheet } from '@/book/engine/frame'
import { computeLayout, PAGE_WIDTH } from '@/book/engine/layout'
import { positionAlongPath, sweepPath } from '@/book/engine/timed'

/** Book x of the point at radius r on a sheet turned by `turn` with `curl`, as the shader draws it. */
function drawnX(turn: number, r: number, curl: number): number {
  const theta = turn * Math.PI
  const bend = bendAngle(curl, turn)
  const kappa = (bend * r) / (2 * PAGE_WIDTH)
  const phiMid = kappa
  const sinc = Math.abs(kappa) < 1e-9 ? 1 : Math.sin(kappa) / kappa
  const localX = r * Math.cos(phiMid) * sinc
  const localZ = r * Math.sin(phiMid) * sinc
  return localX * Math.cos(theta) - localZ * Math.sin(theta)
}

describe('page bend', () => {
  it('keeps a flat page flat and bows a bent page without stretching it', () => {
    const flat = bentPoint(PAGE_WIDTH, PAGE_WIDTH, 0)
    expect(flat.x).toBeCloseTo(PAGE_WIDTH, 9)
    expect(flat.z).toBeCloseTo(0, 9)
    const tip = bentPoint(PAGE_WIDTH, PAGE_WIDTH, 0.5)
    expect(tip.x).toBeLessThan(PAGE_WIDTH)
    expect(tip.z).toBeGreaterThan(0)
    // Arc length is preserved: the chord is shorter than the paper.
    expect(Math.hypot(tip.x, tip.z)).toBeLessThan(PAGE_WIDTH)
    expect(Math.hypot(tip.x, tip.z)).toBeGreaterThan(PAGE_WIDTH * 0.98)
    const middle = bentPoint(PAGE_WIDTH / 2, PAGE_WIDTH, 0.5)
    expect(middle.z).toBeGreaterThan(0)
    expect(middle.z).toBeLessThan(tip.z)
  })

  it('puts the grabbed point back under the cursor', () => {
    ;[0.15, 0.3, 0.5, 0.7, 0.85].forEach((turn) => {
      ;[0.9, 1].forEach((fraction) => {
        const r = fraction * PAGE_WIDTH
        const x = drawnX(turn, r, DRAG_CURL)
        expect(solveTurnForX(x, r, PAGE_WIDTH, DRAG_CURL)).toBeCloseTo(turn, 3)
      })
    })
  })

  it('clamps the solve at the ends', () => {
    expect(solveTurnForX(PAGE_WIDTH * 2, PAGE_WIDTH, PAGE_WIDTH, 0)).toBe(0)
    expect(solveTurnForX(-PAGE_WIDTH * 2, PAGE_WIDTH, PAGE_WIDTH, 0)).toBe(1)
  })
})

describe('sheet poses', () => {
  const layout = computeLayout(8)

  it('sheet i is flat right before i, turning between i and i+1, flat left after', () => {
    expect(sheetPose(layout, 3, 2.5).turn).toBe(0)
    expect(sheetPose(layout, 3, 3.5).turn).toBe(0.5)
    expect(sheetPose(layout, 3, 4.2).turn).toBe(1)
    expect(sheetPose(layout, 3, 3.5).angle).toBeCloseTo(-Math.PI / 2)
    expect(turningSheet(3)).toBe(-1)
    expect(turningSheet(3.2)).toBe(3)
    expect(turningSheet(0.4)).toBe(0)
  })

  it('stacks sheets 0.3 mm apart with the turning sheet lifted clear', () => {
    const top = sheetPose(layout, 1, 0).z
    const below = sheetPose(layout, 2, 0).z
    expect(top - below).toBeCloseTo(0.0003, 6)
    expect(sheetPose(layout, 1, 2).z).toBeCloseTo(0.0003, 6)
    expect(sheetPose(layout, 1, 1.5).z).toBeGreaterThan(top)
    expect(sheetPose(layout, 4, 4.5).z).toBeGreaterThan(Math.max(sheetPose(layout, 5, 4.5).z, sheetPose(layout, 3, 4.5).z))
  })
})

describe('cover poses', () => {
  const layout = computeLayout(8)

  it('is continuous where the front cover hands over to the back cover', () => {
    const a = coverPoses(layout, 1, 0)
    const b = coverPoses(layout, 1, 1e-6)
    ;(['front', 'back'] as const).forEach((part) => {
      expect(a[part].x).toBeCloseTo(b[part].x, 5)
      expect(a[part].z).toBeCloseTo(b[part].z, 5)
      expect(Math.cos(a[part].angle)).toBeCloseTo(Math.cos(b[part].angle), 5)
    })
    // The strip is symmetric about its centre, so compare where its centre lands.
    const centre = (pose: { x: number; z: number; angle: number }) => ({
      x: pose.x + (layout.spineWidth / 2) * Math.cos(pose.angle),
      z: pose.z - (layout.spineWidth / 2) * Math.sin(pose.angle),
    })
    expect(centre(a.strip).x).toBeCloseTo(centre(b.strip).x, 5)
    expect(centre(a.strip).z).toBeCloseTo(centre(b.strip).z, 5)
  })

  it('closes the back cover on top of the left stack', () => {
    const closed = coverPoses(layout, 1, 1)
    expect(closed.back.angle).toBeCloseTo(-Math.PI)
    expect(closed.back.z).toBeGreaterThan(layout.spreads * layout.sheetGap)
    expect(closed.front.z).toBeCloseTo(-layout.coverThickness / 2)
  })
})

describe('sweep path', () => {
  it('flicks at most four sheets, snapping the rest', () => {
    expect(sweepPath(1, 3, 4)).toEqual([[1, 3]])
    expect(sweepPath(1, 8, 4)).toEqual([[4, 8]])
    expect(sweepPath(8, 1, 4)).toEqual([[5, 1]])
    expect(sweepPath(0, 7, 4, 1)).toEqual([
      [0, 1],
      [3, 7],
    ])
    expect(sweepPath(0, 5, 4, 1)).toEqual([[0, 5]])
  })

  it('walks the path with progress and lands on the target', () => {
    const path = sweepPath(0, 7, 4, 1)
    expect(positionAlongPath(path, 0)).toBe(0)
    expect(positionAlongPath(path, 0.1)).toBeCloseTo(0.5)
    expect(positionAlongPath(path, 0.6)).toBeCloseTo(5)
    expect(positionAlongPath(path, 1)).toBe(7)
  })
})
