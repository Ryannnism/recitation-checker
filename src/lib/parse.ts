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

export function parseDeck(kind: DeckKind, text: string, splitBy: SplitBy = 'line'): ParseResult {
  switch (kind) {
    case 'passage':
      return parsePassage(text, splitBy)
    case 'qa':
      return parseQa(text)
    case 'list':
      return parseList(text)
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
