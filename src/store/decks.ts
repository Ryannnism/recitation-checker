import { useSyncExternalStore } from 'react'
import type { Attempt, Deck, Mode } from '../types'

const DECKS_KEY = 'rc.decks.v1'
const ATTEMPTS_KEY = 'rc.attempts.v1'

interface State {
  decks: Deck[]
  attempts: Attempt[]
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function load(): State {
  return { decks: read<Deck[]>(DECKS_KEY, []), attempts: read<Attempt[]>(ATTEMPTS_KEY, []) }
}

let state: State = load()
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function setState(next: State) {
  state = next
  localStorage.setItem(DECKS_KEY, JSON.stringify(state.decks))
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(state.attempts))
  emit()
}

window.addEventListener('storage', (e) => {
  if (e.key === DECKS_KEY || e.key === ATTEMPTS_KEY) {
    state = load()
    emit()
  }
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function useStore(): State {
  return useSyncExternalStore(subscribe, () => state)
}

export function useDecks(): Deck[] {
  return useStore().decks
}

export function useDeck(id: string | undefined): Deck | undefined {
  return useStore().decks.find((d) => d.id === id)
}

export function useAttempts(): Attempt[] {
  return useStore().attempts
}

export function saveDeck(deck: Deck) {
  const exists = state.decks.some((d) => d.id === deck.id)
  setState({
    ...state,
    decks: exists ? state.decks.map((d) => (d.id === deck.id ? deck : d)) : [...state.decks, deck],
  })
}

export function deleteDeck(id: string) {
  setState({
    decks: state.decks.filter((d) => d.id !== id),
    attempts: state.attempts.filter((a) => a.deckId !== id),
  })
}

export function addAttempt(attempt: Omit<Attempt, 'id' | 'at'>): Attempt {
  const full: Attempt = { ...attempt, id: crypto.randomUUID(), at: Date.now() }
  setState({ ...state, attempts: [...state.attempts, full] })
  return full
}

export function clearAttempts(deckId?: string) {
  setState({
    ...state,
    attempts: deckId ? state.attempts.filter((a) => a.deckId !== deckId) : [],
  })
}

export function exportData(): string {
  return JSON.stringify(
    { app: 'recitation-checker', version: 1, exportedAt: Date.now(), ...state },
    null,
    2,
  )
}

/** Merges decks and attempts from a backup; entries with the same id are overwritten. Returns the number of decks imported. */
export function importData(json: string): number {
  const data = JSON.parse(json) as Partial<State>
  if (!Array.isArray(data.decks)) throw new Error('This file has no "decks" list.')
  const decks = data.decks.filter(
    (d): d is Deck => !!d && typeof d.id === 'string' && Array.isArray(d.items) && typeof d.kind === 'string',
  )
  const attempts = Array.isArray(data.attempts) ? data.attempts : []
  const deckIds = new Set(decks.map((d) => d.id))
  const attemptIds = new Set(attempts.map((a) => a.id))
  setState({
    decks: [...state.decks.filter((d) => !deckIds.has(d.id)), ...decks],
    attempts: [...state.attempts.filter((a) => !attemptIds.has(a.id)), ...attempts],
  })
  return decks.length
}

export function percent(a: { score: number; total: number }): number {
  return a.total ? a.score / a.total : 0
}

/** Best attempt for a deck and mode: highest score for speed drills (per drill length), highest percentage otherwise. */
export function bestAttempt(
  attempts: Attempt[],
  deckId: string,
  mode: Mode,
  drillSeconds?: number,
): Attempt | undefined {
  let best: Attempt | undefined
  for (const a of attempts) {
    if (a.deckId !== deckId || a.mode !== mode) continue
    if (mode === 'speed') {
      if (drillSeconds !== undefined && a.drillSeconds !== drillSeconds) continue
      if (!best || a.score > best.score) best = a
    } else if (!best || percent(a) > percent(best)) {
      best = a
    }
  }
  return best
}
