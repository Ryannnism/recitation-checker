import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteDeck, saveDeck, useDeck } from '../store/decks'
import { parseDeck, reuseIds } from '../lib/parse'
import { deckSize } from '../lib/format'
import { KIND_LABELS, type DeckKind, type SplitBy } from '../types'

const KINDS: DeckKind[] = ['passage', 'qa', 'list', 'groups']

const HELP: Record<DeckKind, { hint: string; placeholder: string }> = {
  passage: {
    hint: 'Paste the passage you want to recite word-for-word. It is split into lines or sentences for line-by-line practice and "what comes next" questions.',
    placeholder: 'Shall I compare thee to a summer’s day?\nThou art more lovely and more temperate:\nRough winds do shake the darling buds of May,\nAnd summer’s lease hath all too short a date;',
  },
  qa: {
    hint: 'One pair per line: prompt | answer. Use a tab instead of "|" if you paste from a spreadsheet. Add more "|" fields for extra accepted answers.',
    placeholder: 'Capital of France | Paris\nH2O | Water\nLargest planet | Jupiter\nAuthor of Hamlet | Shakespeare | William Shakespeare',
  },
  list: {
    hint: 'One entry per line, in order. Numbering like "1." or "2)" is stripped automatically.',
    placeholder: 'Mercury\nVenus\nEarth\nMars',
  },
  groups: {
    hint: 'A header line for each class, like "Eta - 12 men" (or ending in ":"), with that class\'s names under it, one per line. Names inside a class are tested in any order. If the header has a count, it is checked against the names listed.',
    placeholder: 'Alpha - 3 men\nJohn Smith\nMike Lee\nDavid Kim\n\nBeta - 2 men\nChris Park\nSam Jones',
  },
}

export default function DeckEditor() {
  const { deckId } = useParams()
  const existing = useDeck(deckId)
  const navigate = useNavigate()

  const [name, setName] = useState(existing?.name ?? '')
  const [kind, setKind] = useState<DeckKind>(existing?.kind ?? 'passage')
  const [splitBy, setSplitBy] = useState<SplitBy>(existing?.splitBy ?? 'line')
  const [source, setSource] = useState(existing?.source ?? '')

  const parsed = useMemo(() => parseDeck(kind, source, splitBy), [kind, source, splitBy])

  if (deckId && !existing) {
    return (
      <div className="card">
        <h2>Deck not found</h2>
        <Link to="/">Back to decks</Link>
      </div>
    )
  }

  const canSave = name.trim() && parsed.items.length > 0

  const save = () => {
    if (!canSave) return
    const now = Date.now()
    saveDeck({
      id: existing?.id ?? crypto.randomUUID(),
      name: name.trim(),
      kind,
      splitBy: kind === 'passage' ? splitBy : undefined,
      source,
      items: existing ? reuseIds(existing.items, parsed.items) : parsed.items,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })
    navigate('/')
  }

  const remove = () => {
    if (existing && confirm(`Delete "${existing.name}" and its history?`)) {
      deleteDeck(existing.id)
      navigate('/')
    }
  }

  return (
    <div className="stack">
      <div className="page-header">
        <h1>{existing ? 'Edit deck' : 'New deck'}</h1>
        <div className="row">
          {existing && (
            <button className="ghost danger" onClick={remove}>
              Delete
            </button>
          )}
          <Link className="button ghost" to="/">
            Cancel
          </Link>
          <button className="primary" disabled={!canSave} onClick={save}>
            Save deck
          </button>
        </div>
      </div>

      <div className="card stack">
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sonnet 18" autoFocus />
        </label>
        <div className="row">
          <div className="segmented">
            {KINDS.map((k) => (
              <button key={k} className={kind === k ? 'active' : ''} onClick={() => setKind(k)}>
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>
          {kind === 'passage' && (
            <label className="row small muted">
              Split into
              <select value={splitBy} onChange={(e) => setSplitBy(e.target.value as SplitBy)}>
                <option value="line">Lines</option>
                <option value="sentence">Sentences</option>
              </select>
            </label>
          )}
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          {HELP[kind].hint}
        </p>
      </div>

      <div className="editor">
        <div className="card">
          <label className="field">
            <span>Content</span>
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={HELP[kind].placeholder}
              spellCheck={false}
            />
          </label>
        </div>
        <div className="card">
          <div className="spread" style={{ marginBottom: '0.5rem' }}>
            <strong>Preview</strong>
            <span className="muted small">{deckSize({ kind, items: parsed.items })}</span>
          </div>
          {parsed.errors.length > 0 && (
            <div className="errors" style={{ marginBottom: '0.5rem' }}>
              {parsed.errors.slice(0, 5).map((e) => (
                <div key={e}>{e}</div>
              ))}
              {parsed.errors.length > 5 && <div>...and {parsed.errors.length - 5} more</div>}
            </div>
          )}
          <div className="preview">
            {parsed.items.length === 0 ? (
              <p className="muted small">Parsed items will show up here.</p>
            ) : (
              <ol>
                {parsed.items.slice(0, 200).map((it) => (
                  <li key={it.id}>
                    {it.members ? (
                      <>
                        <strong>{it.prompt}</strong>{' '}
                        <span className="muted small">({it.members.length} names)</span>
                        <div className="small">{it.members.join(' · ')}</div>
                      </>
                    ) : it.prompt !== undefined ? (
                      <>
                        <span className="q">{it.prompt}</span> &rarr; {it.answer}
                        {it.alternates && <span className="muted small"> (also: {it.alternates.join(', ')})</span>}
                      </>
                    ) : (
                      it.answer
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
