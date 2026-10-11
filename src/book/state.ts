// One number drives everything (plan: Navigating the book). The book's
// position runs from closed on the desk to closed on the back cover, and
// scrolling, dragging, clicking and keys all move this same number.
//
//   position 0            closed, front cover up, on the desk
//   position k (1..N)     spread k open and flat (1 = inside cover and contents)
//   position N + 1        closed on the back cover
//   fractional values     a page mid-turn (k + 0.5 is a page standing upright)
//
// The store is framework-free so the render loop can read it without React.

import { useSyncExternalStore } from 'react'

export type BookMode = 'desk' | 'open' | 'sheet'

export interface BookState {
  /** Continuous position, see above. */
  position: number
  /** Where the position is heading when animating; equals position at rest. */
  target: number
  /** Number of spreads (from the content file). */
  spreads: number
  /** 'desk' while closed on the desk, 'open' once the book is open, 'sheet' while the reading sheet is up. */
  mode: BookMode
  /** True while a page is held by the pointer. */
  dragging: boolean
  /** True while an automatic turn or jump is in flight. */
  animating: boolean
  /** Reading light on (lamp switched to the brighter, cooler setting). */
  readingLight: boolean
  /** Sound on. Off on every visit. */
  sound: boolean
  /** Reduced-motion visitors who chose the 3D book anyway get cuts and fades. */
  reducedMotion: boolean
  /** Test mode: animations off, camera fixed, fallback disabled. */
  testMode: boolean
}

type Listener = () => void

export function createBookStore(initial: Partial<BookState> = {}) {
  let state: BookState = {
    position: 0,
    target: 0,
    spreads: 1,
    mode: 'desk',
    dragging: false,
    animating: false,
    readingLight: false,
    sound: false,
    reducedMotion: false,
    testMode: false,
    ...initial,
  }
  const listeners = new Set<Listener>()

  const get = () => state
  const set = (patch: Partial<BookState> | ((s: BookState) => Partial<BookState>)) => {
    const next = typeof patch === 'function' ? patch(state) : patch
    state = { ...state, ...next }
    listeners.forEach((l) => l())
  }
  const subscribe = (l: Listener): (() => void) => {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }

  /** Clamp a position to the valid range. */
  const clamp = (p: number) => Math.min(Math.max(p, 0), state.spreads + 1)
  /** The spread a position belongs to (nearest whole position). */
  const spreadAt = (p: number) => Math.round(clamp(p))

  return { get, set, subscribe, clamp, spreadAt }
}

export type BookStore = ReturnType<typeof createBookStore>

export function useBookState<T>(store: BookStore, selector: (s: BookState) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()), () => selector(store.get()))
}

/**
 * Commands the UI, desk objects and inputs send to the book. The engine owns
 * the implementation; everything else only calls these.
 */
export interface BookCommands {
  /** Open the book from the desk (1.4s), landing on the contents spread or a given spread. */
  open(spread?: number): void
  /** Turn one page forward or back (0.65s spring). A turn asked for during a turn queues one more at most. */
  turn(direction: 1 | -1): void
  /** Jump to a spread (up to 1s); from the closed book this overlaps the opening. */
  jumpTo(spread: number): void
  /** Close the book and return to the desk (0.9s). */
  close(): void
}
