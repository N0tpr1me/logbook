import type { Chapter } from '@/content/content'
import { DroneMedicReplay } from '@/interactive/DroneMedicReplay'
import { ImcReplay } from '@/interactive/ImcReplay'
import { InteractiveBoundary } from '@/interactive/InteractiveBoundary'
import { ChapterMedia } from './ChapterMedia'
import { ChapterStory } from './ChapterStory'
import { ContactBlock } from './ContactBlock'
import { ContentsIntro, ContentsList } from './ContentsPage'
import { ClipMedia } from './media/ClipMedia'
import { ImcProfitChart } from './media/ImcProfitChart'
import './paper.css'
import '@/interactive/interactive.css'

export type ChapterPageMode = 'paper' | 'sheet'

export interface ChapterPageProps {
  chapter: Chapter
  /** 'paper' in the paper version, 'sheet' inside the 3D book's reading sheet. The content is the same. */
  mode: ChapterPageMode
}

/**
 * One chapter as a real web page: result first, story second, media third,
 * then the interactive part. Used by the paper version and the reading sheet.
 */
export function ChapterPage({ chapter, mode }: ChapterPageProps) {
  const headingId = `${chapter.id}-title`
  const replayId = `${chapter.id}-replay`
  const className = `chapter chapter-${chapter.id} chapter-mode-${mode}`

  if (chapter.media.kind === 'contact') {
    return (
      <article className={className} aria-labelledby={headingId}>
        <ContactBlock headingId={headingId} />
      </article>
    )
  }

  if (chapter.id === 'contents') {
    return (
      <article className={className} aria-labelledby={headingId}>
        <ContentsIntro chapter={chapter} headingId={headingId} />
        <ContentsList />
      </article>
    )
  }

  return (
    <article className={className} aria-labelledby={headingId}>
      <ChapterStory chapter={chapter} headingId={headingId} replayHref={`#${replayId}`} />
      <ChapterMedia chapter={chapter} variant="live" />
      <ReplaySection chapter={chapter} id={replayId} />
    </article>
  )
}

interface ReplaySectionProps {
  chapter: Chapter
  id: string
}

/** The replays sit under the media; the pipeline, timeline and contact block are the media. */
function ReplaySection({ chapter, id }: ReplaySectionProps) {
  const media = chapter.media
  if (chapter.interactive === 'dronemedicReplay') {
    const still = media.kind === 'clip' ? <ClipMedia src={media.src} poster={media.poster} caption={media.caption} variant="print" /> : null
    return (
      <section id={id} className="chapter-replay" aria-label="Mission replay">
        <p className="chapter-replay-title">Try the replay</p>
        <InteractiveBoundary label="The mission replay" still={still}>
          <DroneMedicReplay />
        </InteractiveBoundary>
      </section>
    )
  }
  if (chapter.interactive === 'imcReplay') {
    return (
      <section id={id} className="chapter-replay" aria-label="Backtest replay">
        <p className="chapter-replay-title">Try the replay</p>
        <InteractiveBoundary label="The backtest replay" still={<ImcProfitChart variant="print" />}>
          <ImcReplay label={media.kind === 'chart' ? media.caption : 'Backtest'} />
        </InteractiveBoundary>
      </section>
    )
  }
  return null
}
