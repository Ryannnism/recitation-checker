# Recitation Checker

A local quiz site for checking recitations. Create decks in the browser and practice them in three modes.

```bash
npm install
npm run dev   # http://localhost:5173
```

## Decks

- **Passage**: text recited word-for-word, split into lines or sentences.
- **Q/A**: one `prompt | answer` pair per line (tabs work too). Extra `| answer` fields are accepted alternates.
- **List**: one entry per line, in order.

Everything is stored in `localStorage`. Use Export/Import on the Decks page to back up or move data.

## Modes

- **Typing**: full-passage or line-by-line recitation with a word-by-word diff; Q/A answers with typo tolerance; full-recall or one-at-a-time lists.
- **Multiple choice**: options built from the deck itself (what comes next, fill in the blank, which position, prompt/answer). Number keys pick options.
- **Speed drill**: 30/60/120 second rounds answered by typing or multiple choice, with streaks and per-length best scores.

Every session ends with a results screen listing missed items and a "Retry missed only" button. History and personal bests are on the Stats page.
