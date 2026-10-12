// Prerenders the paper version to static HTML, one file per chapter address,
// plus sitemap.xml (plan: The paper version; Launch). Uses the server bundle
// from `vite build --ssr`, so no browser is needed and the same step runs on
// Vercel. Runs after `vite build`.
//
//   node scripts/prerender.mjs   → dist/index.html, dist/dronemedic/index.html, …

import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const SERVER_ENTRY = join(ROOT, 'dist-ssr', 'entry-server.js')

function fail(message) {
  console.error(`prerender: ${message}`)
  process.exit(1)
}

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const escapeText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

/** Replace or add one tag in the head. */
function setTag(head, pattern, replacement) {
  return pattern.test(head) ? head.replace(pattern, replacement) : head.replace('</head>', `    ${replacement}\n  </head>`)
}

function withHead(template, page) {
  const site = page.canonical ? page.canonical.replace(/\/(dronemedic|imc|ams|chandrayaan|about|contact)$/, '') : ''
  let html = template
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeText(page.title)}</title>`)
  html = setTag(html, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeAttr(page.description)}" />`)
  html = setTag(html, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeAttr(page.title)}" />`)
  html = setTag(html, /<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeAttr(page.description)}" />`)
  if (page.canonical) {
    html = setTag(html, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${escapeAttr(page.canonical)}" />`)
    html = setTag(html, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${escapeAttr(page.canonical)}" />`)
    html = html.replace(/<meta property="og:image" content="(\/[^"]*)" \/>/, (_, path) => `<meta property="og:image" content="${escapeAttr(site + path)}" />`)
  }
  const ld = `<script type="application/ld+json" id="structured-data">${page.structuredData.replace(/</g, '\\u003c')}</script>`
  html = setTag(html, /<script type="application\/ld\+json" id="structured-data">[^<]*<\/script>/, ld)
  return html
}

function withBody(html, rendered) {
  // The instant shell inside #root is replaced by the rendered chapter pages.
  // Vite hoists the module script into the head, so #root is the last element in the body.
  const start = html.indexOf('<div id="root">')
  const bodyEnd = html.indexOf('</body>', start)
  const rootEnd = bodyEnd < 0 ? -1 : html.lastIndexOf('</div>', bodyEnd)
  if (start < 0 || rootEnd < 0) fail('dist/index.html has no #root inside the body')
  return `${html.slice(0, start)}<div id="root">${rendered}${html.slice(rootEnd)}`
}

/** A chapter address opens at its chapter before the first paint, so the page never jumps once scripts run. */
function withInitialScroll(html, page) {
  if (page.id === 'contents') return html
  const snippet =
    `<script>(function(){var e=document.getElementById(${JSON.stringify(page.id)});` +
    `if(e){history.scrollRestoration='manual';e.scrollIntoView({block:'start'})}})()</script>`
  return html.replace('</body>', `${snippet}\n  </body>`)
}

async function writePage(path, html) {
  const dir = path === '/' ? DIST : join(DIST, path.replace(/^\/+/, ''))
  await mkdir(dir, { recursive: true })
  const file = join(dir, 'index.html')
  await writeFile(file, html, 'utf8')
  return file
}

async function writeSitemap(urls) {
  if (urls.length === 0) return
  const today = new Date().toISOString().slice(0, 10)
  const body = urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
  await writeFile(join(DIST, 'sitemap.xml'), xml, 'utf8')
  console.log(`prerender: sitemap.xml with ${urls.length} addresses`)
}

async function main() {
  if (!existsSync(join(DIST, 'index.html'))) fail('dist/index.html is missing. Run `vite build` first.')
  if (!existsSync(SERVER_ENTRY)) fail('dist-ssr/entry-server.js is missing. Run `vite build --ssr src/entry-server.tsx --outDir dist-ssr` first.')
  const template = await readFile(join(DIST, 'index.html'), 'utf8')
  const server = await import(pathToFileURL(SERVER_ENTRY).href)
  const canonicals = []
  for (const route of server.routes) {
    const page = server.render(route.id)
    const html = withInitialScroll(withBody(withHead(template, page), page.html), page)
    const file = await writePage(page.path, html)
    if (page.canonical) canonicals.push(page.canonical)
    console.log(`prerender: ${page.path} → ${file.replace(ROOT, '.')} (${page.title})`)
  }
  await writeSitemap(canonicals)
}

main().catch((error) => fail(error instanceof Error ? (error.stack ?? error.message) : String(error)))
