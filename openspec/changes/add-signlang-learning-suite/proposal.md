## Why

The current product is a one-way BISINDO sign-language *translator* (camera → Indonesian text). It helps hearing people read signs, but it does nothing to help a learner *acquire* vocabulary or *produce* signs themselves. We want to turn the existing detector into an interactive, gamified learning app so students can build a personal vocabulary of words they can both recognize (Indonesian ↔ English) and physically produce in **American Sign Language (ASL)**, verified live through the camera. The goal is to reuse existing computer-vision technology (YOLOv8 object detection, MediaPipe Hands, and an off-the-shelf ASL alphabet/number recognizer) rather than train new models from scratch.

> **Sign system (CONFIRMED):** The app teaches and recognizes **American Sign Language (ASL)** — both the manual alphabet (A–Z) **and numbers (0–9)**. Features 1, 2, and 3 use ASL signs and English words. The existing BISINDO detector is only reused for the under-review Feature 4 translator, not for the ASL learning flows.

## What Changes

- **Guided word-card learning (Feature 1):** A student picks a card showing an Indonesian word, guesses among 4 English options, and each chosen option flips to a picture so the student can self-correct. On the correct answer, the app shows the **ASL** fingerspelling reference for the word and asks the student to sign each letter on camera; when signed correctly the word is added to their deck.
- **Camera "capture-to-learn" (Feature 2):** A student photographs a real-world object (focus on **school and daily objects**); the app detects it **with a bounding box**, shows the Indonesian and English words, presents the **ASL** fingerspelling reference, verifies the student's signing on camera, and adds the learned word to their deck. Because objects are not a fixed set, a free open-vocabulary detection fallback and a free translator handle objects/words outside the curated list.
- **Deck & mastery tracking:** A per-student deck records learned words and their mastery state, and is the source of truth that quizzes draw from.
- **Camera ASL sign recognition (shared):** A reusable capability that captures hand signs from the camera and checks them against a target — a **letter (A–Z), a number (0–9), or a whole word** signed letter by letter — used by Features 1, 2, 3, and the video quizzes.
- **Quiz mode (Feature 3):** Quizzes generated from the student's learned deck, including sign-the-word, sign-a-single-letter, **sign-a-number**, and additional modes proposed in `design.md`.
- **ASL video lessons (Feature 5):** A videos section with two lessons — one teaching ASL **letter** signs and one teaching ASL **number** signs, both with **Indonesian captions** — and a quiz triggered when a student finishes a video.
- **Sign-language translation (Feature 4, UNDER REVIEW — not implemented):** Keep the camera → Indonesian/English text translation as a review-only spec. Reliable word/sentence-level Indonesian sign translation has no proven off-the-shelf technology today, so this stays research-only and may be revisited later.
- Adds new dependencies/tech: object detection with bounding boxes (YOLOv8 for school/daily objects + a free open-vocabulary fallback), an **ASL alphabet + number recognizer built from a small classifier trained on MediaPipe Hands landmarks** (public ASL datasets; KNN fallback), a curated Indonesian↔English dictionary plus a **free translator** for open object labels, ASL letter/number reference images, the two lesson videos with Indonesian caption tracks (possibly AI-generated), and lightweight name/email/password login with per-student persistence for decks and progress.

## Capabilities

### New Capabilities
- `word-card-learning`: The guided card flow where a learner maps an Indonesian word to its English meaning via progressive picture reveals, then fingerspells it in ASL (Feature 1).
- `camera-object-learning`: The capture-a-photo → detect object → learn-and-sign flow that grows the deck from the real world (Feature 2).
- `fingerspelling-recognition`: Shared camera-based capture and verification of a learner signing a target ASL letter, ASL number, or a whole word signed letter by letter.
- `student-account`: Lightweight student sign-in that binds a deck, mastery, and video progress to a private, persistent identity.
- `learner-deck`: Per-student storage of learned words plus their mastery state; the source quizzes draw from.
- `sign-quiz`: Deck-driven quizzes with multiple modes (word, letter, number) that assess recognition and production of ASL signs.
- `learning-videos`: The videos section with the ASL letters and ASL numbers lessons (Indonesian captions) and a completion quiz (Feature 5).
- `sign-language-translation`: Real-time camera → Indonesian/English text translation reusing the existing BISINDO detector (Feature 4, review-only / research).

### Modified Capabilities
<!-- None. The existing translator is not yet described as an OpenSpec capability; Feature 4 introduces `sign-language-translation` as a new spec rather than modifying an existing one. -->

## Impact

- **Existing code:** `app.py` (Flask + Socket.IO streaming), `templates/`, and `static/` gain new routes/pages and client flows. The current YOLO/MediaPipe pipeline (`bisindo.pt`, `yolov8n.pt`) is reused; `sign-language-translation` wraps today's detection loop (review-only).
- **New dependencies/data:** object detection with boxes (existing **YOLOv8** for school/daily objects + a **free open-vocabulary fallback** — YOLO-World/Grounding DINO or YOLO-box+ImageNet-classifier), a small **ASL letter+number classifier trained on MediaPipe-landmark features** from public ASL datasets (KNN fallback), a **curated static Indonesian↔English dictionary** (picture + distractors) plus a **free translator** (Argos Translate offline, or MyMemory/LibreTranslate) for open object labels, ASL reference images for every letter and digit, two lesson videos with Indonesian narration + Indonesian caption tracks (possibly AI-generated), and a lightweight **name/email/password** login with per-student persistence (DB or file store) for decks/mastery/video progress. See `design.md` → Reusable Assets & External References for exact carry-over files and library/model/dataset links.
- **Privacy/permissions:** camera and photo capture require explicit consent; captured frames should be processed and not retained by default. Passwords are stored hashed.
- **Non-goals for this change:** training the vision/hand model from scratch (only a small landmark classifier is trained), a full/enterprise auth system (SSO, roles) beyond the lightweight name/email/password login, and implementing Feature 4 (it stays a reviewed, research-only spec).
