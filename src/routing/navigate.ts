// Chapter addresses with the history API (plan: Launch). Jumping to a chapter
// adds a history entry; page turns and scrolling only update the address, so
// Back returns to the previous jump. No router library.

import { chapterById, contact, person, type Chapter, type ChapterId } from '@/content/content'
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

const isServer = typeof window === 'undefined'
/** The chapter being rendered at build time, where there is no address bar. */
let serverChapterId: ChapterId = 'contents'

/** Build-time rendering: the chapter the next render is for. */
export function setServerRoute(id: ChapterId): void {
  serverChapterId = id
  current = null
}

function readLocation(source: RouteSource): RouteState {
  if (isServer) return { chapterId: serverChapterId, source }
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
  if (!listening && !isServer) {
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
    const site = contact.siteUrl.replace(/\/+$/, '')
    const href = `${site}${chapter.path === '/' ? '' : chapter.path}`
    const existing = document.head.querySelector('link[rel="canonical"]')
    if (existing) existing.setAttribute('href', href)
    else {
      const link = document.createElement('link')
      link.rel = 'canonical'
      link.href = href
      document.head.appendChild(link)
    }
    // Link previews need an absolute image address.
    const image = document.head.querySelector('meta[property="og:image"]')
    const imagePath = image?.getAttribute('content') ?? ''
    if (image && imagePath.startsWith('/')) image.setAttribute('content', `${site}${imagePath}`)
    setMeta('meta[property="og:url"]', 'content', href)
  }
  applyStructuredData()
}

/**
 * Structured data naming Zain, with the LinkedIn and GitHub links (plan:
 * Launch, Search). Written once; the prerendered pages carry it in their HTML.
 */
export function structuredData(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    description: person.strapline,
    url: contact.siteUrl || undefined,
    // No email here: the contact page carries it as text, and scrapers read this block first.
    sameAs: [contact.linkedin, contact.github].filter(Boolean),
    alumniOf: { '@type': 'CollegeOrUniversity', name: 'University of West London' },
    knowsAbout: ['Software engineering', 'Artificial intelligence', 'Financial markets'],
  }
}

function applyStructuredData(): void {
  if (document.getElementById('structured-data')) return
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.id = 'structured-data'
  script.textContent = JSON.stringify(structuredData())
  document.head.appendChild(script)
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
