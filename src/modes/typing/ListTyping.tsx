import { useState, type KeyboardEvent } from 'react'
import GradeSettings from '../../components/GradeSettings'
import SetupCard, { Segmented } from '../../components/SetupCard'
import { pct } from '../../lib/format'
import { matchAnswer } from '../../lib/grader'
import { buildQuestionSet, type Question } from '../../lib/questions'
import { useGradeOptions } from '../../store/settings'
import type { ModeProps } from '../../types'
import TypedQuiz from '../TypedQuiz'

type Style = 'full' | 'one'

export default function ListTyping({ deck, itemIds, onFinish }: ModeProps) {
  const [choice, setChoice] = useState<Style>(itemIds ? 'one' : 'full')
  const [started, setStarted] = useState<Question[] | 'full' | null>(null)

  if (!started) {
    return (
      <SetupCard
        title="Typing: recite the list"
        description={
          itemIds
            ? `Retrying ${itemIds.length} missed entr${itemIds.length === 1 ? 'y' : 'ies'}, one at a time.`
            : choice === 'full'
              ? 'Type every entry in order, one per line.'
              : 'You are shown each entry and type the one that comes after it.'
        }
        onStart={() => setStarted(choice === 'full' ? 'full' : buildQuestionSet(deck, itemIds, 'after', false, true))}
      >
        {!itemIds && (
          <Segmented
            value={choice}
            onChange={setChoice}
            options={[
              { id: 'full', label: 'Full recall' },
              { id: 'one', label: 'One at a time' },
            ]}
          />
        )}
        <GradeSettings />
      </SetupCard>
    )
  }

  if (started === 'full') return <FullRecall deck={deck} itemIds={null} onFinish={onFinish} />
  return <TypedQuiz questions={started} unit="entries" onFinish={onFinish} />
}

type Status = 'correct' | 'typo' | 'wrong' | 'order' | 'missing'

interface Row {
  i: number
  expected: string
  given: string
  status: Status
  note?: string
}

const STATUS_LABELS: Record<Status, string> = {
  correct: 'Correct',
  typo: 'Accepted typo',
  wrong: 'Wrong',
  order: 'Out of order',
  missing: 'Missing',
}

function FullRecall({ deck, onFinish }: ModeProps) {
  const opts = useGradeOptions()
  const [text, setText] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [extras, setExtras] = useState<string[]>([])
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)

  const check = () => {
    const given = text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    setRows(
      deck.items.map((it, i): Row => {
        const g = given[i] ?? ''
        if (!g) return { i, expected: it.answer, given: '', status: 'missing' }
        const kind = matchAnswer(g, it.answer, opts)
        if (kind !== 'wrong') return { i, expected: it.answer, given: g, status: kind === 'exact' ? 'correct' : 'typo' }
        const elsewhere = deck.items.findIndex((o, j) => j !== i && matchAnswer(g, o.answer, opts) !== 'wrong')
        return elsewhere >= 0
          ? { i, expected: it.answer, given: g, status: 'order', note: `belongs at #${elsewhere + 1}` }
          : { i, expected: it.answer, given: g, status: 'wrong' }
      }),
    )
    setExtras(given.slice(deck.items.length))
    setElapsed(Date.now() - startedAt)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      check()
    }
  }

  if (rows) {
    const good = rows.filter((r) => r.status === 'correct' || r.status === 'typo')
    const finish = () =>
      onFinish({
        mode: 'typing',
        score: good.length,
        total: rows.length,
        durationMs: elapsed,
        unit: 'entries',
        missed: rows
          .filter((r) => r.status !== 'correct' && r.status !== 'typo')
          .map((r) => ({ itemId: deck.items[r.i].id, prompt: `#${r.i + 1}`, expected: r.expected, given: r.given })),
      })
    return (
      <div className="card stack">
        <div className="spread">
          <h2>
            {pct(good.length, rows.length)}%{' '}
            <span className="muted small">
              ({good.length} / {rows.length} entries)
            </span>
          </h2>
          <div className="row">
            <button
              onClick={() => {
                setRows(null)
                setText('')
                setStartedAt(Date.now())
              }}
            >
              Try again
            </button>
            <button className="primary" onClick={finish} autoFocus>
              Save &amp; see results
            </button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Expected</th>
              <th>You typed</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.i}>
                <td className="muted">{r.i + 1}</td>
                <td>{r.expected}</td>
                <td>{r.given || <span className="muted">-</span>}</td>
                <td className={`status-${r.status}`}>
                  {STATUS_LABELS[r.status]}
                  {r.note && <span className="muted small"> ({r.note})</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {extras.length > 0 && (
          <p className="muted small">
            Extra lines beyond the end of the list: {extras.join(', ')}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="card stack">
      <div className="spread">
        <h2>{deck.name}</h2>
        <span className="muted small">{deck.items.length} entries</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        rows={Math.min(20, Math.max(8, deck.items.length + 1))}
        placeholder="One entry per line, in order"
        autoFocus
        spellCheck={false}
      />
      <div className="row">
        <button className="primary" onClick={check} disabled={!text.trim()}>
          Check <kbd>⌘ Enter</kbd>
        </button>
      </div>
    </div>
  )
}
