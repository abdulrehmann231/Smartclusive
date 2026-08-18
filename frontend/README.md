# Smartclusive — Frontend

Mock-first frontend for the **Sign Language Learning Suite** (`add-signlang-learning-suite`),
built per `openspec/changes/add-signlang-learning-suite/frontend.md`.

React + Vite + TypeScript. All server calls sit behind `src/api/` (mock now, real later)
and all camera/ML behind `src/services/signService.ts` — components never change on swap.

## Color theme

GERKATIN palette (from the reference site), centralized as CSS variables in `src/theme.css`:

| Token | Value | Use |
|---|---|---|
| `--brand` | `#29ABE2` | sky-blue primary (nav, headings, big stats) |
| `--accent` | `#FFD400` | yellow accent (active nav, CTAs, highlights) |
| `--ink` | `#142A35` | body text |
| `--bg` | `#F2FAFE` | page background |

## Run

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # typecheck + production build
```

## What's implemented (frontend.md build order)

1. App shell, routing, mock API + `SignService`/`DetectService` stubs
2. Auth (register/login/logout) + session store + route guards
3. Dashboard + `/deck` list
4. Feature 1 — card flow (`OptionTile` flip → `FingerspellReference` → `SignPad`)
5. Feature 5 — videos + captions toggle + post-video quiz
6. Feature 3 — `QuizRunner` (word/letter/number) + results
7. Feature 2 — capture + bounding-box overlay + retake
8. Feature 4 — `/translate` placeholder (review-only)

## Mock notes

- No real backend: `src/api/client.ts` holds in-memory state. Any login works; two demo
  words are pre-seeded so quizzes are reachable.
- No real recognition: `SignPad` exposes "Isyaratkan / Simulasikan salah" buttons that stand
  in for MediaPipe frames.
- Contract addition beyond frontend.md: `addToDeck` returns `{ added, duplicate }` and
  `detect` returns `alreadyInDeck` — closing the deck-writer / duplicate-signal gaps.
