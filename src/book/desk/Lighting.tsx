// Scene lighting (plan: Visual design). The warm lamp spotlight lives in the
// Lamp object because it changes with the switch; this file adds the low,
// cool ambient light and a small local environment so ceramic and steel
// pick up reflections. No shadow maps anywhere.

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { PMREMGenerator } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

export function Lighting() {
  const { gl, scene, invalidate } = useThree()

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const environment = pmrem.fromScene(room, 0.04).texture
    scene.environment = environment
    scene.environmentIntensity = 0.28
    pmrem.dispose()
    invalidate()
    return () => {
      scene.environment = null
      environment.dispose()
    }
  }, [gl, scene, invalidate])

  return (
    <>
      <hemisphereLight args={['#3B4A66', '#0C0B0A', 0.95]} />
      <directionalLight position={[0.8, 0.9, 1.2]} intensity={0.3} color="#8FA3C4" />
    </>
  )
}
