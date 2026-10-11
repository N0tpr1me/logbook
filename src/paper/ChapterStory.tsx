import type { Chapter } from '@/content/content'
import { joinNames } from './format'

export interface ChapterStoryProps {
  chapter: Chapter
  headingId: string
  /** Where a '#replay' link should point on this page; left as written when omitted. */
  replayHref?: string
  showLinks?: boolean
}

/** The left page: title, the result line, the story, checked facts and the team credit. */
export function ChapterStory({ chapter, headingId, replayHref, showLinks = true }: ChapterStoryProps) {
  const hand = chapter.id === 'contact'
  const links = showLinks ? (chapter.links ?? []) : []
  return (
    <>
      <header className="chapter-head">
        <h2 id={headingId} className={`chapter-title${hand ? ' hand' : ''}`}>
          {chapter.title}
        </h2>
        <p className="chapter-result">{chapter.result}</p>
      </header>
      <div className="chapter-story">
        {chapter.story.map((paragraph) => (
          <p key={paragraph.slice(0, 40)}>{paragraph}</p>
        ))}
        {chapter.facts && chapter.facts.length > 0 && (
          <dl className="chapter-facts">
            {chapter.facts.map((fact) => (
              <div key={fact.label} className="chapter-fact">
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {chapter.team && chapter.team.length > 0 && <p className="chapter-team">Team: {joinNames(chapter.team)}.</p>}
        {links.length > 0 && (
          <ul className="chapter-links">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href === '#replay' && replayHref ? replayHref : link.href}
                  target={link.newTab ? '_blank' : undefined}
                  rel={link.newTab ? 'noopener noreferrer' : undefined}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
