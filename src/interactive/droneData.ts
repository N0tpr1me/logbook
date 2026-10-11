// The DroneMedic mission dataset, checked once at the boundary. Pure helpers
// for the map projection and the flight path live here so they can be tested.

import raw from '@/data/dronemedic-replay.json'

export type LatLon = [lat: number, lon: number]
export type XY = [x: number, y: number]

export interface Depot {
  name: string
  lat: number
  lon: number
}

export interface Hospital {
  id: string
  name: string
  lat: number
  lon: number
  route: LatLon[]
  distanceKm: number
  etaMin: number
  payload: string
}

export interface NoFlyZone {
  name: string
  polygon: LatLon[]
}

export interface DroneMissionData {
  speedMps: number
  depot: Depot
  hospitals: Hospital[]
  noFly: NoFlyZone[]
  /** [minLat, minLon, maxLat, maxLon] */
  bbox: [number, number, number, number]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toLatLon(value: unknown): LatLon {
  if (!Array.isArray(value) || value.length < 2 || typeof value[0] !== 'number' || typeof value[1] !== 'number') {
    throw new Error('Coordinate is malformed')
  }
  return [value[0], value[1]]
}

function toHospital(value: unknown): Hospital {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' || !Array.isArray(value.route)) {
    throw new Error('Hospital is malformed')
  }
  const num = (key: string): number => {
    const v = value[key]
    if (typeof v !== 'number') throw new Error(`Hospital ${value.id} is missing ${key}`)
    return v
  }
  return {
    id: value.id,
    name: value.name,
    lat: num('lat'),
    lon: num('lon'),
    route: value.route.map(toLatLon),
    distanceKm: num('distanceKm'),
    etaMin: num('etaMin'),
    payload: typeof value.payload === 'string' ? value.payload : '',
  }
}

function toZone(value: unknown): NoFlyZone {
  if (!isRecord(value) || typeof value.name !== 'string' || !Array.isArray(value.polygon)) throw new Error('No-fly zone is malformed')
  return { name: value.name, polygon: value.polygon.map(toLatLon) }
}

export function parseDroneMission(value: unknown): DroneMissionData {
  if (!isRecord(value) || !isRecord(value.depot) || !Array.isArray(value.hospitals) || !Array.isArray(value.bbox)) {
    throw new Error('DroneMedic replay data is malformed')
  }
  const bbox = value.bbox.map((v) => (typeof v === 'number' ? v : Number.NaN))
  if (bbox.length !== 4 || bbox.some((v) => Number.isNaN(v))) throw new Error('DroneMedic bbox is malformed')
  const depot = value.depot
  if (typeof depot.lat !== 'number' || typeof depot.lon !== 'number') throw new Error('Depot is malformed')
  return {
    speedMps: typeof value.speedMps === 'number' ? value.speedMps : 15,
    depot: { name: typeof depot.name === 'string' ? depot.name : 'Depot', lat: depot.lat, lon: depot.lon },
    hospitals: value.hospitals.map(toHospital),
    noFly: Array.isArray(value.noFly) ? value.noFly.map(toZone) : [],
    bbox: [bbox[0], bbox[1], bbox[2], bbox[3]],
  }
}

let cached: DroneMissionData | null = null

export function droneMission(): DroneMissionData {
  if (!cached) cached = parseDroneMission(raw)
  return cached
}

// Map projection: 1 unit is roughly 1 km, x east and y south, so a grid line
// every unit is a 1 km grid. Good enough for a city-scale static map.
const KM_PER_DEG_LAT = 110.57
const KM_PER_DEG_LON_EQUATOR = 111.32

export interface MapProjection {
  width: number
  height: number
  toXY: (point: LatLon) => XY
}

export function createProjection(bbox: [number, number, number, number]): MapProjection {
  const [minLat, minLon, maxLat, maxLon] = bbox
  const kmPerDegLon = KM_PER_DEG_LON_EQUATOR * Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180))
  return {
    width: (maxLon - minLon) * kmPerDegLon,
    height: (maxLat - minLat) * KM_PER_DEG_LAT,
    toXY: ([lat, lon]) => [(lon - minLon) * kmPerDegLon, (maxLat - lat) * KM_PER_DEG_LAT],
  }
}

export interface FlightPosition {
  point: XY
  /** Heading in degrees, 0 pointing east, clockwise on screen. */
  heading: number
}

/** The drone's place along a projected route at progress 0..1, by distance. */
export function positionAlong(route: XY[], progress: number): FlightPosition {
  if (route.length === 0) return { point: [0, 0], heading: 0 }
  if (route.length === 1) return { point: route[0], heading: 0 }
  const lengths = route.slice(1).map((p, i) => Math.hypot(p[0] - route[i][0], p[1] - route[i][1]))
  const total = lengths.reduce((a, b) => a + b, 0)
  const target = Math.min(Math.max(progress, 0), 1) * total
  let walked = 0
  for (let i = 0; i < lengths.length; i += 1) {
    const [ax, ay] = route[i]
    const [bx, by] = route[i + 1]
    const heading = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI
    if (walked + lengths[i] >= target || i === lengths.length - 1) {
      const f = lengths[i] === 0 ? 1 : Math.min((target - walked) / lengths[i], 1)
      return { point: [ax + (bx - ax) * f, ay + (by - ay) * f], heading }
    }
    walked += lengths[i]
  }
  return { point: route[route.length - 1], heading: 0 }
}

/** The part of the route already flown, for the trail behind the drone. */
export function flownPath(route: XY[], progress: number): XY[] {
  if (route.length < 2) return route
  const lengths = route.slice(1).map((p, i) => Math.hypot(p[0] - route[i][0], p[1] - route[i][1]))
  const total = lengths.reduce((a, b) => a + b, 0)
  const target = Math.min(Math.max(progress, 0), 1) * total
  const points: XY[] = [route[0]]
  let walked = 0
  for (let i = 0; i < lengths.length; i += 1) {
    if (walked + lengths[i] >= target) {
      points.push(positionAlong(route, progress).point)
      return points
    }
    walked += lengths[i]
    points.push(route[i + 1])
  }
  return points
}

/** Battery left after flying `flownKm`, from a full charge, at 4% per km (simulated). */
export function batteryPercent(flownKm: number): number {
  return Math.max(0, Math.round(100 - flownKm * 4))
}

/** 'Clinic A (general medical clinic)' → 'Clinic A' for map labels. */
export function shortName(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, '').replace(/\s+Hospital$/, '')
}
