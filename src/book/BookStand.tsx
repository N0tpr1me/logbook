// The closed book on the desk (plan: Desk objects; Experience storyboard):
// a click anywhere on it opens it, hovering lifts it 3 mm, and after 3
// seconds without input it lifts and settles once per visit. Once the book
// is open the engine's own pointer handling takes over and this does nothing.

import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import type { Group } from 'three'
import type { BookController } from '@/book/engine/motion'
import type { DeskInteraction } from '@/book/desk/interaction'
import type { BookStore } from '@/book/state'

export interface BookStandProps {
  store: BookStore
  controller: BookController
  interaction: DeskInteraction
  /** The idle nudge waits for the reveal, then for 3 seconds of quiet. */
  armed: boolean
  position: readonly [number, number, number]
  rotation: readonly [number, number, number]
  children: ReactNode
}

const IDLE_MS = 3000
const LIFT = 0.003
const HOVER_S = 0.18
const IDLE_S = 0.35

export function BookStand({ store, controller, interaction, armed, position, rotation, children }: BookStandProps) {
  const group = useRef<Group>(null)
  const invalidate = useThree((s) => s.invalidate)
  const nudged = useRef(false)
  const tween = useRef<gsap.core.Tween | null>(null)
  const base = position[1]

  const isClosed = useCallback(() => store.get().mode === 'desk', [store])
  const instant = useCallback(() => store.get().reducedMotion || store.get().testMode, [store])

  const moveTo = useCallback(
    (y: number, duration: number, yoyo = false) => {
      const g = group.current
      if (!g) return
      tween.current?.kill()
      if (instant() && !yoyo) {
        g.position.y = y
        invalidate()
        return
      }
      tween.current = gsap.to(g.position, {
        y,
        duration,
        ease: 'expo.out',
        yoyo,
        repeat: yoyo ? 1 : 0,
        onUpdate: invalidate,
        onComplete: invalidate,
      })
    },
    [instant, invalidate],
  )

  // One-time idle nudge.
  useEffect(() => {
    if (!armed || nudged.current) return
    let timer = 0
    const lift = () => {
      if (nudged.current || !isClosed() || instant()) return
      nudged.current = true
      moveTo(base + LIFT, IDLE_S, true)
    }
    const arm = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(lift, IDLE_MS)
    }
    arm()
    const events = ['wheel', 'pointerdown', 'pointermove', 'keydown'] as const
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }))
    return () => {
      window.clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, arm))
    }
  }, [armed, base, isClosed, instant, moveTo])

  // The book settles flat whenever it opens.
  useEffect(
    () =>
      store.subscribe(() => {
        if (store.get().mode !== 'desk' && group.current && group.current.position.y !== base) moveTo(base, HOVER_S)
      }),
    [store, base, moveTo],
  )

  const onPointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (!isClosed() || !armed) return
    e.stopPropagation()
    document.body.style.cursor = 'pointer'
    interaction.set({ hovered: 'book' })
    moveTo(base + LIFT, HOVER_S)
  }
  const onPointerOut = () => {
    document.body.style.cursor = ''
    if (interaction.get().hovered === 'book') interaction.set({ hovered: null })
    if (isClosed()) moveTo(base, HOVER_S)
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!isClosed() || !armed) return
    e.stopPropagation()
    document.body.style.cursor = ''
    controller.open()
  }

  return (
    <group
      ref={group}
      position={[position[0], position[1], position[2]]}
      rotation={[rotation[0], rotation[1], rotation[2]]}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {children}
    </group>
  )
}
