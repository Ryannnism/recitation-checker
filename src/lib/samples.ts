import type { Deck, DeckKind, SplitBy } from '../types'
import { parseDeck } from './parse'

const SAMPLES: { name: string; kind: DeckKind; splitBy?: SplitBy; source: string }[] = [
  {
    name: 'Gettysburg Address (opening)',
    kind: 'passage',
    splitBy: 'sentence',
    source: `Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal. Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battle-field of that war. We have come to dedicate a portion of that field, as a final resting place for those who here gave their lives that that nation might live. It is altogether fitting and proper that we should do this.`,
  },
  {
    name: 'World capitals',
    kind: 'qa',
    source: `France | Paris
Japan | Tokyo
Australia | Canberra
Canada | Ottawa
Brazil | Brasília | Brasilia
Egypt | Cairo
Kenya | Nairobi
Turkey | Ankara
South Korea | Seoul
Argentina | Buenos Aires
Norway | Oslo
Vietnam | Hanoi`,
  },
  {
    name: 'Planets in order',
    kind: 'list',
    source: `Mercury
Venus
Earth
Mars
Jupiter
Saturn
Uranus
Neptune`,
  },
]

export function buildSampleDecks(): Deck[] {
  const now = Date.now()
  return SAMPLES.map((s) => ({
    id: crypto.randomUUID(),
    name: s.name,
    kind: s.kind,
    splitBy: s.splitBy,
    source: s.source,
    items: parseDeck(s.kind, s.source, s.splitBy).items,
    createdAt: now,
    updatedAt: now,
  }))
}
