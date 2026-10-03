import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import GradeSettings from '../components/GradeSettings'
import OptionList from '../components/OptionList'
import SetupCard, { ProgressBar, Segmented } from '../components/SetupCard'
import { createQuestionStream, gradeTyped, QUESTION_STYLES, type Question } from '../lib/questions'
import { bestAttempt, useAttempts } from '../store/decks'
import { useGradeOptions } from '../store/settings'
import { DRILL_LENGTHS, type Deck, type Missed, type ModeProps, type SessionResult } from '../types'

type AnswerStyle = 'mcq' | 'typing'

interface Config {
  seconds: number
  answer: AnswerStyle
  style: string
}

export default function SpeedMode({ deck, itemIds, onFinish }: ModeProps) {
  const attempts = useAttempts()
  const styles = QUESTION_STYLES[deck.kind]
  const [seconds, setSeconds] = useState<number>(60)
  const [answer, setAnswer] = useState<AnswerStyle>('mcq')
  const [style, setStyle] = useState(styles[0].id)
  const [config, setConfig] = useState<Config | null>(null)

  if (!config) {
    return (
      <SetupCard
        title="Speed drill"
        description={
          itemIds
            ? `Rapid-fire on your ${itemIds.length} missed item(s).`
            : 'Answer as many as you can before the clock runs out. Wrong answers flash the right one and move on.'
        }
        onStart={() => setConfig({ seconds, answer, style })}
      >
        <div className="row">
          <span className="muted small" style={{ width: '6rem' }}>Duration</span>
          <Segmented
            value={String(seconds)}
            onChange={(v) => setSeconds(Number(v))}
            options={DRILL_LENGTHS.map((s) => ({ id: String(s), label: `${s}s` }))}
          />
        </div>
        <div className="row">
          <span className="muted small" style={{ width: '6rem' }}>Answer by</span>
          <Segmented
            value={answer}
            onChange={setAnswer}
            options={[
              { id: 'mcq', label: 'Multiple choice' },
              { id: 'typing', label: 'Typing' },
            ]}
          />
        </div>
        <div className="row">
          <span className="muted small" style={{ width: '6rem' }}>Questions</span>
          <Segmented value={style} onChange={setStyle} options={styles} />
        </div>
        {answer === 'typing' && <GradeSettings />}
        <div className="row small muted">
          Best:
          {DRILL_LENGTHS.map((s) => {
            const best = bestAttempt(attempts, deck.id, 'speed', s)
            return (
              <span key={s} className="badge">
                {s}s: {best ? `${best.score} correct` : '-'}
              </span>
            )
          })}
        </div>
      </SetupCard>
    )
  }

  return <SpeedRun deck={deck} itemIds={itemIds} config={config} onFinish={onFinish} />
}

interface Stats {
  correct: number
  answered: number
  streak: number
  bestStreak: number
}

interface Feedback {
  correct: boolean
  given: string
}

function SpeedRun({
  deck,
  itemIds,
  config,
  onFinish,
}: {
  deck: Deck
  itemIds: string[] | null
  config: Config
  onFinish: (r: SessionResult) => void
}) {
  const opts = useGradeOptions()
  const mcq = config.answer === 'mcq'
  const [nextQuestion] = useState(() => createQuestionStream(deck, itemIds, config.style, mcq))
  const [q, setQ] = useState<Question | null>(() => nextQuestion())
  const [startedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [stats, setStats] = useState<Stats>({ correct: 0, answered: 0, streak: 0, bestStreak: 0 })
  const missed = useRef(new Map<string, Missed>())
  const finished = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const durationMs = config.seconds * 1000
  const remaining = Math.max(0, durationMs - (now - startedAt))

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (remaining > 0 || finished.current) return
    finished.current = true
    onFinish({
      mode: 'speed',
      score: stats.correct,
      total: stats.answered,
      durationMs,
      drillSeconds: config.seconds,
      unit: 'questions',
      missed: [...missed.current.values()],
    })
  }, [remaining, stats, durationMs, config.seconds, onFinish])

  useEffect(() => {
    if (!feedback) return
    const t = setTimeout(
      () => {
        setFeedback(null)
        setInput('')
        setQ(nextQuestion())
        inputRef.current?.focus()
      },
      feedback.correct ? 200 : 1200,
    )
    return () => clearTimeout(t)
  }, [feedback, nextQuestion])

  const record = (given: string, correct: boolean) => {
    if (!q || feedback || remaining <= 0) return
    setStats((s) => {
      const streak = correct ? s.streak + 1 : 0
      return {
        correct: s.correct + (correct ? 1 : 0),
        answered: s.answered + 1,
        streak,
        bestStreak: Math.max(s.bestStreak, streak),
      }
    })
    if (!correct) missed.current.set(q.itemId, { itemId: q.itemId, prompt: q.prompt, expected: q.answer, given })
    setFeedback({ correct, given })
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (!q) return
    if (e.key === 'Escape') {
      e.preventDefault()
      record('', false)
    } else if (e.key === 'Enter' && input.trim()) {
      e.preventDefault()
      record(input, gradeTyped(q, input, opts).correct)
    }
  }

  if (!q) {
    return (
      <div className="card">
        <h2>Not enough material</h2>
        <p className="muted">This deck doesn't have enough distinct items to build these questions.</p>
      </div>
    )
  }

  const low = remaining <= 5000

  return (
    <div className={`card ${feedback ? (feedback.correct ? 'flash-good' : 'flash-bad') : ''}`}>
      <div className="speed-hud">
        <span className={`timer ${low ? 'low' : ''}`}>{(remaining / 1000).toFixed(1)}s</span>
        <span className="stat">
          <strong>{stats.correct}</strong>correct
        </span>
        <span className="stat">
          <strong>{stats.answered}</strong>answered
        </span>
        <span className="stat">
          <strong>{stats.streak}</strong>streak
        </span>
      </div>
      <ProgressBar value={remaining / durationMs} className={`time ${low ? 'low' : ''}`} />
      <div className="question-label">{q.label}</div>
      <div className="question-prompt">{q.prompt}</div>
      {mcq ? (
        <OptionList
          key={q.id}
          options={q.options ?? []}
          answer={q.answer}
          picked={feedback ? feedback.given : null}
          onPick={(opt) => record(opt, opt === q.answer)}
        />
      ) : (
        <>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => !feedback && setInput(e.target.value)}
            onKeyDown={onKeyDown}
            readOnly={!!feedback}
            placeholder="Type and press Enter (Esc to skip)"
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          {feedback && !feedback.correct && (
            <div className="feedback bad">
              Answer: <span className="expected">{q.answer}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
