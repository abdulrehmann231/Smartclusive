// Mock API client — implements the frontend.md contract with in-memory state.
// Swap this module for a real fetch/axios implementation later; screens never change.

import type {
  AuthResult,
  Card,
  DeckWord,
  DetectResult,
  Fingerspelling,
  GuessResult,
  Letter,
  QuizItem,
  QuizMode,
  QuizResult,
  QuizStart,
  Student,
  Video,
} from './types'
import {
  CAPTIONS,
  initialDeck,
  pic,
  seedWord,
  VIDEOS,
  WORDS,
} from '../mock/data'

const MIN_DECK = 3

function delay(ms = 420) {
  return new Promise((r) => setTimeout(r, ms))
}
function uid(prefix: string) {
  return prefix + '-' + Math.random().toString(36).slice(2, 8)
}

// Build an ordered ASL fingerspelling reference for a word (English, uppercase).
function fingerspell(word: string): Fingerspelling {
  const clean = word.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const letters: Letter[] = clean.split('').map((ch) => ({
    letter: ch,
    image: pic(ch, '🤟', 199),
  }))
  return { word: clean, letters }
}

// ---- in-memory "database", keyed by student email ----
interface DB {
  students: Record<string, { student: Student; password: string; deck: DeckWord[] }>
  tokens: Record<string, string> // token -> email
  videos: Record<string, Video[]> // email -> videos
}

const db: DB = { students: {}, tokens: {}, videos: {} }

function currentEmail(): string | null {
  const token = localStorage.getItem('sc.token')
  return token ? db.tokens[token] ?? null : null
}
function requireStudentEmail(): string {
  const email = currentEmail()
  if (!email) throw { status: 401, error: 'unauthorized' }
  // Recreate a demo student on hot reload if the token outlived the module state.
  if (!db.students[email]) {
    db.students[email] = {
      student: { id: uid('stu'), name: email.split('@')[0], email },
      password: '',
      deck: initialDeck(),
    }
    db.videos[email] = VIDEOS.map((v) => ({ ...v }))
  }
  return email
}

export const api = {
  // ---------------- Auth (student-account) ----------------
  async register(name: string, email: string, password: string): Promise<AuthResult> {
    await delay()
    email = email.toLowerCase().trim()
    if (db.students[email]) throw { status: 409, error: 'email_taken' }
    const student: Student = { id: uid('stu'), name, email }
    db.students[email] = { student, password, deck: initialDeck() }
    db.videos[email] = VIDEOS.map((v) => ({ ...v }))
    const token = uid('tok')
    db.tokens[token] = email
    return { token, student }
  },

  async login(email: string, password: string): Promise<AuthResult> {
    await delay()
    email = email.toLowerCase().trim()
    const rec = db.students[email]
    // Demo convenience: unknown accounts are auto-created so any login works.
    if (!rec) {
      const student: Student = { id: uid('stu'), name: email.split('@')[0], email }
      db.students[email] = { student, password, deck: initialDeck() }
      db.videos[email] = VIDEOS.map((v) => ({ ...v }))
      const token = uid('tok')
      db.tokens[token] = email
      return { token, student }
    }
    if (rec.password && rec.password !== password) {
      throw { status: 401, error: 'invalid_credentials' }
    }
    const token = uid('tok')
    db.tokens[token] = email
    return { token, student: rec.student }
  },

  async logout(): Promise<void> {
    await delay(150)
    const token = localStorage.getItem('sc.token')
    if (token) delete db.tokens[token]
  },

  async me(): Promise<{ student: Student }> {
    await delay(200)
    const email = requireStudentEmail()
    return { student: db.students[email].student }
  },

  // ---------------- Deck (learner-deck) ----------------
  async getDeck(): Promise<{ words: DeckWord[] }> {
    await delay()
    const email = requireStudentEmail()
    return { words: [...db.students[email].deck] }
  },

  // Contract addition (flagged gap): explicit deck writer used by Feature 1 & 2.
  // Returns { added, duplicate } so callers can show "added" vs "already in deck".
  async addToDeck(word: {
    indonesian: string
    english: string
    image: string
  }): Promise<{ added: boolean; duplicate: boolean; word: DeckWord }> {
    await delay(200)
    const email = requireStudentEmail()
    const deck = db.students[email].deck
    const existing = deck.find(
      (w) => w.english.toLowerCase() === word.english.toLowerCase(),
    )
    if (existing) return { added: false, duplicate: true, word: existing }
    const entry: DeckWord = {
      id: uid('w'),
      indonesian: word.indonesian,
      english: word.english,
      image: word.image,
      mastery: 0,
      learnedAt: new Date().toISOString(),
    }
    deck.push(entry)
    return { added: true, duplicate: false, word: entry }
  },

  // ---------------- Feature 1: cards (word-card-learning) ----------------
  async nextCard(): Promise<Card> {
    await delay()
    const correct = WORDS[Math.floor(Math.random() * WORDS.length)]
    const distractors = WORDS.filter((w) => w.english !== correct.english)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
    const options = [correct, ...distractors]
      .sort(() => Math.random() - 0.5)
      .map(seedWord)
    return { cardId: uid('c'), indonesian: correct.indonesian, options }
  },

  async guess(indonesian: string, optionId: string): Promise<GuessResult> {
    await delay(300)
    const correctWord = WORDS.find((w) => w.indonesian === indonesian)
    const guessedEnglish = optionId.replace('opt-', '')
    const revealedImage =
      seedWord(WORDS.find((w) => w.english === guessedEnglish) ?? WORDS[0]).image
    const isCorrect = !!correctWord && optionId === 'opt-' + correctWord.english
    if (isCorrect && correctWord) {
      return {
        correct: true,
        revealedImage,
        correctOptionId: 'opt-' + correctWord.english,
        fingerspelling: fingerspell(correctWord.english),
      }
    }
    return { correct: false, revealedImage }
  },

  // ---------------- Feature 2: capture (camera-object-learning) ----------------
  async detect(): Promise<DetectResult> {
    await delay(700)
    // 1-in-6 "not recognized" so the retake path is exercised.
    if (Math.random() < 0.16) return { detected: false }
    const email = requireStudentEmail()
    const w = WORDS[Math.floor(Math.random() * WORDS.length)]
    const dup = db.students[email].deck.some(
      (d) => d.english.toLowerCase() === w.english.toLowerCase(),
    )
    return {
      detected: true,
      box: { x: 0.18, y: 0.2, w: 0.6, h: 0.55 },
      english: w.english,
      indonesian: w.indonesian,
      source: Math.random() < 0.7 ? 'dictionary' : 'translated',
      fingerspelling: fingerspell(w.english),
      alreadyInDeck: dup,
    }
  },

  // ---------------- Feature 3: quiz (sign-quiz) ----------------
  async quizStart(mode: QuizMode): Promise<QuizStart> {
    await delay()
    const email = requireStudentEmail()
    const deck = db.students[email].deck
    if (deck.length < MIN_DECK) {
      throw { status: 422, error: 'deck_too_small', needed: MIN_DECK - deck.length }
    }
    let items: QuizItem[] = []
    if (mode === 'sign_word') {
      items = deck
        .slice(0, 5)
        .map((w) => ({ id: uid('q'), kind: 'word', prompt: w.english.toUpperCase() }))
    } else if (mode === 'sign_letter') {
      const letters = Array.from(
        new Set(deck.flatMap((w) => w.english.toUpperCase().split(''))),
      ).slice(0, 5)
      items = letters.map((l) => ({ id: uid('q'), kind: 'letter', prompt: l }))
    } else {
      items = ['3', '7', '5', '2', '9'].map((n) => ({
        id: uid('q'),
        kind: 'number',
        prompt: n,
      }))
    }
    return { quizId: uid('quiz'), items }
  },

  async quizAnswer(quizId: string, itemId: string, correct: boolean): Promise<{ correct: boolean }> {
    await delay(120)
    void quizId
    void itemId
    return { correct }
  },

  // Given results, bump mastery on the deck (mock of server-side mastery update).
  async quizFinish(results: boolean[]): Promise<QuizResult> {
    await delay(200)
    const email = requireStudentEmail()
    const deck = db.students[email].deck
    const correct = results.filter(Boolean).length
    // Reward correct answers by nudging mastery on a few deck words.
    deck.slice(0, correct).forEach((w) => {
      w.mastery = Math.min(5, w.mastery + 1)
    })
    return { correct, incorrect: results.length - correct, total: results.length }
  },

  // ---------------- Feature 5: videos (learning-videos) ----------------
  async getVideos(): Promise<{ videos: Video[] }> {
    await delay()
    const email = requireStudentEmail()
    return { videos: [...db.videos[email]] }
  },

  async completeVideo(id: string): Promise<{ completed: boolean; quiz: QuizStart }> {
    await delay(300)
    const email = requireStudentEmail()
    const vids = db.videos[email]
    const v = vids.find((x) => x.id === id)
    if (v) v.completed = true
    const isLetters = v?.type === 'letters'
    const items: QuizItem[] = isLetters
      ? ['A', 'B', 'C'].map((l) => ({ id: uid('q'), kind: 'letter', prompt: l }))
      : ['1', '2', '3'].map((n) => ({ id: uid('q'), kind: 'number', prompt: n }))
    return { completed: true, quiz: { quizId: uid('quiz'), items } }
  },

  captionsFor(type: string): string[] {
    return CAPTIONS[type] ?? []
  },
}

export type Api = typeof api
