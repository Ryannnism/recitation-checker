import { useRef, useState, type KeyboardEvent } from 'react'
import GradeSettings from '../../components/GradeSettings'
import SetupCard, { ProgressBar, Segmented } from '../../components/SetupCard'
import { pct } from '../../lib/format'
import { gradeSet, splitList, type SetGrade } from '../../lib/grader'
import SetView from '../../components/SetView'
import { targetIndexes } from '../../lib/questions'
import { shuffle } from '../../lib/shuffle'
import { useGradeOptions } from '../../store/settings'
import type { Deck, ModeProps } from '../../types'

type Order = 'ordered' | 'shuffled'

export default function GroupTyping({ deck, itemIds, onFinish }: ModeProps) {
  const [order, setOrder] = useState<Order>('ordered')
  const [targets, setTargets] = useState<number[] | null>(null)

  if (!targets) {
    const count = targetIndexes(deck, itemIds).length
    return (
      <SetupCard
        title="Typing: name everyone in each class"
        description={
          itemIds
            ? `${count} selected class${count === 1 ? '' : 'es'}. Type every name you remember in any order, one per line or separated by commas.`
            : 'For each class, type every name you remember in any order, one per line or separated by commas.'
        }
        onStart={() => {
          const t = targetIndexes(deck, itemIds)
          setTargets(order === 'shuffled' ? shuffle(t) : t)
        }}
      >
        <Segmented
          value={order}
          onChange={setOrder}
          options={[
            { id: 'ordered', label: 'Classes in order' },
            { id: 'shuffled', label: 'Shuffled' },
          ]}
        />
        <GradeSettings />
      </SetupCard>
    )
  }

  return <GroupRun deck={deck} targets={targets} onFinish={onFinish} />
}

interface GroupResult {
  index: number
  grade: SetGrade
}

function GroupRun({ deck, targets, onFinish }: { deck: Deck; targets: number[]; onFinish: ModeProps['onFinish'] }) {
  const opts = useGradeOptions()
  const [pos, setPos] = useState(0)
  const [text, setText] = useState('')
  const [grade, setGrade] = useState<SetGrade | null>(null)
  const [results, setResults] = useState<GroupResult[]>([])
  const [startedAt] = useState(() => Date.now())
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const index = targets[pos]
  const group = deck.items[index]
  const members = group.members ?? []
  const entered = splitList(text).length

  const finish = (all: GroupResult[]) => {
    onFinish({
      mode: 'typing',
      score: all.reduce((s, r) => s + r.grade.found.length, 0),
      total: all.reduce((s, r) => s + r.grade.found.length + r.grade.missing.length, 0),
      durationMs: Date.now() - startedAt,
      unit: 'names',
      missed: all
        .filter((r) => r.grade.missing.length > 0)
        .map((r) => ({
          itemId: deck.items[r.index].id,
          prompt: deck.items[r.index].prompt ?? '',
          expected: r.grade.missing.join(', '),
          given: r.grade.extra.join(', '),
        })),
    })
  }

  const check = () => {
    const g = gradeSet(members, splitList(text), opts)
    setGrade(g)
    setResults((r) => [...r, { index, grade: g }])
    inputRef.current?.focus()
  }

  const next = () => {
    if (pos + 1 >= targets.length) return finish(results)
    setPos(pos + 1)
    setText('')
    setGrade(null)
    inputRef.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return
    if (grade) {
      e.preventDefault()
      next()
    } else if ((e.metaKey || e.ctrlKey) && text.trim()) {
      e.preventDefault()
      check()
    }
  }

  const named = results.reduce((s, r) => s + r.grade.found.length, 0)
  const asked = results.reduce((s, r) => s + r.grade.found.length + r.grade.missing.length, 0)

  return (
    <div className="card">
      <div className="spread small muted" style={{ marginBottom: '0.5rem' }}>
        <span>
          Class {pos + 1} / {targets.length}
        </span>
        <span>
          {asked ? `${named} / ${asked} names so far` : ''}
          <button className="ghost small" style={{ marginLeft: '0.5rem' }} onClick={() => finish(results)} disabled={!results.length}>
            End early
          </button>
        </span>
      </div>
      <ProgressBar value={pos / targets.length} />
      <div className="question-label">Name everyone (any order)</div>
      <div className="question-prompt">{group.prompt}</div>
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => !grade && setText(e.target.value)}
        onKeyDown={onKeyDown}
        readOnly={!!grade}
        rows={Math.min(14, Math.max(5, members.length + 1))}
        placeholder="One name per line, or separated by commas"
        autoFocus
        spellCheck={false}
      />
      {!grade ? (
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <button className="primary" onClick={check} disabled={!text.trim()}>
            Check <kbd>⌘ Enter</kbd>
          </button>
          <span className="muted small">
            {entered} / {members.length} entered
          </span>
        </div>
      ) : (
        <>
          <div className={`feedback ${grade.missing.length ? 'bad' : 'good'}`}>
            <strong>
              {grade.found.length} / {members.length} named ({pct(grade.found.length, members.length)}%)
            </strong>
            {grade.extra.length > 0 && <span className="muted"> &middot; {grade.extra.length} not in this class</span>}
          </div>
          <SetView grade={grade} extraLabel="not in class" />
          <div className="row" style={{ marginTop: '0.75rem' }}>
            <button className="primary" onClick={next}>
              {pos + 1 >= targets.length ? 'See results' : 'Next class'} <kbd>Enter</kbd>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
