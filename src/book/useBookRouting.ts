// Keeps the chapter address and the book in step (plan: Launch, Chapter
// addresses). A jump adds a history entry; page turns only replace the
// address, so Back returns to the previous jump. On load, a chapter address
// opens the book straight at that chapter once the desk has appeared.

import { useEffect, useRef } from 'react'
import { chapterForSpread, spreadForChapter } from '@/book/spreads'
import type { BookStore } from '@/book/state'
import type { BookController } from '@/book/engine/motion'
import { chapterById, type ChapterId } from '@/content/content'
import { applyDocumentMeta, getRoute, navigateToChapter, subscribeRoute } from '@/routing'

export interface BookRouting {
  /** Jump to a chapter from a ribbon, a desk object or the contents list: adds a history entry. */
  goTo: (id: ChapterId) => void
}

export function useBookRouting(store: BookStore, controller: BookController, revealed: boolean): BookRouting {
  const lastSettled = useRef<number | null>(null)
  const goTo = useRef((id: ChapterId) => {
    const spread = spreadForChapter(id)
    navigateToChapter(id, { push: true })
    if (store.get().mode === 'desk') controller.open(spread)
    else controller.jumpTo(spread)
  }).current

  // A chapter address on load opens the book there after the reveal.
  useEffect(() => {
    if (!revealed) return
    const { chapterId } = getRoute()
    if (chapterId !== 'contents') controller.open(spreadForChapter(chapterId))
  }, [revealed, controller])

  // Settled spreads replace the address and the document title.
  useEffect(
    () =>
      store.subscribe(() => {
        const s = store.get()
        if (s.animating || s.dragging || s.mode === 'desk') return
        const spread = Math.round(s.position)
        if (Math.abs(s.position - spread) > 1e-3 || spread === lastSettled.current) return
        lastSettled.current = spread
        const chapter = chapterForSpread(spread)
        if (!chapter) return
        if (getRoute().chapterId !== chapter.id) navigateToChapter(chapter.id, { push: false })
        applyDocumentMeta(chapter)
      }),
    [store],
  )

  // Back and Forward turn the book to the chapter they return to.
  useEffect(
    () =>
      subscribeRoute(() => {
        const route = getRoute()
        if (route.source !== 'popstate') return
        const chapter = chapterById(route.chapterId)
        if (!chapter) return
        const spread = spreadForChapter(chapter.id)
        if (store.get().mode === 'desk') controller.open(spread)
        else if (Math.round(store.get().position) !== spread) controller.jumpTo(spread)
      }),
    [store, controller],
  )

  return { goTo }
}
