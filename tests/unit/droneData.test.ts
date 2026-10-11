// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { batteryPercent, createProjection, droneMission, flownPath, parseDroneMission, positionAlong, shortName, type XY } from '@/interactive/droneData'

describe('droneMission', () => {
  it('parses the dataset with a depot, hospitals, no-fly zones and a bbox', () => {
    const data = droneMission()
    expect(data.hospitals.length).toBeGreaterThan(0)
    expect(data.noFly.length).toBeGreaterThan(0)
    expect(data.bbox).toHaveLength(4)
    for (const h of data.hospitals) {
      expect(h.route.length).toBeGreaterThanOrEqual(2)
      expect(h.distanceKm).toBeGreaterThan(0)
      expect(h.etaMin).toBeGreaterThan(0)
    }
  })

  it('rejects malformed data instead of drawing a broken map', () => {
    expect(() => parseDroneMission({})).toThrow()
    expect(() => parseDroneMission({ depot: { lat: 1, lon: 2 }, hospitals: [{ id: 'x' }], bbox: [0, 0, 1, 1] })).toThrow()
  })
})

describe('createProjection', () => {
  const projection = createProjection([51.5, -0.1, 51.6, 0.0])

  it('maps the north-west corner to the origin and the south-east corner to the far edge', () => {
    expect(projection.toXY([51.6, -0.1])).toEqual([0, 0])
    const [x, y] = projection.toXY([51.5, 0.0])
    expect(x).toBeCloseTo(projection.width, 6)
    expect(y).toBeCloseTo(projection.height, 6)
  })

  it('uses roughly kilometres: 0.1 degrees of latitude is about 11 km', () => {
    expect(projection.height).toBeCloseTo(11.06, 1)
    expect(projection.width).toBeLessThan(projection.height)
  })
})

describe('positionAlong and flownPath', () => {
  const route: XY[] = [
    [0, 0],
    [3, 0],
    [3, 4],
  ]

  it('starts at the first point and ends at the last', () => {
    expect(positionAlong(route, 0).point).toEqual([0, 0])
    expect(positionAlong(route, 1).point).toEqual([3, 4])
    expect(positionAlong(route, 2).point).toEqual([3, 4])
  })

  it('walks by distance, not by segment count', () => {
    // Total length 7: halfway is 3.5, which is 0.5 into the second segment.
    const { point, heading } = positionAlong(route, 0.5)
    expect(point[0]).toBeCloseTo(3)
    expect(point[1]).toBeCloseTo(0.5)
    expect(heading).toBeCloseTo(90)
  })

  it('returns the flown part of the route for the trail', () => {
    expect(flownPath(route, 0.5)).toEqual([
      [0, 0],
      [3, 0],
      [3, 0.5],
    ])
    expect(flownPath(route, 1)).toEqual(route)
  })
})

describe('batteryPercent and shortName', () => {
  it('drains 4% per kilometre from a full charge', () => {
    expect(batteryPercent(0)).toBe(100)
    expect(batteryPercent(5)).toBe(80)
    expect(batteryPercent(30)).toBe(0)
  })

  it('shortens hospital names for the map labels', () => {
    expect(shortName('Clinic A (general medical clinic)')).toBe('Clinic A')
    expect(shortName('Royal London Hospital')).toBe('Royal London')
  })
})
