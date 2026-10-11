// Maps chapters to spreads and spreads to the sheets of the 3D book.
//
// A book with N spreads has N + 1 sheets: sheet 0 is the cover (front: cover
// exterior, back: spread 1's left page), sheet k (1..N-1) carries spread k's
// right page on its front and spread k+1's left page on its back, and sheet N
// carries spread N's right page on its front and the back cover on its back.

import { chapters, type Chapter, type ChapterId } from '@/content/content'

export interface SheetImages {
  front: string
  back: string
}

export const PAGE_IMAGE_DIR = '/assets/pages'

export const pageImage = (name: string) => `${PAGE_IMAGE_DIR}/${name}.webp`

/** Spread k (1-based) shows chapters[k - 1]. */
export const spreadCount = chapters.length

export function spreadForChapter(id: ChapterId): number {
  const i = chapters.findIndex((c) => c.id === id)
  return i < 0 ? 1 : i + 1
}

export function chapterForSpread(spread: number): Chapter | undefined {
  return chapters[Math.min(Math.max(Math.round(spread), 1), spreadCount) - 1]
}

export function sheetImages(): SheetImages[] {
  const sheets: SheetImages[] = []
  sheets.push({ front: pageImage('cover'), back: pageImage(`${chapters[0].id}-left`) })
  for (let k = 1; k < spreadCount; k++) {
    sheets.push({ front: pageImage(`${chapters[k - 1].id}-right`), back: pageImage(`${chapters[k].id}-left`) })
  }
  sheets.push({ front: pageImage(`${chapters[spreadCount - 1].id}-right`), back: pageImage('back') })
  return sheets
}

/** Every page image the build produces, for the preload manifest. */
export function allPageImages(): string[] {
  return Array.from(new Set(sheetImages().flatMap((s) => [s.front, s.back])))
}

/** The build-time print routes, one per page image. */
export function printRoutes(): { name: string; route: string }[] {
  const routes = [
    { name: 'cover', route: '/__page/cover' },
    { name: 'back', route: '/__page/back' },
  ]
  for (const c of chapters) {
    routes.push({ name: `${c.id}-left`, route: `/__page/${c.id}/left` })
    routes.push({ name: `${c.id}-right`, route: `/__page/${c.id}/right` })
  }
  return routes
}
