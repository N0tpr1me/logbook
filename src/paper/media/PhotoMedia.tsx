import { useState } from 'react'
import { person } from '@/content/content'

export interface PhotoMediaProps {
  src: string
  alt: string
}

/** The headshot; while the file is missing, a plain initials box stands in. */
export function PhotoMedia({ src, alt }: PhotoMediaProps) {
  const [missing, setMissing] = useState(false)
  if (missing) {
    return (
      <div className="photo photo-placeholder" role="img" aria-label={alt}>
        <span aria-hidden="true">{person.initials}</span>
      </div>
    )
  }
  // The headshot is the first thing on the page (the largest contentful paint), so it is never lazy.
  return <img className="photo" src={src} alt={alt} loading="eager" fetchPriority="high" decoding="async" onError={() => setMissing(true)} />
}
