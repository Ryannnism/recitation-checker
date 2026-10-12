import { useEffect, useState } from 'react'
import OptionList from '../components/OptionList'
import SetupCard, { ProgressBar, Segmented } from '../components/SetupCard'
import { buildQuestionSet, QUESTION_STYLES, type Question } from '../lib/questions'
import type { ModeProps, SessionResult } from '../types'

export default function McqMode({ deck, itemIds, onFinish }: ModeProps) {
  const styles = QUESTION_STYLES[deck.kind]
  const [style, setStyle] = useState(styles[0].id)
  const [questions, setQuestions] = useState<Question[] | null>(null)

  if (!questions) {
    return (
      <SetupCard
        title="Multiple choice"
        description={
          itemIds
            ? `Retrying ${itemIds.length} missed item(s).`
            : 'Pick the right option. Use the number keys for speed.'
        }
        onStart={() => setQuestions(buildQuestionSet(deck, itemIds, style, true))}
      >
        {styles.length > 1 && <Segmented value={style} onChange={setStyle} options={styles} />}
      </SetupCard>
    )
  }

  if (!questions.length) {
    return (
      <div className="card">
        <h2>Not enough material</h2>
        <p className="muted">Multiple choice needs at least two different answers in the deck to build options from.</p>
      </div>
    )
  }

  return <McqQuiz questions={questions} onFinish={onFinish} />
}

interface Entry {
  q: Question
  picked: string
  correct: boolean
}

function McqQuiz({ questions, onFinish }: { questions: Question[]; onFinish: (r: SessionResult) => void }) {
  const [pos, setPos] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [log, setLog] = useState<Entry[]>([])
  const [startedAt] = useState(() => Date.now())
  const q = questions[pos]

  const finish = (entries: Entry[]) =>
    onFinish({
      mode: 'mcq',
      score: entries.filter((e) => e.correct).length,
      total: entries.length,
      durationMs: Date.now() - startedAt,
      unit: 'questions',
      missed: entries
        .filter((e) => !e.correct)
        .map((e) => ({ itemId: e.q.itemId, prompt: e.q.prompt, expected: e.q.answer, given: e.picked })),
    })

  const next = () => {
    if (pos + 1 >= questions.length) return finish(log)
    setPos(pos + 1)
    setPicked(null)
  }

  const pick = (opt: string) => {
    if (picked !== null) return
    setPicked(opt)
    setLog((l) => [...l, { q, picked: opt, correct: opt === q.answer }])
  }

  useEffect(() => {
    if (picked === null) return
    if (picked === q.answer) {
      const t = setTimeout(next, 650)
      return () => clearTimeout(t)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

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
      <OptionList key={q.id} options={q.options ?? []} answer={q.answer} picked={picked} onPick={pick} />
      {picked !== null && picked !== q.answer && (
        <div className="row" style={{ marginTop: '1rem' }}>
          <button className="primary" onClick={next}>
            {pos + 1 >= questions.length ? 'See results' : 'Next'} <kbd>Enter</kbd>
          </button>
        </div>
      )}
    </div>
  )
}
