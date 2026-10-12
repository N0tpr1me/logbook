import { useId, useMemo, useRef, useState } from 'react'
import { Pause, Play } from '@phosphor-icons/react'
import { formatNumber, productName } from '@/paper/format'
import { useElementWidth, useReducedMotion } from '@/paper/hooks'
import { linePath, niceTicks, padDomain, scaleLinear } from './chartScale'
import { imcReplay, type ImcProduct, type ImcTrade } from './imcData'
import { useReplayClock } from './useReplayClock'

export interface ImcReplayProps {
  /** The label from content, such as 'Test run on the IMC platform, day 0. Not the scored round.' */
  label: string
}

const PLAY_MS = 8000
const WIDE_MARGIN = { top: 16, right: 64, bottom: 36, left: 64 }
const NARROW_MARGIN = { top: 16, right: 44, bottom: 36, left: 52 }

/**
 * The backtest replayed: the price line, own trades as dots and the running
 * profit on a second axis. Drag the scrubber through the day or press Play;
 * switch between products.
 */
export function ImcReplay({ label }: ImcReplayProps) {
  const data = useMemo(() => imcReplay(), [])
  const [productIndex, setProductIndex] = useState(0)
  const product = data.products[Math.min(productIndex, data.products.length - 1)]
  const reduced = useReducedMotion()
  const clock = useReplayClock(PLAY_MS, reduced)
  const last = product.series.length - 1
  const index = Math.min(last, Math.round(clock.progress * last))
  const point = product.series[index]
  const tradesSoFar = useMemo(() => product.trades.filter((t) => t.t <= point.t), [product, point.t])
  const scrubberId = useId()

  return (
    <div className="replay imc-replay">
      <div className="replay-toolbar">
        <span className="replay-badge">{label}</span>
        <div className="product-switch" role="group" aria-label="Product">
          {data.products.map((p, i) => (
            <button key={p.name} type="button" className="btn" aria-pressed={i === productIndex} onClick={() => setProductIndex(i)}>
              {productName(p.name)}
            </button>
          ))}
        </div>
      </div>

      <ReplayChart product={product} index={index} trades={tradesSoFar} />

      <div className="scrubber">
        <label htmlFor={scrubberId} className="scrubber-label">
          Timestamp
        </label>
        <input
          id={scrubberId}
          type="range"
          min={0}
          max={last}
          step={1}
          value={index}
          aria-valuetext={`Timestamp ${formatNumber(point.t)}, profit ${formatNumber(point.pnl)}`}
          onChange={(e) => clock.seek(Number(e.target.value) / last)}
        />
        <button type="button" className="btn" onClick={clock.playing ? clock.pause : clock.play}>
          {clock.playing ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
          {clock.playing ? 'Pause' : clock.done ? 'Play again' : 'Play'}
        </button>
      </div>

      <dl className="readout">
        <div>
          <dt>Timestamp</dt>
          <dd>{formatNumber(point.t)}</dd>
        </div>
        <div>
          <dt>Mid price</dt>
          <dd>{formatNumber(point.mid, 1)}</dd>
        </div>
        <div>
          <dt>Profit</dt>
          <dd>{formatNumber(point.pnl)}</dd>
        </div>
        <div>
          <dt>Trades so far</dt>
          <dd>{tradesSoFar.length}</dd>
        </div>
      </dl>
    </div>
  )
}

interface ReplayChartProps {
  product: ImcProduct
  index: number
  trades: ImcTrade[]
}

function ReplayChart({ product, index, trades }: ReplayChartProps) {
  const box = useRef<HTMLDivElement>(null)
  const width = useElementWidth(box, 640)
  // Fixed on-screen height, so the prerendered and hydrated pages never differ in height.
  const height = 280
  const MARGIN = width < 480 ? NARROW_MARGIN : WIDE_MARGIN

  const { x, yPrice, yPnl, priceTicks, pnlTicks } = useMemo(() => {
    const series = product.series
    const maxT = Math.max(...series.map((s) => s.t), 1)
    const priceDomain = padDomain([Math.min(...series.map((s) => s.mid)), Math.max(...series.map((s) => s.mid))])
    const pnlDomain = padDomain([Math.min(0, ...series.map((s) => s.pnl)), Math.max(0, ...series.map((s) => s.pnl))])
    const range: [number, number] = [height - MARGIN.bottom, MARGIN.top]
    return {
      x: scaleLinear([0, maxT], [MARGIN.left, width - MARGIN.right]),
      yPrice: scaleLinear(priceDomain, range),
      yPnl: scaleLinear(pnlDomain, range),
      priceTicks: niceTicks(priceDomain[0], priceDomain[1], 4),
      pnlTicks: niceTicks(pnlDomain[0], pnlDomain[1], 4),
    }
  }, [product, width, height, MARGIN])

  const visible = product.series.slice(0, index + 1)
  const pricePath = linePath(visible.map((s) => [x(s.t), yPrice(s.mid)] as const))
  const pnlPath = linePath(visible.map((s) => [x(s.t), yPnl(s.pnl)] as const))
  const point = product.series[index]
  const tri = 5

  return (
    <div ref={box} className="chart replay-chart">
      <svg
        className="chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{ height }}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${productName(product.name)}: mid price and running profit through the day, with ${trades.length} trades so far`}
      >
        {priceTicks.map((tick) => (
          <g key={`p${tick}`}>
            <line x1={MARGIN.left} x2={width - MARGIN.right} y1={yPrice(tick)} y2={yPrice(tick)} className="chart-gridline" />
            <text x={MARGIN.left - 8} y={yPrice(tick)} textAnchor="end" dominantBaseline="middle" className="chart-label">
              {formatNumber(tick, 1)}
            </text>
          </g>
        ))}
        {pnlTicks.map((tick) => (
          <text key={`q${tick}`} x={width - MARGIN.right + 8} y={yPnl(tick)} textAnchor="start" dominantBaseline="middle" className="chart-label chart-label-pnl">
            {formatNumber(tick)}
          </text>
        ))}
        <text x={MARGIN.left} y={height - 10} className="chart-label" textAnchor="start">
          Mid price
        </text>
        <text x={width - MARGIN.right} y={height - 10} className="chart-label chart-label-pnl" textAnchor="end">
          Profit
        </text>
        <path d={pnlPath} className="replay-pnl" />
        <path d={pricePath} className="replay-price" />
        {trades.map((t, i) => {
          const cx = x(t.t)
          const cy = yPrice(t.price)
          const d =
            t.side === 'buy'
              ? `M${cx} ${cy - tri} L${cx + tri} ${cy + tri} L${cx - tri} ${cy + tri} Z`
              : `M${cx} ${cy + tri} L${cx + tri} ${cy - tri} L${cx - tri} ${cy - tri} Z`
          return <path key={`${t.t}-${i}`} d={d} className={t.side === 'buy' ? 'replay-buy' : 'replay-sell'} />
        })}
        <line x1={x(point.t)} x2={x(point.t)} y1={MARGIN.top} y2={height - MARGIN.bottom} className="replay-marker" />
        <circle cx={x(point.t)} cy={yPrice(point.mid)} r={4} className="replay-marker-dot" />
      </svg>
      <ul className="chart-legend" aria-label="Legend">
        <li>
          <span className="legend-swatch replay-price" aria-hidden="true" /> Mid price
        </li>
        <li>
          <span className="legend-swatch replay-pnl" aria-hidden="true" /> Running profit
        </li>
        <li>
          <span className="legend-mark replay-buy" aria-hidden="true" /> Buy
        </li>
        <li>
          <span className="legend-mark replay-sell" aria-hidden="true" /> Sell
        </li>
      </ul>
    </div>
  )
}
