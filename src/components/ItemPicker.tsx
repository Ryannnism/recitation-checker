import { useMemo, useState } from 'react'
import { crossingYear } from '../lib/parse'
import type { Deck, Item } from '../types'

interface Props {
  deck: Deck
  selected: string[] | null
  onChange: (ids: string[] | null) => void
}

function itemLabel(deck: Deck, item: Item, index: number): string {
  if (deck.kind === 'groups' || deck.kind === 'qa') return item.prompt ?? item.answer
  const text = item.answer.length > 80 ? `${item.answer.slice(0, 77)}...` : item.answer
  return `${index + 1}. ${text}`
}

export default function ItemPicker({ deck, selected, onChange }: Props) {
  const [draft, setDraft] = useState<Set<string> | null>(null)
  const noun = deck.kind === 'groups' ? 'classes' : deck.kind === 'passage' ? 'lines' : 'items'
  const total = deck.items.length
  const count = selected?.length ?? total

  const years = useMemo(() => {
    if (deck.kind !== 'groups') return []
    const byYear = new Map<string, string[]>()
    for (const it of deck.items) {
      const y = crossingYear(it.prompt ?? '')
      if (y) byYear.set(y, [...(byYear.get(y) ?? []), it.id])
    }
    return byYear.size > 1 ? [...byYear.entries()].map(([year, ids]) => ({ year, ids })) : []
  }, [deck])

  if (!draft) {
    return (
      <div className="picker-bar">
        <span>
          Practicing{' '}
          <strong>{count === total ? `all ${total} ${noun}` : `${count} of ${total} ${noun}`}</strong>
        </span>
        <button className="small" onClick={() => setDraft(new Set(selected ?? deck.items.map((i) => i.id)))}>
          Choose {noun}
        </button>
        {selected && (
          <button className="ghost small" onClick={() => onChange(null)}>
            Use all
          </button>
        )}
      </div>
    )
  }

  const toggle = (ids: string[], on: boolean) => {
    const next = new Set(draft)
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)))
    setDraft(next)
  }

  const apply = () => {
    const ids = deck.items.filter((i) => draft.has(i.id)).map((i) => i.id)
    onChange(ids.length === total ? null : ids)
    setDraft(null)
  }

  return (
    <div className="card picker">
      <div className="spread">
        <strong>Choose {noun} to practice</strong>
        <div className="row">
          <button className="ghost small" onClick={() => toggle(deck.items.map((i) => i.id), true)}>
            All
          </button>
          <button className="ghost small" onClick={() => setDraft(new Set())}>
            None
          </button>
        </div>
      </div>
      {years.length > 0 && (
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <span className="muted small">Crossing year:</span>
          {years.map(({ year, ids }) => {
            const allOn = ids.every((id) => draft.has(id))
            return (
              <button key={year} className={`small chip ${allOn ? 'active' : ''}`} onClick={() => toggle(ids, !allOn)}>
                {year}
              </button>
            )
          })}
        </div>
      )}
      <div className="picker-grid">
        {deck.items.map((it, i) => (
          <label key={it.id} className="check">
            <input type="checkbox" checked={draft.has(it.id)} onChange={(e) => toggle([it.id], e.target.checked)} />
            <span>
              {itemLabel(deck, it, i)}
              {it.members && <span className="muted small"> ({it.members.length})</span>}
            </span>
          </label>
        ))}
      </div>
      <div className="row">
        <button className="primary" onClick={apply} disabled={draft.size === 0}>
          Practice {draft.size} {noun}
        </button>
        <button className="ghost" onClick={() => setDraft(null)}>
          Cancel
        </button>
      </div>
    </div>
  )
}
