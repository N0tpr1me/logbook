import { lazy, Suspense, useMemo, useState, type ComponentType } from 'react'
import { decideVersion, type VersionDecision } from '@/app/version'
import { features } from '@/config/features'
import { PaperSite } from '@/paper/PaperSite'
import { isPrintPath } from '@/routing'

// The 3D book is lazy so phones never download three.js.
const BookSite = lazy(() => import('@/book/BookSite'))

// Development harnesses for the 3D parts, reached with ?dev=book or ?dev=desk.
// Resolved through a glob so a missing harness never breaks the dev server.
const devModules = import.meta.glob<{ default: ComponentType }>('@/dev/Dev*.tsx')
const devHarness = (name: string) => {
  const loader = devModules[`/src/dev/${name}.tsx`]
  return lazy(loader ?? (() => Promise.resolve({ default: () => <p>No {name} harness yet.</p> })))
}
const DevBook = devHarness('DevBook')
const DevDesk = devHarness('DevDesk')

export interface AppProps {
  /** The version decision made once at startup (plan: Who sees which version). */
  initialDecision?: VersionDecision
}

export function App({ initialDecision }: AppProps) {
  const [decision, setDecision] = useState<VersionDecision>(() => initialDecision ?? decideVersion())
  const useBook = useMemo(() => features.book3d && decision.version === 'book', [decision])
  const dev = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('dev') : null

  if (dev === 'book') return <Suspense fallback={null}><DevBook /></Suspense>
  if (dev === 'desk') return <Suspense fallback={null}><DevDesk /></Suspense>

  // Build-time page routes always render through the paper version.
  if (!useBook || isPrintPath(window.location.pathname)) {
    return (
      <PaperSite
        decision={decision}
        onOpenBookAnyway={() => setDecision({ ...decision, version: 'book', reason: 'forced-3d' })}
      />
    )
  }

  return (
    <Suspense fallback={<PaperSite decision={decision} loadingBook />}>
      <BookSite
        decision={decision}
        onFallback={(reason) => setDecision({ ...decision, version: 'paper', reason })}
      />
    </Suspense>
  )
}
