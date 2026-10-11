// Steam over the mug: three soft, see-through sprites that rise for 4 seconds
// after the desk appears and after each stir, then stop. Hovering the mug
// shows a thinner wisp (plan: "steam thickens slightly").

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { AdditiveBlending, type Sprite, SpriteMaterial } from 'three'
import { steamPuffTexture } from '../textures'
import { EXPO_OUT, HOVER_DURATION } from '../motion'

export interface SteamHandle {
  /** Start a 4 second puff. */
  burst: () => void
  /** A thin wisp while hovered. */
  setHover: (on: boolean) => void
}

export interface SteamProps {
  /** Height of the mug rim in local space. */
  rimY: number
}

const LAYERS = 3
const BURST_SECONDS = 4
const RISE = 0.13

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export const Steam = forwardRef<SteamHandle, SteamProps>(function Steam({ rimY }, ref) {
  const sprites = useRef<(Sprite | null)[]>([])
  const materials = useMemo(
    () =>
      Array.from({ length: LAYERS }, () => {
        return new SpriteMaterial({
          map: steamPuffTexture(),
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: AdditiveBlending,
          toneMapped: false,
        })
      }),
    [],
  )
  const state = useRef({ burstStart: -1, hover: 0, hoverTween: null as gsap.core.Tween | null })

  useImperativeHandle(ref, () => ({
    burst: () => {
      state.current.burstStart = performance.now() / 1000
    },
    setHover: (on) => {
      state.current.hoverTween?.kill()
      state.current.hoverTween = gsap.to(state.current, { hover: on ? 0.45 : 0, duration: HOVER_DURATION, ease: EXPO_OUT })
    },
  }))

  useFrame(({ clock, invalidate }) => {
    const now = performance.now() / 1000
    const s = state.current
    const since = s.burstStart < 0 ? Infinity : now - s.burstStart
    const burst = since > BURST_SECONDS ? 0 : smoothstep(0, 0.5, since) * (1 - smoothstep(BURST_SECONDS - 0.9, BURST_SECONDS, since))
    const level = Math.max(burst, s.hover)
    const active = level > 0.005 || (s.hoverTween?.isActive() ?? false)
    const t = clock.getElapsedTime()
    for (let i = 0; i < LAYERS; i += 1) {
      const sprite = sprites.current[i]
      if (!sprite) continue
      const life = (t * 0.45 + i / LAYERS) % 1
      const x = Math.sin(t * 1.1 + i * 2.1) * 0.012 * life
      const z = Math.cos(t * 0.8 + i * 1.3) * 0.008 * life
      sprite.position.set(x, rimY + 0.01 + life * RISE, z)
      const size = 0.045 + life * 0.09
      sprite.scale.set(size, size * 1.3, 1)
      materials[i].opacity = level * (1 - life) * (0.55 - i * 0.1) * Math.min(1, life * 3)
      materials[i].rotation = t * 0.2 * (i % 2 === 0 ? 1 : -1) + i
    }
    if (active) invalidate()
  })

  return (
    <group>
      {materials.map((material, i) => (
        <sprite
          key={i}
          ref={(el) => {
            sprites.current[i] = el
          }}
          material={material}
          raycast={() => null}
          renderOrder={5}
        />
      ))}
    </group>
  )
})
