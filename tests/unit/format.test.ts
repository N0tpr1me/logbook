// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { linePath, niceTicks, padDomain, scaleLinear } from '@/interactive/chartScale'
import { imcReplay } from '@/interactive/imcData'
import { formatCountdown, formatDate, formatMinutes, joinNames, productName } from '@/paper/format'

describe('format helpers', () => {
  it('writes dates in full', () => {
    expect(formatDate('2026-04-12')).toBe('12 April 2026')
    expect(formatDate('2024-11-05')).toBe('5 November 2024')
    expect(formatDate('April 2026')).toBe('April 2026')
  })

  it('writes product names in sentence case', () => {
    expect(productName('ASH_COATED_OSMIUM')).toBe('Ash coated osmium')
    expect(productName('INTARIAN_PEPPER_ROOT')).toBe('Intarian pepper root')
  })

  it('formats minutes and countdowns', () => {
    expect(formatMinutes(5.46)).toBe('5 min 28 s')
    expect(formatMinutes(0.86)).toBe('52 s')
    expect(formatCountdown(5.46)).toBe('5:28')
    expect(formatCountdown(0)).toBe('0:00')
  })

  it('joins names with commas and "and"', () => {
    expect(joinNames(['Usman Hakimi', 'Haseeb Janjua', 'Karim Khalifa'])).toBe('Usman Hakimi, Haseeb Janjua and Karim Khalifa')
    expect(joinNames(['One'])).toBe('One')
  })
})

describe('chart scale', () => {
  it('maps a domain onto a range linearly', () => {
    const x = scaleLinear([0, 100], [10, 210])
    expect(x(0)).toBe(10)
    expect(x(50)).toBe(110)
    expect(x(100)).toBe(210)
  })

  it('chooses round tick steps', () => {
    expect(niceTicks(0, 100, 4)).toEqual([0, 50, 100])
    expect(niceTicks(0, 100, 10)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
    expect(niceTicks(-500, 7500, 4)).toEqual([0, 2000, 4000, 6000])
  })

  it('pads a domain and builds a path', () => {
    expect(padDomain([0, 100], 0.1)).toEqual([-10, 110])
    expect(linePath([[0, 0], [10, 5.25]])).toBe('M0.0 0.0 L10.0 5.3')
    expect(linePath([])).toBe('')
  })
})

describe('imcReplay', () => {
  it('parses both products with series and trades in time order', () => {
    const data = imcReplay()
    expect(data.products).toHaveLength(2)
    for (const product of data.products) {
      expect(product.series.length).toBeGreaterThan(10)
      expect(product.series[product.series.length - 1].pnl).toBe(product.finalPnl)
      const times = product.series.map((s) => s.t)
      expect([...times].sort((a, b) => a - b)).toEqual(times)
      for (const trade of product.trades) expect(['buy', 'sell']).toContain(trade.side)
    }
    expect(data.products.reduce((sum, p) => sum + p.finalPnl, 0)).toBe(data.totalPnl)
  })
})
