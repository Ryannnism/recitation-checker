import type { Deck, DeckKind, GradeOptions } from '../types'
import { pickDistractors } from './distractors'
import { groupName } from './parse'
import { isPerfect, matchAny, wordDiff, type DiffResult, type MatchKind } from './grader'
import { sample, shuffle } from './shuffle'

export interface Question {
  id: string
  itemId: string
  label: string
  prompt: string
  answer: string
  alternates?: string[]
  options?: string[]
  /** "line" answers are graded word by word; "answer" answers are fuzzy-matched as a whole. */
  matchBy: 'answer' | 'line'
}

export interface StyleOption {
  id: string
  label: string
}

export const QUESTION_STYLES: Record<DeckKind, StyleOption[]> = {
  qa: [
    { id: 'forward', label: 'Prompt → answer' },
    { id: 'reverse', label: 'Answer → prompt' },
    { id: 'mixed', label: 'Mixed' },
  ],
  passage: [
    { id: 'mixed', label: 'Mixed' },
    { id: 'next', label: 'What comes next' },
    { id: 'blank', label: 'Fill in the blank' },
  ],
  list: [
    { id: 'mixed', label: 'Mixed' },
    { id: 'after', label: 'What comes after' },
    { id: 'position', label: 'Which position' },
  ],
  groups: [{ id: 'member', label: 'Who was in the class' }],
}

let counter = 0
const qid = () => `q${++counter}`

function withOptions(q: Question, pool: string[], mcq: boolean): Question {
  if (!mcq) return q
  return { ...q, options: shuffle([q.answer, ...pickDistractors(q.answer, pool)]) }
}

function resolveStyle(kind: DeckKind, style: string): string {
  if (style !== 'mixed') return style
  return sample(QUESTION_STYLES[kind].map((s) => s.id).filter((id) => id !== 'mixed'))
}

const EDGE_PUNCT = /^([\p{P}\p{S}]*)(.*?)([\p{P}\p{S}]*)$/u

function core(word: string): string {
  return EDGE_PUNCT.exec(word)?.[2] ?? word
}

function memberQuestion(deck: Deck, index: number, member: string, mcq: boolean): Question {
  const item = deck.items[index]
  const members = item.members ?? []
  const name = groupName(item.prompt ?? '')
  const inGroup = new Set(members.map((m) => m.toLocaleLowerCase()))
  const pool = deck.items
    .filter((i) => i !== item)
    .flatMap((i) => i.members ?? [])
    .filter((m) => !inGroup.has(m.toLocaleLowerCase()))
  return withOptions(
    {
      id: qid(),
      itemId: item.id,
      label: mcq ? 'Who was in the class?' : 'Name anyone in the class',
      prompt: mcq ? `Which of these was in ${name}?` : `Name someone in ${name}`,
      answer: member,
      alternates: members.filter((m) => m !== member),
      matchBy: 'answer',
    },
    pool,
    mcq,
  )
}

function blankQuestion(deck: Deck, index: number, mcq: boolean): Question | null {
  const item = deck.items[index]
  const tokens = item.answer.split(/(\s+)/)
  const candidates = tokens
    .map((t, i) => ({ i, core: core(t) }))
    .filter((c) => c.core.length >= 3)
    .sort((a, b) => b.core.length - a.core.length)
  if (!candidates.length) return null
  const pick = sample(candidates.slice(0, Math.max(3, Math.ceil(candidates.length / 2))))
  const m = EDGE_PUNCT.exec(tokens[pick.i])!
  const blanked = [...tokens]
  blanked[pick.i] = `${m[1]}_____${m[3]}`
  const pool = deck.items.flatMap((it) => it.answer.split(/\s+/).map(core)).filter((w) => w.length >= 3)
  return withOptions(
    { id: qid(), itemId: item.id, label: 'Fill in the blank', prompt: blanked.join(''), answer: pick.core, matchBy: 'answer' },
    pool,
    mcq,
  )
}

export function buildQuestion(deck: Deck, index: number, style: string, mcq: boolean): Question | null {
  const items = deck.items
  const item = items[index]
  if (!item) return null
  const s = resolveStyle(deck.kind, style)
  const prev = items[index - 1]
  const othersThanPrev = items.filter((i) => i !== prev).map((i) => i.answer)

  switch (deck.kind) {
    case 'groups':
      return item.members?.length ? memberQuestion(deck, index, sample(item.members), mcq) : null

    case 'qa':
      if (s === 'reverse') {
        return withOptions(
          { id: qid(), itemId: item.id, label: 'Which prompt goes with this answer?', prompt: item.answer, answer: item.prompt ?? '', matchBy: 'answer' },
          items.map((i) => i.prompt ?? ''),
          mcq,
        )
      }
      return withOptions(
        { id: qid(), itemId: item.id, label: 'Answer', prompt: item.prompt ?? '', answer: item.answer, alternates: item.alternates, matchBy: 'answer' },
        items.map((i) => i.answer),
        mcq,
      )

    case 'passage': {
      if (s === 'blank') {
        const q = blankQuestion(deck, index, mcq)
        if (q) return q
      }
      return withOptions(
        {
          id: qid(),
          itemId: item.id,
          label: prev ? 'What comes next?' : 'How does it begin?',
          prompt: prev ? prev.answer : `First line of "${deck.name}"`,
          answer: item.answer,
          matchBy: 'line',
        },
        othersThanPrev,
        mcq,
      )
    }

    case 'list': {
      if (s === 'position' && items.length > 1) {
        const answer = String(index + 1)
        const q: Question = {
          id: qid(),
          itemId: item.id,
          label: 'Which position?',
          prompt: `What number is "${item.answer}" in the list?`,
          answer,
          matchBy: 'answer',
        }
        if (!mcq) return q
        const others = items
          .map((_, i) => i + 1)
          .filter((p) => p !== index + 1)
          .map((p) => ({ p, d: Math.abs(p - (index + 1)) + Math.random() * 2 }))
          .sort((a, b) => a.d - b.d)
          .slice(0, 3)
          .map((x) => String(x.p))
        return { ...q, options: shuffle([answer, ...others]) }
      }
      return withOptions(
        {
          id: qid(),
          itemId: item.id,
          label: prev ? 'What comes after?' : 'What comes first?',
          prompt: prev ? prev.answer : `First entry of "${deck.name}"`,
          answer: item.answer,
          matchBy: 'answer',
        },
        othersThanPrev,
        mcq,
      )
    }
  }
}

export function targetIndexes(deck: Deck, itemIds: string[] | null): number[] {
  const all = deck.items.map((_, i) => i)
  if (!itemIds) return all
  const wanted = new Set(itemIds)
  const filtered = all.filter((i) => wanted.has(deck.items[i].id))
  return filtered.length ? filtered : all
}

const usable = (q: Question | null, mcq: boolean): q is Question => !!q && (!mcq || (q.options?.length ?? 0) >= 2)

export function buildQuestionSet(
  deck: Deck,
  itemIds: string[] | null,
  style: string,
  mcq: boolean,
  ordered = false,
): Question[] {
  const targets = targetIndexes(deck, itemIds)
  const qs = (
    deck.kind === 'groups'
      ? targets.flatMap((i) =>
          shuffle(deck.items[i].members ?? [])
            .slice(0, 3)
            .map((m) => memberQuestion(deck, i, m, mcq)),
        )
      : targets.map((i) => buildQuestion(deck, i, style, mcq))
  ).filter((q) => usable(q, mcq))
  return ordered ? qs : shuffle(qs)
}

/** Endless question supply for speed drills: cycles through the targets in shuffled rounds without immediate repeats. */
export function createQuestionStream(
  deck: Deck,
  itemIds: string[] | null,
  style: string,
  mcq: boolean,
): () => Question | null {
  let bag: number[] = []
  let last = -1
  return () => {
    for (let tries = 0; tries < 50; tries++) {
      if (!bag.length) {
        bag = shuffle(targetIndexes(deck, itemIds))
        if (bag.length > 1 && bag[bag.length - 1] === last) {
          ;[bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]]
        }
      }
      const i = bag.pop()!
      const q = buildQuestion(deck, i, style, mcq)
      if (usable(q, mcq)) {
        last = i
        return q
      }
    }
    return null
  }
}

export interface TypedGrade {
  correct: boolean
  kind: MatchKind
  diff?: DiffResult
}

export function gradeTyped(q: Question, input: string, opts: GradeOptions): TypedGrade {
  if (q.matchBy === 'line') {
    const diff = wordDiff(q.answer, input, opts)
    const perfect = isPerfect(diff) && diff.total > 0
    const kind: MatchKind = !perfect ? 'wrong' : diff.tokens.some((t) => t.type === 'typo') ? 'close' : 'exact'
    return { correct: perfect, kind, diff }
  }
  const kind = matchAny(input, [q.answer, ...(q.alternates ?? [])], opts)
  return { correct: kind !== 'wrong', kind }
}
