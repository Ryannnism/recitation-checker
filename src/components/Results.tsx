import { Link } from 'react-router-dom'
import { percent } from '../store/decks'
import { formatDuration, formatScore, pct } from '../lib/format'
import { MODES, MODE_LABELS, type Attempt, type Deck, type SessionResult } from '../types'

interface Props {
  deck: Deck
  result: SessionResult
  prevBest?: Attempt
  onRetry: () => void
  onRetryMissed: () => void
}

export default function Results({ deck, result, prevBest, onRetry, onRetryMissed }: Props) {
  const isSpeed = result.mode === 'speed'
  const newBest = prevBest && (isSpeed ? result.score > prevBest.score : percent(result) > percent(prevBest))

  return (
    <div className="stack">
      <div className="card">
        <div className="question-label">{MODE_LABELS[result.mode]} results</div>
        {isSpeed ? (
          <>
            <div className="score-big">{result.score} correct</div>
            <p className="muted">
              in {result.drillSeconds}s &middot; {result.total} answered &middot; {pct(result.score, result.total)}% accuracy
            </p>
          </>
        ) : (
          <>
            <div className="score-big">{pct(result.score, result.total)}%</div>
            <p className="muted">
              {result.score} / {result.total} {result.unit} &middot; {formatDuration(result.durationMs)}
            </p>
          </>
        )}
        {newBest && <p className="new-best">New personal best! (previous: {formatScore(prevBest)})</p>}
        {prevBest && !newBest && <p className="muted small">Personal best: {formatScore(prevBest)}</p>}
        {!prevBest && <p className="muted small">First attempt recorded for this mode.</p>}
        <div className="row">
          <button className="primary" onClick={onRetry} autoFocus>
            Try again
          </button>
          {result.missed.length > 0 && <button onClick={onRetryMissed}>Retry missed only ({result.missed.length})</button>}
          {MODES.filter((m) => m !== result.mode).map((m) => (
            <Link key={m} className="button ghost" to={`/practice/${deck.id}/${m}`}>
              {MODE_LABELS[m]}
            </Link>
          ))}
          <Link className="button ghost" to="/">
            All decks
          </Link>
        </div>
      </div>

      {result.missed.length > 0 ? (
        <div className="card">
          <h3>Missed ({result.missed.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Prompt</th>
                <th>Expected</th>
                <th>Your answer</th>
              </tr>
            </thead>
            <tbody>
              {result.missed.map((m, i) => (
                <tr key={`${m.itemId}-${i}`}>
                  <td className="muted">{m.prompt}</td>
                  <td>{m.expected}</td>
                  <td className="status-wrong">{m.given || <span className="muted">-</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        result.total > 0 && (
          <div className="card">
            <strong className="status-correct">Nothing missed. Clean run.</strong>
          </div>
        )
      )}
    </div>
  )
}
