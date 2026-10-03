import type { ReactNode } from 'react'

interface Props {
  title: string
  description?: ReactNode
  children?: ReactNode
  onStart: () => void
  startDisabled?: boolean
}

export default function SetupCard({ title, description, children, onStart, startDisabled }: Props) {
  return (
    <div className="card stack">
      <div>
        <h2>{title}</h2>
        {description && <p className="muted" style={{ margin: 0 }}>{description}</p>}
      </div>
      {children}
      <div>
        <button className="primary" onClick={onStart} disabled={startDisabled} autoFocus>
          Start
        </button>
      </div>
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.id} className={value === o.id ? 'active' : ''} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`progress ${className}`}>
      <div style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  )
}
