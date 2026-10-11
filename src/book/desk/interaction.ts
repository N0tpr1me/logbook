// Which desk object is hovered, focused or animating (plan: Rules for every
// object). One object animates at a time: activating another smoothly cancels
// the current one. Each animation plays in full once per visit, then a short
// version on repeats (the mug excepted).
//
// Framework-free, like the book store, so the render loop and the HTML button
// list share one source of truth.

import { useSyncExternalStore } from 'react'
import type { DeskObjectId } from './layout'

export interface DeskInteractionState {
  hovered: DeskObjectId | null
  focused: DeskObjectId | null
  /** The object whose click animation is running. */
  active: DeskObjectId | null
  /** Objects whose full animation has played this visit. */
  played: readonly DeskObjectId[]
  /** The mug's "Now" note is showing. */
  noteOpen: boolean
  /** The CV is unfolded with its two buttons showing. */
  cvOpen: boolean
}

export interface DeskObjectHandlers {
  /** Runs the click animation. Called by pointer clicks and by Enter/Space on the keyboard button. */
  click: () => void
  /** Smoothly returns the object to rest because another object was clicked, or Esc was pressed. */
  cancel: () => void
}

type Listener = () => void

export function createDeskInteraction() {
  let state: DeskInteractionState = {
    hovered: null,
    focused: null,
    active: null,
    played: [],
    noteOpen: false,
    cvOpen: false,
  }
  const listeners = new Set<Listener>()
  const handlers = new Map<DeskObjectId, DeskObjectHandlers>()

  const get = () => state
  const set = (patch: Partial<DeskInteractionState> | ((s: DeskInteractionState) => Partial<DeskInteractionState>)) => {
    const next = typeof patch === 'function' ? patch(state) : patch
    state = { ...state, ...next }
    listeners.forEach((l) => l())
  }
  const subscribe = (l: Listener) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }

  /** Objects register their handlers on mount and unregister on unmount. */
  const register = (id: DeskObjectId, h: DeskObjectHandlers) => {
    handlers.set(id, h)
    return () => {
      if (handlers.get(id) === h) handlers.delete(id)
    }
  }

  /** Claim the animation slot: cancels whichever object is animating now. */
  const activate = (id: DeskObjectId) => {
    const current = state.active
    if (current && current !== id) handlers.get(current)?.cancel()
    set({ active: id })
  }

  /** Give the slot back once an animation has finished. */
  const release = (id: DeskObjectId) => {
    if (state.active === id) set({ active: null })
  }

  /** Mark an object's full animation as played; returns whether this was its first time. */
  const markPlayed = (id: DeskObjectId): boolean => {
    if (state.played.includes(id)) return false
    set((s) => ({ played: [...s.played, id] }))
    return true
  }

  const click = (id: DeskObjectId) => handlers.get(id)?.click()
  const cancelActive = () => {
    const current = state.active
    if (current) handlers.get(current)?.cancel()
  }

  return { get, set, subscribe, register, activate, release, markPlayed, click, cancelActive }
}

export type DeskInteraction = ReturnType<typeof createDeskInteraction>

export function useDeskState<T>(interaction: DeskInteraction, selector: (s: DeskInteractionState) => T): T {
  return useSyncExternalStore(
    interaction.subscribe,
    () => selector(interaction.get()),
    () => selector(interaction.get()),
  )
}
