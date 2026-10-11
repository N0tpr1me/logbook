import { useEffect, useRef } from 'react'
import { chapters, type ChapterId } from '@/content/content'
import { barLabel } from '@/routing/routes'
import { useReducedMotion } from './hooks'

export interface ChapterBarProps {
  currentId: ChapterId
  onSelect: (id: ChapterId) => void
  /** A quiet status line, such as 'Loading the 3D book'. */
  status?: string
}

/** The sticky chapter bar: it replaces the ribbons in the paper version. */
export function ChapterBar({ currentId, onSelect, status }: ChapterBarProps) {
  const nav = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const el = nav.current
    const active = el?.querySelector<HTMLElement>('a[aria-current="page"]')
    if (!el || !active) return
    const left = active.offsetLeft - 16
    if (Math.abs(el.scrollLeft - left) < 2) return
    el.scrollTo({ left, behavior: reduced ? 'auto' : 'smooth' })
  }, [currentId, reduced])

  return (
    <header className="chapter-bar">
      <nav ref={nav} className="chapter-nav" aria-label="Chapters">
        <ul className="chapter-nav-list">
          {chapters.map((chapter) => (
            <li key={chapter.id}>
              <a
                href={chapter.path}
                data-chapter-link
                data-chapter={chapter.id}
                aria-current={chapter.id === currentId ? 'page' : undefined}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
                  event.preventDefault()
                  onSelect(chapter.id)
                }}
              >
                {barLabel(chapter)}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {status && (
        <p className="chapter-bar-status" role="status">
          {status}
        </p>
      )}
    </header>
  )
}
