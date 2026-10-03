import { useSyncExternalStore } from 'react'
import type { GradeOptions } from '../types'

const KEY = 'rc.settings.v1'

export const DEFAULT_GRADE_OPTIONS: GradeOptions = {
  ignoreCase: true,
  ignorePunctuation: true,
  typoTolerance: 0.15,
}

function load(): GradeOptions {
  try {
    return { ...DEFAULT_GRADE_OPTIONS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return DEFAULT_GRADE_OPTIONS
  }
}

let current = load()
const listeners = new Set<() => void>()

export function setGradeOptions(patch: Partial<GradeOptions>) {
  current = { ...current, ...patch }
  localStorage.setItem(KEY, JSON.stringify(current))
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useGradeOptions(): GradeOptions {
  return useSyncExternalStore(subscribe, () => current)
}
