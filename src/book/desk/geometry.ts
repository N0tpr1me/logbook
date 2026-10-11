// Small geometry helpers for building the desk objects in code.

import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Vec3 } from './layout'

const UP = new Vector3(0, 1, 0)

/** A cylinder whose axis runs from `a` to `b`. */
export function cylinderBetween(
  a: Vec3,
  b: Vec3,
  radius: number,
  segments = 16,
  radiusEnd = radius,
  open = false,
): BufferGeometry {
  const start = new Vector3(...a)
  const end = new Vector3(...b)
  const length = start.distanceTo(end)
  const geometry = new CylinderGeometry(radiusEnd, radius, length, segments, 1, open)
  const direction = end.clone().sub(start).normalize()
  const quaternion = new Quaternion().setFromUnitVectors(UP, direction)
  const middle = start.clone().add(end).multiplyScalar(0.5)
  geometry.applyMatrix4(new Matrix4().compose(middle, quaternion, new Vector3(1, 1, 1)))
  return geometry
}

/** Give every vertex of a geometry the same colour, for merging into a vertex-coloured mesh. */
export function withColor(geometry: BufferGeometry, color: string): BufferGeometry {
  const c = new Color(color)
  const count = geometry.getAttribute('position').count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return geometry
}

/** Merge into one geometry so the object costs one draw call. Throws if attributes differ. */
export function merge(parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts, false)
  if (!merged) throw new Error('Geometries could not be merged: attribute sets differ')
  parts.forEach((p) => p.dispose())
  return merged
}

/** Translate a geometry in place and return it, for fluent building. */
export function moved(geometry: BufferGeometry, x: number, y: number, z: number): BufferGeometry {
  geometry.translate(x, y, z)
  return geometry
}

/** Rotate a geometry in place (radians) and return it. */
export function turned(geometry: BufferGeometry, x: number, y: number, z: number): BufferGeometry {
  if (x) geometry.rotateX(x)
  if (y) geometry.rotateY(y)
  if (z) geometry.rotateZ(z)
  return geometry
}
