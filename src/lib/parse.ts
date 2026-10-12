import type { DeckKind, Item, SplitBy } from '../types'

export interface ParseResult {
  items: Item[]
  errors: string[]
}

const newId = () => crypto.randomUUID()

function nonEmptyLines(text: string): { line: string; n: number }[] {
  return text
    .split(/\r?\n/)
    .map((line, i) => ({ line: line.trim(), n: i + 1 }))
    .filter((l) => l.line)
}

export function splitSentences(text: string): string[] {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (!flat) return []
  const parts = flat.match(/[^.!?。！？]+(?:[.!?。！？]+["'”’)\]]*|$)/g) ?? [flat]
  return parts.map((p) => p.trim()).filter(Boolean)
}

function parsePassage(text: string, splitBy: SplitBy): ParseResult {
  const parts = splitBy === 'sentence' ? splitSentences(text) : nonEmptyLines(text).map((l) => l.line)
  return { items: parts.map((answer) => ({ id: newId(), answer })), errors: [] }
}

function parseQa(text: string): ParseResult {
  const items: Item[] = []
  const errors: string[] = []
  for (const { line, n } of nonEmptyLines(text)) {
    const fields = (line.includes('\t') ? line.split('\t') : line.split('|')).map((f) => f.trim())
    if (fields.length < 2) {
      errors.push(`Line ${n}: no "|" or tab between prompt and answer.`)
      continue
    }
    const [prompt, answer, ...alternates] = fields
    if (!prompt || !answer) {
      errors.push(`Line ${n}: prompt or answer is empty.`)
      continue
    }
    const alts = alternates.filter(Boolean)
    items.push({ id: newId(), prompt, answer, ...(alts.length ? { alternates: alts } : {}) })
  }
  return { items, errors }
}

const NUMBERING = /^\s*\d+[.)]\s+/

function parseList(text: string): ParseResult {
  const lines = nonEmptyLines(text).map((l) => l.line)
  const numbered = lines.length > 1 && lines.every((l) => NUMBERING.test(l))
  const entries = numbered ? lines.map((l) => l.replace(NUMBERING, '')) : lines
  return { items: entries.map((answer) => ({ id: newId(), answer })), errors: [] }
}

const COUNT = /\b(\d+)\s*(?:men|members|brothers|guys|people|names)\b/i
const BULLET = /^\s*(?:[-*•·]|\d+[.)])\s+/

const GREEK = 'alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega'
const GREEK_ONLY = new RegExp(`^(?:(?:${GREEK})\\b\\s*)+(?:class)?$`, 'i')
const GREEK_LEAD = new RegExp(`^(?:(?:${GREEK})\\b\\s*)+(?:class\\s*)?[-–—:|,(]`, 'i')
const YEAR = /\b(?:19|20)\d{2}\b/

function isExplicitHeader(line: string): boolean {
  return (
    line.startsWith('#') ||
    /:\s*$/.test(line) ||
    COUNT.test(line) ||
    YEAR.test(line) ||
    GREEK_ONLY.test(line) ||
    GREEK_LEAD.test(line)
  )
}

export function crossingYear(header: string): string | undefined {
  return YEAR.exec(header)?.[0]
}

function cleanHeader(line: string): string {
  return line.replace(/^#+\s*/, '').replace(/:\s*$/, '').trim()
}

/** "Eta - 12 men" -> "Eta" */
export function groupName(header: string): string {
  return header.replace(/\s*[-–—:,(]?\s*\d+\s*(?:men|members|brothers|guys|people|names)\b.*$/i, '').trim() || header
}

/**
 * Headers are lines starting with "#", ending with ":", containing a count like "12 men" or a year,
 * or starting with Greek letters followed by a separator ("Eta - ...").
 * Without any such line, each blank-line-separated block's first line is its header.
 */
function parseGroups(text: string): ParseResult {
  const lines = text.split(/\r?\n/).map((l, i) => ({ line: l.trim(), n: i + 1 }))
  const explicit = lines.some((l) => l.line && isExplicitHeader(l.line))
  const groups: { header: string; n: number; members: string[] }[] = []
  const errors: string[] = []
  let current: (typeof groups)[number] | null = null
  let blockStart = true

  for (const { line, n } of lines) {
    if (!line) {
      blockStart = true
      continue
    }
    const isHeader = explicit ? isExplicitHeader(line) : blockStart
    blockStart = false
    if (isHeader) {
      current = { header: cleanHeader(line), n, members: [] }
      groups.push(current)
    } else if (!current) {
      errors.push(`Line ${n}: "${line}" comes before any class header.`)
    } else {
      current.members.push(line.replace(BULLET, '').trim())
    }
  }

  const items: Item[] = []
  for (const g of groups) {
    if (!g.members.length) {
      errors.push(`Line ${g.n}: "${g.header}" has no names under it.`)
      continue
    }
    const expected = COUNT.exec(g.header)
    if (expected && Number(expected[1]) !== g.members.length) {
      errors.push(`"${g.header}" lists ${g.members.length} name${g.members.length === 1 ? '' : 's'}.`)
    }
    items.push({ id: newId(), prompt: g.header, answer: g.members.join(', '), members: g.members })
  }
  return { items, errors }
}

export function parseDeck(kind: DeckKind, text: string, splitBy: SplitBy = 'line'): ParseResult {
  switch (kind) {
    case 'passage':
      return parsePassage(text, splitBy)
    case 'qa':
      return parseQa(text)
    case 'list':
      return parseList(text)
    case 'groups':
      return parseGroups(text)
  }
}

/** Keeps ids of items whose text didn't change, so history for unchanged items survives an edit. */
export function reuseIds(previous: Item[], next: Item[]): Item[] {
  const pool = new Map<string, string[]>()
  for (const it of previous) {
    const key = `${it.prompt ?? ''}\u0000${it.answer}`
    pool.set(key, [...(pool.get(key) ?? []), it.id])
  }
  return next.map((it) => {
    const ids = pool.get(`${it.prompt ?? ''}\u0000${it.answer}`)
    const id = ids?.shift()
    return id ? { ...it, id } : it
  })
}
