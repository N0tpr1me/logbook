// A contact card built in the browser (plan: The contact page), so the phone
// number never sits in a file on the server. Pure, so it is unit tested.

export interface VCardInput {
  name: string
  email?: string
  tel?: string
  url?: string
}

export const VCARD_FILENAME = 'Zain-Ali.vcf'

/** vCard text values escape backslashes, commas, semicolons and line breaks (RFC 6350). */
export function escapeVCardValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function splitName(name: string): { given: string; family: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { given: '', family: '' }
  if (parts.length === 1) return { given: parts[0], family: '' }
  return { given: parts.slice(0, -1).join(' '), family: parts[parts.length - 1] }
}

/** A vCard 3.0 string with CRLF line endings, the form phones and address books read. */
export function buildVCard({ name, email, tel, url }: VCardInput): string {
  const { given, family } = splitName(name)
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCardValue(family)};${escapeVCardValue(given)};;;`,
    `FN:${escapeVCardValue(name)}`,
    ...(email ? [`EMAIL;TYPE=INTERNET:${escapeVCardValue(email)}`] : []),
    ...(tel ? [`TEL;TYPE=CELL:${escapeVCardValue(tel)}`] : []),
    ...(url ? [`URL:${escapeVCardValue(url)}`] : []),
    'END:VCARD',
  ]
  return `${lines.join('\r\n')}\r\n`
}
