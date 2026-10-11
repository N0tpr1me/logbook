import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@/styles/base.css'
import { App } from '@/app/App'

const root = document.getElementById('root')!
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
