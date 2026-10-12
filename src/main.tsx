import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@/styles/base.css'
import { App } from '@/app/App'
import { decideVersion } from '@/app/version'

const root = document.getElementById('root')!
const decision = decideVersion()
const app = (
  <React.StrictMode>
    <App initialDecision={decision} />
  </React.StrictMode>
)

// A prerendered paper page is hydrated in place, so the markup the visitor is
// already reading is kept rather than replaced (no flash, no scroll jump).
// Everything else, including the instant shell before the 3D book, is rendered fresh.
const prerendered = root.querySelector('[data-paper-site]') !== null
const plainPaper = decision.version === 'paper' && decision.reason !== 'reduced-motion' && decision.reason !== 'fallback'
if (prerendered && plainPaper) hydrateRoot(root, app)
else createRoot(root).render(app)
