import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowCounterClockwise, Minus, Pause, Play, Plus } from '@phosphor-icons/react'
import { formatCountdown, formatMinutes, formatNumber } from '@/paper/format'
import { useElementWidth, useReducedMotion } from '@/paper/hooks'
import { batteryPercent, createProjection, droneMission, flownPath, positionAlong, shortName, type Hospital, type XY } from './droneData'
import { useReplayClock } from './useReplayClock'

const PAD_KM = 0.8
const MAX_DURATION_MS = 6000
const MIN_DURATION_MS = 3000
const ZOOM_STEP = 1.5
const MAX_ZOOM = 8

interface ViewState {
  zoom: number
  cx: number
  cy: number
}

interface DragState {
  pointerId: number
  startX: number
  startY: number
  cx: number
  cy: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/**
 * A scripted mission replay on a static map, labelled "Simulated" (plan:
 * Interactive pages). Pick a hospital and the drone flies its pre-computed
 * route while battery and arrival time update. Drag to pan, + and − to zoom.
 */
export function DroneMedicReplay() {
  const data = useMemo(() => droneMission(), [])
  const projection = useMemo(() => createProjection(data.bbox), [data])
  const world = useMemo(
    () => ({ x: -PAD_KM, y: -PAD_KM, w: projection.width + PAD_KM * 2, h: projection.height + PAD_KM * 2 }),
    [projection],
  )
  const reduced = useReducedMotion()
  const [hospitalId, setHospitalId] = useState<string | null>(null)
  const hospital = data.hospitals.find((h) => h.id === hospitalId) ?? null
  const maxEta = Math.max(...data.hospitals.map((h) => h.etaMin), 1)
  const duration = hospital ? clamp((MAX_DURATION_MS * hospital.etaMin) / maxEta, MIN_DURATION_MS, MAX_DURATION_MS) : MAX_DURATION_MS
  const clock = useReplayClock(duration, reduced)
  const [view, setView] = useState<ViewState>({ zoom: 1, cx: world.x + world.w / 2, cy: world.y + world.h / 2 })

  const pick = (id: string) => {
    setHospitalId(id)
    clock.replay()
  }

  const zoomBy = (factor: number) =>
    setView((v) => {
      const zoom = clamp(v.zoom * factor, 1, MAX_ZOOM)
      return zoom === 1 ? { zoom, cx: world.x + world.w / 2, cy: world.y + world.h / 2 } : { ...v, zoom }
    })

  const panBy = (dx: number, dy: number) => setView((v) => ({ ...v, cx: v.cx + dx, cy: v.cy + dy }))
  const panTo = (cx: number, cy: number) => setView((v) => ({ ...v, cx, cy }))

  const status = !hospital ? 'Pick a hospital to start a delivery' : clock.done ? 'Delivered' : clock.playing ? 'Flying' : 'Paused'
  const flownKm = hospital ? hospital.distanceKm * clock.progress : 0

  return (
    <div className="replay drone-replay">
      <div className="replay-map-wrap">
        <span className="replay-badge">Simulated</span>
        <DroneMap
          data={data}
          projection={projection}
          world={world}
          view={view}
          hospital={hospital}
          progress={clock.progress}
          onPan={panBy}
          onPanTo={panTo}
          onZoom={zoomBy}
        />
      </div>

      <p className="map-legend">Red areas are no-fly zones: {data.noFly.map((z) => z.name).join(' and ')}. Drag the map to pan once zoomed in.</p>

      <div className="replay-side">
        <p className="replay-list-title" id="hospital-list-title">
          Deliver to
        </p>
        <ul className="hospital-list" aria-labelledby="hospital-list-title">
          {data.hospitals.map((h) => (
            <li key={h.id}>
              <button type="button" className="hospital-button" aria-pressed={h.id === hospitalId} onClick={() => pick(h.id)}>
                <span className="hospital-name">{h.name}</span>
                <span className="hospital-meta">
                  {h.payload}. {formatNumber(h.distanceKm, 1)} km, {formatMinutes(h.etaMin)}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <dl className="mission-panel">
          <div>
            <dt>Status</dt>
            <dd aria-live="polite">{status}</dd>
          </div>
          <div>
            <dt>Battery</dt>
            <dd>
              {hospital ? `${batteryPercent(flownKm)}%` : '100%'}
              <span className="battery-bar" aria-hidden="true">
                <span className="battery-level" style={{ width: `${hospital ? batteryPercent(flownKm) : 100}%` }} />
              </span>
            </dd>
          </div>
          <div>
            <dt>Distance remaining</dt>
            <dd>{hospital ? `${formatNumber(hospital.distanceKm - flownKm, 1)} km` : '0.0 km'}</dd>
          </div>
          <div>
            <dt>Arrival in</dt>
            <dd>{hospital ? formatCountdown(hospital.etaMin * (1 - clock.progress)) : '0:00'}</dd>
          </div>
        </dl>

        <div className="replay-controls">
          <button type="button" className="btn" onClick={clock.playing ? clock.pause : clock.play} disabled={!hospital}>
            {clock.playing ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
            {clock.playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" className="btn" onClick={clock.replay} disabled={!hospital}>
            <ArrowCounterClockwise size={20} aria-hidden="true" />
            Replay
          </button>
          <button type="button" className="btn" onClick={() => zoomBy(ZOOM_STEP)} disabled={view.zoom >= MAX_ZOOM}>
            <Plus size={20} aria-hidden="true" />
            Zoom in
          </button>
          <button type="button" className="btn" onClick={() => zoomBy(1 / ZOOM_STEP)} disabled={view.zoom <= 1}>
            <Minus size={20} aria-hidden="true" />
            Zoom out
          </button>
        </div>
      </div>
    </div>
  )
}

interface DroneMapProps {
  data: ReturnType<typeof droneMission>
  projection: ReturnType<typeof createProjection>
  world: { x: number; y: number; w: number; h: number }
  view: ViewState
  hospital: Hospital | null
  progress: number
  onPan: (dx: number, dy: number) => void
  onPanTo: (cx: number, cy: number) => void
  onZoom: (factor: number) => void
}

function DroneMap({ data, projection, world, view, hospital, progress, onPan, onPanTo, onZoom }: DroneMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const clientWidth = useElementWidth(svgRef, 640)
  const gridId = useId()
  const drag = useRef<DragState | null>(null)

  const vw = world.w / view.zoom
  const vh = world.h / view.zoom
  const viewBox = `${view.cx - vw / 2} ${view.cy - vh / 2} ${vw} ${vh}`
  /** Kilometres per CSS pixel, so labels and markers keep their size at any zoom or screen width. */
  const u = vw / Math.max(clientWidth, 1)
  const px = (n: number) => n * u
  /** Zone names only fit once a kilometre is wide enough on screen (phones at base zoom skip them). */
  const showZoneNames = 1 / u >= 60

  const route: XY[] = useMemo(() => (hospital ? hospital.route.map(projection.toXY) : []), [hospital, projection])
  const flown = useMemo(() => flownPath(route, progress), [route, progress])
  const drone = useMemo(() => positionAlong(route, progress), [route, progress])
  const depot = projection.toXY([data.depot.lat, data.depot.lon])

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (view.zoom <= 1) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, cx: view.cx, cy: view.cy }
  }
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    onPanTo(d.cx - (e.clientX - d.startX) * u, d.cy - (e.clientY - d.startY) * u)
  }
  const endDrag = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (drag.current?.pointerId === e.pointerId) drag.current = null
  }
  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = vw * 0.1
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const move = moves[e.key]
    if (move) {
      e.preventDefault()
      onPan(move[0], move[1])
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault()
      onZoom(ZOOM_STEP)
    } else if (e.key === '-') {
      e.preventDefault()
      onZoom(1 / ZOOM_STEP)
    }
  }

  const label = `Simulated map with the depot, ${data.hospitals.length} hospitals and ${data.noFly.length} no-fly zones. ${
    hospital ? `Flying to ${hospital.name}, ${Math.round(progress * 100)}% of the way.` : 'Pick a hospital to start.'
  }`

  return (
    <svg
      ref={svgRef}
      className={`drone-map${view.zoom > 1 ? ' is-zoomed' : ''}`}
      viewBox={viewBox}
      role="img"
      aria-label={label}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
    >
      <defs>
        <pattern id={gridId} width={1} height={1} patternUnits="userSpaceOnUse">
          <path d="M1 0 L0 0 L0 1" fill="none" className="map-grid" strokeWidth={px(1)} />
        </pattern>
      </defs>
      <rect x={world.x - world.w} y={world.y - world.h} width={world.w * 3} height={world.h * 3} className="map-ground" />
      <rect x={world.x - world.w} y={world.y - world.h} width={world.w * 3} height={world.h * 3} fill={`url(#${gridId})`} />

      {data.noFly.map((zone) => {
        const points = zone.polygon.map(projection.toXY)
        const [lx, ly] = points.reduce<XY>((acc, p) => [acc[0] + p[0] / points.length, acc[1] + p[1] / points.length], [0, 0])
        return (
          <g key={zone.name} className="map-nofly">
            <polygon points={points.map((p) => p.join(',')).join(' ')} strokeWidth={px(1.5)} />
            {showZoneNames && (
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={px(12)} strokeWidth={px(3)}>
                {zone.name}
              </text>
            )}
          </g>
        )
      })}

      {route.length > 1 && (
        <polyline points={route.map((p) => p.join(',')).join(' ')} className="map-route" strokeWidth={px(2)} strokeDasharray={`${px(6)} ${px(5)}`} />
      )}
      {flown.length > 1 && <polyline points={flown.map((p) => p.join(',')).join(' ')} className="map-flown" strokeWidth={px(3)} />}

      <g className="map-depot">
        <rect x={depot[0] - px(5)} y={depot[1] - px(5)} width={px(10)} height={px(10)} strokeWidth={px(1.5)} />
        <text x={depot[0] + px(9)} y={depot[1] + px(16)} fontSize={px(13)} strokeWidth={px(3)}>
          {data.depot.name}
        </text>
      </g>

      {data.hospitals.map((h) => {
        const [x, y] = projection.toXY([h.lat, h.lon])
        const flipX = x > world.x + world.w * 0.68
        const selected = hospital?.id === h.id
        return (
          <g key={h.id} className={`map-hospital${selected ? ' is-selected' : ''}`}>
            {selected && <circle cx={x} cy={y} r={px(11)} className="map-selected-ring" strokeWidth={px(2)} />}
            <circle cx={x} cy={y} r={px(6.5)} />
            <path d={`M${x - px(3.5)} ${y} H${x + px(3.5)} M${x} ${y - px(3.5)} V${y + px(3.5)}`} strokeWidth={px(1.8)} />
            <text x={flipX ? x : x + px(10)} y={flipX ? y + px(20) : y + px(4)} textAnchor={flipX ? 'end' : 'start'} fontSize={px(13)} strokeWidth={px(3)}>
              {shortName(h.name)}
            </text>
          </g>
        )
      })}

      {hospital && route.length > 0 && (
        <g className="map-drone" transform={`translate(${drone.point[0]} ${drone.point[1]}) rotate(${drone.heading})`}>
          <path d={`M${-px(6)} ${-px(6)} L${px(6)} ${px(6)} M${-px(6)} ${px(6)} L${px(6)} ${-px(6)}`} strokeWidth={px(1.5)} />
          {[-1, 1].flatMap((sx) => [-1, 1].map((sy) => <circle key={`${sx}${sy}`} cx={sx * px(6)} cy={sy * px(6)} r={px(2.6)} />))}
          <circle cx={0} cy={0} r={px(4)} className="map-drone-body" strokeWidth={px(1.2)} />
        </g>
      )}
    </svg>
  )
}
