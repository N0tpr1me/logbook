import type { ReactNode } from 'react'
import type { Chapter } from '@/content/content'
import { AboutFilter } from '@/interactive/AboutFilter'
import { AmsPipeline } from '@/interactive/AmsPipeline'
import { InteractiveBoundary } from '@/interactive/InteractiveBoundary'
import { ContactBlock } from './ContactBlock'
import { ClipMedia } from './media/ClipMedia'
import { ImcProfitChart } from './media/ImcProfitChart'
import { PhotoMedia } from './media/PhotoMedia'
import { TimelineList } from './media/TimelineList'

export type MediaVariant = 'live' | 'print'

export interface ChapterMediaProps {
  chapter: Chapter
  variant: MediaVariant
}

/** The right page: the chapter's clip, chart, diagram, timeline, photo or contact block, with its caption. */
export function ChapterMedia({ chapter, variant }: ChapterMediaProps) {
  const media = chapter.media
  if (media.kind === 'contact') return <ContactBlock headingId={`${chapter.id}-contact-title`} variant={variant} />
  return (
    <figure className={`chapter-media media-${media.kind}`}>
      <MediaBody chapter={chapter} variant={variant} />
      <figcaption className="chapter-caption">{media.caption}</figcaption>
    </figure>
  )
}

function MediaBody({ chapter, variant }: ChapterMediaProps): ReactNode {
  const media = chapter.media
  const live = variant === 'live'
  switch (media.kind) {
    case 'clip':
      return <ClipMedia src={media.src} poster={media.poster} caption={media.caption} fullVideo={media.fullVideo} variant={variant} />
    case 'chart':
      if (media.id === 'imcProfit') return <ImcProfitChart variant={variant} />
      return (
        <div className="media-frame media-placeholder" role="img" aria-label={media.caption}>
          <span>Drawing to come</span>
        </div>
      )
    case 'diagram':
      return live ? (
        <InteractiveBoundary label="The hiring pipeline" still={<AmsPipeline variant="print" />}>
          <AmsPipeline />
        </InteractiveBoundary>
      ) : (
        <AmsPipeline variant="print" />
      )
    case 'timeline':
      return live ? (
        <InteractiveBoundary label="The timeline and skills" still={<TimelineList />}>
          <AboutFilter />
        </InteractiveBoundary>
      ) : (
        <TimelineList />
      )
    case 'photo':
      return <PhotoMedia src={media.src} alt={media.alt} />
    default:
      return null
  }
}
