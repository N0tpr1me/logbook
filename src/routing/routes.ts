// Pure routing helpers shared by the paper version, the 3D book and the build
// scripts. Nothing here touches the window, so it can be unit tested in node.

import { chapters, chapterByPath, chapterById, siteMeta, type Chapter, type ChapterId } from '@/content/content'

/** Build-time page routes render one page of the book at a time (plan: Page images). */
export const PRINT_PREFIX = '/__page/'

export type PrintSide = 'left' | 'right'

export type PrintTarget =
  | { kind: 'cover' }
  | { kind: 'back' }
  | { kind: 'page'; chapter: Chapter; side: PrintSide }

export function isPrintPath(pathname: string): boolean {
  return pathname.startsWith(PRINT_PREFIX)
}

/** `/__page/dronemedic/left` → the DroneMedic chapter's left page; null when the path is not a page route. */
export function parsePrintPath(pathname: string): PrintTarget | null {
  if (!isPrintPath(pathname)) return null
  const parts = pathname.slice(PRINT_PREFIX.length).split('/').filter(Boolean)
  if (parts.length === 1 && parts[0] === 'cover') return { kind: 'cover' }
  if (parts.length === 1 && parts[0] === 'back') return { kind: 'back' }
  if (parts.length !== 2) return null
  const [id, side] = parts
  if (side !== 'left' && side !== 'right') return null
  const chapter = chapterById(id as ChapterId)
  return chapter ? { kind: 'page', chapter, side } : null
}

/** The chapter a pathname opens; unknown addresses open the contents. */
export function chapterForPath(pathname: string): Chapter {
  return chapterByPath(pathname) ?? chapters[0]
}

/** Window title for a chapter: the site title on the contents, `Title · Zain Ali` elsewhere. */
export function documentTitle(chapter: Chapter): string {
  return chapter.id === 'contents' ? siteMeta.title : `${chapter.title} · Zain Ali`
}

/** One-line description for link previews. */
export function chapterDescription(chapter: Chapter): string {
  return chapter.id === 'contents' ? siteMeta.description : chapter.result
}

/** Page numbers in the printed book: spread k holds pages 2k-1 and 2k. */
export function pageNumbers(chapter: Chapter): { left: number; right: number } {
  const index = Math.max(0, chapters.findIndex((c) => c.id === chapter.id))
  return { left: index * 2 + 1, right: index * 2 + 2 }
}

/** Short labels for the chapter bar and ribbons, where the full title would not fit. */
export function barLabel(chapter: Chapter): string {
  if (chapter.id === 'contact') return 'Contact'
  if (chapter.id === 'chandrayaan') return 'Chandrayaan-3'
  return chapter.title
}

/** The addresses to prerender and test, in book order. */
export function chapterAddresses(): { id: ChapterId; path: string; title: string }[] {
  return chapters.map((c) => ({ id: c.id, path: c.path, title: c.title }))
}
