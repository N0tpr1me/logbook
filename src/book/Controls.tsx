// On-screen controls (plan: Navigating the book): Previous, Next, Read, Close
// book, Sound and Simple version. Each is an icon with a label and a 44px
// target. Sound and Simple version are always visible; the others appear once
// the book is open. The three ribbons (Contents, About, Contact) sit along the
// top edge.

import { forwardRef } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, SpeakerHigh, SpeakerSlash, TextAa, X } from '@phosphor-icons/react'
import './controls.css'

export interface ControlsProps {
  bookOpen: boolean
  sound: boolean
  canPrevious: boolean
  canNext: boolean
  onPrevious: () => void
  onNext: () => void
  onRead: () => void
  onCloseBook: () => void
  onToggleSound: () => void
  onSimple: () => void
  ribbons: { label: string; onClick: () => void; active: boolean }[]
}

export const Controls = forwardRef<HTMLButtonElement, ControlsProps>(function Controls(props, readRef) {
  const { bookOpen, sound, canPrevious, canNext, ribbons } = props
  return (
    <>
      {bookOpen && (
        <nav className="ribbons" aria-label="Bookmarks">
          {ribbons.map((r) => (
            <button key={r.label} type="button" className={`ribbon${r.active ? ' is-active' : ''}`} onClick={r.onClick}>
              {r.label}
            </button>
          ))}
        </nav>
      )}
      <div className="controls" role="toolbar" aria-label="Book controls">
        {bookOpen && (
          <>
            <button type="button" className="ctl" onClick={props.onPrevious} disabled={!canPrevious} data-testid="ctl-prev">
              <ArrowLeft size={20} aria-hidden /> <span>Previous</span>
            </button>
            <button type="button" className="ctl" onClick={props.onNext} disabled={!canNext} data-testid="ctl-next">
              <ArrowRight size={20} aria-hidden /> <span>Next</span>
            </button>
            <button ref={readRef} type="button" className="ctl" onClick={props.onRead} data-testid="ctl-read">
              <BookOpen size={20} aria-hidden /> <span>Read</span>
            </button>
            <button type="button" className="ctl" onClick={props.onCloseBook} data-testid="ctl-close">
              <X size={20} aria-hidden /> <span>Close book</span>
            </button>
          </>
        )}
        <button type="button" className="ctl" onClick={props.onToggleSound} aria-pressed={sound} data-testid="ctl-sound">
          {sound ? <SpeakerHigh size={20} aria-hidden /> : <SpeakerSlash size={20} aria-hidden />}
          <span>{sound ? 'Sound on' : 'Sound off'}</span>
        </button>
        <button type="button" className="ctl" onClick={props.onSimple} data-testid="ctl-simple">
          <TextAa size={20} aria-hidden /> <span>Simple version</span>
        </button>
      </div>
    </>
  )
})
