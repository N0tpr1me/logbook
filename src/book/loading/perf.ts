// Adaptive sharpness and the automatic fallback (plan: Keeping it smooth,
// Safety nets). Frame time is measured only while something animates,
// skipping the first 2 seconds and any time the tab is hidden. The median of
// 90 animated frames over 20ms lowers the pixel density (never below 1 while
// the book is open); over 33ms, or a lost WebGL context, triggers the
// fallback. Disabled entirely in test mode.

export interface FrameMonitorOptions {
  /** The scene is too slow or its graphics crashed: switch to the paper version. */
  onSlow: () => void
  /** Called with the new device pixel ratio when sharpness changes. */
  onDpr?: (dpr: number) => void
  /** The sharpest density to use, usually min(devicePixelRatio, 2). */
  maxDpr?: number
  /** Lowest density allowed right now; 1 while the book is open, lower on the desk. */
  minDpr?: () => number
  /** Test mode: every method is a no-op. */
  testMode?: boolean
  /** Clock, for tests. */
  now?: () => number
  windowSize?: number
  warmupMs?: number
  lowerAboveMs?: number
  slowAboveMs?: number
  raiseBelowMs?: number
}

export interface FrameMonitor {
  /** Mark a source of motion as running or stopped. Frames count only while at least one is running. */
  setAnimating: (source: string, active: boolean) => void
  /** Call once per rendered frame with the frame's timestamp in milliseconds. */
  frame: (timestamp: number) => void
  /** Watch a canvas for a lost WebGL context. */
  watchCanvas: (canvas: HTMLCanvasElement) => void
  currentDpr: () => number
  dispose: () => void
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function createFrameMonitor(options: FrameMonitorOptions): FrameMonitor {
  const {
    onSlow,
    onDpr,
    maxDpr = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2),
    minDpr = () => 1,
    testMode = false,
    now = () => performance.now(),
    windowSize = 90,
    warmupMs = 2000,
    lowerAboveMs = 20,
    slowAboveMs = 33,
    raiseBelowMs = 14,
  } = options

  const started = now()
  const sources = new Set<string>()
  let samples: number[] = []
  let last: number | null = null
  let dpr = maxDpr
  let slowFired = false
  let hiddenSince: number | null = null
  let disposed = false

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') hiddenSince = now()
    else {
      hiddenSince = null
      last = null
    }
  }
  if (!testMode && typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility)

  const setDpr = (next: number) => {
    const clamped = Math.max(minDpr(), Math.min(maxDpr, next))
    if (Math.abs(clamped - dpr) < 0.01) return
    dpr = clamped
    onDpr?.(dpr)
  }

  const evaluate = () => {
    const m = median(samples)
    samples = []
    if (m > slowAboveMs) {
      if (!slowFired) {
        slowFired = true
        onSlow()
      }
      return
    }
    if (m > lowerAboveMs) setDpr(dpr - 0.25)
    else if (m < raiseBelowMs) setDpr(dpr + 0.25)
  }

  return {
    setAnimating: (source, active) => {
      if (testMode) return
      if (active) sources.add(source)
      else sources.delete(source)
      if (sources.size === 0) last = null
    },
    frame: (timestamp) => {
      if (testMode || disposed || slowFired) return
      if (sources.size === 0 || hiddenSince !== null || timestamp - started < warmupMs) {
        last = null
        return
      }
      if (last !== null) {
        const dt = timestamp - last
        // Ignore pauses that are not frame time (a tab switch the event missed, a breakpoint).
        if (dt < 500) samples = [...samples, dt]
        if (samples.length >= windowSize) evaluate()
      }
      last = timestamp
    },
    watchCanvas: (canvas) => {
      if (testMode) return
      canvas.addEventListener(
        'webglcontextlost',
        () => {
          if (!slowFired) {
            slowFired = true
            onSlow()
          }
        },
        { once: true },
      )
    },
    currentDpr: () => dpr,
    dispose: () => {
      disposed = true
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility)
    },
  }
}
