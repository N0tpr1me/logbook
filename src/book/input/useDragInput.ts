// Drag input: a page grabbed in its outer 15% follows the cursor exactly;
// release while moving carries the speed, release slowly before halfway
// falls back. A grab during a turn waits until the page lands. A tap on the
// outer edge is an automatic turn. Plan: Dragging and flicking a page.

import { useEffect, useMemo, useRef } from 'react'
import { DRAG_CURL, solveTurnForX } from '@/book/engine/bend'
import { PAGE_WIDTH } from '@/book/engine/layout'
import type { BookController } from '@/book/engine/motion'
import type { PageGrabInfo, PagePointerHandlers } from '@/book/engine/pointer'
import type { BookStore } from '@/book/state'

export interface DragInputOptions {
  enabled?: boolean
}

/** A press shorter than this, that barely moves, is a click. */
export const TAP_MAX_MS = 250
export const TAP_MAX_DISTANCE = 0.004

interface ActiveDrag {
  direction: 1 | -1
  /** Grab radius in metres from the spine. */
  radius: number
  startX: number
  lastX: number
  startTime: number
}

interface DragMemory {
  pending: PageGrabInfo | null
  active: ActiveDrag | null
}

/** Which sheet a grab on `side` takes hold of at this position, and which way it turns. */
export function sheetForGrab(position: number, spreads: number, side: 'right' | 'left'): { sheet: number; direction: 1 | -1 } | null {
  const at = Math.round(position)
  const sheet = side === 'right' ? at : at - 1
  if (sheet < 0 || sheet > spreads) return null
  return { sheet, direction: side === 'right' ? 1 : -1 }
}

export function useDragInput(store: BookStore, controller: BookController, options: DragInputOptions = {}): PagePointerHandlers {
  const { enabled = true } = options
  const memory = useRef<DragMemory>({ pending: null, active: null })
  const settings = useRef({ enabled })
  settings.current.enabled = enabled

  const handlers = useMemo<PagePointerHandlers>(() => {
    const start = (info: PageGrabInfo): void => {
      const state = store.get()
      const grab = sheetForGrab(state.position, state.spreads, info.side)
      if (!grab) return
      const began = controller.beginDrag({ ...grab, grabY: info.grabY, tilt: info.tilt })
      if (!began) return
      memory.current = {
        pending: null,
        active: { direction: grab.direction, radius: info.radius * PAGE_WIDTH, startX: info.x, lastX: info.x, startTime: info.time },
      }
    }

    return {
      onGrab(info) {
        if (!settings.current.enabled || !info.inGrabZone || memory.current.active) return
        const state = store.get()
        if (state.animating || state.dragging) {
          memory.current = { ...memory.current, pending: info }
          return
        }
        start(info)
      },
      onMove(x) {
        const { active, pending } = memory.current
        if (pending) memory.current = { ...memory.current, pending: { ...pending, x } }
        if (!active) return
        memory.current = { ...memory.current, active: { ...active, lastX: x } }
        controller.updateDrag(solveTurnForX(x, active.radius, PAGE_WIDTH, DRAG_CURL * active.direction))
      },
      onRelease(time) {
        const { active, pending } = memory.current
        memory.current = { pending: null, active: null }
        if (pending) {
          const quick = time - pending.time < TAP_MAX_MS
          if (quick) controller.turn(pending.side === 'right' ? 1 : -1)
          return
        }
        if (!active) return
        const tap = time - active.startTime < TAP_MAX_MS && Math.abs(active.lastX - active.startX) < TAP_MAX_DISTANCE
        if (tap) {
          controller.cancelDrag()
          controller.turn(active.direction)
          return
        }
        controller.endDrag()
      },
    }
  }, [store, controller])

  // A grab that arrived mid-turn starts once the page has landed.
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const state = store.get()
      const pending = memory.current.pending
      if (!pending || state.animating || state.dragging || memory.current.active) return
      handlers.onGrab(pending)
    })
    return () => {
      unsubscribe()
    }
  }, [store, handlers])

  useEffect(() => {
    if (!enabled && memory.current.active) {
      controller.cancelDrag()
      memory.current = { pending: null, active: null }
    }
  }, [enabled, controller])

  return handlers
}
