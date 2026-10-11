// The IMC backtest dataset, checked once at the boundary so the chart and the
// replay can trust its shape. A malformed file throws, and the error boundary
// shows the still fallback instead of a broken chart.

import raw from '@/data/imc-replay.json'

export type TradeSide = 'buy' | 'sell'

export interface ImcPoint {
  t: number
  mid: number
  pnl: number
}

export interface ImcTrade {
  t: number
  price: number
  qty: number
  side: TradeSide
}

export interface ImcProduct {
  name: string
  series: ImcPoint[]
  trades: ImcTrade[]
  finalPnl: number
}

export interface ImcReplayData {
  source: string
  kind: string
  day: number
  totalPnl: number
  products: ImcProduct[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toPoint(row: unknown): ImcPoint {
  if (!Array.isArray(row) || row.length < 3 || row.some((v) => typeof v !== 'number')) throw new Error('IMC series row is malformed')
  const [t, mid, pnl] = row as number[]
  return { t, mid, pnl }
}

function toTrade(row: unknown): ImcTrade {
  if (!Array.isArray(row) || row.length < 4) throw new Error('IMC trade row is malformed')
  const [t, price, qty, side] = row as unknown[]
  if (typeof t !== 'number' || typeof price !== 'number' || typeof qty !== 'number') throw new Error('IMC trade row is malformed')
  if (side !== 'buy' && side !== 'sell') throw new Error('IMC trade side is malformed')
  return { t, price, qty, side }
}

function toProduct(value: unknown): ImcProduct {
  if (!isRecord(value) || typeof value.name !== 'string' || !Array.isArray(value.series) || !Array.isArray(value.trades)) {
    throw new Error('IMC product is malformed')
  }
  // A tick with no quotes is logged as a mid of 0; it is carried forward from the previous tick
  // so the price line never plunges to zero.
  const series = value.series.map(toPoint).reduce<ImcPoint[]>((acc, point) => {
    const previous = acc[acc.length - 1]
    const mid = point.mid > 0 || !previous ? point.mid : previous.mid
    return [...acc, { ...point, mid }]
  }, [])
  return {
    name: value.name,
    series,
    trades: value.trades.map(toTrade),
    finalPnl: typeof value.finalPnl === 'number' ? value.finalPnl : 0,
  }
}

export function parseImcReplay(value: unknown): ImcReplayData {
  if (!isRecord(value) || !Array.isArray(value.products) || value.products.length === 0) throw new Error('IMC replay data is malformed')
  return {
    source: typeof value.source === 'string' ? value.source : '',
    kind: typeof value.kind === 'string' ? value.kind : '',
    day: typeof value.day === 'number' ? value.day : 0,
    totalPnl: typeof value.totalPnl === 'number' ? value.totalPnl : 0,
    products: value.products.map(toProduct),
  }
}

let cached: ImcReplayData | null = null

/** The dataset, parsed once. */
export function imcReplay(): ImcReplayData {
  if (!cached) cached = parseImcReplay(raw)
  return cached
}
