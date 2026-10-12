import { useCallback, useMemo, useState, type ComponentType } from 'react'
import { Link, NavLink, useParams } from 'react-router-dom'
import ItemPicker from '../components/ItemPicker'
import Results from '../components/Results'
import { setSelection, useSelection } from '../store/selection'
import { deckSize } from '../lib/format'
import McqMode from '../modes/McqMode'
import SpeedMode from '../modes/SpeedMode'
import TypingMode from '../modes/TypingMode'
import { addAttempt, bestAttempt, useAttempts, useDeck } from '../store/decks'
import { KIND_LABELS, MODES, MODE_LABELS, type Attempt, type Deck, type Mode, type ModeProps, type SessionResult } from '../types'

const MODE_COMPONENTS: Record<Mode, ComponentType<ModeProps>> = {
  typing: TypingMode,
  mcq: McqMode,
  speed: SpeedMode,
}

export default function PracticePage() {
  const { deckId, mode } = useParams()
  const deck = useDeck(deckId)

  if (!deck) {
    return (
      <div className="card">
        <h2>Deck not found</h2>
        <Link to="/">Back to decks</Link>
      </div>
    )
  }
  if (!MODES.includes(mode as Mode)) {
    return (
      <div className="card">
        <h2>Unknown mode</h2>
        <Link to="/">Back to decks</Link>
      </div>
    )
  }
  return <Practice key={`${deck.id}-${mode}`} deck={deck} mode={mode as Mode} />
}

function Practice({ deck, mode }: { deck: Deck; mode: Mode }) {
  const attempts = useAttempts()
  const [session, setSession] = useState<{ key: number; itemIds: string[] | null }>({ key: 0, itemIds: null })
  const [done, setDone] = useState<{ result: SessionResult; prevBest?: Attempt } | null>(null)
  const savedSelection = useSelection(deck.id)
  const selection = useMemo(() => {
    if (!savedSelection) return null
    const ids = new Set(deck.items.map((i) => i.id))
    const valid = savedSelection.filter((id) => ids.has(id))
    return valid.length && valid.length < deck.items.length ? valid : null
  }, [savedSelection, deck.items])

  const onFinish = useCallback(
    (result: SessionResult) => {
      const prevBest = bestAttempt(attempts, deck.id, result.mode, result.drillSeconds)
      if (result.total > 0) {
        addAttempt({
          deckId: deck.id,
          mode: result.mode,
          score: result.score,
          total: result.total,
          durationMs: result.durationMs,
          drillSeconds: result.drillSeconds,
        })
      }
      setDone({ result, prevBest })
    },
    [attempts, deck.id],
  )

  const restart = (itemIds: string[] | null) => {
    setDone(null)
    setSession((s) => ({ key: s.key + 1, itemIds }))
  }

  const ModeComponent = MODE_COMPONENTS[mode]

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="row">
            <span className={`badge ${deck.kind}`}>{KIND_LABELS[deck.kind]}</span>
            <span className="muted small">{deckSize(deck)}</span>
          </div>
          <h1 style={{ marginTop: '0.35rem' }}>{deck.name}</h1>
        </div>
        <div className="row mode-tabs">
          {MODES.map((m) => (
            <NavLink key={m} to={`/practice/${deck.id}/${m}`} className={({ isActive }) => `button ${isActive ? 'primary' : 'ghost'}`}>
              {MODE_LABELS[m]}
            </NavLink>
          ))}
        </div>
      </div>

      {!done &&
        (session.itemIds ? (
          <p className="muted small">
            Practicing {session.itemIds.length} missed item(s).{' '}
            <button className="ghost small" onClick={() => restart(null)}>
              Back to your selection
            </button>
          </p>
        ) : (
          <ItemPicker
            deck={deck}
            selected={selection}
            onChange={(ids) => {
              setSelection(deck.id, ids)
              restart(null)
            }}
          />
        ))}

      {done ? (
        <Results
          deck={deck}
          result={done.result}
          prevBest={done.prevBest}
          onRetry={() => restart(session.itemIds)}
          onRetryMissed={() => restart([...new Set(done.result.missed.map((m) => m.itemId))])}
        />
      ) : (
        <ModeComponent key={session.key} deck={deck} itemIds={session.itemIds ?? selection} onFinish={onFinish} />
      )}
    </div>
  )
}
