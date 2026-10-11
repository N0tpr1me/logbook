// The coffee stir, keyframed in code (plan: The coffee mug, in detail).
//
//   0 to 0.25s     the spoon lifts off the coaster, turns upright and moves over the mug
//   0.25 to 0.45s  it dips in; a ripple ring spreads across the surface
//   0.45 to 1.6s   two full circles in one ease-in-out; the coffee swirls
//   1.6 to 1.8s    the spoon lifts out, taps the rim once (clink) and returns to the coaster
//   1.8 to 4s      the swirl settles; the "Now" note fades in at 1.8s
//
// Clicking again mid-stir adds one more circle; it never restarts or queues.
// Framework-free so it can be unit-tested and driven from any renderer.

import gsap from 'gsap'

export interface SpoonPose {
  /** Position of the spoon's bowl in mug space, metres. */
  x: number
  y: number
  z: number
  /** Yaw about the mug axis and lean from vertical, radians. */
  rotY: number
  rotZ: number
}

export interface StirTargets {
  pose: SpoonPose
  /** Stir angle in radians; drives the bowl position during the circles. */
  angle: number
  /** 0 to 1, drives the coffee shader's twist. */
  swirl: number
  /** 0 to 1, the ripple ring's radius as a share of the surface. 0 hides it. */
  ripple: number
}

export const MUG = {
  radius: 0.04,
  rim: 0.101,
  coffeeY: 0.082,
  innerRadius: 0.0352,
} as const

export const STIR = {
  radius: 0.02,
  dipY: 0.07,
  hoverY: 0.128,
  lean: -0.38,
  circles: 2,
  circlesDuration: 1.15,
} as const

/** Lying on the coaster beside the mug, handle out towards the desk. */
export const REST_POSE: SpoonPose = { x: 0.03, y: 0.0098, z: 0.046, rotY: -0.65, rotZ: -Math.PI / 2 }

export type StirPhase = 'idle' | 'lift' | 'dip' | 'circles' | 'out' | 'settle'

export interface StirCallbacks {
  /** The spoon taps the rim: play the clink. */
  onTap: () => void
  /** 1.8s: show the note. */
  onNote: () => void
  /** The sequence has fully settled or was cancelled. */
  onDone: () => void
  /** Ask the renderer to draw a frame. */
  invalidate: () => void
}

export function createStirTargets(): StirTargets {
  return { pose: { ...REST_POSE }, angle: 0, swirl: 0, ripple: 0 }
}

export function createStirSequencer(targets: StirTargets, callbacks: StirCallbacks) {
  let phase: StirPhase = 'idle'
  let animations: gsap.core.Animation[] = []
  let angleTween: gsap.core.Tween | null = null
  let angleTarget = 0
  const angularSpeed = (STIR.circles * Math.PI * 2) / STIR.circlesDuration

  const track = <T extends gsap.core.Animation>(animation: T): T => {
    animations = [...animations, animation]
    return animation
  }
  const killAll = () => {
    animations.forEach((a) => a.kill())
    animations = []
    angleTween = null
  }
  const { invalidate } = callbacks
  const pose = targets.pose

  const applyAngle = () => {
    pose.x = Math.cos(targets.angle) * STIR.radius
    pose.z = Math.sin(targets.angle) * STIR.radius
    pose.rotY = -targets.angle
    invalidate()
  }

  const settle = () => {
    phase = 'settle'
    callbacks.onNote()
    track(gsap.to(targets, { swirl: 0, duration: 2.2, ease: 'power2.out', onUpdate: invalidate, onComplete: finish }))
    track(gsap.to(pose, { ...REST_POSE, duration: 0.25, ease: 'power2.inOut', onUpdate: invalidate }))
  }

  const finish = () => {
    phase = 'idle'
    animations = []
    callbacks.onDone()
  }

  const out = () => {
    phase = 'out'
    const tl = gsap.timeline({ onUpdate: invalidate, onComplete: settle })
    tl.to(pose, { y: STIR.hoverY, duration: 0.07, ease: 'power2.out' })
    tl.to(pose, { x: MUG.radius + 0.002, z: 0, rotY: 0, rotZ: -0.55, duration: 0.05, ease: 'power1.inOut' })
    tl.to(pose, { y: MUG.rim + 0.004, duration: 0.04, ease: 'power2.in', onComplete: callbacks.onTap })
    tl.to(pose, { y: MUG.rim + 0.014, duration: 0.04, ease: 'power2.out' })
    track(tl)
  }

  const circles = () => {
    phase = 'circles'
    angleTarget = STIR.circles * Math.PI * 2
    targets.angle = 0
    angleTween = track(
      gsap.to(targets, {
        angle: angleTarget,
        duration: STIR.circlesDuration,
        ease: 'sine.inOut',
        onUpdate: applyAngle,
        onComplete: out,
      }),
    )
    track(gsap.to(targets, { swirl: 1, duration: STIR.circlesDuration, ease: 'sine.inOut', onUpdate: invalidate }))
    track(gsap.fromTo(targets, { ripple: 0.04 }, { ripple: 1, duration: 0.6, ease: 'power1.out', onUpdate: invalidate }))
  }

  const dip = () => {
    phase = 'dip'
    track(gsap.to(pose, { y: STIR.dipY, duration: 0.2, ease: 'power2.in', onUpdate: invalidate, onComplete: circles }))
  }

  const lift = () => {
    phase = 'lift'
    track(
      gsap.to(pose, {
        x: STIR.radius,
        y: STIR.hoverY,
        z: 0,
        rotY: 0,
        rotZ: STIR.lean,
        duration: 0.25,
        ease: 'power2.inOut',
        onUpdate: invalidate,
        onComplete: dip,
      }),
    )
  }

  /** Start a stir. With `instant`, jump to the settled end state. */
  const start = (instant: boolean) => {
    if (phase !== 'idle') return
    killAll()
    if (instant) {
      Object.assign(pose, REST_POSE)
      targets.swirl = 0
      targets.ripple = 0
      invalidate()
      callbacks.onNote()
      callbacks.onDone()
      return
    }
    lift()
  }

  /** Mid-stir click: one more circle at the same speed. Returns false outside the circles. */
  const addCircle = (): boolean => {
    if (phase !== 'circles') return false
    angleTarget += Math.PI * 2
    const remaining = angleTarget - targets.angle
    angleTween?.kill()
    angleTween = track(
      gsap.to(targets, {
        angle: angleTarget,
        duration: remaining / angularSpeed,
        ease: 'sine.out',
        onUpdate: applyAngle,
        onComplete: out,
      }),
    )
    return true
  }

  /** Another object was clicked: return smoothly to rest. */
  const cancel = () => {
    if (phase === 'idle') return
    killAll()
    phase = 'idle'
    gsap.to(pose, { ...REST_POSE, duration: 0.3, ease: 'power2.inOut', onUpdate: invalidate })
    gsap.to(targets, { swirl: 0, ripple: 0, duration: 0.3, ease: 'power2.out', onUpdate: invalidate, onComplete: callbacks.onDone })
  }

  const dispose = () => {
    killAll()
    phase = 'idle'
  }

  return { start, addCircle, cancel, dispose, phase: () => phase }
}

export type StirSequencer = ReturnType<typeof createStirSequencer>
