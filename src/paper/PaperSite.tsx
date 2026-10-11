import { useCallback, useEffect, useRef, type MouseEvent } from 'react'
import { ArrowClockwise, Cube } from '@phosphor-icons/react'
import type { VersionDecision } from '@/app/version'
import { chapters, type ChapterId } from '@/content/content'
import { applyDocumentMeta, getRoute, navigateToChapter } from '@/routing/navigate'
import { isPrintPath } from '@/routing/routes'
import { useChapterRoute } from '@/routing/useChapterRoute'
import { ChapterBar } from './ChapterBar'
import { ChapterPage } from './ChapterPage'
import { useReducedMotion } from './hooks'
import { PrintPage } from './PrintPage'
import { SiteFooter } from './SiteFooter'

export interface PaperSiteProps {
  decision: VersionDecision
  /** Reduced-motion visitors can open the 3D book anyway (plan: Who sees which version). */
  onOpenBookAnyway?: () => void
  /** True while the 3D code loads; the same site shows meanwhile. */
  loadingBook?: boolean
}

/**
 * The paper version (plan: The paper version): the whole site for phones,
 * tablets, small windows and the automatic fallback. Build-time page routes
 * under /__page/ render one page of the book instead.
 */
export function PaperSite(props: PaperSiteProps) {
  if (isPrintPath(window.location.pathname)) return <PrintPage pathname={window.location.pathname} />
  return <PaperBody {...props} />
}

const SMOOTH_SCROLL_MS = 1500
const INSTANT_SCROLL_MS = 400

function PaperBody({ decision, onOpenBookAnyway, loadingBook = false }: PaperSiteProps) {
  const route = useChapterRoute()
  const reduced = useReducedMotion()
  const main = useRef<HTMLElement>(null)
  /** While a programmatic scroll is in flight, the observer must not rewrite the address. */
  const suppressUntil = useRef(0)

  const scrollToChapter = useCallback((id: ChapterId, smooth: boolean) => {
    const el = document.getElementById(id)
    if (!el) return
    suppressUntil.current = performance.now() + (smooth ? SMOOTH_SCROLL_MS : INSTANT_SCROLL_MS)
    el.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  const go = useCallback(
    (id: ChapterId) => {
      navigateToChapter(id, { push: true })
      scrollToChapter(id, !reduced)
    },
    [reduced, scrollToChapter],
  )

  // On load the address decides which chapter is in view. The site scrolls to
  // chapters itself on Back and Forward, so the browser's own restoration is off.
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
    const { chapterId } = getRoute()
    const chapter = chapters.find((c) => c.id === chapterId) ?? chapters[0]
    applyDocumentMeta(chapter)
    if (chapter.id !== 'contents') scrollToChapter(chapter.id, false)
  }, [scrollToChapter])

  // Back and Forward scroll to the chapter they return to.
  useEffect(() => {
    if (route.source === 'popstate') scrollToChapter(route.chapterId, !reduced)
  }, [route, reduced, scrollToChapter])

  // Scrolling updates the address without adding history entries.
  useEffect(() => {
    if (loadingBook || typeof IntersectionObserver === 'undefined') return
    const sections = Array.from(main.current?.querySelectorAll<HTMLElement>('[data-chapter-section]') ?? [])
    const observer = new IntersectionObserver(
      (entries) => {
        if (performance.now() < suppressUntil.current) return
        const hit = entries.find((e) => e.isIntersecting)
        const id = hit?.target.getAttribute('data-chapter-section') as ChapterId | null | undefined
        if (id && id !== getRoute().chapterId) navigateToChapter(id, { push: false })
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: 0 },
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [loadingBook])

  // Chapter links inside the pages (the contents list, the skill filter) jump like the bar.
  const onMainClick = (event: MouseEvent<HTMLElement>) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-chapter]')
    const id = link?.getAttribute('data-chapter') as ChapterId | null | undefined
    if (!id || !chapters.some((c) => c.id === id)) return
    event.preventDefault()
    go(id)
  }

  return (
    <div className="paper-site" data-paper-site>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <VersionBanner decision={decision} onOpenBookAnyway={onOpenBookAnyway} />
      <ChapterBar currentId={route.chapterId} onSelect={go} status={loadingBook ? 'Loading the 3D book' : undefined} />
      <main id="main" ref={main} className="paper-main" onClick={onMainClick}>
        {chapters.map((chapter) => (
          <section key={chapter.id} id={chapter.id} data-chapter-section={chapter.id} className="paper chapter-sheet">
            <ChapterPage chapter={chapter} mode="paper" />
          </section>
        ))}
      </main>
      <SiteFooter />
    </div>
  )
}

interface VersionBannerProps {
  decision: VersionDecision
  onOpenBookAnyway?: () => void
}

function VersionBanner({ decision, onOpenBookAnyway }: VersionBannerProps) {
  if (decision.reason === 'reduced-motion') {
    return (
      <div className="site-banner" role="region" aria-label="Version">
        <p>Reduced motion is on, so this is the simple version.</p>
        {onOpenBookAnyway && (
          <button type="button" className="btn btn-desk" onClick={onOpenBookAnyway}>
            <Cube size={20} aria-hidden="true" />
            Open the 3D book anyway
          </button>
        )}
      </div>
    )
  }
  if (decision.reason === 'fallback') {
    return (
      <div className="site-banner" role="region" aria-label="Version">
        <p>Switched to the simple version.</p>
        <a className="btn btn-desk" href="/?3d=1">
          <ArrowClockwise size={20} aria-hidden="true" />
          Try the 3D book again
        </a>
      </div>
    )
  }
  return null
}
