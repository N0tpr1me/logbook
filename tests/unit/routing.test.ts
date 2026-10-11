// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { chapters, siteMeta } from '@/content/content'
import { barLabel, chapterAddresses, chapterDescription, chapterForPath, documentTitle, isPrintPath, pageNumbers, parsePrintPath } from '@/routing/routes'

describe('chapterForPath', () => {
  it('finds a chapter by its address, with or without a trailing slash', () => {
    expect(chapterForPath('/dronemedic').id).toBe('dronemedic')
    expect(chapterForPath('/dronemedic/').id).toBe('dronemedic')
    expect(chapterForPath('/').id).toBe('contents')
  })

  it('falls back to the contents for an unknown address', () => {
    expect(chapterForPath('/nowhere').id).toBe('contents')
    expect(chapterForPath('/__page/dronemedic/left').id).toBe('contents')
  })
})

describe('documentTitle and chapterDescription', () => {
  it('uses the site title on the contents and "Title · Zain Ali" elsewhere', () => {
    expect(documentTitle(chapterForPath('/'))).toBe(siteMeta.title)
    expect(documentTitle(chapterForPath('/dronemedic'))).toBe('DroneMedic · Zain Ali')
    expect(documentTitle(chapterForPath('/contact'))).toBe("Let's talk · Zain Ali")
  })

  it('describes a chapter by its result line', () => {
    expect(chapterDescription(chapterForPath('/'))).toBe(siteMeta.description)
    expect(chapterDescription(chapterForPath('/dronemedic'))).toBe(chapterForPath('/dronemedic').result)
  })
})

describe('print paths', () => {
  it('recognises page, cover and back routes', () => {
    expect(isPrintPath('/__page/cover')).toBe(true)
    expect(isPrintPath('/dronemedic')).toBe(false)
    expect(parsePrintPath('/__page/cover')).toEqual({ kind: 'cover' })
    expect(parsePrintPath('/__page/back')).toEqual({ kind: 'back' })
    const page = parsePrintPath('/__page/dronemedic/left')
    expect(page?.kind).toBe('page')
    if (page?.kind === 'page') {
      expect(page.chapter.id).toBe('dronemedic')
      expect(page.side).toBe('left')
    }
  })

  it('rejects malformed or unknown page routes', () => {
    expect(parsePrintPath('/__page/dronemedic/middle')).toBeNull()
    expect(parsePrintPath('/__page/unknown/left')).toBeNull()
    expect(parsePrintPath('/__page/')).toBeNull()
    expect(parsePrintPath('/__page/chandrayaan/left')).toBeNull() // switched off in features.ts
    expect(parsePrintPath('/dronemedic')).toBeNull()
  })
})

describe('pageNumbers', () => {
  it('gives spread k the pages 2k-1 and 2k', () => {
    expect(pageNumbers(chapters[0])).toEqual({ left: 1, right: 2 })
    expect(pageNumbers(chapters[1])).toEqual({ left: 3, right: 4 })
    const last = chapters[chapters.length - 1]
    expect(pageNumbers(last).right).toBe(chapters.length * 2)
  })
})

describe('chapterAddresses and barLabel', () => {
  it('lists every chapter in book order with its address', () => {
    const addresses = chapterAddresses()
    expect(addresses.map((a) => a.path)).toEqual(chapters.map((c) => c.path))
    expect(addresses[0].path).toBe('/')
    expect(addresses[addresses.length - 1].id).toBe('contact')
  })

  it('shortens the contact label for the bar', () => {
    expect(barLabel(chapterForPath('/contact'))).toBe('Contact')
    expect(barLabel(chapterForPath('/dronemedic'))).toBe('DroneMedic')
  })
})
