// Tiny chart helpers: a linear scale, tick values and an SVG line path.

export interface LinearScale {
  (value: number): number
  domain: [number, number]
  range: [number, number]
}

export function scaleLinear(domain: [number, number], range: [number, number]): LinearScale {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0 === 0 ? 1 : d1 - d0
  const scale = ((value: number) => r0 + ((value - d0) / span) * (r1 - r0)) as LinearScale
  scale.domain = domain
  scale.range = range
  return scale
}

/** Round tick values covering [min, max] at a step of 1, 2 or 5 times a power of ten. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [min]
  const rough = (max - min) / Math.max(1, count)
  const power = 10 ** Math.floor(Math.log10(rough))
  const candidates = [1, 2, 5, 10].map((m) => m * power)
  const step = candidates.find((c) => c >= rough) ?? candidates[candidates.length - 1]
  const first = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let v = first; v <= max + step / 1000; v += step) ticks.push(Number(v.toFixed(10)))
  return ticks
}

/** Pad a domain by a fraction on each side so lines never touch the frame. */
export function padDomain([min, max]: [number, number], fraction = 0.08): [number, number] {
  const span = max - min === 0 ? Math.abs(max) || 1 : max - min
  return [min - span * fraction, max + span * fraction]
}

export function linePath(points: readonly (readonly [number, number])[]): string {
  if (points.length === 0) return ''
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
}
