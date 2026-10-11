// One AudioContext for the whole site, created on the first user gesture,
// with effects and music channels under a master gain (plan: Sound and
// music). Nothing plays until the visitor turns Sound on.

export type EffectName = 'page' | 'clink' | 'lampClick'

export interface AudioChannels {
  context: AudioContext
  master: GainNode
  effects: GainNode
  music: GainNode
}

export const EFFECT_FILES: Record<EffectName, string> = {
  page: '/assets/sounds/page.wav',
  clink: '/assets/sounds/clink.wav',
  lampClick: '/assets/sounds/lamp-click.wav',
}

const EFFECTS_LEVEL = 0.9
const MUSIC_LEVEL = 0.28
const MUSIC_FADE_IN_SECONDS = 3
const MUSIC_FADE_OUT_SECONDS = 0.8

type AudioContextCtor = typeof AudioContext

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & { webkitAudioContext?: AudioContextCtor }
  return window.AudioContext ?? w.webkitAudioContext ?? null
}

export interface AudioEngineOptions {
  /** Raw bytes for each effect, from the preloader. Missing effects stay silent. */
  effectBuffers?: ReadonlyMap<string, ArrayBuffer>
  /** Reads the Sound setting. */
  soundOn: () => boolean
  /** Subscribe to Sound changes; returns an unsubscribe. */
  subscribe: (listener: () => void) => () => void
}

export interface AudioEngine {
  /** Plays an effect at once if Sound is on and the context exists. */
  playEffect: (name: EffectName) => void
  /** Fetch and decode the music once, after the reveal. Starts if Sound is already on. */
  loadMusic: (url: string) => Promise<void>
  /** Stop everything, for the switch to the simple version. */
  dispose: () => void
}

/**
 * Trim the near-silence encoders add at both ends so the loop is seamless.
 * Returns [start, end] in seconds.
 */
export function loopPoints(buffer: AudioBuffer, threshold = 0.002): [number, number] {
  const data = buffer.getChannelData(0)
  let first = 0
  let last = data.length - 1
  while (first < data.length && Math.abs(data[first]) < threshold) first += 1
  while (last > first && Math.abs(data[last]) < threshold) last -= 1
  const start = first / buffer.sampleRate
  const end = (last + 1) / buffer.sampleRate
  return end - start > 1 ? [start, end] : [0, buffer.duration]
}

export function createAudioEngine(options: AudioEngineOptions): AudioEngine {
  let channels: AudioChannels | null = null
  let effects = new Map<EffectName, AudioBuffer>()
  let decodingEffects: Promise<void> | null = null
  let musicBuffer: AudioBuffer | null = null
  let musicSource: AudioBufferSourceNode | null = null
  let musicUrl: string | null = null
  let disposed = false

  const ensureContext = (): AudioChannels | null => {
    if (channels || disposed) return channels
    const Ctor = audioContextCtor()
    if (!Ctor) return null
    const context = new Ctor()
    const master = context.createGain()
    const effectsGain = context.createGain()
    const music = context.createGain()
    effectsGain.gain.value = EFFECTS_LEVEL
    music.gain.value = 0
    effectsGain.connect(master)
    music.connect(master)
    master.connect(context.destination)
    channels = { context, master, effects: effectsGain, music }
    return channels
  }

  const decodeEffects = (): Promise<void> => {
    if (decodingEffects) return decodingEffects
    const c = ensureContext()
    const sources = options.effectBuffers
    if (!c || !sources) return Promise.resolve()
    decodingEffects = Promise.all(
      (Object.keys(EFFECT_FILES) as EffectName[]).map(async (name) => {
        const bytes = sources.get(EFFECT_FILES[name])
        if (!bytes) return
        try {
          const decoded = await c.context.decodeAudioData(bytes.slice(0))
          effects = new Map(effects).set(name, decoded)
        } catch {
          // A broken effect file stays silent; the site is complete without it.
        }
      }),
    ).then(() => undefined)
    return decodingEffects
  }

  const startMusic = () => {
    const c = ensureContext()
    if (!c || !musicBuffer || musicSource) return
    const source = c.context.createBufferSource()
    source.buffer = musicBuffer
    const [start, end] = loopPoints(musicBuffer)
    source.loop = true
    source.loopStart = start
    source.loopEnd = end
    source.connect(c.music)
    source.start(0, start)
    musicSource = source
  }

  const fadeMusic = (level: number, seconds: number) => {
    const c = channels
    if (!c) return
    const now = c.context.currentTime
    c.music.gain.cancelScheduledValues(now)
    c.music.gain.setValueAtTime(c.music.gain.value, now)
    c.music.gain.linearRampToValueAtTime(level, now + seconds)
  }

  const sync = () => {
    if (disposed) return
    const on = options.soundOn()
    const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden'
    if (!on) {
      fadeMusic(0, MUSIC_FADE_OUT_SECONDS)
      return
    }
    const c = ensureContext()
    if (!c) return
    if (c.context.state === 'suspended') void c.context.resume()
    void decodeEffects()
    if (!musicBuffer) return
    startMusic()
    fadeMusic(hidden ? 0 : MUSIC_LEVEL, hidden ? MUSIC_FADE_OUT_SECONDS : MUSIC_FADE_IN_SECONDS)
  }

  const onVisibility = () => sync()
  const unsubscribe = options.subscribe(sync)
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility)

  return {
    playEffect: (name) => {
      if (disposed || !options.soundOn()) return
      const c = ensureContext()
      if (!c) return
      const buffer = effects.get(name)
      if (!buffer) {
        void decodeEffects()
        return
      }
      if (c.context.state === 'suspended') void c.context.resume()
      const source = c.context.createBufferSource()
      source.buffer = buffer
      source.connect(c.effects)
      source.start()
    },
    loadMusic: async (url) => {
      if (disposed || musicUrl === url) return
      musicUrl = url
      try {
        const response = await fetch(url)
        if (!response.ok) return
        const bytes = await response.arrayBuffer()
        const c = ensureContext()
        if (!c) return
        musicBuffer = await c.context.decodeAudioData(bytes)
        sync()
      } catch {
        // No music is a complete experience too.
      }
    },
    dispose: () => {
      disposed = true
      unsubscribe()
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility)
      musicSource?.stop()
      musicSource = null
      void channels?.context.close()
      channels = null
    },
  }
}
