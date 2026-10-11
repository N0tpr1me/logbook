// The DroneMedic airframe from public/assets/models/drone.glb (compressed by
// scripts/assets/compress-drone.mjs: ~40k triangles, 1024 WebP textures,
// Meshopt). Decoded with three's own Meshopt decoder, hosted with the site.

import { useLayoutEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Box3, Matrix4, type Mesh, type Object3D, Vector3 } from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import type { GLTFLoader } from 'three-stdlib'
import { useDesk } from '../DeskContext'
import { Outline } from '../Outline'
import type { DeskObjectBinding } from '../useDeskObject'

export const DRONE_MODEL_URL = '/assets/models/drone.glb'

function withMeshopt(loader: GLTFLoader) {
  loader.setMeshoptDecoder(MeshoptDecoder)
}

/** Start fetching and parsing before the desk needs it. */
export function preloadDroneModel(): void {
  useGLTF.preload(DRONE_MODEL_URL, false, false, withMeshopt)
}

export interface DroneModelProps {
  /** Target width across the airframe, metres. */
  width: number
  /** Receives the model's size after scaling, for rotor and pod placement. */
  onMeasured?: (size: Vector3) => void
  bind: DeskObjectBinding['bind']
  outlined: boolean
}

/**
 * The mesh's transform relative to the scene root, from its own local matrices.
 * Never uses world matrices: on a remount (React StrictMode, Suspense retries)
 * `gltf.scene` is still parented under the previous scaled group, so a
 * world-space measurement would be taken post-scale and the drone would
 * render about ten times too big.
 */
function matrixRelativeToRoot(mesh: Mesh, root: Object3D): Matrix4 {
  const matrix = new Matrix4()
  let node: Object3D | null = mesh
  while (node && node !== root) {
    node.updateMatrix()
    matrix.premultiply(node.matrix)
    node = node.parent
  }
  return matrix
}

export function DroneModel({ width, onMeasured, bind, outlined }: DroneModelProps) {
  const { modelReady } = useDesk()
  const gltf = useGLTF(DRONE_MODEL_URL, false, false, withMeshopt)
  const { mesh, meshMatrix, scale, offset, size } = useMemo(() => {
    let found: Mesh | null = null
    gltf.scene.traverse((o) => {
      if (!found && (o as Mesh).isMesh) found = o as Mesh
    })
    if (!found) throw new Error('drone.glb has no mesh')
    const m = found as Mesh
    const relative = matrixRelativeToRoot(m, gltf.scene)
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox()
    const box = (m.geometry.boundingBox as Box3).clone().applyMatrix4(relative)
    const extent = box.getSize(new Vector3())
    const s = width / Math.max(extent.x, 0.001)
    const centre = box.getCenter(new Vector3())
    // Centre on x and z, and rest the lowest point on y = 0.
    const off = new Vector3(-centre.x * s, -box.min.y * s, -centre.z * s)
    const scaled = extent.clone().multiplyScalar(s)
    return { mesh: m, meshMatrix: relative, scale: s, offset: off, size: scaled }
  }, [gltf, width])

  useLayoutEffect(() => {
    onMeasured?.(size)
    modelReady()
  }, [size, onMeasured, modelReady])

  return (
    <group scale={[scale, scale, scale]} position={[offset.x, offset.y, offset.z]}>
      <primitive object={gltf.scene} position={[0, 0, 0]} scale={[1, 1, 1]} {...bind} />
      {/* A thin rim: the airframe has many thin parts, so a thicker shell would show through them. */}
      <group matrixAutoUpdate={false} matrix={meshMatrix}>
        <Outline geometry={mesh.geometry} visible={outlined} thickness={0.0009 / scale} />
      </group>
    </group>
  )
}
