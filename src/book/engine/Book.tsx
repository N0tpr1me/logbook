// The book: cover, N sheets (each with a front and a back), back cover and
// three ribbons, driven by one number, the store's `position`
// (plan: Navigating the book). Sheet i is flat right when position <= i,
// turning while position is in (i, i+1), and flat left when position >= i+1;
// sheet 0 is the cover.
//
// Rendering is on demand: the scene redraws only when the store changes or
// a smoothed value (curl, tilt) is still settling.

import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { BookStore } from '@/book/state'
import { Covers, type Endpapers } from './Covers'
import { sheetPose, smoothTowards, targetCurl, turningSheet } from './frame'
import { coverPoses } from './coverPoses'
import { PAGE_SEGMENTS, useBookLayout, type BookLayout } from './layout'
import type { BookController, MoveState } from './motion'
import {
  blankPageSide,
  createPageMaterial,
  createSharedPageUniforms,
  DEFAULT_LAMP_DIRECTION,
  setDrawnForward,
  type PageMaterial,
  type PageSide,
} from './PageMaterial'
import type { PageTextures } from './pageTextures'
import type { PagePointerHandlers, PageSideName } from './pointer'
import { useBookPointer } from './useBookPointer'

export interface LampSettings {
  /** Direction towards the lamp, in the book's frame. */
  direction?: readonly [number, number, number]
  /** Diffuse strength of the lamp on the paper. */
  strength?: number
  /** Ambient floor on the paper. */
  ambient?: number
}

/** Page images glued inside the covers: the left page of spread 1 and the right page after the last spread. */
export interface BookEndpapers {
  front?: PageSide
  back?: PageSide
}

export interface BookProps {
  store: BookStore
  /** One entry per sheet: pages[k - 1] is sheet k. The store's `spreads` should equal pages.length. */
  pages: readonly PageTextures[]
  /** Lets the book shape the curl by what is moving it (drag, jump). */
  controller?: BookController
  /** Pointer handlers from the drag input; without them pages are not grabbable. */
  pointer?: PagePointerHandlers
  lamp?: LampSettings
  /** Textures for the inside covers; plain paper when not given. */
  endpapers?: BookEndpapers
  /** Called once the meshes exist, with the layout (ribbon tails included). */
  onReady?: (layout: BookLayout) => void
}

const IDLE_MOVE: MoveState = { kind: 'idle', sheet: null, direction: 1, grabY: 0.5, tilt: 0 }
const CURL_RATE = 14
const TILT_RATE = 10
const MAX_FRAME = 0.1
const SETTLE_EPSILON = 1e-3

interface FrameMemory {
  previousPosition: number
  velocity: number
  curl: number
  tilt: number
  grabY: number
}

export function Book({ store, pages, controller, pointer, lamp, endpapers: endpaperSides, onReady }: BookProps) {
  const layout = useBookLayout(pages.length)
  const groupRef = useRef<THREE.Group>(null)
  const sheetRefs = useRef<(THREE.Mesh | null)[]>([])
  const stripRef = useRef<THREE.Group>(null)
  const frontRef = useRef<THREE.Group>(null)
  const backRef = useRef<THREE.Group>(null)
  const coverRefs = useMemo(() => ({ strip: stripRef, front: frontRef, back: backRef }), [])
  const invalidate = useThree((s) => s.invalidate)
  const gl = useThree((s) => s.gl)
  const memory = useRef<FrameMemory>({ previousPosition: Number.NaN, velocity: 0, curl: 0, tilt: 0, grabY: 0.5 })
  const lampLocal = useRef(new THREE.Vector3())

  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(layout.pageWidth, layout.pageHeight, PAGE_SEGMENTS.x, PAGE_SEGMENTS.y)
    plane.translate(layout.pageWidth / 2, 0, 0)
    return plane
  }, [layout])
  useEffect(() => () => geometry.dispose(), [geometry])

  const shared = useMemo(createSharedPageUniforms, [])
  const materials = useMemo<PageMaterial[]>(
    () =>
      pages.map((page) =>
        createPageMaterial({ width: layout.pageWidth, height: layout.pageHeight, front: page.front, back: page.back, shared }),
      ),
    [pages, layout, shared],
  )
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials])

  const frontEndpaper = endpaperSides?.front
  const backEndpaper = endpaperSides?.back
  const endpapers = useMemo<Endpapers>(() => {
    const flat = new THREE.PlaneGeometry(layout.pageWidth, layout.pageHeight, 1, 1)
    flat.translate(layout.pageWidth / 2, 0, 0)
    const make = (side: PageSide | undefined, flipFront: boolean) =>
      createPageMaterial({
        width: layout.pageWidth,
        height: layout.pageHeight,
        front: side ?? blankPageSide(),
        back: blankPageSide(),
        shared,
        grid: side !== undefined,
        flipFront,
      })
    return { geometry: flat, front: make(frontEndpaper, true), back: make(backEndpaper, false) }
  }, [layout, shared, frontEndpaper, backEndpaper])
  useEffect(
    () => () => {
      endpapers.geometry.dispose()
      endpapers.front.dispose()
      endpapers.back.dispose()
    },
    [endpapers],
  )

  useEffect(() => {
    const max = gl.capabilities.getMaxAnisotropy()
    pages.forEach((page) => {
      ;[page.front, page.back].forEach((side) => {
        if (side.texture.anisotropy > max) side.texture.anisotropy = max
      })
    })
  }, [gl, pages])

  useEffect(() => {
    const direction = lamp?.direction ?? DEFAULT_LAMP_DIRECTION
    lampLocal.current.set(direction[0], direction[1], direction[2]).normalize()
    shared.uAmbient.value = lamp?.ambient ?? 0.42
    shared.uLamp.value = lamp?.strength ?? 0.66
    invalidate()
  }, [lamp, shared, invalidate])

  useEffect(() => {
    const unsubscribe = store.subscribe(() => invalidate())
    return () => {
      unsubscribe()
    }
  }, [store, invalidate])
  useEffect(() => {
    invalidate()
    onReady?.(layout)
  }, [layout, materials, onReady, invalidate])

  const pointerBinding = useBookPointer(groupRef, layout, pointer)
  const sideOfFront = useCallback((): PageSideName => (store.get().position < 0.5 ? 'right' : 'left'), [store])
  const sideOfBack = useCallback(
    (): PageSideName => (store.get().position < store.get().spreads + 0.5 ? 'right' : 'left'),
    [store],
  )
  const coverSides = useMemo(() => ({ front: sideOfFront, back: sideOfBack }), [sideOfFront, sideOfBack])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return
    const dt = Math.min(Math.max(delta, 1e-4), MAX_FRAME)
    const state = store.get()
    const position = state.position
    const move = controller?.getMove() ?? IDLE_MOVE
    const mem = memory.current

    const previous = Number.isNaN(mem.previousPosition) ? position : mem.previousPosition
    const rawVelocity = (position - previous) / dt
    const velocity = smoothTowards(mem.velocity, rawVelocity, 30, dt)
    const curl = smoothTowards(mem.curl, targetCurl(move, velocity), CURL_RATE, dt)
    const wantsTilt = move.kind === 'drag' || move.kind === 'release' ? move.tilt : 0
    const tilt = smoothTowards(mem.tilt, wantsTilt, TILT_RATE, dt)
    const grabY = move.kind === 'drag' || move.kind === 'release' ? move.grabY : mem.grabY
    memory.current = { previousPosition: position, velocity, curl, tilt, grabY }

    const turning = turningSheet(position)
    shared.uShadow.value = turning >= 0 ? (position - turning) * Math.PI : -1
    shared.uLampDir.value.copy(lampLocal.current).transformDirection(group.matrixWorld)

    materials.forEach((material, i) => {
      const index = i + 1
      const mesh = sheetRefs.current[i]
      if (!mesh) return
      const pose = sheetPose(layout, index, position)
      mesh.rotation.y = pose.angle
      mesh.position.z = pose.z
      const isTurning = index === turning
      material.uniforms.uTurn.value = pose.turn
      material.uniforms.uCurl.value = isTurning ? curl : 0
      material.uniforms.uTilt.value = isTurning ? tilt : 0
      material.uniforms.uGrab.value = grabY
      setDrawnForward(material, isTurning)
      mesh.renderOrder = isTurning ? 2 : 0
    })

    const frontTurn = Math.min(Math.max(position, 0), 1)
    const backTurn = Math.min(Math.max(position - layout.spreads, 0), 1)
    endpapers.front.uniforms.uTurn.value = frontTurn
    endpapers.back.uniforms.uTurn.value = backTurn
    const poses = coverPoses(layout, frontTurn, backTurn)
    applyPose(coverRefs.strip.current, poses.strip)
    applyPose(coverRefs.front.current, poses.front)
    applyPose(coverRefs.back.current, poses.back)

    const settling =
      Math.abs(curl - targetCurl(move, velocity)) > SETTLE_EPSILON || Math.abs(tilt - wantsTilt) > SETTLE_EPSILON
    if (settling || state.animating || state.dragging) invalidate()
  })

  const sheetDown = useCallback(
    (event: ThreeEvent<PointerEvent>, index: number) => {
      const mesh = sheetRefs.current[index - 1]
      if (!mesh) return
      const side: PageSideName = store.get().position < index + 0.5 ? 'right' : 'left'
      pointerBinding.onPointerDown(event, side, mesh)
    },
    [pointerBinding, store],
  )
  const sheetMove = useCallback(
    (event: ThreeEvent<PointerEvent>, index: number) => {
      const mesh = sheetRefs.current[index - 1]
      if (mesh) pointerBinding.onPointerMove(event, mesh)
    },
    [pointerBinding],
  )

  return (
    <group ref={groupRef}>
      <Covers layout={layout} refs={coverRefs} pointer={pointerBinding} sides={coverSides} endpapers={endpapers} />
      {materials.map((material, i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            sheetRefs.current[i] = mesh
          }}
          geometry={geometry}
          material={material}
          frustumCulled={false}
          onPointerDown={(e) => sheetDown(e, i + 1)}
          onPointerMove={(e) => sheetMove(e, i + 1)}
          onPointerOut={pointerBinding.onPointerOut}
        />
      ))}
    </group>
  )
}

function applyPose(group: THREE.Group | null, pose: { x: number; z: number; angle: number }): void {
  if (!group) return
  group.position.set(pose.x, 0, pose.z)
  group.rotation.y = pose.angle
}

export { useBookLayout } from './layout'
export type { BookLayout } from './layout'
