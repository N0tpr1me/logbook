import { useCallback, useEffect, useRef, useState } from 'react'

export interface ReplayClock {
  /** 0 at the start, 1 at the end. */
  progress: number
  playing: boolean
  done: boolean
  play: () => void
  pause: () => void
  replay: () => void
  seek: (progress: number) => void
}

interface ClockState {
  progress: number
  playing: boolean
  /** Bumped by replay so a running loop restarts from zero. */
  run: number
}

/**
 * A requestAnimationFrame clock that runs progress from 0 to 1 over
 * `durationMs`. With reduced motion, play jumps straight to the end.
 */
export function useReplayClock(durationMs: number, reducedMotion: boolean): ReplayClock {
  const [state, setState] = useState<ClockState>({ progress: 0, playing: false, run: 0 })
  const latest = useRef(state.progress)
  latest.current = state.progress

  useEffect(() => {
    if (!state.playing) return
    const startProgress = latest.current
    let startTime: number | null = null
    let frame = 0
    const tick = (now: number) => {
      if (startTime === null) startTime = now
      const next = Math.min(1, startProgress + (now - startTime) / durationMs)
      setState((s) => ({ ...s, progress: next, playing: next < 1 }))
      if (next < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [state.playing, state.run, durationMs])

  const play = useCallback(() => {
    setState((s) => {
      if (reducedMotion) return { ...s, progress: 1, playing: false }
      return { ...s, progress: s.progress >= 1 ? 0 : s.progress, playing: true, run: s.run + 1 }
    })
  }, [reducedMotion])

  const pause = useCallback(() => setState((s) => ({ ...s, playing: false })), [])

  const replay = useCallback(() => {
    setState((s) => (reducedMotion ? { ...s, progress: 1, playing: false } : { progress: 0, playing: true, run: s.run + 1 }))
  }, [reducedMotion])

  const seek = useCallback((progress: number) => {
    setState((s) => ({ ...s, progress: Math.min(Math.max(progress, 0), 1), playing: false }))
  }, [])

  return { progress: state.progress, playing: state.playing, done: state.progress >= 1, play, pause, replay, seek }
}
