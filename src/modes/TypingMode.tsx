import type { ModeProps } from '../types'
import GroupTyping from './typing/GroupTyping'
import ListTyping from './typing/ListTyping'
import PassageTyping from './typing/PassageTyping'
import QaTyping from './typing/QaTyping'

export default function TypingMode(props: ModeProps) {
  switch (props.deck.kind) {
    case 'passage':
      return <PassageTyping {...props} />
    case 'qa':
      return <QaTyping {...props} />
    case 'list':
      return <ListTyping {...props} />
    case 'groups':
      return <GroupTyping {...props} />
  }
}
