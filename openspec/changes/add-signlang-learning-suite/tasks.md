## 1. Foundations & shared data

- [ ] 1.0 Bootstrap the new repo: copy carry-over assets per `design.md` → Reusable Assets (`yolov8n.pt`, `app.py` camera+MediaPipe plumbing, `templates/`, `static/`) and set up deps (Flask, Flask-SocketIO, mediapipe, opencv, torch/torchvision, ultralytics)
- [ ] 1.1 Assemble the curated static Indonesian↔English dictionary with per-word picture assets and per-word distractor sets (covers card vocabulary + the ~80 YOLO labels)
- [ ] 1.2 Assemble the ASL reference images for every letter (A–Z) and number (0–9)
- [ ] 1.3 Record the two ASL lesson videos (letters, numbers) with Indonesian narration; generate/review Indonesian caption tracks (e.g. Whisper → WebVTT)
- [ ] 1.4 Choose and provision the persistence store (SQLite or per-student file store)

## 2. Student account (name / email / password login)

- [ ] 2.1 Implement registration (name, email, password) with unique-email check and hashed password storage per `student-account` spec
- [ ] 2.2 Implement email+password sign-in, session handling, and sign-out
- [ ] 2.3 Scope decks, mastery, and video progress to the signed-in student and keep them private
- [ ] 2.4 Verify wrong-credential rejection and that data is hidden until next sign-in

## 3. Learner deck capability

- [ ] 3.1 Implement per-student deck storage (add word, list words, dedupe) per `learner-deck` spec
- [ ] 3.2 Implement mastery state tracking and update-on-quiz-result
- [ ] 3.3 Expose an eligible-words query for the quiz capability
- [ ] 3.4 Verify deck isolation and cross-session persistence

## 4. ASL recognition capability (shared — letters + numbers)

- [ ] 4.1 Add camera-consent gate before capture
- [ ] 4.2 Extract + normalize MediaPipe Hands landmarks; assemble training data from public ASL datasets (ASL Alphabet, Sign Language MNIST, ASL digits) + a few self-recorded samples
- [ ] 4.3 Train the small landmark classifier (MLP/SVM) covering A–Z and 0–9; keep a KNN/template matcher as the zero-data bootstrap + offline fallback
- [ ] 4.4 Implement single-letter and single-number match reporting against an expected target
- [ ] 4.5 Implement the letter-by-letter word verifier state machine with consecutive-frame stability
- [ ] 4.6 Handle the motion letters "J" and "Z" (animated reference + relaxed/start-end-pose match)
- [ ] 4.7 Emit progress feedback (matched letters/numbers + current expected target) to the UI

## 5. Feature 1 — word-card learning

- [ ] 5.1 Card screen: show Indonesian word + four distinct English options (one correct)
- [ ] 5.2 On guess, flip the chosen option to its picture; loop until correct
- [ ] 5.3 On correct, show the ordered ASL fingerspelling reference for the word
- [ ] 5.4 Wire the signing step to the ASL recognizer; add to deck on verified success

## 6. Feature 2 — camera object learning

- [ ] 6.1 Photo capture UI + YOLOv8 detection with a bounding box (school/daily objects); "not recognized / retake" path
- [ ] 6.2 Add the free open-vocabulary fallback for objects outside COCO (YOLO-World/Grounding DINO, or YOLO-box + torchvision ImageNet classifier on the crop)
- [ ] 6.3 Resolve detected object to Indonesian + English words: curated dictionary first, else translate the English label via the free translator (Argos Translate offline / MyMemory)
- [ ] 6.4 Show ASL fingerspelling reference for the detected word
- [ ] 6.5 Wire the signing step; mark learned and add to deck (skip duplicates)

## 7. Feature 3 — sign quiz

- [ ] 7.1 Enforce minimum-deck-size gate before starting a quiz
- [ ] 7.2 Implement sign-the-word mode via the ASL recognizer
- [ ] 7.3 Implement sign-the-letter mode
- [ ] 7.4 Implement sign-the-number mode
- [ ] 7.5 Score the quiz, show results, and update mastery
- [ ] 7.6 (Stretch) add one or more additional modes from design.md (e.g. multiple-choice recognition, reverse fingerspelling)

## 8. Feature 5 — ASL video lessons

- [ ] 8.1 Build the videos section listing the ASL letters and ASL numbers lessons
- [ ] 8.2 Play the Indonesian-narration videos with toggleable Indonesian captions and track watch-to-end completion per student
- [ ] 8.3 On letters-video completion, launch a letter quiz; on numbers-video completion, launch a number quiz
- [ ] 8.4 Record post-video quiz results against the lesson

## 9. Feature 4 — sign-language translation (review-only, NOT implemented)

- [ ] 9.1 Keep the reviewed spec current; document research findings on word/sentence-level Indonesian sign translation (no implementation this change)

## 10. Frontend track (parallel, mock-first — see `frontend.md`)

> Can start immediately, before any backend exists, by building against the mock API contract in `frontend.md`.

- [ ] 10.1 App shell, routing, and mock API client + `SignService`/`DetectService` stubs returning the sample JSON
- [ ] 10.2 Auth screens (register/login/logout) + session store + route guards
- [ ] 10.3 Home dashboard + `/deck` list (mock deck)
- [ ] 10.4 Feature 1 card flow: 4 options, tile flip text→picture, fingerspelling reference, mock `SignPad`
- [ ] 10.5 Feature 5 videos: player + Indonesian captions toggle + post-video quiz hook
- [ ] 10.6 Feature 3 `QuizRunner` for word/letter/number modes + results screen
- [ ] 10.7 Feature 2 capture UI + bounding-box overlay + retake path
- [ ] 10.8 Swap mock services for the real REST/Socket.IO endpoints once backend lands

## 11. Integration, privacy & verification

- [ ] 11.1 Wire frontend to real routes/endpoints (login, learn, capture, quiz, videos) and Socket.IO sign events
- [ ] 11.2 Add camera/photo consent copy and in-memory-only frame handling (retain nothing by default)
- [ ] 11.3 Run `openspec validate add-signlang-learning-suite --strict` and resolve findings
- [ ] 11.4 End-to-end test each flow: login → data isolation; card → sign → deck; capture → sign → deck; deck → quiz (word/letter/number) → mastery; video → completion → quiz
