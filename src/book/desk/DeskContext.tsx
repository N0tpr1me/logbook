import { createContext, useContext } from 'react'
import type { BookStore } from '@/book/state'
import type { DeskInteraction } from './interaction'
import type { DeskObjectId } from './layout'

export type EffectName = 'page' | 'clink' | 'lampClick'

export interface DeskAudio {
  playEffect: (name: EffectName) => void
}

export interface DeskContextValue {
  store: BookStore
  interaction: DeskInteraction
  audio: DeskAudio | null
  onObjectClick: (id: DeskObjectId) => void
  /** True once the loading screen has cross-faded into the scene. */
  revealed: boolean
  /** The drone model (or its stand-in) is mounted: the scene is complete and can be compiled. */
  modelReady: () => void
}

const DeskContext = createContext<DeskContextValue | null>(null)

export const DeskProvider = DeskContext.Provider

export function useDesk(): DeskContextValue {
  const value = useContext(DeskContext)
  if (!value) throw new Error('useDesk must be used inside <Desk>')
  return value
}
