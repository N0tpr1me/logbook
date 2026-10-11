// Keyboard and screen-reader access to the desk objects (plan: Accessibility).
// A visually hidden but focusable list of buttons, in left-to-right order.
// Focus shows the same outline and label as hover; Enter or Space runs the
// same click as the pointer (a button's native click handles both keys).

import { useDeskState, type DeskInteraction } from './interaction'
import { DESK_OBJECT_ORDER, OBJECT_LABELS, type DeskObjectId } from './layout'

export interface DeskA11yProps {
  interaction: DeskInteraction
  /** Objects to list; defaults to every object in desk order. */
  objects?: readonly DeskObjectId[]
}

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  position: 'absolute',
  left: 16,
  bottom: 16,
  display: 'flex',
  gap: 8,
}

/** Hidden until focused, then a visible pill so sighted keyboard users see where they are. */
const buttonStyle: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
  padding: 0,
  margin: -1,
}

const focusedStyle: React.CSSProperties = {
  position: 'static',
  width: 'auto',
  height: 'auto',
  overflow: 'visible',
  clip: 'auto',
  clipPath: 'none',
  margin: 0,
  padding: '10px 14px',
  minHeight: 44,
  font: '500 15px/20px var(--font, "IBM Plex Sans", system-ui, sans-serif)',
  color: '#ECEAE4',
  background: 'rgba(27, 26, 24, 0.92)',
  border: '2px solid #F3E25A',
  borderRadius: 6,
  cursor: 'pointer',
}

export function DeskA11y({ interaction, objects = DESK_OBJECT_ORDER }: DeskA11yProps) {
  const focused = useDeskState(interaction, (s) => s.focused)

  return (
    <ul style={listStyle} aria-label="Desk objects">
      {objects.map((id) => (
        <li key={id}>
          <button
            type="button"
            data-testid={`obj-${id}`}
            style={focused === id ? focusedStyle : buttonStyle}
            onFocus={() => interaction.set({ focused: id })}
            onBlur={() => interaction.set((s) => (s.focused === id ? { focused: null } : {}))}
            onClick={() => interaction.click(id)}
          >
            {OBJECT_LABELS[id]}
          </button>
        </li>
      ))}
    </ul>
  )
}
