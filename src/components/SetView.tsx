import type { SetGrade } from '../lib/grader'

export default function SetView({ grade, extraLabel = 'not one of them' }: { grade: SetGrade; extraLabel?: string }) {
  return (
    <>
      <div className="group-grade">
        {grade.found.map((f) => (
          <span
            key={f.expected}
            className={f.kind === 'exact' ? 'd-correct' : 'd-typo'}
            title={f.kind === 'close' ? `You typed: ${f.given}` : undefined}
          >
            {f.expected}
          </span>
        ))}
        {grade.missing.map((m) => (
          <span key={m} className="d-missing" title="Missing">
            {m}
          </span>
        ))}
        {grade.extra.map((x, i) => (
          <span key={`${x}-${i}`} className="d-extra" title={extraLabel}>
            <s>{x}</s>
          </span>
        ))}
      </div>
      <div className="legend muted">
        <span className="d-correct">named</span>
        <span className="d-typo">accepted typo</span>
        <span className="d-missing">missing</span>
        <span className="d-extra">
          <s>{extraLabel}</s>
        </span>
      </div>
    </>
  )
}
