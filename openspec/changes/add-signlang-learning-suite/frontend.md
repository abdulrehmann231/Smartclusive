# Frontend Guide — start now, without the backend

This is a supplementary artifact for `add-signlang-learning-suite`. It exists so a **frontend developer can start immediately, in parallel with backend**, by building the whole UI against the **mock API contract** below instead of a live server. Read `proposal.md` for the features and `specs/` for the behavior each screen must satisfy; this doc is the UI + contract layer.

## How to work independently (mock-first)

1. **Put all server calls behind one API client module** (e.g. `src/api/`). Ship a **mock implementation** now that returns the sample JSON in this doc (use MSW, `json-server`, or plain in-memory stubs). Swap to the real implementation later — the components never change.
2. **Put all camera/ML behind a `SignService` and `DetectService`** with mock implementations now (e.g. a fake that "matches" the expected letter after a short delay, or on a button press). This lets you build every flow before recognition exists.
3. **The contract below is the integration boundary.** Treat field names/shapes as the agreement to finalize with backend; if you must change one, note it so the backend spec stays in sync.

## Tech notes (framework-agnostic)

- **Camera:** `navigator.mediaDevices.getUserMedia` for the live stream; `<input type="file" capture>` or a canvas snapshot for Feature 2 photo capture. Always gate on explicit permission (see `fingerspelling-recognition` spec).
- **Where recognition runs (affects nothing you build now):** either (a) the browser extracts MediaPipe Hands landmarks with `@mediapipe/tasks-vision` and sends landmark arrays to the backend classifier, or (b) the browser sends frames and the backend does everything. Build against the `SignService` interface and stay agnostic.
- **Suggested stack:** any SPA framework (React/Vue/Svelte) or the existing vanilla-JS approach from the old repo's `static/`. State: keep an auth/session store and a deck store.
- **i18n:** UI chrome can be Indonesian; word content is Indonesian + English from the API.

## Screen inventory (routes)

| Route | Screen | Feature | Auth required |
|---|---|---|---|
| `/register` | Register (name, email, password) | student-account | no |
| `/login` | Login (email, password) | student-account | no |
| `/` (home) | Dashboard: deck summary + nav to features | learner-deck | yes |
| `/learn/cards` | Word-card guessing → fingerspell | Feature 1 | yes |
| `/learn/capture` | Photo capture → detect → fingerspell | Feature 2 | yes |
| `/quiz` | Quiz setup + run (word/letter/number) | Feature 3 | yes |
| `/videos` | Video lessons + post-video quiz | Feature 5 | yes |
| `/deck` | Full deck list + mastery | learner-deck | yes |
| `/translate` | (Feature 4 — later, review-only) | — | — |

Shared components: `CameraView`, `SignPad` (shows expected target + matched-so-far + retry), `FingerspellReference` (ordered per-letter images), `WordCard`, `OptionTile` (flips text→picture), `DeckList`, `QuizRunner`, `VideoPlayer` (with Indonesian captions toggle), `AuthForm`, `Nav`.

## Per-feature UI flow, components, and states

Every screen must handle **loading / empty / error / success** states and a **camera-denied** state where relevant.

- **Register/Login** — `AuthForm`. Validate email format + password presence client-side; show field-level errors; on success store the session token and redirect to `/`. Show a generic "email or password is wrong" (never reveal which).
- **Feature 1 – cards** — Show Indonesian word + four `OptionTile`s. On tap, flip that tile's text to its picture; keep others tappable; loop until the correct tile. On correct, show `FingerspellReference`, then `SignPad` + `CameraView`; on verified success show "added to deck" and load the next card.
- **Feature 2 – capture** — `CameraView` → capture button → show the photo with a **bounding box** overlay + detected Indonesian/English words. Handle "not recognized → retake". Then `FingerspellReference` + `SignPad`; on success mark learned. Show "already in your deck" if duplicate.
- **Feature 3 – quiz** — If deck too small, show "learn N more words". Else `QuizRunner` iterates items by mode (`sign_word` / `sign_letter` / `sign_number`), each using `SignPad`; end with a score summary.
- **Feature 5 – videos** — `/videos` lists the two lessons (`VideoPlayer` with captions toggle). On watch-to-end, show "start quiz" (letters video → letter quiz, numbers video → number quiz).

## API contract (mock these exactly)

Base: `/api`. Auth via `Authorization: Bearer <token>` after login. All bodies are JSON. **These shapes are the proposed contract — finalize with backend.**

### Auth — `student-account`
```
POST /api/auth/register  { "name","email","password" }
  → 201 { "token", "student": { "id","name","email" } }
  → 409 { "error": "email_taken" }
POST /api/auth/login     { "email","password" }
  → 200 { "token", "student": {...} }   → 401 { "error": "invalid_credentials" }
POST /api/auth/logout    → 204
GET  /api/me             → 200 { "student": {...} }
```

### Deck — `learner-deck`
```
GET  /api/deck
  → 200 { "words": [ { "id","indonesian","english","image","mastery":0..5,"learnedAt" } ] }
```

### Feature 1 — cards (`word-card-learning`)
```
GET  /api/cards/next
  → 200 { "cardId","indonesian",
          "options": [ { "id","english","image" } ]   // exactly 4
        }
POST /api/cards/{cardId}/guess   { "optionId" }
  → 200 { "correct": true|false,
          "revealedImage",                 // picture for the guessed option
          "correctOptionId": "...",        // present only when correct
          "fingerspelling": { "word", "letters":[ { "letter","image" } ] } } // when correct
```

### Feature 2 — capture (`camera-object-learning`)
```
POST /api/objects/detect   (multipart image OR { "imageBase64" })
  → 200 { "detected": true,
          "box": { "x","y","w","h" },
          "english","indonesian","source":"dictionary"|"translated",
          "fingerspelling": { "word","letters":[ { "letter","image" } ] } }
  → 200 { "detected": false }             // → UI shows retake
```

### Shared sign verification — `fingerspelling-recognition`
Realtime (preferred) via Socket.IO, with a REST fallback for mocks:
```
// Socket.IO
emit  "sign:start"   { "target": "CAT" | "A" | "7", "kind": "word"|"letter"|"number" }
emit  "sign:frame"   { "landmarks": [...] }   // or { "frameBase64" }
on    "sign:progress"{ "matched": ["C","A"], "expected": "T", "complete": false }
on    "sign:done"    { "complete": true, "target": "CAT" }

// REST fallback (easy to mock)
POST /api/sign/verify-letter { "expected":"A", "landmarks":[...] } → { "matched":true, "predicted":"A" }
```

### Feature 3 — quiz (`sign-quiz`)
```
POST /api/quiz/start   { "mode": "sign_word"|"sign_letter"|"sign_number" }
  → 200 { "quizId", "items": [ { "id","kind","prompt" } ] }
  → 422 { "error":"deck_too_small", "needed": 3 }
POST /api/quiz/{quizId}/answer  { "itemId","correct":true|false }
  → 200 { "correct": true|false }
GET  /api/quiz/{quizId}/result  → 200 { "correct","incorrect","total" }
```

### Feature 5 — videos (`learning-videos`)
```
GET  /api/videos
  → 200 { "videos": [ { "id","title","type":"letters"|"numbers","url","captionsUrl","completed":false } ] }
POST /api/videos/{id}/complete
  → 200 { "completed": true, "quiz": { "quizId","items":[...] } }
```

## Mock data (drop into your stubs)
```json
{
  "deck": { "words": [
    { "id":"w1","indonesian":"kucing","english":"cat","image":"/mock/cat.png","mastery":2,"learnedAt":"2026-01-01T00:00:00Z" }
  ]},
  "card": { "cardId":"c1","indonesian":"kucing","options":[
    {"id":"o1","english":"cat","image":"/mock/cat.png"},
    {"id":"o2","english":"dog","image":"/mock/dog.png"},
    {"id":"o3","english":"cow","image":"/mock/cow.png"},
    {"id":"o4","english":"car","image":"/mock/car.png"} ] },
  "videos": { "videos":[
    {"id":"v-letters","title":"Alfabet ASL","type":"letters","url":"/mock/letters.mp4","captionsUrl":"/mock/letters.id.vtt","completed":false},
    {"id":"v-numbers","title":"Angka ASL","type":"numbers","url":"/mock/numbers.mp4","captionsUrl":"/mock/numbers.id.vtt","completed":false} ]}
}
```

## Suggested frontend build order (all doable before backend exists)
1. App shell, routing, and the mock API + `SignService`/`DetectService` stubs.
2. Auth screens (register/login/logout) + session store + route guards.
3. Home dashboard + `/deck` list from mock deck.
4. Feature 1 card flow with `OptionTile` flip + `FingerspellReference` + `SignPad` (mock match).
5. Feature 5 videos + captions toggle + post-video quiz hook.
6. Feature 3 `QuizRunner` (all three modes) + results.
7. Feature 2 capture + bounding-box overlay + retake.
8. Swap mock services for real API/Socket.IO once backend endpoints land.
