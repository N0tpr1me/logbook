// The loading screen (plan: Experience storyboard). The closed logbook cover
// drawn in plain HTML and CSS, with a highlighter-yellow line that fills by
// real bytes. Skipped if the load finishes under 0.4s; once shown it stays
// at least 0.6s; then a 1.2s expo-out cross-fade and scale into the scene.

import { useEffect, useMemo, useRef, useState } from 'react'
import { person } from '@/content/content'

export interface LoadingScreenProps {
  /** 0 to 1, by bytes. */
  progress: number
  /** True once everything is downloaded, decoded and uploaded. */
  ready: boolean
  /** Fires when the 1.2s reveal has finished and the screen is gone. */
  onRevealed: () => void
  /** Overrides for tests. */
  timings?: Partial<LoadingTimings>
}

export interface LoadingTimings {
  skipUnderMs: number
  minShowMs: number
  revealMs: number
}

export const DEFAULT_TIMINGS: LoadingTimings = { skipUnderMs: 400, minShowMs: 600, revealMs: 1200 }

type Phase = 'pending' | 'shown' | 'revealing' | 'done'

/** Pure timing decisions, so the screen's behaviour can be unit-tested. */
export function nextPhase(phase: Phase, ready: boolean, elapsedMs: number, shownForMs: number, t: LoadingTimings): Phase {
  if (phase === 'done' || phase === 'revealing') return phase
  if (phase === 'pending') {
    if (ready && elapsedMs < t.skipUnderMs) return 'revealing'
    if (elapsedMs >= t.skipUnderMs) return 'shown'
    return 'pending'
  }
  if (ready && shownForMs >= t.minShowMs) return 'revealing'
  return 'shown'
}

export function LoadingScreen({ progress, ready, onRevealed, timings }: LoadingScreenProps) {
  const skipUnderMs = timings?.skipUnderMs ?? DEFAULT_TIMINGS.skipUnderMs
  const minShowMs = timings?.minShowMs ?? DEFAULT_TIMINGS.minShowMs
  const revealMs = timings?.revealMs ?? DEFAULT_TIMINGS.revealMs
  const t = useMemo<LoadingTimings>(() => ({ skipUnderMs, minShowMs, revealMs }), [skipUnderMs, minShowMs, revealMs])
  const [phase, setPhase] = useState<Phase>('pending')
  const start = useRef(performance.now())
  const shownAt = useRef<number | null>(null)
  const revealed = useRef(onRevealed)
  revealed.current = onRevealed

  useEffect(() => {
    if (phase === 'done' || phase === 'revealing') return
    let frame = 0
    const tick = () => {
      const now = performance.now()
      const shownFor = shownAt.current === null ? 0 : now - shownAt.current
      const next = nextPhase(phase, ready, now - start.current, shownFor, t)
      if (next !== phase) {
        if (next === 'shown') shownAt.current = now
        setPhase(next)
        return
      }
      frame = window.setTimeout(tick, 50)
    }
    tick()
    return () => window.clearTimeout(frame)
  }, [phase, ready, t])

  useEffect(() => {
    if (phase !== 'revealing') return
    const id = window.setTimeout(() => {
      setPhase('done')
      revealed.current()
    }, t.revealMs)
    return () => window.clearTimeout(id)
  }, [phase, t.revealMs])

  if (phase === 'done') return null
  const revealing = phase === 'revealing'
  // The dark background covers the scene from the first frame; the cover only
  // appears once the load has lasted long enough to show it.
  const contentVisible = phase !== 'pending'
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100)

  return (
    <div
      style={{
        ...screenStyle,
        opacity: revealing ? 0 : 1,
        transform: revealing ? 'scale(1.06)' : 'scale(1)',
        transition: revealing
          ? `opacity ${t.revealMs}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${t.revealMs}ms cubic-bezier(0.16, 1, 0.3, 1)`
          : 'none',
        pointerEvents: revealing ? 'none' : 'auto',
      }}
      aria-busy={!ready}
      aria-live="polite"
      data-testid="loading-screen"
      data-phase={phase}
    >
      <div style={{ ...coverStyle, opacity: contentVisible ? 1 : 0, transition: 'opacity 160ms linear' }} role="img" aria-label={`${person.name}'s logbook, loading`}>
        <div style={foilStyle}>{person.name}</div>
        <div style={labelStyle}>
          <div>{person.strapline}</div>
          <div style={labelSecondLine}>{person.coverResult}</div>
        </div>
        <div style={ribbonStyle} />
      </div>
      <div
        style={{ ...trackStyle, opacity: contentVisible ? 1 : 0 }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Loading the logbook"
        data-testid="loading"
      >
        <div style={{ ...lineStyle, width: `${percent}%` }} />
      </div>
      <div style={{ ...captionStyle, opacity: contentVisible ? 1 : 0 }}>{ready ? 'Ready' : `Loading, ${percent}%`}</div>
    </div>
  )
}

const screenStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  display: 'grid',
  placeItems: 'center',
  alignContent: 'center',
  gap: 20,
  background: '#1B1A18',
  color: '#ECEAE4',
  fontFamily: 'var(--font, "IBM Plex Sans", system-ui, sans-serif)',
  transformOrigin: '50% 55%',
}

const coverStyle: React.CSSProperties = {
  position: 'relative',
  width: 210,
  height: 297,
  borderRadius: '4px 10px 10px 4px',
  background: 'linear-gradient(135deg, #2A4A37 0%, #23402F 45%, #1C3426 100%)',
  boxShadow: '0 24px 48px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(255, 255, 255, 0.05), inset 8px 0 12px -8px rgba(0, 0, 0, 0.6)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  paddingTop: 48,
  boxSizing: 'border-box',
  overflow: 'hidden',
}

const foilStyle: React.CSSProperties = {
  font: '600 26px/32px var(--font, "IBM Plex Sans", system-ui, sans-serif)',
  letterSpacing: '0.04em',
  color: '#C9B26A',
  textShadow: '0 1px 0 rgba(255, 245, 200, 0.25), 0 -1px 0 rgba(0, 0, 0, 0.4)',
}

const labelStyle: React.CSSProperties = {
  marginTop: 112,
  width: 150,
  background: '#E6ECDF',
  color: '#1E2633',
  borderRadius: 3,
  padding: '10px 12px',
  font: '500 12px/16px var(--font, "IBM Plex Sans", system-ui, sans-serif)',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
  textAlign: 'left',
}

const labelSecondLine: React.CSSProperties = { marginTop: 4, color: '#4E5A57', fontWeight: 400 }

const ribbonStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 30,
  width: 10,
  height: 40,
  background: '#1C3426',
  clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)',
}

const trackStyle: React.CSSProperties = {
  width: 210,
  height: 4,
  borderRadius: 2,
  background: 'rgba(236, 234, 228, 0.12)',
  overflow: 'hidden',
}

const lineStyle: React.CSSProperties = {
  height: '100%',
  background: '#F3E25A',
  transition: 'width 120ms linear',
}

const captionStyle: React.CSSProperties = {
  font: '400 15px/20px var(--font, "IBM Plex Sans", system-ui, sans-serif)',
  color: '#A3A79F',
  fontVariantNumeric: 'tabular-nums',
}
