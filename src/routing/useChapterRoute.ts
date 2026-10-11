import { useSyncExternalStore } from 'react'
import { chapterById, chapters, type Chapter, type ChapterId } from '@/content/content'
import { getRoute, subscribeRoute, type RouteSource } from './navigate'

export interface ChapterRoute {
  chapter: Chapter
  chapterId: ChapterId
  /** How the address last changed: on load, a jump (push), a replace, or Back and Forward (popstate). */
  source: RouteSource
}

/** The chapter the address currently points at. Shared by the paper version and the 3D book. */
export function useChapterRoute(): ChapterRoute {
  const route = useSyncExternalStore(subscribeRoute, getRoute, getRoute)
  const chapter = chapterById(route.chapterId) ?? chapters[0]
  return { chapter, chapterId: chapter.id, source: route.source }
}
