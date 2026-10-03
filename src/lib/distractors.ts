const key = (s: string) => s.trim().toLocaleLowerCase()

/** Picks up to `n` wrong options from the pool, favouring ones that look like the correct answer. */
export function pickDistractors(correct: string, pool: readonly string[], n = 3): string[] {
  const ck = key(correct)
  const seen = new Set([ck])
  const unique: string[] = []
  for (const p of pool) {
    const k = key(p)
    if (!k || seen.has(k)) continue
    seen.add(k)
    unique.push(p.trim())
  }
  return unique
    .map((s) => {
      const lenRatio = Math.min(s.length, correct.length) / Math.max(s.length, correct.length, 1)
      const sameStart = key(s)[0] === ck[0] ? 0.3 : 0
      return { s, score: lenRatio + sameStart + Math.random() * 0.7 }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.s)
}
