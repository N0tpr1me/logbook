// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { buildVCard, escapeVCardValue, VCARD_FILENAME } from '@/paper/vcard'

describe('buildVCard', () => {
  it('builds a vCard 3.0 with CRLF line endings and every field', () => {
    const card = buildVCard({ name: 'Zain Ali', email: 'hello@example.com', tel: '+447000000000', url: 'https://zainali.dev' })
    const lines = card.split('\r\n')
    expect(lines[0]).toBe('BEGIN:VCARD')
    expect(lines[1]).toBe('VERSION:3.0')
    expect(lines).toContain('N:Ali;Zain;;;')
    expect(lines).toContain('FN:Zain Ali')
    expect(lines).toContain('EMAIL;TYPE=INTERNET:hello@example.com')
    expect(lines).toContain('TEL;TYPE=CELL:+447000000000')
    expect(lines).toContain('URL:https://zainali.dev')
    expect(lines[lines.length - 2]).toBe('END:VCARD')
    expect(card.endsWith('\r\n')).toBe(true)
    expect(card).not.toMatch(/[^\r]\n/)
  })

  it('leaves out fields that are missing', () => {
    const card = buildVCard({ name: 'Zain Ali' })
    expect(card).not.toContain('EMAIL')
    expect(card).not.toContain('TEL')
    expect(card).not.toContain('URL')
    expect(card).toContain('FN:Zain Ali')
  })

  it('splits multi-word names into family and given parts', () => {
    expect(buildVCard({ name: 'Mirza Zain Ali' })).toContain('N:Ali;Mirza Zain;;;')
    expect(buildVCard({ name: 'Zain' })).toContain('N:;Zain;;;')
  })

  it('escapes commas, semicolons, backslashes and line breaks', () => {
    expect(escapeVCardValue('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne')
    expect(buildVCard({ name: 'Ali, Zain' })).toContain('FN:Ali\\, Zain')
  })

  it('names the file after the person', () => {
    expect(VCARD_FILENAME).toBe('Zain-Ali.vcf')
  })
})
