// The reading sheet: a paper-coloured sheet that slides up over the dimmed desk
// and holds the open chapter as a real web page (plan: Interactive pages and
// the reading sheet). Focus moves into the sheet when it opens and back to the
// Read button when it closes; everything behind it is inert.

import { useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight, X } from '@phosphor-icons/react'
import { chapters, type Chapter } from '@/content/content'
import { ChapterPage } from '@/paper/ChapterPage'
import './reading-sheet.css'

export interface ReadingSheetProps {
  chapter: Chapter
  open: boolean
  /** Scroll to the replay section once open (from "Try the replay"). */
  anchor?: string
  onClose: () => void
  onNavigate: (chapter: Chapter) => void
  /** Element to return focus to when the sheet closes. */
  returnFocusTo?: HTMLElement | null
}

export function ReadingSheet({ chapter, open, anchor, onClose, onNavigate, returnFocusTo }: ReadingSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const index = chapters.findIndex((c) => c.id === chapter.id)
  const previous = chapters[index - 1]
  const next = chapters[index + 1]

  useEffect(() => {
    if (!open) return
    const sheet = sheetRef.current
    closeRef.current?.focus()
    if (anchor) {
      const el = sheet?.querySelector(anchor)
      if (el instanceof HTMLElement) el.scrollIntoView({ block: 'start' })
    } else {
      sheet?.scrollTo({ top: 0 })
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Esc steps back one level: the sheet closes, the book stays open.
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
      if (e.key === 'Tab') trapFocus(e, sheet)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      returnFocusTo?.focus()
    }
  }, [open, anchor, chapter.id, onClose, returnFocusTo])

  return (
    <div className={`sheet-root${open ? ' is-open' : ''}`} aria-hidden={!open}>
      <button type="button" className="sheet-scrim" aria-label="Close the reading sheet" onClick={onClose} tabIndex={-1} />
      <div
        ref={sheetRef}
        className="sheet paper"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        data-testid="reading-sheet"
      >
        <header className="sheet-bar">
          <h2 id="sheet-title" className="sheet-title">{chapter.title}</h2>
          <div className="sheet-actions">
            <button type="button" className="sheet-btn" disabled={!previous} onClick={() => previous && onNavigate(previous)}>
              <ArrowLeft size={20} aria-hidden /> <span>Previous</span>
            </button>
            <button type="button" className="sheet-btn" disabled={!next} onClick={() => next && onNavigate(next)}>
              <ArrowRight size={20} aria-hidden /> <span>Next</span>
            </button>
            <button ref={closeRef} type="button" className="sheet-btn" onClick={onClose} data-testid="sheet-close">
              <X size={20} aria-hidden /> <span>Close</span>
            </button>
          </div>
        </header>
        <div className="sheet-body">{open && <ChapterPage chapter={chapter} mode="sheet" />}</div>
      </div>
    </div>
  )
}

function trapFocus(e: KeyboardEvent, root: HTMLElement | null) {
  if (!root) return
  const focusable = root.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
  )
  if (focusable.length === 0) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}
