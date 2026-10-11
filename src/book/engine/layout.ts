// Book dimensions in world units (1 unit = 1 metre). A page is an A4 sheet in
// portrait, so one page is 0.21 x 0.297 (plan: Visual design, book format).
//
// Book-local frame: the spine runs along the y axis at x = 0, the right page
// spans x in [0, W], the left page x in [-W, 0], and z is the page normal
// (towards the viewer and the lamp). The desk helper lays the group flat.

import { useMemo } from 'react'

export const PAGE_WIDTH = 0.21
export const PAGE_HEIGHT = 0.297
/** Pages sit 0.3 mm apart so they never flicker into each other. */
export const SHEET_GAP = 0.0003
/** The cover is slightly larger than the pages on three sides. */
export const COVER_MARGIN = 0.004
export const COVER_THICKNESS = 0.0025
export const DEFAULT_SPREADS = 8
/** The 30 x 40 grid each page is split into (plan: What makes the paper feel real). */
export const PAGE_SEGMENTS = { x: 30, y: 40 } as const

export interface RibbonTail {
  x: number
  y: number
  z: number
}

export interface BookLayout {
  pageWidth: number
  pageHeight: number
  sheetGap: number
  coverMargin: number
  coverThickness: number
  spreads: number
  /** x of the spine in the book frame (always 0). */
  spineX: number
  /** Distance between the two covers' centre planes when the book is closed. */
  spineWidth: number
  /** Total height of the closed book, from the desk to the top of the front cover. */
  closedThickness: number
  /** Footprint of the closed book on the desk: width (x) and depth (y). */
  closedFootprint: { width: number; height: number }
  /** Footprint of the open book: both covers plus the spine. */
  openFootprint: { width: number; height: number }
  /** Where each ribbon pokes out past the top edge (book frame), for labels. */
  ribbonTails: readonly RibbonTail[]
}

/** Fractions of the page width where the three ribbons cross the top edge. */
export const RIBBON_FRACTIONS = [0.18, 0.34, 0.5] as const
/** How far a ribbon reaches past the top edge of the page. */
export const RIBBON_TAIL = 0.028

export function computeLayout(spreads: number = DEFAULT_SPREADS): BookLayout {
  const n = Math.max(1, Math.floor(spreads))
  const spineWidth = (n + 1) * SHEET_GAP + COVER_THICKNESS
  const closedThickness = spineWidth + COVER_THICKNESS
  const coverWidth = PAGE_WIDTH + COVER_MARGIN
  const coverHeight = PAGE_HEIGHT + 2 * COVER_MARGIN
  const zTop = (n + 1) * SHEET_GAP
  const ribbonTails = RIBBON_FRACTIONS.map((f) => ({
    x: f * PAGE_WIDTH,
    y: PAGE_HEIGHT / 2 + RIBBON_TAIL,
    z: zTop,
  }))
  return {
    pageWidth: PAGE_WIDTH,
    pageHeight: PAGE_HEIGHT,
    sheetGap: SHEET_GAP,
    coverMargin: COVER_MARGIN,
    coverThickness: COVER_THICKNESS,
    spreads: n,
    spineX: 0,
    spineWidth,
    closedThickness,
    closedFootprint: { width: coverWidth, height: coverHeight },
    openFootprint: { width: 2 * coverWidth + spineWidth, height: coverHeight },
    ribbonTails,
  }
}

/** Height of sheet `index` (1..N) above the desk when it lies flat on one side. */
export function sheetRestHeight(layout: BookLayout, index: number, side: 'right' | 'left'): number {
  return side === 'right' ? (layout.spreads - index + 1) * layout.sheetGap : index * layout.sheetGap
}

/** Page width, height and spine position, so the desk helper can place the book. */
export function useBookLayout(spreads: number = DEFAULT_SPREADS): BookLayout {
  return useMemo(() => computeLayout(spreads), [spreads])
}
