import { backCover, person } from '@/content/content'

const PRIVACY_NOTE =
  'Visits are counted with GoatCounter and errors are reported with Sentry. Neither sets cookies or stores personal data: ' +
  'GoatCounter is cookieless and the error reports leave out IP addresses. Both load after the page is interactive, ' +
  'and the site works fully if they are blocked. Nothing you type or copy here is sent anywhere.'

/** The back cover of the paper version: closing line, privacy note and how the site was built. */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="site-footer-closing">{backCover.closing}</p>
      <details className="site-footer-privacy">
        <summary>Privacy</summary>
        <p>{PRIVACY_NOTE}</p>
      </details>
      <p className="site-footer-built">
        <span className="site-footer-label">How this site was built. </span>
        {backCover.howBuilt}
      </p>
      <p className="site-footer-name">{person.name}</p>
    </footer>
  )
}
