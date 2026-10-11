import { AddressBook, Copy, DownloadSimple, Envelope, GithubLogo, LinkedinLogo, Phone } from '@phosphor-icons/react'
import { contact, person, phoneDisplay, phoneNumber } from '@/content/content'
import { copyText } from './clipboard'
import { downloadBlob } from './download'
import { useAnnouncement } from './hooks'
import { buildVCard, VCARD_FILENAME } from './vcard'

export interface ContactBlockProps {
  /** The id for the heading, so the chapter can be labelled by it. */
  headingId?: string
  /** Print pages show the links only; the copy and save buttons need a browser. */
  variant?: 'live' | 'print'
}

/**
 * The contact page (plan: The contact page): email and phone with copy actions,
 * LinkedIn and GitHub in new tabs, the CV to download and a contact card built
 * in the browser. The number is assembled at render time, never in the source.
 */
export function ContactBlock({ headingId = 'contact-title', variant = 'live' }: ContactBlockProps) {
  const [message, announce] = useAnnouncement()
  const email = contact.email || ''
  const number = phoneNumber()
  const display = phoneDisplay()
  const live = variant === 'live'

  const copyEmail = async () => announce((await copyText(email)) ? 'Email copied' : 'Could not copy, so select the address instead')
  const copyNumber = async () => announce((await copyText(number)) ? 'Number copied' : 'Could not copy, so select the number instead')
  const saveContact = () => {
    const card = buildVCard({ name: person.name, email: email || undefined, tel: number || undefined, url: contact.siteUrl || undefined })
    const ok = downloadBlob(VCARD_FILENAME, new Blob([card], { type: 'text/vcard;charset=utf-8' }))
    announce(ok ? 'Contact saved' : 'Could not save the contact')
  }

  return (
    <div className="contact">
      <h2 id={headingId} className="contact-title hand">
        Let&rsquo;s talk
      </h2>
      <p className="contact-looking">{person.lookingFor}</p>

      <dl className="contact-rows">
        {email && (
          <div className="contact-row">
            <dt>
              <Envelope size={20} aria-hidden="true" />
              Email
            </dt>
            <dd>
              <a className="contact-value" href={`mailto:${email}`}>
                {email}
              </a>
              {live && (
                <button type="button" className="btn" onClick={copyEmail}>
                  <Copy size={20} aria-hidden="true" />
                  Copy email
                </button>
              )}
            </dd>
          </div>
        )}
        {number && (
          <div className="contact-row">
            <dt>
              <Phone size={20} aria-hidden="true" />
              Phone
            </dt>
            <dd>
              <a className="contact-value" href={`tel:${number}`}>
                {display}
              </a>
              {live && (
                <button type="button" className="btn" onClick={copyNumber}>
                  <Copy size={20} aria-hidden="true" />
                  Copy number
                </button>
              )}
            </dd>
          </div>
        )}
        {contact.linkedin && (
          <div className="contact-row">
            <dt>LinkedIn</dt>
            <dd>
              <a className="btn btn-link" href={contact.linkedin} target="_blank" rel="noopener noreferrer">
                <LinkedinLogo size={20} aria-hidden="true" />
                Open LinkedIn
              </a>
            </dd>
          </div>
        )}
        {contact.github && (
          <div className="contact-row">
            <dt>GitHub</dt>
            <dd>
              <a className="btn btn-link" href={contact.github} target="_blank" rel="noopener noreferrer">
                <GithubLogo size={20} aria-hidden="true" />
                Open GitHub
              </a>
            </dd>
          </div>
        )}
      </dl>

      <div className="contact-actions">
        <a className="btn btn-link" href={person.cv} download onClick={() => live && announce('CV downloaded')}>
          <DownloadSimple size={20} aria-hidden="true" />
          Download CV
        </a>
        {live && (
          <button type="button" className="btn" onClick={saveContact}>
            <AddressBook size={20} aria-hidden="true" />
            Save contact
          </button>
        )}
      </div>

      {live && (
        <p className="contact-status" role="status" aria-live="polite" data-testid="contact-status">
          {message}
        </p>
      )}
      {!email && !number && <p className="contact-note">Contact details are added at build time.</p>}
    </div>
  )
}
