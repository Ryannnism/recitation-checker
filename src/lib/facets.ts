import type { Item } from '../types'

export interface Facet {
  /** Leading part of the prompt, e.g. "Eta Pi". */
  group: string
  /** Trailing part shared with other prompts, e.g. "President?". */
  category: string
}

const cache = new WeakMap<Item[], Map<string, Facet>>()

/**
 * Splits prompts like "Eta Pi President?" into a group ("Eta Pi") and a question type ("President?").
 * The question type is the trailing run of words shared by the most prompts; ties go to the longer run.
 */
export function promptFacets(items: Item[]): Map<string, Facet> {
  const cached = cache.get(items)
  if (cached) return cached

  const words = items.map((i) => (i.prompt ?? '').trim().split(/\s+/).filter(Boolean))
  const counts = new Map<string, number>()
  for (const ws of words) {
    for (let k = 1; k < ws.length; k++) {
      const key = ws.slice(-k).join(' ').toLowerCase()
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  const facets = new Map<string, Facet>()
  items.forEach((item, idx) => {
    const ws = words[idx]
    let bestK = 0
    let bestCount = 1
    for (let k = 1; k < ws.length; k++) {
      const c = counts.get(ws.slice(-k).join(' ').toLowerCase()) ?? 0
      if (c > bestCount || (c === bestCount && c > 1 && k > bestK)) {
        bestK = k
        bestCount = c
      }
    }
    if (bestK) facets.set(item.id, { group: ws.slice(0, -bestK).join(' '), category: ws.slice(-bestK).join(' ') })
  })
  cache.set(items, facets)
  return facets
}

const key = (s: string) => s.toLowerCase()

export function sameCategory(items: Item[], item: Item): Item[] {
  const facets = promptFacets(items)
  const mine = facets.get(item.id)
  if (!mine) return []
  return items.filter((i) => i !== item && key(facets.get(i.id)?.category ?? '') === key(mine.category))
}

export interface FacetOption {
  label: string
  ids: string[]
}

/** Question types and groups worth offering as filters (each needs 2+ values, each value 2+ items for types). */
export function facetOptions(items: Item[]): { categories: FacetOption[]; groups: FacetOption[] } {
  const facets = promptFacets(items)
  const collect = (pick: (f: Facet) => string) => {
    const map = new Map<string, FacetOption>()
    for (const it of items) {
      const f = facets.get(it.id)
      if (!f) continue
      const label = pick(f)
      const k = key(label)
      if (!map.has(k)) map.set(k, { label: label.replace(/\?$/, ''), ids: [] })
      map.get(k)!.ids.push(it.id)
    }
    return [...map.values()]
  }
  const categories = collect((f) => f.category).filter((c) => c.ids.length >= 2)
  if (categories.length < 2) return { categories: [], groups: [] }
  const groups = collect((f) => f.group)
  return { categories, groups: groups.length >= 2 ? groups : [] }
}
