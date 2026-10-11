// Every feature has a switch here. A feature that cannot pass the definition of
// done is switched off and moves to after launch (plan: Safety nets).
export const features = {
  book3d: true,
  readingSheet: true,
  desk: {
    drone: true,
    cv: true,
    pencil: true,
    mug: true,
    lamp: true,
    ruler: false,       // after launch
    orbitSketch: false, // after launch, only if the Chandrayaan-3 chapter stays
    polaroid: false,    // after launch, only with a real photo and agreement
  },
  chapters: {
    chandrayaan: false, // decided before the 3D spreads are built; material not yet received
    aiPassport: false,  // after launch
  },
  interactive: {
    dronemedicReplay: true,
    imcReplay: true,
    amsPipeline: true,
    aboutFilter: true,
  },
  sound: true,
  music: false, // switched on once Zain has chosen a track from the shortlist
  autoFallback: true,
  analytics: false, // GoatCounter: switched on once the account exists
  errorReporting: false, // Sentry: switched on once the DSN exists
} as const

export type Features = typeof features
