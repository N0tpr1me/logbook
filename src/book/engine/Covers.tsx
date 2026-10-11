// The covers, spine strip and ribbons. Cloth in bottle green, a foil name
// plate on the front, paper endpapers inside. The Book positions the three
// groups every frame from coverPoses().

import type { ThreeEvent } from '@react-three/fiber'
import { useCallback, type RefObject } from 'react'
import type * as THREE from 'three'
import { RIBBON_TAIL, type BookLayout } from './layout'
import { COVER_COLOUR, FOIL_COLOUR, type PageMaterial } from './PageMaterial'
import type { PageSideName } from './pointer'
import type { BookPointerBinding } from './useBookPointer'

export interface CoverRefs {
  strip: RefObject<THREE.Group | null>
  front: RefObject<THREE.Group | null>
  back: RefObject<THREE.Group | null>
}

export interface Endpapers {
  /** Flat page geometry with x running from the spine outwards. */
  geometry: THREE.BufferGeometry
  front: PageMaterial
  back: PageMaterial
}

export interface CoversProps {
  layout: BookLayout
  refs: CoverRefs
  pointer: BookPointerBinding
  /** Which side each cover currently lies on, for grabs. */
  sides: { front: () => PageSideName; back: () => PageSideName }
  /** Paper glued inside each cover, drawn with the page shader so it lights like a page. */
  endpapers: Endpapers
}

/** Foil plate: name area in the upper part of the front cover. */
const PLATE_SIZE: readonly [number, number] = [0.11, 0.036]
const PLATE_Y = 0.075
const RIBBON_WIDTH = 0.004
// Only the top margin of the page: the ribbons must never cover the headings.
const RIBBON_INSIDE = 0.012
const RIBBON_THICKNESS = 0.0002
const SURFACE_LIFT = 0.00015

interface CoverSlabProps {
  layout: BookLayout
  groupRef: RefObject<THREE.Group | null>
  pointer: BookPointerBinding
  side: () => PageSideName
  /** The foil plate goes on the front cover only. */
  plate: boolean
  /** Which local face the endpaper is on: -1 for the front cover (inside faces -z when closed). */
  endpaperFace: 1 | -1
  endpaperGeometry: THREE.BufferGeometry
  endpaperMaterial: PageMaterial
}

function CoverSlab({ layout, groupRef, pointer, side, plate, endpaperFace, endpaperGeometry, endpaperMaterial }: CoverSlabProps) {
  const width = layout.pageWidth + layout.coverMargin
  const height = layout.pageHeight + 2 * layout.coverMargin
  const thickness = layout.coverThickness
  const onPointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (groupRef.current) pointer.onPointerDown(event, side(), groupRef.current)
    },
    [groupRef, pointer, side],
  )
  const onPointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (groupRef.current) pointer.onPointerMove(event, groupRef.current)
    },
    [groupRef, pointer],
  )
  const endpaperZ = endpaperFace * (thickness / 2 + SURFACE_LIFT)
  return (
    <group ref={groupRef}>
      <mesh
        position={[width / 2, 0, 0]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerOut={pointer.onPointerOut}
      >
        <boxGeometry args={[width, height, thickness]} />
        <meshStandardMaterial color={COVER_COLOUR} roughness={0.92} metalness={0} />
      </mesh>
      {plate && (
        <mesh position={[width / 2, PLATE_Y, thickness / 2 + SURFACE_LIFT]}>
          <planeGeometry args={PLATE_SIZE} />
          <meshStandardMaterial color={FOIL_COLOUR} roughness={0.35} metalness={0.6} />
        </mesh>
      )}
      <mesh
        geometry={endpaperGeometry}
        material={endpaperMaterial}
        position={[0, 0, endpaperZ]}
        rotation={[endpaperFace < 0 ? Math.PI : 0, 0, 0]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerOut={pointer.onPointerOut}
      />
    </group>
  )
}

function Ribbons({ layout }: { layout: BookLayout }) {
  const top = layout.pageHeight / 2
  const length = RIBBON_INSIDE + RIBBON_TAIL
  const centreY = top - RIBBON_INSIDE + length / 2
  return (
    <>
      {layout.ribbonTails.map((tail, i) => (
        <mesh key={i} position={[tail.x, centreY, tail.z + SURFACE_LIFT]}>
          <boxGeometry args={[RIBBON_WIDTH, length, RIBBON_THICKNESS]} />
          <meshStandardMaterial color={COVER_COLOUR} roughness={0.8} metalness={0} />
        </mesh>
      ))}
    </>
  )
}

export function Covers({ layout, refs, pointer, sides, endpapers }: CoversProps) {
  const stripHeight = layout.pageHeight + 2 * layout.coverMargin
  return (
    <>
      <group ref={refs.strip}>
        <mesh position={[layout.spineWidth / 2, 0, 0]}>
          <boxGeometry args={[layout.spineWidth, stripHeight, layout.coverThickness]} />
          <meshStandardMaterial color={COVER_COLOUR} roughness={0.92} metalness={0} />
        </mesh>
      </group>
      <CoverSlab
        layout={layout}
        groupRef={refs.front}
        pointer={pointer}
        side={sides.front}
        plate
        endpaperFace={-1}
        endpaperGeometry={endpapers.geometry}
        endpaperMaterial={endpapers.front}
      />
      <CoverSlab
        layout={layout}
        groupRef={refs.back}
        pointer={pointer}
        side={sides.back}
        plate={false}
        endpaperFace={1}
        endpaperGeometry={endpapers.geometry}
        endpaperMaterial={endpapers.back}
      />
      <Ribbons layout={layout} />
    </>
  )
}
