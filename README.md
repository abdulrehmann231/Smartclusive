# Smartclusive

Smartclusive is an interactive American Sign Language (ASL) learning platform designed to help Indonesian students build English vocabulary by recognizing words and producing their signs on camera. The application turns a standard webcam into a learning tool: students guess meanings, study ASL fingerspelling references, and sign words letter by letter to add them to a personal deck.

## Description

The project layers a gamified learning product on top of computer-vision building blocks. Students learn English words through Indonesian prompts, receive live feedback while signing, and track mastery over time. The backend handles student accounts, deck persistence, quiz generation, object detection, and ASL recognition. The React frontend provides the camera-driven learning interface.

## Features

- Word cards: guess the English meaning of an Indonesian word, reveal picture feedback, then sign the word on camera.
- Camera object learning: photograph a real-world object, detect it, and learn its English and Indonesian names plus ASL fingerspelling.
- Sign recognition: real-time ASL letter and number recognition from webcam frames using MediaPipe Hands and a trained landmark classifier.
- Learner deck: per-student persistent storage of learned words with mastery tracking.
- Quizzes: deck-driven word, letter, and number signing challenges.
- Video lessons: ASL alphabet and number lessons with Indonesian captions and post-video quizzes.
- Lightweight authentication: name, email, and password login with hashed passwords.

## Impact

Smartclusive makes English vocabulary acquisition accessible through visual and kinetic learning. By teaching ASL fingerspelling alongside English words, it supports Deaf and hard-of-hearing learners as well as hearing students who benefit from multi-modal instruction. The project reuses open computer-vision models and keeps infrastructure lightweight so it can run in classrooms or low-resource settings.

## Future Goals

- Real video assets for the ASL letters and numbers lessons.
- Expanded object detection coverage with a stronger open-vocabulary fallback.
- ASL number reference images to match the letter reference set.
- Research integration for Indonesian sign language (BISINDO) camera-to-text translation.
- Mobile and offline support for classroom use without reliable internet.
- Teacher dashboards and class-wide progress tracking.

## How to Run

### Backend

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. (Optional) Add the trained ASL model to enable real recognition:
   ```bash
   cp asl_landmark_model.joblib data/
   cp labels.json data/
   ```

4. Start the server:
   ```bash
   python app.py
   ```

The backend runs on port 5000 by default.

The backend serves lesson videos from `backend/static/`. Placeholder MP4 files are generated automatically for development; replace `letters.mp4` and `numbers.mp4` with real ASL lesson videos when available.

### Frontend

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Point the frontend at the backend. For local development:
   ```bash
   echo "VITE_API_URL=http://localhost:5000" > .env
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```

The frontend runs on port 5173 by default.

### Running Tests

Backend smoke tests:
```bash
cd backend
.venv/bin/python -m pytest tests/test_api.py -v
```
