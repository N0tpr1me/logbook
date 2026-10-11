import { chapters, contact, person, type Chapter } from '@/content/content'
import { PhotoMedia } from './media/PhotoMedia'

export interface ContentsIntroProps {
  chapter: Chapter
  headingId: string
}

/** The inside cover: photo, intro, degree, average and "This logbook belongs to Zain Ali". */
export function ContentsIntro({ chapter, headingId }: ContentsIntroProps) {
  const photo = chapter.media.kind === 'photo' ? chapter.media : null
  return (
    <div className="contents-intro">
      {photo && (
        <div className="contents-photo">
          <PhotoMedia src={photo.src} alt={photo.alt} />
        </div>
      )}
      <div className="contents-text">
        <h2 id={headingId} className="chapter-title">
          {person.name}
        </h2>
        <p className="chapter-result">{person.strapline}</p>
        <div className="chapter-story">
          {chapter.story.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>
        <dl className="contents-facts">
          <div>
            <dt>Degree</dt>
            <dd>{person.degree}</dd>
          </div>
          <div>
            <dt>Average</dt>
            <dd>{person.average.replace(/^Current average\s*/, '')}</dd>
          </div>
        </dl>
        <p className="contents-belongs">
          <span className="hand contents-belongs-line">This logbook belongs to {person.name}</span>
          {contact.email && (
            <a className="contents-email" href={`mailto:${contact.email}`}>
              {contact.email}
            </a>
          )}
        </p>
      </div>
    </div>
  )
}

export interface ContentsListProps {
  /** With a heading for the print page; the paper version already has the chapter title. */
  heading?: boolean
}

/** The chapter list, each with its one-line result; each entry jumps to its chapter. */
export function ContentsList({ heading = false }: ContentsListProps) {
  return (
    <div className="contents-list-wrap">
      {heading && <h2 className="chapter-title">Contents</h2>}
      <ol className="contents-list" aria-label="Chapters">
        {chapters
          .filter((c) => c.id !== 'contents')
          .map((c) => (
            <li key={c.id}>
              <a href={c.path} data-chapter={c.id}>
                {c.id === 'contact' ? 'Contact' : c.title}
              </a>
              <span className="contents-result">{c.result}</span>
            </li>
          ))}
      </ol>
    </div>
  )
}
