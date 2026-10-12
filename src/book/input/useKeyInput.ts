// Keys: ArrowLeft/Right, PageUp/Down and Space turn one page; a held key
// keeps turning, one page every 0.65 s; Enter opens. Escape is reported to
// the caller (the integrator closes the sheet or the book), not handled here.

import { useEffect } from 'react'
import { HOLD_REPEAT, type BookController } from '@/book/engine/motion'

export interface KeyInputOptions {
  enabled?: boolean
  onEscape?: () => void
}

type KeyAction = { kind: 'turn'; direction: 1 | -1 } | { kind: 'open' } | { kind: 'escape' }

export function keyAction(key: string): KeyAction | null {
  switch (key) {
    case 'ArrowRight':
    case 'PageDown':
    case ' ':
    case 'Spacebar':
      return { kind: 'turn', direction: 1 }
    case 'ArrowLeft':
    case 'PageUp':
      return { kind: 'turn', direction: -1 }
    case 'Enter':
      return { kind: 'open' }
    case 'Escape':
      return { kind: 'escape' }
    default:
      return null
  }
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

function isActivatable(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest('button, a[href], summary, [role="button"]') !== null
}

export function useKeyInput(controller: BookController, options: KeyInputOptions = {}): void {
  const { enabled = true, onEscape } = options

  useEffect(() => {
    if (!enabled) return
    // A held key keeps turning, one page every HOLD_REPEAT seconds, paced by the
    // keyboard's own repeat events rather than a timer: no key event, no turn.
    let lastTurnAt = 0

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditable(event.target) || event.metaKey || event.ctrlKey || event.altKey) return
      const action = keyAction(event.key)
      if (!action) return
      // Enter and Space on a focused button or link activate that control, not the book.
      if (action.kind === 'open' && isActivatable(event.target)) return
      event.preventDefault()
      if (action.kind === 'escape') {
        if (!event.repeat) onEscape?.()
        return
      }
      if (action.kind === 'open') {
        if (!event.repeat) controller.open()
        return
      }
      const now = performance.now()
      if (event.repeat && now - lastTurnAt < HOLD_REPEAT * 1000) return
      lastTurnAt = now
      controller.turn(action.direction)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [controller, enabled, onEscape])
}
