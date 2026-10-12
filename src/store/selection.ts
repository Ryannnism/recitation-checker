import { useSyncExternalStore } from 'react'

const KEY = 'rc.selection.v1'

function load(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

let current = load()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Item ids chosen for practice in this deck, or null for the whole deck. */
export function useSelection(deckId: string): string[] | null {
  return useSyncExternalStore(subscribe, () => current)[deckId] ?? null
}

export function setSelection(deckId: string, ids: string[] | null) {
  const next = { ...current }
  if (ids) next[deckId] = ids
  else delete next[deckId]
  current = next
  localStorage.setItem(KEY, JSON.stringify(current))
  listeners.forEach((l) => l())
}
