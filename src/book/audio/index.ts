// Wires the audio engine to the book store's Sound setting.

import type { BookStore } from '@/book/state'
import { createAudioEngine, EFFECT_FILES, type AudioEngine, type EffectName } from './engine'

export type { AudioEngine, EffectName }
export { EFFECT_FILES, loopPoints } from './engine'

/** Every sound effect file, for the preload manifest. */
export const EFFECT_URLS: readonly string[] = Object.values(EFFECT_FILES)

export function createBookAudio(store: BookStore, effectBuffers?: ReadonlyMap<string, ArrayBuffer>): AudioEngine {
  return createAudioEngine({
    effectBuffers,
    soundOn: () => store.get().sound,
    subscribe: store.subscribe,
  })
}
