## Context

The app today is a Flask + Socket.IO server (`app.py`) that streams webcam/YouTube frames, runs a YOLOv8 BISINDO model (`bisindo.pt`) plus MediaPipe Hands for landmark overlay, and emits detected labels to the browser over a socket. There is no notion of a user, no persistence, and no "produce a sign" path — only "read a sign." This change layers a learning product on top of that pipeline. See `proposal.md` → Why for motivation. Guiding constraint: **reuse existing CV tech, train nothing new.**

## Goals / Non-Goals

**Goals:**
- Reuse the existing detection stack (YOLOv8, MediaPipe) and **train a small classifier** on MediaPipe landmarks for the **ASL alphabet + numbers**.
- Teach and recognize **ASL** — the manual alphabet (A–Z) **and numbers (0–9)** — as the single, confirmed sign system for the learning flows.
- Detect **school and daily objects with bounding boxes** (YOLOv8), with a free open-vocabulary fallback for arbitrary objects.
- Provide lightweight name/email/password login and per-student persistence (deck + mastery + video completion) without an enterprise auth system.
- Make `fingerspelling-recognition` a single shared recognizer (letters and numbers) consumed by Features 1, 2, 3, and the video quizzes.

**Non-Goals:**
- Training the hand-detection/vision model from scratch — only a **small classifier head** over MediaPipe landmarks is trained.
- Full/enterprise auth (SSO, roles, org management) — v1 is a lightweight name/email/password login.
- Implementing Feature 4 — it stays a reviewed, research-only spec (no training of a BISINDO word/sentence model in this change).
- Continuous (non-fingerspelling) sign production grading — v1 grades static ASL letters and numbers only (ASL "J"/"Z" motion handled as the small exception in Architecture).

## Decisions

**1. ASL letter + number recognition = MediaPipe Hands landmarks + a small trained classifier.**
Rationale: The manual alphabet and digits are a well-solved, ~36-class static-hand-pose problem (26 letters + 10 numbers). MediaPipe Hands already ships in the repo for landmark extraction; the team opted in to **training a small 36-class classifier** over those landmarks (public ASL datasets + a few self-recorded samples). A KNN/template matcher is the zero-data bootstrap and offline fallback. Only the small classifier head is trained — MediaPipe itself is reused as-is. See the Sign Detection Architecture section for the full pipeline. Alternative considered: a full sign-language-production model (rejected — needs continuous-motion data and is unsolved, that is Feature 4).

**2. Object detection reuses YOLOv8, with an image-classification fallback for broad coverage.**
Rationale: `yolov8n.pt` (COCO, 80 classes) is already present and covers many everyday objects for Feature 2. For objects outside those classes, fall back to an off-the-shelf image classifier / vision API. Alternative: retrain YOLO on a custom object set (rejected — training).

**3. Indonesian↔English mapping and picture assets come from a static dictionary + asset pack.**
Rationale: Deterministic, offline-friendly, and lets us control the four-option distractors and per-word pictures for Feature 1. Detected class labels (English) map through this dictionary to Indonesian and to picture/fingerspelling assets. Alternative: live translation API (viable but adds a network dependency and non-determinism for distractor generation).

**4. Deck + mastery persisted server-side keyed by a student id.**
Rationale: Enables cross-session decks and quiz eligibility. Start with a simple store (SQLite or a JSON/file store per student id) to avoid infra weight; the `learner-deck` spec is storage-agnostic. Alternative: browser localStorage (rejected — not portable across devices, harder to quiz server-side).

**5. Camera capture reuses the existing streaming path; verification runs per-frame against an expected letter/number.**
Rationale: Reuse the MJPEG/Socket.IO plumbing already in `app.py`. The word verifier is a small state machine: the expected-target pointer advances only when the recognizer matches the current letter (or number) with sufficient stability across consecutive frames (mirrors the existing "accumulate over frames" approach in the translator).

**6. Video lessons are hosted assets with caption tracks; completion + post-video quiz are app state.**
Rationale: The two ASL lessons (letters, numbers) are plain video assets with Indonesian caption tracks (e.g. WebVTT), so no CV is involved in playback. The app tracks watch-to-end completion and, on completion, launches the matching quiz (letter quiz after the letters video, number quiz after the numbers video) through the same `fingerspelling-recognition` + `sign-quiz` path. Alternative: gate quizzes behind a manual "I finished" button (rejected — completion should reflect actual viewing).

### Feature 3 — additional quiz mode ideas (the requested brainstorm)
Beyond sign-the-word and sign-the-letter, candidate modes (all deck-driven):
- **Multiple choice recognition:** show an Indonesian word → pick the English (or vice-versa); the inverse of the Feature 1 card, no camera needed.
- **Picture → sign:** show the object picture, student fingerspells the word.
- **Fingerspelling → word:** app plays/animates a fingerspelled sequence, student types or picks the word (reverse fingerspelling reading).
- **Scrambled letters:** show the fingerspelling hand-shapes out of order, student signs them in the correct order.
- **Speed round / timed drill:** as many correct letters or words as possible in N seconds.
- **Spaced-repetition review:** prioritize words with the lowest mastery or longest since last correct.
- **Missing-letter fill:** show the word with one letter blanked, student signs only the missing letter.
- **Mixed exam:** randomized blend of modes across the whole deck for a "final."

### Extra product ideas (optional, beyond the four features)
- **Streaks, XP, badges** and a daily goal to drive retention.
- **Leaderboards / class mode** so a teacher can track a cohort.
- **Word categories / themed decks** (food, animals, home) for structured curricula.
- **Pronunciation/audio** of the Indonesian and English word alongside the sign.
- **Offline/PWA** packaging for classrooms with poor connectivity.
- **Accessibility:** left/right-hand mirroring option, adjustable per-letter timing, high-contrast reference images.
- **Two-way conversation practice** combining Feature 4 (read) with the fingerspelling producer (write).

## Sign Detection Architecture

There are **two independent detection problems** in this product. They have very different difficulty, and only one of them is in scope for implementation.

### A. ASL letter + number recognition (Features 1, 2, 3, 5) — IN SCOPE

**What it is:** classify a single static hand pose into one of ~36 classes (A–Z + 0–9). This is a small, well-understood pose-classification problem, not "sign language translation."

**Pipeline (per camera frame):**
1. **Hand localization + landmarks — MediaPipe Hands (already in the repo).** For each frame it returns 21 3-D hand landmarks. This does the hard vision work for us and is pre-trained.
2. **Normalize landmarks.** Translate to a wrist-origin, scale by hand size, and (optionally) mirror for handedness, so the features are position/'distance-from-camera' invariant. Result: a small fixed-length feature vector per frame.
3. **Classify the pose → a letter or number.** Chosen approach and fallback:
   - **(Chosen) Train a small landmark classifier for all 36 classes.** Feed the normalized landmark vectors to a small model (MLP or SVM) trained on **public ASL datasets** (ASL Alphabet, Sign Language MNIST, an ASL digits set) plus a handful of self-recorded samples. Training is tiny (a small head over 21×(x,y,z) features), runs in minutes, and infers in real time. One model covers A–Z and 0–9.
   - **(Zero-data quick-start / offline fallback) Landmark template / KNN matcher.** Store a few reference landmark vectors per class and match by nearest-neighbor / cosine similarity — no training. Use this to bootstrap before the trained model exists, or as an offline fallback.
4. **Temporal stability gate.** Require the same predicted class across N consecutive frames above a confidence threshold before accepting it — this reuses the existing "accumulate over frames" idea and kills flicker/false positives.
5. **Verifier state machine.** For a word, hold a pointer to the expected next letter; accept and advance only when step 4 confirms that letter. For a single-letter or single-number quiz item, one confirmed match scores it.

**Do we need to train a model? — Short answer: YES, but only a small one (the team opted in), and never from scratch on the vision.**
- MediaPipe already provides the trained hand-detection/landmark model — we do NOT train that.
- We train only a **small 36-class classifier head** on top of MediaPipe landmarks, using public ASL datasets (minimal data collection, minutes to train on CPU/GPU). This is the accuracy path the team chose over pure KNN.
- The **KNN/template matcher remains available** with zero training to bootstrap and as an offline fallback, so development is never blocked on the trained model.
- This training scope is limited to ASL letters+numbers. It does **not** apply to Feature 4 (BISINDO words/sentences), which stays unsolved and out of scope (see § B).
- **Motion exception:** ASL "J" and "Z" (numbers are all static) involve movement. Handle them as a tiny special case — match the letter's start-and-end poses in sequence, or, for v1 simplicity, present a short animated reference with a relaxed match. Everything else is static.

**Adding numbers changes almost nothing:** numbers 0–9 are additional static classes fed through the exact same pipeline — 10 more sets of reference landmarks (KNN) or 10 more labels (classifier). The recognizer, the stability gate, and the verifier are unchanged.

### B. BISINDO word/sentence translation (Feature 4) — UNDER REVIEW, NOT IN SCOPE

**What it is:** read Indonesian sign language from video and produce Indonesian/English **words and sentences**. This is a fundamentally harder problem: continuous, two-handed, grammar-carrying signing with non-manual markers, and no reliable off-the-shelf model exists for open-vocabulary sentence translation. The existing `bisindo.pt` YOLO model only classifies a **fixed, limited set** of isolated signs — useful as a demo, not a general translator.

**Conclusion:** we keep Feature 4 as a documented, review-only spec (isolated-sign demo only) and continue research. If pursued later, realistic paths are (a) staying at the isolated-word level with a curated vocabulary, or (b) adopting a future pre-trained continuous-sign model — either would be its own change. This is why Feature 4 is explicitly deferred.

## Risks / Trade-offs

- **Teaching ASL to an Indonesian audience** → ASL (confirmed) is not Indonesia's local sign language (BISINDO), so learners acquire a foreign manual alphabet; the app is framed as ASL learning. Mitigation: label lessons clearly as ASL; keep reference assets and the classifier ASL-specific and correct.
- **Fingerspelling accuracy for lookalike letters/numbers** → false negatives frustrate learners. Mitigation: train on enough per-class samples, require stability over consecutive frames, show the expected target, allow unlimited retries, tune thresholds; consider a "skip" affordance.
- **Object detection gaps / open-vocabulary quality** → Feature 2 may mislabel or miss uncommon objects, and the free open-vocab fallback + free translator vary in quality. Mitigation: clear "not recognized, retake" path, prefer the curated dictionary when available, and cap latency; treat the fallback as best-effort.
- **Camera privacy** → Mitigation: explicit consent, process frames in-memory, retain nothing by default; state this in the UI.
- **Lightweight auth** → name/email/password is minimal; risks include weak passwords and no email verification in v1. Mitigation: hash passwords, basic strength/format checks; add verification/reset later if needed.
- **Distractor quality in Feature 1** → poor distractors make guessing trivial. Mitigation: curate distractors within the same category in the dictionary.

## Resolved Decisions

- **Sign system: ASL, letters AND numbers (CONFIRMED).** Features 1, 2, 3, and 5 teach and recognize the ASL manual alphabet (A–Z) and numbers (0–9). BISINDO is only referenced by the review-only Feature 4.
- **Feature 4: research-only (CONFIRMED).** Not implemented in this change; kept as a documented spec pending research (see Architecture § B).
- **Student identity: lightweight login with name + email + password (CONFIRMED).** A student registers and signs in with a display name, email, and password; their deck, mastery, and video progress persist and stay private. Explicitly NOT a full/enterprise auth system (no SSO, roles, org management). Passwords MUST be stored hashed. Captured in the `student-account` capability.
- **Feature 2 focus + detection: school and daily objects, always with a bounding box (CONFIRMED).**
  - **Primary detector:** the existing **YOLOv8** (`yolov8n.pt`, COCO 80 classes) — it draws the bounding box and already covers many school/daily objects (book, laptop, cell phone, scissors, keyboard, mouse, backpack, bottle, cup, chair, clock, …).
  - **Free open-vocabulary fallback (objects are NOT fixed):** for objects outside COCO, use a **free** path that still yields a box — either an open-vocabulary detector (**YOLO-World** via Ultralytics, or **Grounding DINO**) that boxes arbitrary objects from a text list, or **YOLO's box + a free ImageNet classifier** (MobileNet/EfficientNet via torchvision) run on the cropped region. Must remain free/offline-capable.
- **Word sourcing: curated dictionary for cards + free translation for open objects (CONFIRMED).**
  - **Feature 1 cards** use a **curated static dictionary** (English, Indonesian, picture, 3 distractors) — an API cannot supply pictures or good distractors, so these stay hand-curated.
  - **Feature 2 open objects** translate the detected English label → Indonesian with a **free translator**. Preference order: **Argos Translate** (open-source, fully offline, en↔id, no key) → **MyMemory API** (free, no key, ~5k words/day) → self-hosted **LibreTranslate**. Feature 2 needs no distractors, so translation alone suffices there.
- **ASL recognizer: TRAIN a small landmark classifier for A–Z + 0–9 (CONFIRMED — training accepted).** Training is now in scope for the ASL recognizer. Approach: extract MediaPipe Hands landmarks, normalize, and train a small classifier (e.g. an MLP or SVM) on **public ASL datasets** (ASL Alphabet, Sign Language MNIST, ASL digit sets) plus a few self-recorded samples, covering all 36 classes in one model. A landmark **KNN/template matcher** remains the zero-data quick-start and the offline fallback. (This "train a small classifier" scope does NOT extend to Feature 4 — see Architecture § B; that remains unsolved and out of scope.)
- **Videos: Indonesian narration WITH Indonesian captions (CONFIRMED).** The team records the two lessons with spoken-Indonesian instruction and provides Indonesian captions (important for deaf/hard-of-hearing learners). Captions may be **AI-generated** — e.g. auto-transcribe the Indonesian audio (Whisper or similar) into a WebVTT caption track, then review.

## Open Questions

- **Motion letters:** confirm v1 handling for the moving signs "J" and "Z" (animated reference + relaxed match vs start/end-pose matching).
- **Open-vocabulary detector choice:** YOLO-World / Grounding DINO (open-vocab boxes) vs YOLO-box + ImageNet-classifier-on-crop — pick per accuracy/latency on real school/daily photos.
- **Translator choice:** default to offline Argos Translate, or the MyMemory API? (Both free; offline avoids rate limits and network.)
- **Caption tooling:** which AI transcription tool for the Indonesian caption track, and confirm WebVTT as a toggleable track vs burned-in.

## Reusable Assets & External References (for the new repo)

> This change will be developed in a **new, empty repository**. This section makes the PRD self-contained: it lists exactly what to copy from the current repo and which external libraries/models/datasets to pull, so nothing here depends on being able to browse the old repo.

### Set up OpenSpec + this PRD in the new repo (do this first)
1. In the new empty repo run `npx @fission-ai/openspec init --tools claude` (creates `openspec/` + the `/opsx` commands).
2. Copy this whole change folder into it: `openspec/changes/add-signlang-learning-suite/` (all of `proposal.md`, `design.md`, `tasks.md`, `frontend.md`, and `specs/`).
3. Optional: copy `openspec/config.yaml` for the shared project context.
4. Verify with `openspec validate add-signlang-learning-suite --strict`.
5. Frontend can start right away from `frontend.md`; backend starts from `tasks.md`.

### Copy from the current repo (source of truth for reuse)
- **`yolov8n.pt`** (~6.3 MB) — YOLOv8-nano COCO detector. **Reuse directly** for Feature 2 primary object detection (school/daily objects + boxes). If not copied, `ultralytics` re-downloads it by name.
- **`app.py`** — reference implementation of the Flask + Socket.IO MJPEG streaming loop, YOLO inference per frame, and **MediaPipe Hands landmark extraction/drawing**. Reuse the camera-stream + landmark plumbing for `fingerspelling-recognition` and Feature 2 capture. (Do not copy its BISINDO-specific logic except for Feature 4.)
- **`templates/` and `static/`** (`hompage.html`, `index.html`, `script.js`, `style.css`) — existing UI/JS patterns for the camera view, sockets, and controls; use as a starting point for the new pages.
- **`bisindo.pt` / `bisindov2.pt`** (~22 MB each) — trained BISINDO YOLO models. **Only needed if Feature 4 is ever pursued** (review-only now); safe to leave behind otherwise.
- **`requirements.txt`** — pinned versions to mirror (see key deps below). Note: `ultralytics` is **vendored** as the `ultralytics/` folder in the old repo, not pinned in requirements; in the new repo just `pip install ultralytics`.

### Key runtime dependencies (versions currently used; a modern equivalent is fine)
- Python ≥ 3.8 · **Flask 2.2.3** · **Flask-SocketIO 5.3.3** (+ python-socketio 5.8, python-engineio 4.4, simple-websocket)
- **mediapipe 0.10.14** (Hands landmarks) · **opencv-python 4.6.0.66** · **numpy 1.23** · **Pillow 9.5**
- **torch 2.0.0** · **torchvision 0.15.1** (also gives the free ImageNet classifier fallback) · **ultralytics** (YOLOv8; `pip install ultralytics`)
- Optional: **yt-dlp** (only if keeping the old YouTube-stream feature — not required by the new features)

### External libraries / models / datasets to add in the new repo
- **Ultralytics YOLOv8 / YOLO-World** — object + open-vocabulary detection. License: **AGPL-3.0** (note for distribution). Docs: https://docs.ultralytics.com
- **Grounding DINO** (alt open-vocab detector) — https://github.com/IDEA-Research/GroundingDINO
- **MediaPipe Hands** — hand landmarks (Apache-2.0) — https://developers.google.com/mediapipe
- **ASL recognizer training data** — ASL Alphabet dataset (Kaggle: grassknoted/asl-alphabet), Sign Language MNIST (Kaggle: datamunge/sign-language-mnist), and an ASL digits/numbers set; combine for A–Z + 0–9.
- **Free translation** — Argos Translate (https://github.com/argosopentech/argos-translate, offline en↔id), MyMemory API (https://mymemory.translated.net/doc/spec.php, no key), LibreTranslate (https://github.com/LibreTranslate/LibreTranslate, self-host).
- **Caption generation** — OpenAI Whisper or faster-whisper for Indonesian ASR → WebVTT.
- **ASL reference images** — a public ASL fingerspelling alphabet + numbers chart set (per-letter/per-digit images) for the on-screen reference.
