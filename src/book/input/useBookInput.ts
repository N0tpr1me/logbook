// One hook wires wheel, drag and keys to the book. Attach `setElement` to
// the canvas container (wheel target, no browser swipe-back) and give
// `pointer` to <Book pointer={...}> so pages can be grabbed.

import { useEffect, useState } from 'react'
import type { BookController } from '@/book/engine/motion'
import type { PagePointerHandlers } from '@/book/engine/pointer'
import type { BookStore } from '@/book/state'
import type { FlickOptions } from './flick'
import { useDragInput } from './useDragInput'
import { useKeyInput } from './useKeyInput'
import { useWheelInput } from './useWheelInput'

export interface BookInputOptions {
  enabled?: boolean
  /** Escape pressed; the integrator decides what closes. */
  onEscape?: () => void
  wheel?: FlickOptions
}

export interface BookInputBindings {
  /** Ref callback for the element that receives wheel events (the canvas container). */
  setElement: (element: HTMLElement | null) => void
  /** Pointer handlers for <Book pointer={...}>. */
  pointer: PagePointerHandlers
}

export function useBookInput(store: BookStore, controller: BookController, options: BookInputOptions = {}): BookInputBindings {
  const { enabled = true, onEscape, wheel } = options
  const [element, setElement] = useState<HTMLElement | null>(null)

  useWheelInput(store, controller, { element, enabled, ...wheel })
  useKeyInput(controller, { enabled, onEscape })
  const pointer = useDragInput(store, controller, { enabled })

  useEffect(() => {
    if (!element) return
    const previous = { overscroll: element.style.overscrollBehaviorX, touch: element.style.touchAction }
    element.style.overscrollBehaviorX = 'none'
    element.style.touchAction = 'none'
    return () => {
      element.style.overscrollBehaviorX = previous.overscroll
      element.style.touchAction = previous.touch
    }
  }, [element])

  return { setElement, pointer }
}
