import { person } from '@/content/content'

export interface TimelineListProps {
  /** Expandable entries use details and summary; static entries show every detail (print pages). */
  expandable?: boolean
}

/** Internships and study, from person.timeline, oldest first. */
export function TimelineList({ expandable = false }: TimelineListProps) {
  return (
    <ol className="timeline">
      {person.timeline.map((entry) => (
        <li key={`${entry.when}-${entry.title}`} className="timeline-entry">
          {expandable ? (
            <details className="timeline-details">
              <summary className="timeline-summary">
                <span className="timeline-when">{entry.when}</span>
                <span className="timeline-title">{entry.title}</span>
              </summary>
              <p className="timeline-detail">{entry.detail}</p>
            </details>
          ) : (
            <>
              <span className="timeline-when">{entry.when}</span>
              <span className="timeline-title">{entry.title}</span>
              <p className="timeline-detail">{entry.detail}</p>
            </>
          )}
        </li>
      ))}
    </ol>
  )
}
