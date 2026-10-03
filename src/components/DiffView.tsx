import type { DiffToken } from '../lib/grader'

export default function DiffView({ tokens }: { tokens: DiffToken[] }) {
  return (
    <p className="diff">
      {tokens.map((t, i) => {
        switch (t.type) {
          case 'correct':
            return <span key={i} className="d-correct">{t.text} </span>
          case 'typo':
            return (
              <span key={i} className="d-typo" title={`Expected: ${t.expected}`}>
                {t.text}{' '}
              </span>
            )
          case 'wrong':
            return (
              <span key={i} className="d-wrong">
                <s>{t.text}</s> <ins>{t.expected}</ins>{' '}
              </span>
            )
          case 'missing':
            return (
              <span key={i} className="d-missing" title="Missing">
                {t.text}
              </span>
            )
          case 'extra':
            return (
              <span key={i} className="d-extra" title="Extra">
                <s>{t.text}</s>{' '}
              </span>
            )
        }
      })}
    </p>
  )
}

export function DiffLegend() {
  return (
    <div className="legend muted">
      <span className="d-correct">correct</span>
      <span className="d-typo">accepted typo</span>
      <span className="d-wrong">
        <s>yours</s> <ins>expected</ins>
      </span>
      <span className="d-missing">missing</span>
      <span className="d-extra">
        <s>extra</s>
      </span>
    </div>
  )
}
