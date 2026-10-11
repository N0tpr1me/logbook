// Compresses the DroneMedic airframe for the desk (plan: Loading and
// performance, 3D models budget 1.5 MB with Meshopt compression).
//
//   node scripts/assets/compress-drone.mjs [source.glb] [out.glb]
//
// Source: the Tripo export (833k triangles, three 4096 JPEG textures, 26 MB).
// Output: about 40k triangles, 1024 WebP textures, Meshopt-compressed, under
// 1.5 MB. Every step is a gltf-transform CLI call so the pipeline is
// reproducible without a Blender install.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, statSync, copyFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..', '..')

const DEFAULT_SOURCE = '/Users/zainali/Desktop/Projects/DroneMedic/DroneMedic 3D Model.glb'
const DEFAULT_OUT = join(projectRoot, 'public', 'assets', 'models', 'drone.glb')
const CLI = '@gltf-transform/cli@4.5.1'
const SIMPLIFY_RATIO = '0.05'
const SIMPLIFY_ERROR = '0.001'
const TEXTURE_SIZE = '1024'
const SIZE_BUDGET_BYTES = 1.5 * 1024 * 1024

const source = process.argv[2] ?? DEFAULT_SOURCE
const out = process.argv[3] ?? DEFAULT_OUT

function gltf(args, label) {
  process.stdout.write(`\n== ${label}\n`)
  execFileSync('npx', ['--yes', CLI, ...args], { stdio: 'inherit' })
}

function sizeOf(file) {
  return statSync(file).size
}

function run() {
  const work = mkdtempSync(join(tmpdir(), 'drone-'))
  const step = (n) => join(work, `step-${n}.glb`)

  // 1. Remove unused data and merge identical accessors so simplify sees one clean mesh.
  gltf(['prune', source, step(1)], 'prune')
  gltf(['dedup', step(1), step(2)], 'dedup')
  // 2. Weld vertices so the simplifier can collapse across seams, then decimate.
  gltf(['weld', step(2), step(3)], 'weld')
  gltf(['simplify', step(3), step(4), '--ratio', SIMPLIFY_RATIO, '--error', SIMPLIFY_ERROR], 'simplify')
  // 3. Textures: 4096 JPEG to 1024 WebP (the desk shows the drone at about 10 cm on screen).
  gltf(['resize', step(4), step(5), '--width', TEXTURE_SIZE, '--height', TEXTURE_SIZE], 'resize textures')
  gltf(['webp', step(5), step(6)], 'webp textures')
  // 4. Quantise and Meshopt-compress the geometry.
  gltf(['meshopt', step(6), step(7), '--level', 'medium'], 'meshopt')

  mkdirSync(dirname(out), { recursive: true })
  copyFileSync(step(7), out)

  const bytes = sizeOf(out)
  const mb = (bytes / 1024 / 1024).toFixed(2)
  process.stdout.write(`\n== wrote ${out} (${mb} MB)\n`)
  if (bytes > SIZE_BUDGET_BYTES) {
    process.stdout.write(`!! over the 1.5 MB budget; lower SIMPLIFY_RATIO or TEXTURE_SIZE\n`)
    process.exitCode = 2
  }
  gltf(['inspect', out], 'inspect')
}

run()
