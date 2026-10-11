// One content file drives the whole site (plan: Tech stack). Both the paper
// version and the 3D book read from here, so they can never disagree.
//
// Writing rules (plan: The book, spread by spread): lead with the result, real
// numbers as digits checked against a primary source, sentence case, no em
// dashes, no buzzwords, one name per action.

import { features } from '@/config/features'

export type ChapterId = 'contents' | 'dronemedic' | 'imc' | 'ams' | 'chandrayaan' | 'about' | 'contact'

export interface Link { label: string; href: string; newTab?: boolean }

export interface Chapter {
  id: ChapterId
  /** Address, such as /dronemedic. Contents has the root address. */
  path: string
  title: string
  /** One line shown in the contents list and the chapter bar. */
  result: string
  /** Left page story, under 90 words, result first. */
  story: string[]
  /** Facts that must be checked against a primary source; shown as a list where useful. */
  facts?: { label: string; value: string; source: string }[]
  /** Right page media. */
  media: ChapterMedia
  /** The interactive part in the reading sheet and the paper version. */
  interactive?: 'dronemedicReplay' | 'imcReplay' | 'amsPipeline' | 'trajectory' | 'aboutFilter' | 'contact'
  links?: Link[]
  /** Real date written on the page foot, with initials. */
  date: string
  team?: string[]
}

export type ChapterMedia =
  | { kind: 'clip'; src: string; poster: string; caption: string; fullVideo?: string }
  | { kind: 'chart'; id: 'imcProfit' | 'trajectory'; caption: string }
  | { kind: 'diagram'; id: 'hiringPipeline'; caption: string }
  | { kind: 'timeline'; caption: string }
  | { kind: 'photo'; src: string; alt: string; caption: string }
  | { kind: 'contact' }

export const person = {
  name: 'Zain Ali',
  initials: 'ZA',
  strapline: 'Software, AI and markets',
  coverResult: '1st of 56 teams, AR26 HackXelerator',
  intro: [
    'Second-year Computer Science student at the University of West London, building software for AI, robotics and markets.',
    'Won the Agents & Robotics HackXelerator (AR26) with DroneMedic, an autonomous medical delivery system.',
  ],
  degree: 'BSc Computer Science, University of West London, 2025 to 2028 (expected)',
  average: 'Current average 84.8%',
  bestModules: [
    { name: 'Programming', mark: '96%' },
    { name: 'Algorithms and Data Types', mark: '93%' },
  ],
  lookingFor: 'Looking for summer 2027 internships in software, quant and consulting.',
  nowNote: 'Now: second year of Computer Science, open to summer 2027 internships.',
  photo: '/assets/photos/zain.jpg',
  cv: '/assets/Zain_Ali_CV.pdf',
  skills: [
    { name: 'TypeScript', projects: ['dronemedic'] as ChapterId[] },
    { name: 'React', projects: ['dronemedic'] as ChapterId[] },
    { name: 'Python', projects: ['dronemedic', 'imc'] as ChapterId[] },
    { name: 'FastAPI', projects: ['dronemedic'] as ChapterId[] },
    { name: 'AI planning', projects: ['dronemedic'] as ChapterId[] },
    { name: 'Route optimisation', projects: ['dronemedic'] as ChapterId[] },
    { name: 'Algorithmic trading', projects: ['imc'] as ChapterId[] },
    { name: 'Backtesting', projects: ['imc'] as ChapterId[] },
    { name: 'NLP pipelines', projects: ['dronemedic'] as ChapterId[] },
    { name: 'Three.js and WebGL', projects: [] as ChapterId[] },
    { name: 'Java', projects: [] as ChapterId[] },
    { name: 'C', projects: [] as ChapterId[] },
    { name: 'SQL', projects: [] as ChapterId[] },
    { name: 'Mathematical modelling', projects: ['chandrayaan'] as ChapterId[] },
    { name: 'Fair AI in hiring', projects: ['ams'] as ChapterId[] },
  ],
  timeline: [
    {
      when: 'October 2023',
      title: 'Software intern, Waterlabs AI',
      detail: 'Two weeks in the software department of a healthcare automation company, 9 to 20 October 2023.',
    },
    {
      when: 'July to August 2024',
      title: 'AI and machine learning intern, Talisma',
      detail: 'Talisma Corporation, 29 July to 9 August 2024.',
    },
    {
      when: '2025 to 2028',
      title: 'BSc Computer Science, University of West London',
      detail: 'Expected 2028. Current average 84.8%, first-class. Programming 96%, Algorithms and Data Types 93%, Computer Architecture 87%, Mathematics for Computing 82%, Databases 80%.',
    },
    {
      when: 'March 2026',
      title: 'AMS AI for Inclusive Recruitment business challenge',
      detail: 'Team recommendations on fair, skills-based hiring.',
    },
    {
      when: 'April 2026',
      title: '1st of 56 teams, Agents & Robotics HackXelerator (AR26)',
      detail: 'DroneMedic, an autonomous medical drone delivery system.',
    },
  ],
}

// Contact details are assembled in the browser from environment variables set at
// build time, so the number never sits in the page's source (plan: Contact page).
export const contact = {
  email: import.meta.env.VITE_CONTACT_EMAIL as string,
  phoneParts: String(import.meta.env.VITE_CONTACT_PHONE ?? '').replace(/\s+/g, '').match(/.{1,4}/g) ?? [],
  linkedin: import.meta.env.VITE_LINKEDIN_URL as string,
  github: import.meta.env.VITE_GITHUB_URL as string,
  siteUrl: import.meta.env.VITE_SITE_URL as string,
}

export function phoneNumber(): string {
  return contact.phoneParts.join('')
}

export function phoneDisplay(): string {
  const n = phoneNumber()
  // +44 7950 406 447 style grouping for UK mobiles; otherwise the raw number.
  const m = n.match(/^\+44(\d{4})(\d{3})(\d{3})$/)
  return m ? `+44 ${m[1]} ${m[2]} ${m[3]}` : n
}

const allChapters: Chapter[] = [
  {
    id: 'contents',
    path: '/',
    title: 'Contents',
    result: 'The logbook of Zain Ali',
    story: person.intro,
    media: { kind: 'photo', src: person.photo, alt: 'Zain Ali', caption: 'This logbook belongs to Zain Ali' },
    date: '2026-10-11',
  },
  {
    id: 'dronemedic',
    path: '/dronemedic',
    title: 'DroneMedic',
    result: '1st of 56 teams at the Agents & Robotics HackXelerator (AR26)',
    story: [
      'Emergency supplies in a city are slowed by traffic, not distance. In our demo case, blood for a child at the Royal London takes a drone 12 minutes and an ambulance 47.',
      'DroneMedic turns a plain-English request into a mission, plans routes around no-fly zones with OR-Tools and flies them in simulation. I led the team and built the React and TypeScript dashboard, joined to a Python and FastAPI backend with AI mission planning, route optimisation and simulated telemetry. Built in 20 days by a team of four.',
    ],
    facts: [
      { label: 'Result', value: '1st of 56 teams, AR26 HackXelerator, April 2026', source: 'AR26 results announcement' },
      { label: 'Stack', value: 'React, TypeScript, Python, FastAPI, OR-Tools, PX4 SITL and Gazebo', source: 'DroneMedic README' },
      { label: 'Demo case', value: 'Drone 12 min and £85 against ambulance 47 min and £180', source: 'DroneMedic demo-scenario.ts' },
    ],
    media: {
      kind: 'clip',
      src: '/assets/clips/dronemedic-dashboard.mp4',
      poster: '/assets/clips/dronemedic-dashboard.jpg',
      caption: 'The mission dashboard during a delivery run. Simulated telemetry.',
      fullVideo: (import.meta.env.VITE_DRONEMEDIC_VIDEO_URL as string) || undefined,
    },
    interactive: 'dronemedicReplay',
    links: [{ label: 'Try the replay', href: '#replay' }],
    date: '2026-04-12',
    team: ['Usman Hakimi', 'Haseeb Janjua', 'Karim Khalifa'],
  },
  {
    id: 'imc',
    path: '/imc',
    title: 'IMC Prosperity',
    result: 'A Python trading bot with market-making and trend-following strategies',
    story: [
      'IMC Prosperity is an algorithmic trading competition on simulated markets. I built a Python bot that makes markets in stable products and follows trends in moving ones.',
      'It ships with a test suite of 148 tests and research comparing it with past top teams. The chart is a test run on the IMC platform, not the scored round.',
    ],
    // The official rank goes here once Zain confirms it against the results page.
    media: { kind: 'chart', id: 'imcProfit', caption: 'Test run on the IMC platform, day 0. Not the scored round.' },
    interactive: 'imcReplay',
    links: [{ label: 'Try the replay', href: '#replay' }],
    date: '2026-04-22',
  },
  {
    id: 'ams',
    path: '/ams',
    title: 'AMS AI for Inclusive Recruitment',
    result: 'Recommendations for fair, skills-based hiring with AI',
    story: [
      'A business challenge set by AMS: how can AI make recruitment fairer? Bias enters at the job advert, the CV screen and the interview, and an AI trained on past hires repeats it.',
      'Our team proposed blind CV screening, an AI bias detector that audits each stage, and an AI potential score that rates skills rather than background.',
    ],
    media: { kind: 'diagram', id: 'hiringPipeline', caption: 'The hiring pipeline, with the points where bias enters marked' },
    interactive: 'amsPipeline',
    date: '2026-03-20',
  },
  {
    id: 'chandrayaan',
    path: '/chandrayaan',
    title: "My model of Chandrayaan-3's trajectory",
    result: 'A model of the Hohmann transfer that took Chandrayaan-3 to the Moon',
    story: [
      'How does a spacecraft reach the Moon on little fuel? I modelled the gravitational field of the Earth and Moon and the Hohmann transfer orbit, using linear algebra and gravitational vectors.',
    ],
    media: { kind: 'chart', id: 'trajectory', caption: 'The transfer orbit, drawn on graph paper' },
    interactive: 'trajectory',
    date: '2024-11-15',
  },
  {
    id: 'about',
    path: '/about',
    title: 'About',
    result: 'Computer Science at the University of West London, average 84.8%',
    story: [
      'I am a second-year Computer Science student at the University of West London. I like building things that have to work in the real world: drones, trading systems, tools for fairer hiring.',
      'Before university I studied at Inventure Academy in Bengaluru and the British School Muscat.',
    ],
    media: { kind: 'timeline', caption: 'Internships and study' },
    interactive: 'aboutFilter',
    date: '2026-10-11',
  },
  {
    id: 'contact',
    path: '/contact',
    title: "Let's talk",
    result: 'Email, phone, LinkedIn and GitHub',
    story: [person.lookingFor],
    media: { kind: 'contact' },
    interactive: 'contact',
    date: '2026-10-11',
  },
]

export const chapters: Chapter[] = allChapters.filter((c) => c.id !== 'chandrayaan' || features.chapters.chandrayaan)

export const chapterById = (id: ChapterId): Chapter | undefined => chapters.find((c) => c.id === id)
export const chapterByPath = (path: string): Chapter | undefined => {
  const clean = path.replace(/\/+$/, '') || '/'
  return chapters.find((c) => c.path === clean)
}

export const backCover = {
  closing: 'Thanks for reading. The next page is yours.',
  howBuilt:
    'Built with TypeScript, React, three.js and a custom page-turn shader, with Claude as a coding assistant. Source code on GitHub.',
}

export const cover = {
  name: person.name,
  label: [person.strapline, person.coverResult],
}

export const siteMeta = {
  title: 'Zain Ali: Software, AI and markets',
  description: 'An explorable logbook of projects in software, AI and markets.',
}
