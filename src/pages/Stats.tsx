import { Link } from 'react-router-dom'
import { bestAttempt, clearAttempts, percent, useAttempts, useDecks } from '../store/decks'
import { formatDate, formatDuration, formatScore } from '../lib/format'
import { DRILL_LENGTHS, KIND_LABELS, MODE_LABELS, type Attempt, type Deck } from '../types'

function DeckStats({ deck, attempts }: { deck: Deck; attempts: Attempt[] }) {
  const recent = [...attempts].sort((a, b) => b.at - a.at)
  const graded = attempts.filter((a) => a.mode !== 'speed').slice(-30)
  const bests = [
    { label: 'Typing', best: bestAttempt(attempts, deck.id, 'typing') },
    { label: 'Multiple choice', best: bestAttempt(attempts, deck.id, 'mcq') },
    ...DRILL_LENGTHS.map((s) => ({ label: `Speed ${s}s`, best: bestAttempt(attempts, deck.id, 'speed', s) })),
  ]

  return (
    <div className="card">
      <div className="spread">
        <div className="row">
          <span className={`badge ${deck.kind}`}>{KIND_LABELS[deck.kind]}</span>
          <h3 style={{ margin: 0 }}>{deck.name}</h3>
        </div>
        <div className="row">
          <span className="muted small">{attempts.length} attempts</span>
          <button
            className="ghost danger small"
            onClick={() => confirm(`Clear history for "${deck.name}"?`) && clearAttempts(deck.id)}
          >
            Clear history
          </button>
        </div>
      </div>

      <div className="row" style={{ margin: '0.75rem 0' }}>
        {bests.map(({ label, best }) => (
          <span key={label} className="badge">
            {label}: {best ? formatScore(best) : '-'}
          </span>
        ))}
      </div>

      {graded.length > 1 && (
        <>
          <div className="muted small">Accuracy over recent typing and MCQ attempts</div>
          <div className="bars">
            {graded.map((a) => (
              <div
                key={a.id}
                style={{ height: `${Math.max(4, percent(a) * 100)}%` }}
                title={`${MODE_LABELS[a.mode]} · ${formatScore(a)} · ${formatDate(a.at)}`}
              />
            ))}
          </div>
        </>
      )}

      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Mode</th>
            <th>Score</th>
            <th>Detail</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {recent.slice(0, 15).map((a) => (
            <tr key={a.id}>
              <td className="muted">{formatDate(a.at)}</td>
              <td>{MODE_LABELS[a.mode]}</td>
              <td>{formatScore(a)}</td>
              <td className="muted">
                {a.score} / {a.total}
              </td>
              <td className="muted">{formatDuration(a.durationMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {recent.length > 15 && <p className="muted small">Showing the latest 15 of {recent.length}.</p>}
    </div>
  )
}

export default function Stats() {
  const decks = useDecks()
  const attempts = useAttempts()
  const withHistory = decks
    .map((d) => ({ deck: d, attempts: attempts.filter((a) => a.deckId === d.id) }))
    .filter((x) => x.attempts.length > 0)
    .sort((a, b) => Math.max(...b.attempts.map((x) => x.at)) - Math.max(...a.attempts.map((x) => x.at)))

  return (
    <div>
      <div className="page-header">
        <h1>Stats</h1>
        {attempts.length > 0 && (
          <button className="ghost danger" onClick={() => confirm('Clear all practice history?') && clearAttempts()}>
            Clear all history
          </button>
        )}
      </div>
      {withHistory.length === 0 ? (
        <div className="card empty">
          <h2>No attempts yet</h2>
          <p className="muted">Finish a practice session and your scores will show up here.</p>
          <Link className="button primary" to="/">
            Go to decks
          </Link>
        </div>
      ) : (
        withHistory.map(({ deck, attempts }) => <DeckStats key={deck.id} deck={deck} attempts={attempts} />)
      )}
    </div>
  )
}
