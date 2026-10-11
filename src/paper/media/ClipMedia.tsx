import { useRef, useState } from 'react'
import { ArrowSquareOut, FilmSlate, Pause, Play } from '@phosphor-icons/react'

export interface ClipMediaProps {
  src: string
  poster: string
  caption: string
  fullVideo?: string
  /** Print pages show the poster frame only. */
  variant?: 'live' | 'print'
}

/**
 * A silent, tap-to-play clip with a poster frame and a visible pause button.
 * A clip that fails shows its poster and a caption, never a blank box.
 */
export function ClipMedia({ src, poster, caption, fullVideo, variant = 'live' }: ClipMediaProps) {
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  const toggle = () => {
    const el = video.current
    if (!el || failed) return
    if (el.paused) {
      el.play().catch(() => setFailed(true))
    } else {
      el.pause()
    }
  }

  const watchLink = fullVideo ? (
    <a className="btn btn-link" href={fullVideo} target="_blank" rel="noopener noreferrer">
      <ArrowSquareOut size={20} aria-hidden="true" />
      Watch the full video
    </a>
  ) : null

  if (variant === 'print' || failed) {
    return (
      <div className="clip clip-still">
        <PosterFrame src={poster} caption={caption} />
        {variant === 'live' && <p className="clip-note">The clip could not load, so this is its poster frame.</p>}
        {watchLink && <div className="clip-actions">{watchLink}</div>}
      </div>
    )
  }

  return (
    <div className="clip">
      <div className="media-frame clip-frame">
        <video
          ref={video}
          src={src}
          poster={poster}
          playsInline
          muted
          preload="metadata"
          onClick={toggle}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => setFailed(true)}
          aria-label={caption}
        />
      </div>
      <div className="clip-actions">
        <button type="button" className="btn" onClick={toggle} aria-pressed={playing}>
          {playing ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
          {playing ? 'Pause clip' : 'Play clip'}
        </button>
        {watchLink}
      </div>
    </div>
  )
}

interface PosterFrameProps {
  src: string
  caption: string
}

function PosterFrame({ src, caption }: PosterFrameProps) {
  const [missing, setMissing] = useState(false)
  if (missing) {
    return (
      <div className="media-frame media-placeholder" role="img" aria-label={caption}>
        <FilmSlate size={20} aria-hidden="true" />
        <span>Clip to come</span>
      </div>
    )
  }
  return (
    <div className="media-frame clip-frame">
      <img src={src} alt={caption} onError={() => setMissing(true)} />
    </div>
  )
}
