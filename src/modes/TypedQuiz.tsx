import { useRef, useState, type KeyboardEvent } from 'react'
import DiffView from '../components/DiffView'
import { ProgressBar } from '../components/SetupCard'
import { gradeTyped, type Question, type TypedGrade } from '../lib/questions'
import { useGradeOptions } from '../store/settings'
import type { SessionResult } from '../types'

interface Entry {
  q: Question
  given: string
  correct: boolean
}

interface Props {
  questions: Question[]
  unit: string
  onFinish: (result: SessionResult) => void
}

/** One-question-at-a-time typed answers, shared by Q/A typing and list "one at a time" typing. */
export default function TypedQuiz({ questions, unit, onFinish }: Props) {
  const opts = useGradeOptions()
  const [pos, setPos] = useState(0)
  const [input, setInput] = useState('')
  const [grade, setGrade] = useState<TypedGrade | null>(null)
  const [log, setLog] = useState<Entry[]>([])
  const [startedAt] = useState(() => Date.now())
  const inputRef = useRef<HTMLInputElement>(null)
  const q = questions[pos]

  const finish = (entries: Entry[]) => {
    onFinish({
      mode: 'typing',
      score: entries.filter((e) => e.correct).length,
      total: entries.length,
      durationMs: Date.now() - startedAt,
      unit,
      missed: entries
        .filter((e) => !e.correct)
        .map((e) => ({ itemId: e.q.itemId, prompt: e.q.prompt, expected: e.q.answer, given: e.given })),
    })
  }

  const check = (given: string) => {
    const g: TypedGrade = given.trim() ? gradeTyped(q, given, opts) : { correct: false, kind: 'wrong' }
    setGrade(g)
    setLog((l) => [...l, { q, given, correct: g.correct }])
    inputRef.current?.focus()
  }

  const next = () => {
    if (pos + 1 >= questions.length) return finish(log)
    setPos(pos + 1)
    setInput('')
    setGrade(null)
    inputRef.current?.focus()
  }

  const override = () => {
    setLog((l) => l.map((e, i) => (i === l.length - 1 ? { ...e, correct: true } : e)))
    setGrade((g) => g && { ...g, correct: true, kind: 'close' })
    inputRef.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (grade) next()
    else if (input.trim()) check(input)
  }

  if (!q) return <div className="card">No questions to show.</div>

  return (
    <div className="card">
      <div className="spread small muted" style={{ marginBottom: '0.5rem' }}>
        <span>
          {pos + 1} / {questions.length}
        </span>
        <span>
          {log.filter((e) => e.correct).length} correct
          <button className="ghost small" style={{ marginLeft: '0.5rem' }} onClick={() => finish(log)} disabled={!log.length}>
            End early
          </button>
        </span>
      </div>
      <ProgressBar value={pos / questions.length} />
      <div className="question-label">{q.label}</div>
      <div className="question-prompt">{q.prompt}</div>
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => !grade && setInput(e.target.value)}
        onKeyDown={onKeyDown}
        readOnly={!!grade}
        placeholder="Type your answer and press Enter"
        autoFocus
        autoComplete="off"
        spellCheck={false}
      />
      {!grade && (
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <button className="primary" onClick={() => check(input)} disabled={!input.trim()}>
            Check <kbd>Enter</kbd>
          </button>
          <button className="ghost" onClick={() => check('')}>
            Reveal
          </button>
        </div>
      )}
      {grade && (
        <>
          <div className={`feedback ${grade.kind === 'exact' ? 'good' : grade.kind === 'close' ? 'warn' : 'bad'}`}>
            {grade.kind === 'exact' && <strong>Correct</strong>}
            {grade.kind === 'close' && (
              <>
                <strong>Accepted</strong> &middot; expected <span className="expected">{q.answer}</span>
              </>
            )}
            {grade.kind === 'wrong' && (
              <>
                <strong>{input.trim() ? 'Not quite' : 'Answer'}</strong> &middot; expected{' '}
                <span className="expected">{q.answer}</span>
                {q.alternates && <span className="muted"> (also: {q.alternates.join(', ')})</span>}
              </>
            )}
          </div>
          {grade.diff && !grade.correct && <DiffView tokens={grade.diff.tokens} />}
          <div className="row" style={{ marginTop: '0.75rem' }}>
            <button className="primary" onClick={next}>
              {pos + 1 >= questions.length ? 'See results' : 'Next'} <kbd>Enter</kbd>
            </button>
            {!grade.correct && input.trim() && (
              <button className="ghost" onClick={override}>
                I was right
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
