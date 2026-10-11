// The "Now" note that fades in beside the mug 1.8s into the stir: paper
// coloured, in the handwriting font, read by screen readers as a note. Closes
// on Esc or a click anywhere else (plan: The coffee mug, in detail).

import { useEffect, useRef } from 'react'
import { Html } from '@react-three/drei'
import type { Vec3 } from '../layout'

export interface NowNoteProps {
  open: boolean
  text: string
  position: Vec3
  onClose: () => void
}

const noteStyle: React.CSSProperties = {
  font: '500 22px/28px var(--font-hand, "Caveat", "Bradley Hand", "Segoe Print", cursive)',
  color: '#1E2633',
  background: '#E6ECDF',
  borderRadius: 6,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
  padding: '12px 16px',
  width: 240,
  transform: 'rotate(-2deg)',
  animation: 'desk-note-in 300ms cubic-bezier(0.16, 1, 0.3, 1) both',
  pointerEvents: 'auto',
}

export function NowNote({ open, text, position, onClose }: NowNoteProps) {
  const element = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onPointer = (e: PointerEvent) => {
      const inside = element.current?.contains(e.target as Node) ?? false
      if (!inside) onClose()
    }
    // Listen after this click has finished bubbling, so the opening click does not close it.
    const id = window.setTimeout(() => {
      window.addEventListener('keydown', onKey)
      window.addEventListener('pointerdown', onPointer)
    }, 0)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <Html position={[position[0], position[1], position[2]]} center zIndexRange={[30, 20]}>
      <style>{'@keyframes desk-note-in { from { opacity: 0; transform: rotate(-2deg) translateY(8px); } to { opacity: 1; transform: rotate(-2deg) translateY(0); } }'}</style>
      <div ref={element} role="note" data-testid="now-note" style={noteStyle}>
        {text}
      </div>
    </Html>
  )
}
