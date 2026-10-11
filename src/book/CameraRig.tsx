// The camera: starts high over the desk, eases down to the three-quarter view
// on reveal (1.2s expo-out), moves in over the book as it opens (1.4s power2
// in-out) and back out as it closes (0.9s). In reduced motion or test mode
// every move is a cut (plan: Motion and timings).

import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { PerspectiveCamera, Vector3, type Camera } from 'three'
import { cameraForOpenBook, deskCamera, revealCamera, type CameraPose } from '@/book/desk/layout'
import type { FrameMonitor } from '@/book/loading/perf'
import { useBookState, type BookStore } from '@/book/state'

export interface CameraRigProps {
  store: BookStore
  revealed: boolean
  monitor: FrameMonitor
}

function applyPose(camera: Camera, pose: CameraPose, target: Vector3) {
  camera.position.set(pose.position[0], pose.position[1], pose.position[2])
  target.set(pose.target[0], pose.target[1], pose.target[2])
  camera.lookAt(target)
  if (camera instanceof PerspectiveCamera && camera.fov !== pose.fov) {
    camera.fov = pose.fov
    camera.updateProjectionMatrix()
  }
}

export function CameraRig({ store, revealed, monitor }: CameraRigProps) {
  const camera = useThree((s) => s.camera)
  const aspect = useThree((s) => s.viewport.aspect)
  const invalidate = useThree((s) => s.invalidate)
  const target = useMemo(() => new Vector3(), [])
  const mode = useBookState(store, (s) => s.mode)
  const instant = store.get().reducedMotion || store.get().testMode
  const bookOpen = mode !== 'desk'

  // Before the reveal the camera waits high over the desk.
  useEffect(() => {
    applyPose(camera, instant ? deskCamera : revealCamera, target)
    invalidate()
    // Runs once; later moves are tweens below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera])

  useEffect(() => {
    if (!revealed) return
    const pose = bookOpen ? cameraForOpenBook(aspect) : deskCamera
    if (instant) {
      applyPose(camera, pose, target)
      invalidate()
      return
    }
    const live = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      tx: target.x,
      ty: target.y,
      tz: target.z,
      fov: camera instanceof PerspectiveCamera ? camera.fov : pose.fov,
    }
    const fromReveal = !bookOpen && Math.abs(camera.position.y - revealCamera.position[1]) < 1e-3
    const duration = fromReveal ? 1.2 : bookOpen ? 1.4 : 0.9
    const ease = fromReveal ? 'expo.out' : 'power2.inOut'
    monitor.setAnimating('camera', true)
    const tween = gsap.to(live, {
      x: pose.position[0],
      y: pose.position[1],
      z: pose.position[2],
      tx: pose.target[0],
      ty: pose.target[1],
      tz: pose.target[2],
      fov: pose.fov,
      duration,
      ease,
      onUpdate: () => {
        camera.position.set(live.x, live.y, live.z)
        target.set(live.tx, live.ty, live.tz)
        camera.lookAt(target)
        if (camera instanceof PerspectiveCamera) {
          camera.fov = live.fov
          camera.updateProjectionMatrix()
        }
        invalidate()
      },
      onComplete: () => monitor.setAnimating('camera', false),
    })
    return () => {
      tween.kill()
      monitor.setAnimating('camera', false)
    }
  }, [revealed, bookOpen, aspect, instant, camera, target, invalidate, monitor])

  return null
}
