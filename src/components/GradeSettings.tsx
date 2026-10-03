import { setGradeOptions, useGradeOptions } from '../store/settings'

export default function GradeSettings() {
  const opts = useGradeOptions()
  return (
    <fieldset className="settings">
      <legend>Grading</legend>
      <label className="check">
        <input type="checkbox" checked={opts.ignoreCase} onChange={(e) => setGradeOptions({ ignoreCase: e.target.checked })} />
        Ignore case
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={opts.ignorePunctuation}
          onChange={(e) => setGradeOptions({ ignorePunctuation: e.target.checked })}
        />
        Ignore punctuation
      </label>
      <label className="row">
        Typo tolerance
        <select value={opts.typoTolerance} onChange={(e) => setGradeOptions({ typoTolerance: Number(e.target.value) })}>
          <option value={0}>Off (exact)</option>
          <option value={0.1}>Low</option>
          <option value={0.15}>Medium</option>
          <option value={0.25}>High</option>
        </select>
      </label>
    </fieldset>
  )
}
