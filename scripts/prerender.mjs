// Prerender the paper version to static HTML (plan: The paper version), one
// file per chapter address, so pages load fast, search engines can read them
// and link previews work. Runs after `vite build` against `vite preview`.
//
//   node scripts/prerender.mjs            → dist/index.html, dist/dronemedic/index.html, ...
//
// The app itself sets the title, description and link-preview tags for each
// chapter (src/routing/navigate.ts); this script captures the result.

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const PORT = 4173
const BASE = `http://localhost:${PORT}`
const SERVER_TIMEOUT_MS = 20_000
const PAGE_TIMEOUT_MS = 30_000

function fail(message) {
  console.error(`prerender: ${message}`)
  process.exit(1)
}

/** Start `vite preview` and resolve once it answers, or reject with a clear message. */
function startPreview() {
  const bin = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const child = spawn(bin, ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  })
  let output = ''
  child.stdout.on('data', (chunk) => {
    output += chunk
  })
  child.stderr.on('data', (chunk) => {
    output += chunk
  })
  const ready = new Promise((resolvePromise, reject) => {
    const started = Date.now()
    const poll = async () => {
      if (child.exitCode !== null) {
        reject(new Error(`vite preview exited with code ${child.exitCode}\n${output}`))
        return
      }
      try {
        const res = await fetch(`${BASE}/`)
        if (res.ok) {
          resolvePromise()
          return
        }
      } catch {
        // Not up yet.
      }
      if (Date.now() - started > SERVER_TIMEOUT_MS) {
        reject(new Error(`vite preview did not answer on port ${PORT} within ${SERVER_TIMEOUT_MS / 1000}s\n${output}`))
        return
      }
      setTimeout(poll, 250)
    }
    poll()
  })
  return { child, ready }
}

function stopPreview(child) {
  if (child.exitCode === null) child.kill('SIGTERM')
}

/** The chapter addresses, read from the chapter bar so the content file stays the single source. */
async function readRoutes(page) {
  await page.goto(`${BASE}/?simple=1`, { waitUntil: 'networkidle', timeout: PAGE_TIMEOUT_MS })
  await page.waitForSelector('[data-paper-site]', { timeout: PAGE_TIMEOUT_MS })
  const routes = await page.$$eval('a[data-chapter-link]', (links) =>
    links.map((a) => ({ path: a.getAttribute('href') ?? '/', label: a.textContent?.trim() ?? '' })),
  )
  if (routes.length === 0) throw new Error('no chapter links found in the chapter bar')
  return routes
}

async function captureRoute(page, route) {
  await page.goto(`${BASE}${route.path}?simple=1`, { waitUntil: 'networkidle', timeout: PAGE_TIMEOUT_MS })
  await page.waitForSelector('[data-paper-site]', { timeout: PAGE_TIMEOUT_MS })
  await page.evaluate(() => document.fonts.ready)
  return page.evaluate(() => {
    const doc = document.documentElement
    return { html: doc.outerHTML, title: document.title }
  })
}

async function writeRoute(route, html) {
  const dir = route.path === '/' ? DIST : join(DIST, route.path.replace(/^\/+/, ''))
  await mkdir(dir, { recursive: true })
  const file = join(dir, 'index.html')
  await writeFile(file, `<!doctype html>\n${html}\n`, 'utf8')
  return file
}

async function main() {
  if (!existsSync(join(DIST, 'index.html'))) fail('dist/index.html is missing. Run `vite build` first.')

  const { child, ready } = startPreview()
  try {
    await ready
  } catch (error) {
    stopPreview(child)
    fail(error instanceof Error ? error.message : String(error))
  }

  let browser = null
  try {
    browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    const routes = await readRoutes(page)
    for (const route of routes) {
      const { html, title } = await captureRoute(page, route)
      const file = await writeRoute(route, html)
      console.log(`prerender: ${route.path} → ${file.replace(ROOT, '.')} (${title})`)
    }
  } catch (error) {
    console.error(`prerender: ${error instanceof Error ? error.stack ?? error.message : String(error)}`)
    process.exitCode = 1
  } finally {
    if (browser) await browser.close()
    stopPreview(child)
  }
}

main()
