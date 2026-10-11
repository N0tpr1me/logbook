// The small label that appears with the hover outline: 15px IBM Plex Sans,
// desk text on a dark pill, fading in over 0.18s expo-out.

import { Html } from '@react-three/drei'
import type { Vec3 } from './layout'

export interface ObjectLabelProps {
  text: string
  visible: boolean
  position: Vec3
}

const pillStyle: React.CSSProperties = {
  font: '500 15px/20px var(--font, "IBM Plex Sans", system-ui, sans-serif)',
  color: '#ECEAE4',
  background: 'rgba(27, 26, 24, 0.92)',
  border: '1px solid rgba(236, 234, 228, 0.14)',
  borderRadius: 6,
  padding: '6px 10px',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  userSelect: 'none',
  animation: 'desk-label-in 180ms cubic-bezier(0.16, 1, 0.3, 1) both',
  transform: 'translateY(-50%)',
}

export function ObjectLabel({ text, visible, position }: ObjectLabelProps) {
  if (!visible) return null
  return (
    <Html position={[position[0], position[1], position[2]]} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
      <style>{'@keyframes desk-label-in { from { opacity: 0; transform: translateY(calc(-50% + 6px)); } to { opacity: 1; transform: translateY(-50%); } }'}</style>
      <div style={pillStyle} aria-hidden="true">
        {text}
      </div>
    </Html>
  )
}
