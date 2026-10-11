import { useEffect, useRef, useState, type RefObject } from 'react'

const REDUCED = '(prefers-reduced-motion: reduce)'

/** True when the visitor has reduced motion turned on; animations then jump to their end. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => typeof window !== 'undefined' && !!window.matchMedia?.(REDUCED).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(REDUCED)
    if (!mq) return
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** True once the element has scrolled into view; stays true afterwards (charts draw once). */
export function useInView<T extends Element>(ref: RefObject<T | null>, rootMargin = '0px 0px -10% 0px'): boolean {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setInView(true)
      },
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, inView, rootMargin])
  return inView
}

/** The element's rendered width in CSS pixels, kept current with a ResizeObserver. */
export function useElementWidth<T extends Element>(ref: RefObject<T | null>, fallback = 640): number {
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setWidth((prev) => (Math.abs(prev - w) < 0.5 ? prev : w))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

/** A short-lived message for a live region; clears itself after `ms`. */
export function useAnnouncement(ms = 2500): [string, (message: string) => void] {
  const [message, setMessage] = useState('')
  const timer = useRef<number | null>(null)
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
  }, [])
  const announce = (next: string) => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    setMessage(next)
    timer.current = window.setTimeout(() => setMessage(''), ms)
  }
  return [message, announce]
}
