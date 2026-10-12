import { useMemo, useRef } from 'react'
import { imcReplay, type ImcProduct } from '@/interactive/imcData'
import { linePath, niceTicks, padDomain, scaleLinear } from '@/interactive/chartScale'
import { formatNumber, productName } from '@/paper/format'
import { useElementWidth, useInView, useReducedMotion } from '@/paper/hooks'

export interface ImcProfitChartProps {
  /** Print pages draw the chart complete at once. */
  variant?: 'live' | 'print'
}

const MARGIN = { top: 16, right: 16, bottom: 36, left: 60 }
const LINE_STYLES = ['profit-line-a', 'profit-line-b', 'profit-line-c']

/**
 * The running profit of each product from the backtest, drawn once when
 * scrolled into view (1.2s expo out, stroke-dashoffset; still with reduced motion).
 */
export function ImcProfitChart({ variant = 'live' }: ImcProfitChartProps) {
  const data = useMemo(() => imcReplay(), [])
  const box = useRef<HTMLDivElement>(null)
  const width = useElementWidth(box, 640)
  // A fixed on-screen height: the prerendered page and the hydrated page must not differ in height,
  // or the chapters below shift (and the browser's scroll anchoring jumps the page).
  const height = variant === 'print' ? 640 : 260
  const inView = useInView(box)
  const reduced = useReducedMotion()
  const drawn = variant === 'print' || reduced || inView

  const { x, y, maxT, ticks } = useMemo(() => {
    const allT = data.products.flatMap((p) => p.series.map((s) => s.t))
    const allPnl = data.products.flatMap((p) => p.series.map((s) => s.pnl))
    const tMax = Math.max(...allT, 1)
    const domain = padDomain([Math.min(0, ...allPnl), Math.max(0, ...allPnl)])
    return {
      maxT: tMax,
      x: scaleLinear([0, tMax], [MARGIN.left, width - MARGIN.right]),
      y: scaleLinear(domain, [height - MARGIN.bottom, MARGIN.top]),
      ticks: niceTicks(domain[0], domain[1], 4),
    }
  }, [data, width, height])

  const label = `Running profit over the day: ${data.products
    .map((p) => `${productName(p.name)} ${formatNumber(p.finalPnl)}`)
    .join(', ')}, total ${formatNumber(data.totalPnl)}`

  return (
    <div ref={box} className="chart profit-chart">
      <svg
        className="chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{ height }}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={label}
      >
        {ticks.map((tick) => (
          <g key={tick} className="chart-tick">
            <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} className={tick === 0 ? 'chart-zero' : 'chart-gridline'} />
            <text x={MARGIN.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" className="chart-label">
              {formatNumber(tick)}
            </text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text key={f} x={x(maxT * f)} y={height - 12} textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'} className="chart-label">
            {formatNumber(Math.round(maxT * f))}
          </text>
        ))}
        {data.products.map((product, i) => (
          <ProfitLine key={product.name} product={product} className={LINE_STYLES[i % LINE_STYLES.length]} drawn={drawn} x={x} y={y} />
        ))}
      </svg>
      <ul className="chart-legend" aria-label="Products">
        {data.products.map((product, i) => (
          <li key={product.name}>
            <span className={`legend-swatch ${LINE_STYLES[i % LINE_STYLES.length]}`} aria-hidden="true" />
            {productName(product.name)}: {formatNumber(product.finalPnl)}
          </li>
        ))}
        <li className="chart-legend-total">Total: {formatNumber(data.totalPnl)}</li>
      </ul>
      <p className="chart-axis-note">Across: timestamp through the day. Up: running profit.</p>
    </div>
  )
}

interface ProfitLineProps {
  product: ImcProduct
  className: string
  drawn: boolean
  x: (v: number) => number
  y: (v: number) => number
}

function ProfitLine({ product, className, drawn, x, y }: ProfitLineProps) {
  const d = useMemo(() => linePath(product.series.map((s) => [x(s.t), y(s.pnl)] as const)), [product, x, y])
  return <path d={d} pathLength={1} className={`profit-line ${className}${drawn ? ' is-drawn' : ''}`} />
}
