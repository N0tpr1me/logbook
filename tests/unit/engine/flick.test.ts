// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createFlickDetector, type FlickEvent } from '@/book/input/flick'

function event(movement: [number, number], flags: Partial<Pick<FlickEvent, 'isStart' | 'isEnding' | 'isMomentum'>> = {}): FlickEvent {
  return {
    isStart: flags.isStart ?? false,
    isEnding: flags.isEnding ?? false,
    isMomentum: flags.isMomentum ?? false,
    axisMovement: [movement[0], movement[1], 0],
  }
}

describe('flick detector', () => {
  it('turns one page per gesture, and the coasting after it never turns another', () => {
    const detector = createFlickDetector({ threshold: 40 })
    expect(detector.feed(event([0, 12], { isStart: true }))).toBe(0)
    expect(detector.feed(event([0, 30]))).toBe(0)
    expect(detector.feed(event([0, 48]))).toBe(1)
    expect(detector.feed(event([0, 160], { isMomentum: true }))).toBe(0)
    expect(detector.feed(event([0, 420], { isMomentum: true }))).toBe(0)
    expect(detector.feed(event([0, 430], { isMomentum: true, isEnding: true }))).toBe(0)
    expect(detector.inGesture()).toBe(false)
  })

  it('scrolling up goes back, and a fresh gesture after the last ended fires again', () => {
    const detector = createFlickDetector({ threshold: 40 })
    expect(detector.feed(event([0, -50], { isStart: true }))).toBe(-1)
    detector.feed(event([0, -90], { isEnding: true }))
    expect(detector.feed(event([0, 50], { isStart: true }))).toBe(1)
  })

  it('a gesture that reaches the threshold during momentum still counts once', () => {
    const detector = createFlickDetector({ threshold: 40 })
    expect(detector.feed(event([0, 20], { isStart: true }))).toBe(0)
    expect(detector.feed(event([0, 45], { isMomentum: true }))).toBe(1)
    expect(detector.feed(event([0, 300], { isMomentum: true }))).toBe(0)
  })

  it('sideways swipes do nothing, for the rest of that gesture', () => {
    const detector = createFlickDetector({ threshold: 40, verticalRatio: 1.5 })
    expect(detector.feed(event([60, 8], { isStart: true }))).toBe(0)
    expect(detector.feed(event([70, 200]))).toBe(0)
    detector.feed(event([70, 200], { isEnding: true }))
    expect(detector.feed(event([10, 50], { isStart: true }))).toBe(1)
  })

  it('a brush below the threshold turns nothing', () => {
    const detector = createFlickDetector({ threshold: 40 })
    expect(detector.feed(event([0, 10], { isStart: true }))).toBe(0)
    expect(detector.feed(event([0, 25], { isEnding: true }))).toBe(0)
  })

  it('a suspended gesture is ignored until it ends', () => {
    const detector = createFlickDetector({ threshold: 40 })
    detector.feed(event([0, 10], { isStart: true }))
    detector.suspend()
    expect(detector.feed(event([0, 200]))).toBe(0)
    expect(detector.feed(event([0, 400], { isEnding: true }))).toBe(0)
    expect(detector.feed(event([0, 60], { isStart: true }))).toBe(1)
  })

  it('a gesture already coasting when listening starts is ignored until it ends', () => {
    const detector = createFlickDetector({ threshold: 40 })
    expect(detector.feed(event([0, 200], { isMomentum: true }))).toBe(0)
    expect(detector.feed(event([0, 260], { isMomentum: true, isEnding: true }))).toBe(0)
    expect(detector.feed(event([0, 60], { isStart: true }))).toBe(1)
  })
})
