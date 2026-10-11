// Chapter addresses with the history API (plan: Launch). Jumping to a chapter
// adds a history entry; page turns and scrolling only update the address, so
// Back returns to the previous jump. No router library.

import { chapterById, contact, type Chapter, type ChapterId } from '@/content/content'
import { chapterDescription, chapterForPath, documentTitle } from './routes'

export type RouteSource = 'load' | 'push' | 'replace' | 'popstate'

export interface RouteState {
  chapterId: ChapterId
  source: RouteSource
}

export interface NavigateOptions {
  /** Add a history entry (a jump) rather than replacing the address (a page turn or scroll). */
  push?: boolean
}

type Listener = () => void

let current: RouteState | null = null
const listeners = new Set<Listener>()
let listening = false

function readLocation(source: RouteSource): RouteState {
  return { chapterId: chapterForPath(window.location.pathname).id, source }
}

function emit(): void {
  listeners.forEach((l) => l())
}

function onPopState(): void {
  current = readLocation('popstate')
  applyDocumentMeta(chapterForPath(window.location.pathname))
  emit()
}

/** The current route, read lazily so the module can load outside a browser. */
export function getRoute(): RouteState {
  if (!current) current = readLocation('load')
  return current
}

export function subscribeRoute(listener: Listener): () => void {
  listeners.add(listener)
  if (!listening) {
    window.addEventListener('popstate', onPopState)
    listening = true
  }
  return () => {
    listeners.delete(listener)
  }
}

function setMeta(selector: string, attribute: 'content' | 'href', value: string): void {
  const el = document.head.querySelector(selector)
  if (el) el.setAttribute(attribute, value)
}

/** Title, description and link-preview tags for a chapter, so prerendered pages carry their own head. */
export function applyDocumentMeta(chapter: Chapter): void {
  const title = documentTitle(chapter)
  const description = chapterDescription(chapter)
  document.title = title
  setMeta('meta[name="description"]', 'content', description)
  setMeta('meta[property="og:title"]', 'content', title)
  setMeta('meta[property="og:description"]', 'content', description)
  if (contact.siteUrl) {
    const href = `${contact.siteUrl.replace(/\/+$/, '')}${chapter.path === '/' ? '' : chapter.path}`
    const existing = document.head.querySelector('link[rel="canonical"]')
    if (existing) existing.setAttribute('href', href)
    else {
      const link = document.createElement('link')
      link.rel = 'canonical'
      link.href = href
      document.head.appendChild(link)
    }
  }
}

/**
 * Move the address to a chapter. `push` adds a history entry (a jump from the
 * chapter bar, a ribbon or a desk object); without it the address is replaced
 * (scrolling, page turns, the reading sheet's Next and Previous).
 */
export function navigateToChapter(id: ChapterId, { push = true }: NavigateOptions = {}): void {
  const chapter = chapterById(id)
  if (!chapter) return
  const url = `${chapter.path}${window.location.search}`
  const state = { chapterId: id }
  if (window.location.pathname !== chapter.path) {
    if (push) window.history.pushState(state, '', url)
    else window.history.replaceState(state, '', url)
  }
  applyDocumentMeta(chapter)
  current = { chapterId: id, source: push ? 'push' : 'replace' }
  emit()
}
