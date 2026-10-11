// One rule, applied once per visit, decides whether a visitor gets the 3D book
// or the paper version (plan: Who sees which version). Resizing never swaps it.

export type Version = 'book' | 'paper'

export interface VersionDecision {
  version: Version
  reason: 'simple' | 'touch' | 'small' | 'no-webgl2' | 'reduced-motion' | 'fallback' | 'ok' | 'forced-3d'
  /** True when reduced motion is on; the paper version then offers "Open the 3D book anyway". */
  reducedMotion: boolean
}

export const MIN_WIDTH = 1200
export const MIN_HEIGHT = 680

function hasWebGL2(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!c.getContext('webgl2')
  } catch {
    return false
  }
}

function isTouchDevice(): boolean {
  // iPads identify as Macs, so touch points are checked as well as the UA.
  const ua = navigator.userAgent
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
  const touchMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
  const coarse = window.matchMedia?.('(pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches
  return mobileUa || touchMac || coarse
}

export function decideVersion(search = window.location.search): VersionDecision {
  const params = new URLSearchParams(search)
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  if (params.get('simple') === '1') return { version: 'paper', reason: 'simple', reducedMotion }
  if (params.get('fallback') === '1') return { version: 'paper', reason: 'fallback', reducedMotion }
  if (params.get('3d') === '1') return { version: 'book', reason: 'forced-3d', reducedMotion }
  if (isTouchDevice()) return { version: 'paper', reason: 'touch', reducedMotion }
  if (window.innerWidth < MIN_WIDTH || window.innerHeight < MIN_HEIGHT) return { version: 'paper', reason: 'small', reducedMotion }
  if (!hasWebGL2()) return { version: 'paper', reason: 'no-webgl2', reducedMotion }
  if (reducedMotion) return { version: 'paper', reason: 'reduced-motion', reducedMotion }
  return { version: 'book', reason: 'ok', reducedMotion }
}

/** Test mode turns off animations, fixes the camera and disables the fallback (plan: Safety nets). */
export function isTestMode(search = window.location.search): boolean {
  return new URLSearchParams(search).get('test') === '1'
}
