import { useState } from 'react'
import GradeSettings from '../../components/GradeSettings'
import SetupCard, { Segmented } from '../../components/SetupCard'
import { buildQuestionSet, QUESTION_STYLES, type Question } from '../../lib/questions'
import type { ModeProps } from '../../types'
import TypedQuiz from '../TypedQuiz'

export default function QaTyping({ deck, itemIds, onFinish }: ModeProps) {
  const [style, setStyle] = useState('forward')
  const [questions, setQuestions] = useState<Question[] | null>(null)

  if (!questions) {
    return (
      <SetupCard
        title="Typing: answer each prompt"
        description={itemIds ? `${itemIds.length} selected prompt(s), shuffled.` : `${deck.items.length} prompts, shuffled.`}
        onStart={() => setQuestions(buildQuestionSet(deck, itemIds, style, false))}
      >
        <Segmented value={style} onChange={setStyle} options={QUESTION_STYLES.qa} />
        <GradeSettings />
      </SetupCard>
    )
  }

  return <TypedQuiz questions={questions} unit="questions" onFinish={onFinish} />
}
