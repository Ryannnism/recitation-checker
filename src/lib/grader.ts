import type { GradeOptions } from '../types'

const DASHES = /[\p{Pd}/\\]/gu
const PUNCT = /[\p{P}\p{S}]/gu

export function normalize(s: string, opts: GradeOptions): string {
  let out = s.normalize('NFC')
  if (opts.ignoreCase) out = out.toLocaleLowerCase()
  if (opts.ignorePunctuation) out = out.replace(DASHES, ' ').replace(PUNCT, '')
  return out.replace(/\s+/g, ' ').trim()
}

export function words(s: string): string[] {
  return s.split(/\s+/).filter(Boolean)
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

/** Number of character edits allowed for a target of this length. Short targets (< 5 chars) must be exact. */
export function allowedTypos(length: number, tolerance: number): number {
  if (tolerance <= 0 || length < 5) return 0
  return Math.max(1, Math.floor(length * tolerance))
}

export type MatchKind = 'exact' | 'close' | 'wrong'

export function matchAnswer(input: string, expected: string, opts: GradeOptions): MatchKind {
  const a = normalize(input, opts)
  const b = normalize(expected, opts)
  if (!a) return 'wrong'
  if (a === b) return 'exact'
  return levenshtein(a, b) <= allowedTypos(b.length, opts.typoTolerance) ? 'close' : 'wrong'
}

export function matchAny(input: string, accepted: string[], opts: GradeOptions): MatchKind {
  const kinds = accepted.map((a) => matchAnswer(input, a, opts))
  if (kinds.includes('exact')) return 'exact'
  if (kinds.includes('close')) return 'close'
  return 'wrong'
}

export interface SetGrade {
  found: { expected: string; given: string; kind: 'exact' | 'close' }[]
  missing: string[]
  extra: string[]
}

/** Grades an unordered recitation: each expected entry can be matched by at most one given entry. */
export function gradeSet(expected: string[], given: string[], opts: GradeOptions): SetGrade {
  const used = expected.map(() => false)
  const matchOf = given.map(() => -1)
  const kindOf: ('exact' | 'close')[] = []
  for (const pass of ['exact', 'close'] as const) {
    given.forEach((g, gi) => {
      if (matchOf[gi] >= 0) return
      const ei = expected.findIndex((e, i) => {
        if (used[i]) return false
        const k = matchAnswer(g, e, opts)
        return pass === 'exact' ? k === 'exact' : k !== 'wrong'
      })
      if (ei >= 0) {
        used[ei] = true
        matchOf[gi] = ei
        kindOf[gi] = pass
      }
    })
  }
  return {
    found: given.flatMap((g, gi) => (matchOf[gi] >= 0 ? [{ expected: expected[matchOf[gi]], given: g, kind: kindOf[gi] }] : [])),
    missing: expected.filter((_, i) => !used[i]),
    extra: given.filter((_, gi) => matchOf[gi] < 0),
  }
}

export type DiffType = 'correct' | 'typo' | 'wrong' | 'missing' | 'extra'

export interface DiffToken {
  type: DiffType
  /** The word to display: expected text for correct/missing, typed text otherwise. */
  text: string
  expected?: string
  /** Index into words(expected), for every type except "extra". */
  ei?: number
}

export interface DiffResult {
  tokens: DiffToken[]
  correct: number
  total: number
  accuracy: number
}

interface Word {
  raw: string
  norm: string
  i: number
}

/** Word-level diff of a recitation against the expected text, using a longest-common-subsequence alignment. */
export function wordDiff(expected: string, actual: string, opts: GradeOptions): DiffResult {
  const toWords = (s: string): Word[] =>
    words(s)
      .map((raw, i) => ({ raw, norm: normalize(raw, opts), i }))
      .filter((w) => w.norm)
  const exp = toWords(expected)
  const act = toWords(actual)
  const n = exp.length
  const m = act.length
  const W = m + 1
  const dp = new Uint16Array((n + 1) * W)
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * W + j] =
        exp[i].norm === act[j].norm ? dp[(i + 1) * W + j + 1] + 1 : Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1])
    }
  }

  const tokens: DiffToken[] = []
  let dels: Word[] = []
  let ins: Word[] = []
  const flush = () => {
    const k = Math.min(dels.length, ins.length)
    for (let p = 0; p < k; p++) {
      const e = dels[p]
      const a = ins[p]
      const close = levenshtein(e.norm, a.norm) <= allowedTypos(e.norm.length, opts.typoTolerance)
      tokens.push({ type: close ? 'typo' : 'wrong', text: a.raw, expected: e.raw, ei: e.i })
    }
    for (const e of dels.slice(k)) tokens.push({ type: 'missing', text: e.raw, ei: e.i })
    for (const a of ins.slice(k)) tokens.push({ type: 'extra', text: a.raw })
    dels = []
    ins = []
  }

  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && exp[i].norm === act[j].norm) {
      flush()
      tokens.push({ type: 'correct', text: exp[i].raw, ei: exp[i].i })
      i++
      j++
    } else if (j < m && (i >= n || dp[i * W + j + 1] >= dp[(i + 1) * W + j])) {
      ins.push(act[j++])
    } else {
      dels.push(exp[i++])
    }
  }
  flush()

  const correct = tokens.filter((t) => t.type === 'correct' || t.type === 'typo').length
  return { tokens, correct, total: n, accuracy: n ? correct / n : m ? 0 : 1 }
}

export function isPerfect(diff: DiffResult): boolean {
  return diff.tokens.every((t) => t.type === 'correct' || t.type === 'typo')
}
