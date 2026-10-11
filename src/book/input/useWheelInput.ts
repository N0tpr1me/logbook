// Wheel input: wheel-gestures groups a flick with the coasting it causes;
// the flick detector turns one page per gesture. The page behind never
// scrolls (wheel-gestures calls preventDefault on the observed element).

import { useEffect } from 'react'
import { WheelGestures } from 'wheel-gestures'
import type { BookController } from '@/book/engine/motion'
import type { BookStore } from '@/book/state'
import { createFlickDetector, type FlickOptions } from './flick'

export interface WheelInputOptions extends FlickOptions {
  /** The element that receives wheel events (the canvas container). */
  element: HTMLElement | null
  enabled?: boolean
}

export function useWheelInput(store: BookStore, controller: BookController, options: WheelInputOptions): void {
  const { element, enabled = true, threshold, verticalRatio } = options

  useEffect(() => {
    if (!element || !enabled) return
    const detector = createFlickDetector({ threshold, verticalRatio })
    const gestures = WheelGestures({ preventWheelAction: true, reverseSign: false })
    const unobserve = gestures.observe(element)
    const off = gestures.on('wheel', (state) => {
      const direction = detector.feed({
        isStart: state.isStart,
        isEnding: state.isEnding,
        isMomentum: state.isMomentum,
        axisMovement: state.axisMovement,
      })
      if (direction === 0) return
      if (store.get().dragging) {
        detector.suspend()
        return
      }
      controller.turn(direction)
    })
    // A gesture already coasting when we start listening is ignored until it ends.
    const unsubscribe = store.subscribe(() => {
      if (store.get().dragging) detector.suspend()
    })
    return () => {
      off()
      unobserve()
      gestures.disconnect()
      unsubscribe()
    }
  }, [element, enabled, store, controller, threshold, verticalRatio])
}
