// Renders every page of the logbook to an image for the 3D book, and records
// the link areas on each page, by screenshotting the /__page routes of the
// paper version (plan: Interactive pages; Assets to prepare).
//
//   npm run build:pages            uses the dev server on 5173 (starts it if needed)
//   PAGES_BASE=http://host:port    use another server

import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'

import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const BASE = process.env.PAGES_BASE ?? 'http://localhost:5173'
// fileURLToPath, not URL.pathname: the project folder has a space in its name.
const OUT_DIR = fileURLToPath(new URL('../public/assets/pages/', import.meta.url))
const AREAS_FILE = fileURLToPath(new URL('../src/data/link-areas.json', import.meta.url))
const PAGE_W = 1448
const PAGE_H = 2048

async function serverUp(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' })
    return r.ok || r.status === 404
  } catch {
    return false
  }
}

async function ensureServer() {
  if (await serverUp(BASE)) return null
  const child = spawn('npx', ['vite', '--port', '5173', '--strictPort'], { stdio: 'ignore', detached: true })
  for (let i = 0; i < 60; i++) {
    await sleep(500)
    if (await serverUp(BASE)) return child
  }
  child.kill()
  throw new Error(`Dev server did not start at ${BASE}`)
}

/** PNG to WebP (quality 0.9) using Chromium's own encoder, so no native tool is needed. */
async function toWebp(browser, png, webp) {
  const { readFile, unlink } = await import('node:fs/promises')
  const data = (await readFile(png)).toString('base64')
  const page = await browser.newPage()
  const dataUrl = await page.evaluate(async (src) => {
    const img = new Image()
    img.src = `data:image/png;base64,${src}`
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d').drawImage(img, 0, 0)
    return canvas.toDataURL('image/webp', 0.9)
  }, data)
  await page.close()
  const { writeFile } = await import('node:fs/promises')
  await writeFile(webp, Buffer.from(dataUrl.split(',')[1], 'base64'))
  await unlink(png)
}

async function routes() {
  // Mirror of src/book/spreads.ts printRoutes(), kept in plain JS for the build.
  // Chandrayaan-3 joins the list once features.chapters.chandrayaan is on.
  const ids = ['contents', 'dronemedic', 'imc', 'ams', 'about', 'contact']
  const list = [
    { name: 'cover', route: '/__page/cover' },
    { name: 'back', route: '/__page/back' },
  ]
  for (const id of ids) {
    list.push({ name: `${id}-left`, route: `/__page/${id}/left` })
    list.push({ name: `${id}-right`, route: `/__page/${id}/right` })
  }
  return list
}

async function main() {
  const server = await ensureServer()
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: PAGE_W, height: PAGE_H }, deviceScaleFactor: 1 })
  const areas = {}
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  for (const { name, route } of await routes()) {
    await page.goto(`${BASE}${route}?simple=1&test=1`, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await sleep(150)
    const target = page.locator('.print-box').first()
    if ((await target.count()) === 0) throw new Error(`No .print-box on ${route}`)
    await page.waitForSelector('[data-print-ready="1"]', { timeout: 10000 }).catch(() => undefined)
    const png = join(OUT_DIR, `${name}.png`)
    const webp = join(OUT_DIR, `${name}.webp`)
    await target.screenshot({ path: png })
    await toWebp(browser, png, webp)
    const json = await page.locator('#link-areas').textContent().catch(() => null)
    areas[name] = json ? JSON.parse(json) : []
    process.stdout.write(`rendered ${name} (${areas[name].length} links)\n`)
  }

  await writeFile(AREAS_FILE, JSON.stringify(areas, null, 2))
  await browser.close()
  if (server) process.kill(-server.pid)
  if (errors.length) {
    process.stderr.write(`Page errors:\n${errors.join('\n')}\n`)
    process.exit(1)
  }
}

main().catch((e) => {
  process.stderr.write(`${e.stack ?? e}\n`)
  process.exit(1)
})
