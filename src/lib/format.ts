import type { Attempt, Deck } from '../types'

export function deckSize(deck: Pick<Deck, 'kind' | 'items'>): string {
  if (deck.kind === 'groups') {
    const names = deck.items.reduce((s, i) => s + (i.members?.length ?? 0), 0)
    return `${deck.items.length} class${deck.items.length === 1 ? '' : 'es'} · ${names} names`
  }
  return `${deck.items.length} items`
}

export function pct(score: number, total: number): number {
  return total ? Math.round((score / total) * 100) : 0
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  return m ? `${m}m ${s % 60}s` : `${s}s`
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatScore(a: Pick<Attempt, 'mode' | 'score' | 'total' | 'drillSeconds'>): string {
  return a.mode === 'speed' ? `${a.score} in ${a.drillSeconds}s` : `${pct(a.score, a.total)}%`
}
