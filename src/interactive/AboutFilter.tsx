import { useState } from 'react'
import { chapters, person, type ChapterId } from '@/content/content'
import { TimelineList } from '@/paper/media/TimelineList'

/**
 * The timeline with expandable entries and the skill tags. Picking a skill
 * lists the projects that used it, each a link to its chapter address.
 */
export function AboutFilter() {
  const [selected, setSelected] = useState<string | null>(null)
  const skill = person.skills.find((s) => s.name === selected) ?? null
  const projects = skill ? chapters.filter((c) => (skill.projects as ChapterId[]).includes(c.id)) : []

  return (
    <div className="about-filter">
      <TimelineList expandable />

      <p className="skills-title" id="skills-title">
        Skills
      </p>
      <ul className="skill-tags" aria-labelledby="skills-title">
        {person.skills.map((s) => (
          <li key={s.name}>
            <button
              type="button"
              className="btn skill-tag"
              aria-pressed={s.name === selected}
              onClick={() => setSelected((prev) => (prev === s.name ? null : s.name))}
            >
              {s.name}
            </button>
          </li>
        ))}
      </ul>

      <div className="skill-projects" aria-live="polite">
        {!skill && <p className="skill-projects-note">Pick a skill to list the projects that used it.</p>}
        {skill && projects.length === 0 && <p className="skill-projects-note">{skill.name}: no chapter in the logbook yet.</p>}
        {skill && projects.length > 0 && (
          <>
            <p className="skill-projects-note">{skill.name} was used in</p>
            <ul className="skill-project-list">
              {projects.map((c) => (
                <li key={c.id}>
                  <a href={c.path} data-chapter={c.id}>
                    {c.title}
                  </a>
                  <span className="skill-project-result"> {c.result}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
