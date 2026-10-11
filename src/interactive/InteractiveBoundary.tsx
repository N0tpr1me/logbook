import { Component, type ErrorInfo, type ReactNode } from 'react'

export interface InteractiveBoundaryProps {
  /** What the part is called in the fallback caption, such as 'The mission replay'. */
  label: string
  /** A still to show when the part fails, such as a poster frame or a static chart. */
  still?: ReactNode
  children: ReactNode
}

interface InteractiveBoundaryState {
  failed: boolean
}

/**
 * Contained failures (plan: Safety nets): if one interactive part throws, the
 * page shows its still image and a caption instead, and the rest keeps working.
 */
export class InteractiveBoundary extends Component<InteractiveBoundaryProps, InteractiveBoundaryState> {
  state: InteractiveBoundaryState = { failed: false }

  static getDerivedStateFromError(): InteractiveBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surfaced for error reporting; the visitor sees the still and caption below.
    console.error(`${this.props.label} failed`, error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children
    return (
      <div className="interactive-fallback" role="group" aria-label={`${this.props.label} unavailable`}>
        {this.props.still}
        <p className="interactive-fallback-note">{this.props.label} could not load. The rest of the page still works.</p>
      </div>
    )
  }
}
