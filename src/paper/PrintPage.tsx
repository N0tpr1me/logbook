import { useRef, type ReactNode } from 'react'
import { backCover, cover, person, type Chapter } from '@/content/content'
import { pageNumbers, parsePrintPath } from '@/routing/routes'
import { ChapterMedia } from './ChapterMedia'
import { ChapterStory } from './ChapterStory'
import { ContentsIntro, ContentsList } from './ContentsPage'
import { formatDate } from './format'
import { useLinkAreas } from './useLinkAreas'
import './paper.css'
import '@/interactive/interactive.css'
import './print.css'

/** A4 portrait at 2048px tall: everything inside is drawn at twice the paper version's size. */
export const PRINT_WIDTH = 1448
export const PRINT_HEIGHT = 2048

export interface PrintPageProps {
  pathname: string
}

/**
 * Build-time page routes: /__page/<chapterId>/<left|right>, /__page/cover
 * and /__page/back each render one page of the book in a fixed box, with a
 * hidden JSON list of link areas for the build script.
 */
export function PrintPage({ pathname }: PrintPageProps) {
  const target = parsePrintPath(pathname)
  if (!target) {
    return (
      <PrintBox className="paper print-page print-missing">
        <p>No page at {pathname}</p>
      </PrintBox>
    )
  }
  if (target.kind === 'cover') {
    return (
      <PrintBox className="print-cover">
        <p className="print-cover-name">{cover.name}</p>
        <div className="print-cover-label">
          {cover.label.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </PrintBox>
    )
  }
  if (target.kind === 'back') {
    return (
      <PrintBox className="print-cover print-back">
        <p className="print-back-closing">{backCover.closing}</p>
        <p className="print-back-built">
          <span className="print-back-label">How this site was built. </span>
          {backCover.howBuilt} <a href={backCover.sourceUrl}>{backCover.sourceLabel}</a>
        </p>
      </PrintBox>
    )
  }

  const { chapter, side } = target
  const numbers = pageNumbers(chapter)
  return (
    <PrintBox className={`paper print-page print-${side}`}>
      <span className="print-number" aria-hidden="true">
        {side === 'left' ? numbers.left : numbers.right}
      </span>
      {side === 'left' ? <LeftPage chapter={chapter} /> : <RightPage chapter={chapter} />}
      <span className="print-foot">
        {formatDate(chapter.date)} · {person.initials}
      </span>
    </PrintBox>
  )
}

interface PrintBoxProps {
  className: string
  children: ReactNode
}

function PrintBox({ className, children }: PrintBoxProps) {
  const box = useRef<HTMLDivElement>(null)
  const areas = useLinkAreas(box)
  const json = areas ? JSON.stringify(areas).replace(/</g, '\\u003c') : null
  return (
    <div ref={box} className={`print-box ${className}`} data-print-ready={areas ? '1' : undefined} style={{ width: PRINT_WIDTH, height: PRINT_HEIGHT }}>
      {children}
      {json && <script id="link-areas" type="application/json" dangerouslySetInnerHTML={{ __html: json }} />}
    </div>
  )
}

interface PageProps {
  chapter: Chapter
}

/** Left page: the story (and for the contents, the photo, degree, average and "This logbook belongs to"). */
function LeftPage({ chapter }: PageProps) {
  if (chapter.id === 'contents') return <ContentsIntro chapter={chapter} headingId="print-title" />
  return <ChapterStory chapter={chapter} headingId="print-title" showLinks={false} />
}

/** Right page: the media (or for the contents, the chapter list) plus the chapter's links. */
function RightPage({ chapter }: PageProps) {
  if (chapter.id === 'contents') return <ContentsList heading />
  const links = chapter.links ?? []
  return (
    <>
      {chapter.id !== 'contact' && <p className="print-running-head">{chapter.title}</p>}
      <ChapterMedia chapter={chapter} variant="print" />
      {links.length > 0 && (
        <ul className="chapter-links">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
