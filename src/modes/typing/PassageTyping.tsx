import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import DiffView, { DiffLegend } from '../../components/DiffView'
import GradeSettings from '../../components/GradeSettings'
import SetupCard, { ProgressBar, Segmented } from '../../components/SetupCard'
import { isPerfect, wordDiff, words, type DiffResult } from '../../lib/grader'
import { pct } from '../../lib/format'
import { targetIndexes } from '../../lib/questions'
import { useGradeOptions } from '../../store/settings'
import type { Missed, ModeProps } from '../../types'

type Style = 'full' | 'lines'

export default function PassageTyping({ deck, itemIds, onFinish }: ModeProps) {
  const [choice, setChoice] = useState<Style>(itemIds ? 'lines' : 'full')
  const [started, setStarted] = useState(false)

  if (!started) {
    return (
      <SetupCard
        title="Typing: recite the passage"
        description={
          itemIds
            ? `${targetIndexes(deck, itemIds).length} selected line(s), one at a time.`
            : 'Type it from memory. You will get a word-by-word comparison when you check.'
        }
        onStart={() => setStarted(true)}
      >
        {!itemIds && (
          <Segmented
            value={choice}
            onChange={setChoice}
            options={[
              { id: 'full', label: 'Full passage' },
              { id: 'lines', label: 'Line by line' },
            ]}
          />
        )}
        <GradeSettings />
      </SetupCard>
    )
  }

  return choice === 'full' ? (
    <FullPassage deck={deck} itemIds={null} onFinish={onFinish} />
  ) : (
    <LineByLine deck={deck} itemIds={itemIds} onFinish={onFinish} />
  )
}

function FullPassage({ deck, onFinish }: ModeProps) {
  const opts = useGradeOptions()
  const [text, setText] = useState('')
  const [diff, setDiff] = useState<DiffResult | null>(null)
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)
  const expected = useMemo(() => deck.items.map((i) => i.answer).join(' '), [deck])

  const check = () => {
    if (!text.trim()) return
    setDiff(wordDiff(expected, text, opts))
    setElapsed(Date.now() - startedAt)
  }

  const retry = () => {
    setDiff(null)
    setText('')
    setStartedAt(Date.now())
  }

  const finish = () => {
    if (!diff) return
    const lineOf = deck.items.flatMap((it, li) => words(it.answer).map(() => li))
    const badLines = new Set<number>()
    for (const t of diff.tokens) {
      if ((t.type === 'wrong' || t.type === 'missing') && t.ei !== undefined) badLines.add(lineOf[t.ei])
    }
    const missed: Missed[] = [...badLines]
      .sort((a, b) => a - b)
      .map((li) => ({ itemId: deck.items[li].id, prompt: `Line ${li + 1}`, expected: deck.items[li].answer }))
    onFinish({ mode: 'typing', score: diff.correct, total: diff.total, durationMs: elapsed, missed, unit: 'words' })
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      check()
    }
  }

  if (diff) {
    return (
      <div className="card">
        <div className="spread">
          <h2>
            {pct(diff.correct, diff.total)}% <span className="muted small">({diff.correct} / {diff.total} words)</span>
          </h2>
          <div className="row">
            <button onClick={retry}>Try again</button>
            <button className="primary" onClick={finish} autoFocus>
              Save &amp; see results
            </button>
          </div>
        </div>
        <DiffView tokens={diff.tokens} />
        <DiffLegend />
      </div>
    )
  }

  return (
    <div className="card stack">
      <div className="spread">
        <h2>{deck.name}</h2>
        <span className="muted small">{words(expected).length} words</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        rows={12}
        placeholder="Start reciting..."
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

interface LineResult {
  li: number
  diff: DiffResult
  given: string
}

function LineByLine({ deck, itemIds, onFinish }: ModeProps) {
  const opts = useGradeOptions()
  const targets = useMemo(() => targetIndexes(deck, itemIds), [deck, itemIds])
  const [pos, setPos] = useState(0)
  const [input, setInput] = useState('')
  const [hints, setHints] = useState(0)
  const [diff, setDiff] = useState<DiffResult | null>(null)
  const [results, setResults] = useState<LineResult[]>([])
  const [startedAt] = useState(() => Date.now())
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const li = targets[pos]
  const line = deck.items[li]
  const lineWords = words(line.answer)
  const context = itemIds
    ? li > 0
      ? [deck.items[li - 1].answer]
      : []
    : deck.items.slice(Math.max(0, li - 4), li).map((i) => i.answer)

  const finish = (all: LineResult[]) => {
    onFinish({
      mode: 'typing',
      score: all.reduce((s, r) => s + r.diff.correct, 0),
      total: all.reduce((s, r) => s + r.diff.total, 0),
      durationMs: Date.now() - startedAt,
      unit: 'words',
      missed: all
        .filter((r) => !isPerfect(r.diff))
        .map((r) => ({ itemId: deck.items[r.li].id, prompt: `Line ${r.li + 1}`, expected: deck.items[r.li].answer, given: r.given })),
    })
  }

  const check = () => {
    const d = wordDiff(line.answer, input, opts)
    setDiff(d)
    setResults((r) => [...r, { li, diff: d, given: input }])
    inputRef.current?.focus()
  }

  const next = () => {
    if (pos + 1 >= targets.length) return finish(results)
    setPos(pos + 1)
    setInput('')
    setHints(0)
    setDiff(null)
    inputRef.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.shiftKey) return
    e.preventDefault()
    if (diff) next()
    else if (input.trim()) check()
  }

  const totalCorrect = results.reduce((s, r) => s + r.diff.correct, 0)
  const totalWords = results.reduce((s, r) => s + r.diff.total, 0)

  return (
    <div className="card">
      <div className="spread small muted" style={{ marginBottom: '0.5rem' }}>
        <span>
          Line {pos + 1} / {targets.length}
        </span>
        <span>
          {totalWords ? `${pct(totalCorrect, totalWords)}% so far` : ''}
          <button
            className="ghost small"
            style={{ marginLeft: '0.5rem' }}
            onClick={() => finish(results)}
            disabled={!results.length}
          >
            End early
          </button>
        </span>
      </div>
      <ProgressBar value={pos / targets.length} />
      <div className="question-label">{li === 0 ? 'How does it begin?' : 'What comes next?'}</div>
      {context.length > 0 && (
        <div className="context">
          {context.map((c, i) => (
            <p key={i}>{c}</p>
          ))}
        </div>
      )}
      {hints > 0 && !diff && <div className="hint">{lineWords.slice(0, hints).join(' ')} ...</div>}
      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => !diff && setInput(e.target.value)}
        onKeyDown={onKeyDown}
        readOnly={!!diff}
        rows={2}
        style={{ minHeight: '4rem' }}
        placeholder="Type the line and press Enter"
        autoFocus
        spellCheck={false}
      />
      {!diff ? (
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <button className="primary" onClick={check} disabled={!input.trim()}>
            Check <kbd>Enter</kbd>
          </button>
          <button
            className="ghost"
            onClick={() => {
              setHints((h) => Math.min(h + 1, lineWords.length))
              inputRef.current?.focus()
            }}
            disabled={hints >= lineWords.length}
          >
            {hints ? 'Next word' : 'Hint: first word'}
          </button>
        </div>
      ) : (
        <>
          <div className={`feedback ${isPerfect(diff) ? 'good' : 'bad'}`}>
            <strong>{isPerfect(diff) ? 'Perfect' : `${pct(diff.correct, diff.total)}% of words`}</strong>
            {hints > 0 && <span className="muted"> &middot; used {hints} hint word(s)</span>}
          </div>
          <DiffView tokens={diff.tokens} />
          <button className="primary" onClick={next}>
            {pos + 1 >= targets.length ? 'See results' : 'Next line'} <kbd>Enter</kbd>
          </button>
        </>
      )}
    </div>
  )
}
