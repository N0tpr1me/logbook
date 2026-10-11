// A visually hidden HTML copy of the open spread for screen readers (plan:
// Accessibility). It is hidden, never removed, and ignores the mouse so
// dragging and hovering still reach the book. Page turns are announced
// politely, for example "DroneMedic, spread 2 of 7".

import { useEffect, useState } from 'react'
import { contact, person, type Chapter } from '@/content/content'
import { spreadCount } from '@/book/spreads'

export interface SpreadA11yProps {
  chapter: Chapter | undefined
  spread: number
  onOpenSheet: (anchor?: string) => void
}

export function SpreadA11y({ chapter, spread, onOpenSheet }: SpreadA11yProps) {
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (!chapter) return
    const t = window.setTimeout(() => setAnnouncement(`${chapter.title}, spread ${spread} of ${spreadCount}`), 50)
    return () => window.clearTimeout(t)
  }, [chapter, spread])

  return (
    <div className="visually-hidden" style={{ pointerEvents: 'none' }}>
      <div role="status" aria-live="polite">{announcement}</div>
      {chapter && (
        <section aria-label={`Open spread: ${chapter.title}`}>
          <h2>{chapter.title}</h2>
          <p>{chapter.result}</p>
          {chapter.story.map((s, i) => <p key={i}>{s}</p>)}
          {chapter.team && <p>Team: {chapter.team.join(', ')}</p>}
          {chapter.id === 'contents' && (
            <ul>
              {person.intro.map((s, i) => <li key={i}>{s}</li>)}
              <li>{person.degree}. {person.average}.</li>
              <li>This logbook belongs to {person.name}, {contact.email}</li>
            </ul>
          )}
          {chapter.links?.map((l) => (
            <button key={l.href} type="button" onClick={() => onOpenSheet(l.href.startsWith('#') ? l.href : undefined)}>
              {l.label}
            </button>
          ))}
          <button type="button" onClick={() => onOpenSheet()}>Read this chapter as a web page</button>
        </section>
      )}
    </div>
  )
}
