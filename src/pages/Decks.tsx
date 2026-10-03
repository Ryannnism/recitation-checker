import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { bestAttempt, deleteDeck, exportData, importData, saveDeck, useAttempts, useDecks } from '../store/decks'
import { buildSampleDecks } from '../lib/samples'
import { formatScore } from '../lib/format'
import { KIND_LABELS, MODES, MODE_LABELS, type Attempt, type Deck } from '../types'

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function DeckCard({ deck, attempts }: { deck: Deck; attempts: Attempt[] }) {
  const bests = [
    { label: 'Typing', best: bestAttempt(attempts, deck.id, 'typing') },
    { label: 'MCQ', best: bestAttempt(attempts, deck.id, 'mcq') },
    { label: 'Speed 60s', best: bestAttempt(attempts, deck.id, 'speed', 60) },
  ]
  const remove = () => {
    if (confirm(`Delete "${deck.name}" and its history?`)) deleteDeck(deck.id)
  }
  return (
    <div className="card deck-card">
      <div className="spread">
        <span className={`badge ${deck.kind}`}>{KIND_LABELS[deck.kind]}</span>
        <span className="muted small">{deck.items.length} items</span>
      </div>
      <h3 style={{ marginTop: '0.5rem' }}>{deck.name}</h3>
      <div className="bests">
        {bests.map(({ label, best }) => (
          <div key={label}>
            <span className="muted">{label}</span>
            <strong>{best ? formatScore(best) : '-'}</strong>
          </div>
        ))}
      </div>
      <div className="row">
        {MODES.map((m) => (
          <Link key={m} className={`button ${m === 'typing' ? 'primary' : ''}`} to={`/practice/${deck.id}/${m}`}>
            {MODE_LABELS[m]}
          </Link>
        ))}
      </div>
      <div className="row" style={{ marginTop: '0.75rem' }}>
        <Link className="button ghost" to={`/decks/${deck.id}/edit`}>
          Edit
        </Link>
        <button className="ghost danger" onClick={remove}>
          Delete
        </button>
      </div>
    </div>
  )
}

export default function Decks() {
  const decks = useDecks()
  const attempts = useAttempts()
  const fileRef = useRef<HTMLInputElement>(null)

  const onImport = async (file: File | undefined) => {
    if (!file) return
    try {
      const count = importData(await file.text())
      alert(`Imported ${count} deck${count === 1 ? '' : 's'}.`)
    } catch (e) {
      alert(`Import failed: ${e instanceof Error ? e.message : String(e)}`)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const loadSamples = () => buildSampleDecks().forEach(saveDeck)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Decks</h1>
          <p className="muted" style={{ margin: 0 }}>
            Pick a deck and a mode: typing, multiple choice, or a timed speed drill.
          </p>
        </div>
        <div className="row">
          <button className="ghost" onClick={() => fileRef.current?.click()}>
            Import
          </button>
          <button
            className="ghost"
            disabled={!decks.length}
            onClick={() => download(`recitation-checker-${new Date().toISOString().slice(0, 10)}.json`, exportData())}
          >
            Export
          </button>
          <Link className="button primary" to="/decks/new">
            New deck
          </Link>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => onImport(e.target.files?.[0])}
        />
      </div>

      {decks.length === 0 ? (
        <div className="card empty">
          <h2>No decks yet</h2>
          <p className="muted">Create a deck by pasting a passage, Q/A pairs, or a list, or start with some examples.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link className="button primary" to="/decks/new">
              Create a deck
            </Link>
            <button onClick={loadSamples}>Load sample decks</button>
          </div>
        </div>
      ) : (
        <div className="grid">
          {[...decks]
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((d) => (
              <DeckCard key={d.id} deck={d} attempts={attempts} />
            ))}
        </div>
      )}
    </div>
  )
}
