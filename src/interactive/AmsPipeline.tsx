import { useState } from 'react'
import { Highlighter } from '@phosphor-icons/react'
import { amsStages, type AmsStage, type AmsStageId } from './amsStages'

export interface AmsPipelineProps {
  /** Print pages show every stage note at once, with no buttons. */
  variant?: 'live' | 'print'
}

/**
 * The hiring pipeline as connected stages. Hover, tap or tab to a stage to see
 * where bias enters and what the team recommended; risk points carry a small
 * highlighter marker.
 */
export function AmsPipeline({ variant = 'live' }: AmsPipelineProps) {
  const [active, setActive] = useState<AmsStageId>('screen')
  const stage = amsStages.find((s) => s.id === active) ?? amsStages[0]

  if (variant === 'print') return <PipelinePrint />

  return (
    <div className="pipeline">
      <ol className="pipeline-stages" aria-label="Hiring stages">
        {amsStages.map((s) => (
          <li key={s.id} className="pipeline-stage">
            <button
              type="button"
              className={`pipeline-button${s.risk ? ' has-risk' : ''}`}
              aria-pressed={s.id === active}
              aria-controls="pipeline-detail"
              onClick={() => setActive(s.id)}
              onFocus={() => setActive(s.id)}
              onMouseEnter={() => setActive(s.id)}
            >
              <span className="pipeline-name">{s.name}</span>
              {s.risk && (
                <span className="pipeline-risk">
                  <Highlighter size={20} aria-hidden="true" />
                  <span className="visually-hidden">Bias enters here</span>
                </span>
              )}
            </button>
          </li>
        ))}
      </ol>
      <div id="pipeline-detail" className="pipeline-detail" role="region" aria-live="polite" aria-label={`${stage.name} details`}>
        <StageNote stage={stage} />
      </div>
    </div>
  )
}

interface StageNoteProps {
  stage: AmsStage
}

function StageNote({ stage }: StageNoteProps) {
  return (
    <>
      <p className="pipeline-detail-title">{stage.name}</p>
      <p>
        <span className="pipeline-detail-label">Where bias enters. </span>
        {stage.bias}
      </p>
      <p>
        <span className="pipeline-detail-label">What we recommended. </span>
        {stage.recommendation}
      </p>
    </>
  )
}

function PipelinePrint() {
  return (
    <div className="pipeline pipeline-print">
      <ol className="pipeline-stages" aria-label="Hiring stages">
        {amsStages.map((s) => (
          <li key={s.id} className="pipeline-stage">
            <span className={`pipeline-button${s.risk ? ' has-risk' : ''}`}>
              <span className="pipeline-name">{s.name}</span>
              {s.risk && (
                <span className="pipeline-risk">
                  <Highlighter size={20} aria-hidden="true" />
                  <span className="visually-hidden">Bias enters here</span>
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
      <ul className="pipeline-notes">
        {amsStages
          .filter((s) => s.risk)
          .map((s) => (
            <li key={s.id} className="pipeline-detail">
              <StageNote stage={s} />
            </li>
          ))}
      </ul>
    </div>
  )
}
