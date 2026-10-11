// Shared behaviour for every desk object: hover and keyboard focus show the
// same outline and label; a pointer click and Enter/Space on the keyboard
// button run the same click handler; one object animates at a time.

import { useCallback, useEffect, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useDesk } from './DeskContext'
import { useDeskState } from './interaction'
import { OBJECT_LABELS, type DeskObjectId } from './layout'
import type { ClickContext } from './motion'

export interface UseDeskObjectOptions {
  /** Runs the click animation. `full` is true the first time this visit. */
  onClick: (ctx: ClickContext) => void
  /** Returns the object to rest because another object was clicked. */
  onCancel: () => void
  /** Hover or focus started (true) or ended (false). */
  onHighlight?: (on: boolean) => void
  /** Plays in full on every click (the mug). */
  alwaysFull?: boolean
}

export interface DeskObjectBinding {
  highlighted: boolean
  label: string
  bind: {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => void
    onPointerOut: (e: ThreeEvent<PointerEvent>) => void
    onClick: (e: ThreeEvent<MouseEvent>) => void
  }
}

export function useDeskObject(id: DeskObjectId, options: UseDeskObjectOptions): DeskObjectBinding {
  const { interaction, store } = useDesk()
  const highlighted = useDeskState(interaction, (s) => s.hovered === id || s.focused === id)
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    const click = () => {
      interaction.activate(id)
      const first = interaction.markPlayed(id)
      const { reducedMotion, testMode } = store.get()
      optionsRef.current.onClick({
        full: first || optionsRef.current.alwaysFull === true,
        instant: reducedMotion || testMode,
      })
    }
    const cancel = () => optionsRef.current.onCancel()
    return interaction.register(id, { click, cancel })
  }, [id, interaction, store])

  useEffect(() => {
    optionsRef.current.onHighlight?.(highlighted)
  }, [highlighted])

  const onPointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      interaction.set({ hovered: id })
      document.body.style.cursor = 'pointer'
    },
    [id, interaction],
  )
  const onPointerOut = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      interaction.set((s) => (s.hovered === id ? { hovered: null } : {}))
      document.body.style.cursor = ''
    },
    [id, interaction],
  )
  const onClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      interaction.click(id)
    },
    [id, interaction],
  )

  return { highlighted, label: OBJECT_LABELS[id], bind: { onPointerOver, onPointerOut, onClick } }
}
