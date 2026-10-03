import { useEffect } from 'react'

interface Props {
  options: string[]
  answer: string
  picked: string | null
  onPick: (option: string) => void
}

/** Multiple-choice buttons with number-key shortcuts (1-9). */
export default function OptionList({ options, answer, picked, onPick }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (picked !== null || e.metaKey || e.ctrlKey || e.altKey) return
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= options.length) {
        e.preventDefault()
        onPick(options[n - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [options, picked, onPick])

  return (
    <div className="options">
      {options.map((opt, i) => {
        let cls = ''
        if (picked !== null) {
          if (opt === answer) cls = 'correct'
          else if (opt === picked) cls = 'incorrect'
        }
        return (
          <button key={opt} className={cls} disabled={picked !== null && cls === ''} onClick={() => picked === null && onPick(opt)}>
            <kbd>{i + 1}</kbd>
            {opt}
          </button>
        )
      })}
    </div>
  )
}
