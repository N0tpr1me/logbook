// The hiring pipeline for the AMS chapter. The three recommendations come
// from content.ts; the per-stage wording should be checked against the AMS
// notes before publication (plan: Open questions).

export type AmsStageId = 'advert' | 'screen' | 'shortlist' | 'interview' | 'offer'

export interface AmsStage {
  id: AmsStageId
  name: string
  /** True where the team marked a point at which bias enters. */
  risk: boolean
  bias: string
  recommendation: string
}

export const amsStages: readonly AmsStage[] = [
  {
    id: 'advert',
    name: 'Job advert',
    risk: true,
    bias: 'Wording and requirement lists written for past hires put some candidates off before they apply.',
    recommendation: 'The AI bias detector audits the advert before it goes out, as it does at every stage.',
  },
  {
    id: 'screen',
    name: 'CV screen',
    risk: true,
    bias: 'Names, universities and gaps in a CV sway the screen, and an AI trained on past hires repeats the pattern.',
    recommendation: 'Blind CV screening, with an AI potential score that rates skills rather than background.',
  },
  {
    id: 'shortlist',
    name: 'Shortlist',
    risk: false,
    bias: 'A shortlist drawn from a biased screen inherits its gaps.',
    recommendation: 'The bias detector compares the shortlist with the applicant pool and flags a skew.',
  },
  {
    id: 'interview',
    name: 'Interview',
    risk: true,
    bias: 'Unstructured interviews reward familiarity rather than skill.',
    recommendation: 'Skills-based scoring with the potential score alongside, and the bias detector auditing the outcomes.',
  },
  {
    id: 'offer',
    name: 'Offer',
    risk: false,
    bias: 'Offers can repeat differences from earlier stages.',
    recommendation: 'The bias detector audits who receives an offer against who was interviewed.',
  },
]
