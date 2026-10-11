// Turns pointer events on page and cover meshes into PagePointerHandlers
// calls: the grab point from the raycast hit, then the pointer's x in the
// book plane while it is held (window-level events, so leaving the mesh or
// the canvas does not drop the page).

import { useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { TILT_MAX, clamp } from './bend'
import type { BookLayout } from './layout'
import { inGrabZone, type PagePointerHandlers, type PageSideName } from './pointer'

export interface BookPointerBinding {
  /** Attach to a page or cover mesh; `frame` is the object whose local x runs from the spine outwards. */
  onPointerDown(event: ThreeEvent<PointerEvent>, side: PageSideName, frame: THREE.Object3D): void
  onPointerMove(event: ThreeEvent<PointerEvent>, frame: THREE.Object3D): void
  onPointerOut(): void
}

interface HeldPointer {
  id: number
  onMove: (event: PointerEvent) => void
  onUp: (event: PointerEvent) => void
}

function localGrab(point: THREE.Vector3, frame: THREE.Object3D, layout: BookLayout) {
  const local = frame.worldToLocal(point.clone())
  const radius = clamp(local.x / layout.pageWidth, 0, 1.2)
  const grabY = clamp((local.y + layout.pageHeight / 2) / layout.pageHeight, 0, 1)
  const tilt = (grabY - 0.5) * 2 * clamp(radius, 0, 1) * TILT_MAX
  return { radius, grabY, tilt }
}

export function useBookPointer(
  groupRef: RefObject<THREE.Group | null>,
  layout: BookLayout,
  handlers: PagePointerHandlers | undefined,
): BookPointerBinding {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const held = useRef<HeldPointer | null>(null)
  const scratch = useRef({
    raycaster: new THREE.Raycaster(),
    plane: new THREE.Plane(),
    normal: new THREE.Vector3(),
    origin: new THREE.Vector3(),
    hit: new THREE.Vector3(),
    ndc: new THREE.Vector2(),
  })

  /** Pointer x in the book plane, or null when the ray misses it. */
  const bookX = useCallback(
    (clientX: number, clientY: number): number | null => {
      const group = groupRef.current
      if (!group) return null
      const { raycaster, plane, normal, origin, hit, ndc } = scratch.current
      const rect = gl.domElement.getBoundingClientRect()
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      normal.set(0, 0, 1).transformDirection(group.matrixWorld)
      group.getWorldPosition(origin)
      plane.setFromNormalAndCoplanarPoint(normal, origin)
      if (!raycaster.ray.intersectPlane(plane, hit)) return null
      return group.worldToLocal(hit).x
    },
    [camera, gl, groupRef],
  )

  const release = useCallback(() => {
    const current = held.current
    if (!current) return
    window.removeEventListener('pointermove', current.onMove)
    window.removeEventListener('pointerup', current.onUp)
    window.removeEventListener('pointercancel', current.onUp)
    held.current = null
    gl.domElement.style.cursor = ''
  }, [gl])

  useEffect(() => release, [release])

  const onPointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>, side: PageSideName, frame: THREE.Object3D) => {
      if (!handlers || held.current) return
      if (event.nativeEvent.button !== undefined && event.nativeEvent.button !== 0) return
      event.stopPropagation()
      const { radius, grabY, tilt } = localGrab(event.point, frame, layout)
      const native = event.nativeEvent
      const x = bookX(native.clientX, native.clientY) ?? (side === 'right' ? radius : -radius) * layout.pageWidth
      handlers.onGrab({
        side,
        radius,
        grabY,
        tilt,
        inGrabZone: inGrabZone(radius, grabY),
        x,
        pointerId: native.pointerId,
        time: native.timeStamp,
      })
      const onMove = (e: PointerEvent) => {
        if (e.pointerId !== native.pointerId) return
        const nextX = bookX(e.clientX, e.clientY)
        if (nextX !== null) handlers.onMove(nextX, e.timeStamp)
      }
      const onUp = (e: PointerEvent) => {
        if (e.pointerId !== native.pointerId) return
        release()
        handlers.onRelease(e.timeStamp)
      }
      held.current = { id: native.pointerId, onMove, onUp }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
      gl.domElement.style.cursor = 'grabbing'
    },
    [bookX, gl, handlers, layout, release],
  )

  const onPointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>, frame: THREE.Object3D) => {
      if (!handlers || held.current) return
      const { radius, grabY } = localGrab(event.point, frame, layout)
      gl.domElement.style.cursor = inGrabZone(radius, grabY) ? 'grab' : ''
    },
    [gl, handlers, layout],
  )

  const onPointerOut = useCallback(() => {
    if (!held.current) gl.domElement.style.cursor = ''
  }, [gl])

  return { onPointerDown, onPointerMove, onPointerOut }
}
