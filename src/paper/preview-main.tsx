// Development harness for the paper version, reached at /src/paper/preview.html
// on the dev server. It mounts PaperSite without the version decision or the
// 3D book, and ?page=/__page/<chapter>/<side> mounts one print page instead.
// Not part of the production build (only index.html is bundled).

import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@/styles/base.css'
import { decideVersion } from '@/app/version'
import { PaperSite } from './PaperSite'
import { PrintPage } from './PrintPage'

const params = new URLSearchParams(window.location.search)
const page = params.get('page')
const decision = { ...decideVersion(), version: 'paper' as const }

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <React.StrictMode>{page ? <PrintPage pathname={page} /> : <PaperSite decision={decision} loadingBook={params.get('loading') === '1'} />}</React.StrictMode>,
  )
}
