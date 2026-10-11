// Hover and focus outline: the object's geometry drawn again, inflated along
// its normals and showing only its back faces, in highlighter yellow. One
// extra draw call per outlined mesh, only while highlighted.

import { useMemo } from 'react'
import { BackSide, type BufferGeometry, Color, MeshBasicMaterial, ShaderMaterial } from 'three'

const HIGHLIGHTER = new Color('#F3E25A')

const vertexShader = /* glsl */ `
  uniform float uThickness;
  void main() {
    vec3 inflated = position + normalize(normal) * uThickness;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(inflated, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  void main() {
    gl_FragColor = vec4(uColor, 1.0);
  }
`

export interface OutlineProps {
  geometry: BufferGeometry
  visible: boolean
  /** Inflation in metres. */
  thickness?: number
}

export interface FlatOutlineProps {
  /** Size of the flat panel in its own x and z, metres. */
  width: number
  depth: number
  visible: boolean
  thickness?: number
}

/**
 * Outline for a flat sheet, where inflating along normals would only move the
 * back face under the paper: a slightly larger plane drawn just before the
 * sheet, without depth, so only its border shows.
 */
export function FlatOutline({ width, depth, visible, thickness = 0.002 }: FlatOutlineProps) {
  const material = useMemo(
    () => new MeshBasicMaterial({ color: HIGHLIGHTER, toneMapped: false, depthTest: false, depthWrite: false }),
    [],
  )
  return (
    <mesh
      material={material}
      visible={visible}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[width + thickness * 2, depth + thickness * 2, 1]}
      renderOrder={-1}
      raycast={() => null}
    >
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}

export function Outline({ geometry, visible, thickness = 0.0025 }: OutlineProps) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        side: BackSide,
        uniforms: { uThickness: { value: thickness }, uColor: { value: HIGHLIGHTER } },
        toneMapped: false,
      }),
    [thickness],
  )
  return <mesh geometry={geometry} material={material} visible={visible} raycast={() => null} />
}
