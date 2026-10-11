// Generates the three sound effects as small WAV files (plan: Sound and
// music; effects under 150 KB in total).
//
//   node scripts/assets/make-sounds.mjs
//
//   page.wav        a 180ms band-passed noise swish with an envelope
//   clink.wav       a short decaying sine at about 3.2kHz with a harmonic
//   lamp-click.wav  two 8ms clicks
//
// 32 kHz mono 16-bit: small, and the clink's 6.6 kHz harmonic sits well below
// the Nyquist limit. The music track is not generated here; see
// public/assets/sounds/README.md.

import { mkdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, '..', '..', 'public', 'assets', 'sounds')
const SAMPLE_RATE = 32000

/** Deterministic noise so the files are reproducible. */
function makeRandom(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

/** Biquad band-pass, direct form 1. */
function bandPass(samples, centreHz, q) {
  const w0 = (2 * Math.PI * centreHz) / SAMPLE_RATE
  const alpha = Math.sin(w0) / (2 * q)
  const b0 = alpha
  const b1 = 0
  const b2 = -alpha
  const a0 = 1 + alpha
  const a1 = -2 * Math.cos(w0)
  const a2 = 1 - alpha
  const out = new Float32Array(samples.length)
  let x1 = 0
  let x2 = 0
  let y1 = 0
  let y2 = 0
  for (let i = 0; i < samples.length; i += 1) {
    const x0 = samples[i]
    const y0 = (b0 / a0) * x0 + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2
    out[i] = y0
    x2 = x1
    x1 = x0
    y2 = y1
    y1 = y0
  }
  return out
}

function normalise(samples, peak) {
  let max = 0
  for (const v of samples) max = Math.max(max, Math.abs(v))
  const gain = max > 0 ? peak / max : 1
  return samples.map((v) => v * gain)
}

function seconds(s) {
  return Math.round(s * SAMPLE_RATE)
}

/** A paper swish: noise through a sweeping band-pass with a rise-and-fall envelope. */
function page() {
  const length = seconds(0.18)
  const random = makeRandom(7)
  const noise = new Float32Array(length).map(() => random() * 2 - 1)
  const low = bandPass(noise, 1400, 0.9)
  const high = bandPass(noise, 3600, 1.2)
  const out = new Float32Array(length)
  for (let i = 0; i < length; i += 1) {
    const t = i / length
    const attack = Math.min(1, t / 0.25)
    const decay = Math.pow(1 - t, 1.6)
    const sweep = t // more high end as the page passes
    out[i] = (low[i] * (1 - sweep * 0.6) + high[i] * (0.3 + sweep * 0.7)) * attack * decay
  }
  return normalise(out, 0.7)
}

/** A ceramic clink: 3.2 kHz with an inharmonic partial, decaying fast. */
function clink() {
  const length = seconds(0.26)
  const out = new Float32Array(length)
  for (let i = 0; i < length; i += 1) {
    const t = i / SAMPLE_RATE
    const envelope = Math.exp(-t * 26)
    const strike = Math.exp(-t * 180) * 0.4
    out[i] =
      (Math.sin(2 * Math.PI * 3200 * t) * 1.0 + Math.sin(2 * Math.PI * 6650 * t) * 0.35 + Math.sin(2 * Math.PI * 1150 * t) * 0.12) * envelope +
      Math.sin(2 * Math.PI * 2400 * t) * strike
  }
  // A 2ms fade-in avoids a click at the start.
  for (let i = 0; i < seconds(0.002); i += 1) out[i] *= i / seconds(0.002)
  return normalise(out, 0.55)
}

/** Two 8ms clicks 55ms apart: the switch going over and seating. */
function lampClick() {
  const length = seconds(0.09)
  const random = makeRandom(11)
  const out = new Float32Array(length)
  const click = (startSeconds, level, tone) => {
    const start = seconds(startSeconds)
    const span = seconds(0.008)
    for (let i = 0; i < span; i += 1) {
      const t = i / span
      const envelope = Math.exp(-t * 7) * (1 - t)
      const body = Math.sin(2 * Math.PI * tone * (i / SAMPLE_RATE)) * 0.6 + (random() * 2 - 1) * 0.4
      out[start + i] += body * envelope * level
    }
  }
  click(0.0, 0.8, 1900)
  click(0.055, 0.6, 1400)
  return normalise(out, 0.6)
}

function wav(samples) {
  const bytesPerSample = 2
  const dataSize = samples.length * bytesPerSample
  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28)
  buffer.writeUInt16LE(bytesPerSample, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)
  for (let i = 0; i < samples.length; i += 1) {
    const v = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.round(v * 32767), 44 + i * 2)
  }
  return buffer
}

mkdirSync(outDir, { recursive: true })
const files = { 'page.wav': page(), 'clink.wav': clink(), 'lamp-click.wav': lampClick() }
let total = 0
for (const [name, samples] of Object.entries(files)) {
  const path = join(outDir, name)
  writeFileSync(path, wav(samples))
  const size = statSync(path).size
  total += size
  process.stdout.write(`${name}: ${(size / 1024).toFixed(1)} KB\n`)
}
process.stdout.write(`total: ${(total / 1024).toFixed(1)} KB (budget 150 KB)\n`)
if (total > 150 * 1024) process.exitCode = 2
