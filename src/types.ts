export type DeckKind = 'passage' | 'qa' | 'list' | 'groups'
export type Mode = 'typing' | 'mcq' | 'speed'
export type SplitBy = 'line' | 'sentence'

export interface Item {
  id: string
  prompt?: string
  answer: string
  /** Extra accepted answers (Q/A decks only). */
  alternates?: string[]
  /** Unordered members under a group header (class list decks only). */
  members?: string[]
}

export interface Deck {
  id: string
  name: string
  kind: DeckKind
  items: Item[]
  source: string
  splitBy?: SplitBy
  createdAt: number
  updatedAt: number
}

export interface Attempt {
  id: string
  deckId: string
  mode: Mode
  score: number
  total: number
  durationMs: number
  at: number
  drillSeconds?: number
}

export interface Missed {
  itemId: string
  prompt: string
  expected: string
  given?: string
}

export interface SessionResult {
  mode: Mode
  score: number
  total: number
  durationMs: number
  missed: Missed[]
  unit: string
  drillSeconds?: number
}

export interface ModeProps {
  deck: Deck
  /** When set, practice only these items (used by "retry missed"). */
  itemIds: string[] | null
  onFinish: (result: SessionResult) => void
}

export interface GradeOptions {
  ignoreCase: boolean
  ignorePunctuation: boolean
  /** Fraction of characters that may be wrong and still count (0 = exact). */
  typoTolerance: number
}

export const KIND_LABELS: Record<DeckKind, string> = {
  passage: 'Passage',
  qa: 'Q/A',
  list: 'List',
  groups: 'Class list',
}

export const MODE_LABELS: Record<Mode, string> = {
  typing: 'Typing',
  mcq: 'Multiple choice',
  speed: 'Speed drill',
}

export const MODES: Mode[] = ['typing', 'mcq', 'speed']
export const DRILL_LENGTHS = [30, 60, 120] as const
