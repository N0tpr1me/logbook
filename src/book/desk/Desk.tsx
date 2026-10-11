// The desk scene: lighting, fixed parts and the five desk objects plus the
// book stand-in, all procedural (plan: Visual design, Desk objects). Mount
// inside an R3F <Canvas frameloop="demand">.

import { useCallback, useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { features } from '@/config/features'
import type { BookStore } from '@/book/state'
import { DeskProvider, type DeskAudio } from './DeskContext'
import { createDeskInteraction, type DeskInteraction } from './interaction'
import type { DeskObjectId } from './layout'
import { Lighting } from './Lighting'
import { Statics } from './Statics'
import { BookPlaceholder } from './objects/BookPlaceholder'
import { Drone } from './objects/Drone'
import { FoldedCv } from './objects/FoldedCv'
import { Lamp } from './objects/Lamp'
import { Mug } from './objects/Mug'
import { Pencil } from './objects/Pencil'

export interface DeskProps {
  store: BookStore
  onObjectClick: (id: DeskObjectId) => void
  /** Shared with <DeskA11y>; created here when not given. */
  interaction?: DeskInteraction
  audio?: DeskAudio | null
  /** True once the loading screen has cross-faded into the scene. */
  revealed?: boolean
  /** Leave out the book stand-in when the real book is mounted. */
  book?: boolean
  /** Called once every object, including the drone model, is mounted, so the loader can compile shaders and upload textures. */
  onMounted?: () => void
}

export function Desk({ store, onObjectClick, interaction, audio = null, revealed = false, book = true, onMounted }: DeskProps) {
  const own = useMemo(() => createDeskInteraction(), [])
  const shared = interaction ?? own
  const invalidate = useThree((s) => s.invalidate)
  const modelReady = useCallback(() => {
    onMounted?.()
    invalidate()
  }, [onMounted, invalidate])
  const value = useMemo(
    () => ({ store, interaction: shared, audio, onObjectClick, revealed, modelReady }),
    [store, shared, audio, onObjectClick, revealed, modelReady],
  )

  useEffect(() => {
    invalidate()
  }, [invalidate])

  // Esc returns the active object to rest and closes the note.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (shared.get().noteOpen) {
        shared.set({ noteOpen: false })
        return
      }
      shared.cancelActive()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shared])

  return (
    <DeskProvider value={value}>
      <color attach="background" args={['#141311']} />
      <Lighting />
      <Statics />
      {book ? <BookPlaceholder /> : null}
      {features.desk.lamp ? <Lamp /> : null}
      {features.desk.cv ? <FoldedCv /> : null}
      {features.desk.pencil ? <Pencil /> : null}
      {features.desk.mug ? <Mug /> : null}
      {features.desk.drone ? <Drone /> : null}
    </DeskProvider>
  )
}
