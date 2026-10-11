import { useLayoutEffect, useState, type RefObject } from 'react'

/** A link's box in page-normalised coordinates (0..1 of the page's width and height). */
export interface LinkArea {
  href: string
  x: number
  y: number
  w: number
  h: number
}

/**
 * Measure every link inside the box after fonts have loaded and layout has
 * settled. Multi-line links produce one area per line box. The build script
 * records these so clicks on the 3D page images reach the right link.
 */
export function useLinkAreas(ref: RefObject<HTMLElement | null>): LinkArea[] | null {
  const [areas, setAreas] = useState<LinkArea[] | null>(null)

  useLayoutEffect(() => {
    let cancelled = false
    const measure = () => {
      const box = ref.current
      if (!box) return
      const bounds = box.getBoundingClientRect()
      if (bounds.width === 0 || bounds.height === 0) return
      const found: LinkArea[] = []
      box.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
        const href = anchor.getAttribute('href') ?? ''
        Array.from(anchor.getClientRects()).forEach((rect) => {
          if (rect.width === 0 || rect.height === 0) return
          found.push({
            href,
            x: round((rect.left - bounds.left) / bounds.width),
            y: round((rect.top - bounds.top) / bounds.height),
            w: round(rect.width / bounds.width),
            h: round(rect.height / bounds.height),
          })
        })
      })
      setAreas(found)
    }
    const fontsReady: Promise<unknown> = typeof document !== 'undefined' && document.fonts ? document.fonts.ready : Promise.resolve()
    fontsReady.then(() => {
      if (cancelled) return
      requestAnimationFrame(() => {
        if (!cancelled) measure()
      })
    })
    return () => {
      cancelled = true
    }
  }, [ref])

  return areas
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000
}
