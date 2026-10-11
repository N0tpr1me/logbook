// If a model fails to load or parse, show the procedural stand-in instead of
// a blank space (plan: Finished edges, Contained failures).

import { Component, type ReactNode } from 'react'

export interface ModelBoundaryProps {
  fallback: ReactNode
  children: ReactNode
  onError?: (error: unknown) => void
}

interface ModelBoundaryState {
  failed: boolean
}

export class ModelBoundary extends Component<ModelBoundaryProps, ModelBoundaryState> {
  state: ModelBoundaryState = { failed: false }

  static getDerivedStateFromError(): ModelBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: unknown): void {
    this.props.onError?.(error)
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
