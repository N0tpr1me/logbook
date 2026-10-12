// Server entry: renders the paper version of one chapter to HTML at build time
// (plan: The paper version is built as static HTML). No browser is involved,
// so the same step runs locally, in CI and on Vercel.
//
//   vite build --ssr src/entry-server.tsx --outDir dist-ssr
//   node scripts/prerender.mjs

import { renderToString } from 'react-dom/server'
import { PaperSite } from '@/paper/PaperSite'
import { chapters, contact, siteMeta, type ChapterId } from '@/content/content'
import { setServerRoute, structuredData } from '@/routing/navigate'
import { chapterDescription, documentTitle } from '@/routing/routes'

export interface RenderedPage {
  id: ChapterId
  path: string
  html: string
  title: string
  description: string
  /** Absolute canonical address when VITE_SITE_URL is set at build time. */
  canonical: string | null
  structuredData: string
}

const site = (contact.siteUrl || '').replace(/\/+$/, '')

export const routes: readonly { id: ChapterId; path: string }[] = chapters.map((c) => ({ id: c.id, path: c.path }))

export const siteTitle = siteMeta.title

export function render(id: ChapterId): RenderedPage {
  const chapter = chapters.find((c) => c.id === id) ?? chapters[0]
  setServerRoute(chapter.id)
  const html = renderToString(<PaperSite decision={{ version: 'paper', reason: 'ok', reducedMotion: false }} />)
  return {
    id: chapter.id,
    path: chapter.path,
    html,
    title: documentTitle(chapter),
    description: chapterDescription(chapter),
    canonical: site ? `${site}${chapter.path === '/' ? '' : chapter.path}` : null,
    structuredData: JSON.stringify(structuredData()),
  }
}
