export { Book } from './Book'
export type { BookProps, BookEndpapers, LampSettings } from './Book'
export { computeLayout, useBookLayout, PAGE_WIDTH, PAGE_HEIGHT, SHEET_GAP, DEFAULT_SPREADS } from './layout'
export type { BookLayout, RibbonTail } from './layout'
export {
  createBookController,
  OPEN_DURATION,
  OPEN_COVER_DELAY,
  CLOSE_DURATION,
  JUMP_MAX_DURATION,
  JUMP_MAX_SHEETS,
  FLICK_SPEED,
  HOLD_REPEAT,
  PAGE_SPRING,
  COVER_SPRING,
  RELEASE_SPRING,
} from './motion'
export type { BookController, ControllerOptions, DragGrab, DragRelease, MoveKind, MoveState, FrameScheduler } from './motion'
export type { TimedMove, TimedMoveFactory, TimedMoveSpec } from './timed'
export { loadPageTextures, makePlaceholderTexture, makePlaceholderSpreads, PAGE_ANISOTROPY } from './pageTextures'
export type { PageTextures, PageTextureUrls } from './pageTextures'
export { createPageMaterial, blankPageSide, PAPER_COLOUR, GRID_COLOUR, INK_COLOUR, COVER_COLOUR, FOIL_COLOUR } from './PageMaterial'
export type { PageMaterial, PageSide } from './PageMaterial'
export type { PageGrabInfo, PagePointerHandlers, PageSideName } from './pointer'
