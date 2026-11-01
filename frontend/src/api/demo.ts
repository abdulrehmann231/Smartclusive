// In-browser demo backend, used when VITE_DEMO_MODE=true.
// Mirrors the response shapes of the Flask API (see backend/smartclusive/*)
// so every page works without a server. State lives in memory for the tab.

import type {
  AuthResult,
  Card,
  DeckWord,
  DetectResult,
  Fingerspelling,
  GuessResult,
  QuizItem,
  QuizMode,
  QuizResult,
  QuizStart,
  SignKind,
  Student,
  Video,
} from './types'
import type { SignProgress, SignSession } from '../services/signService'

export const DEMO_STUDENT: Student = {
  id: 'demo-student',
  name: 'Demo Student',
  email: 'demo@smartclusive.app',
}

// ---------------- Dictionary (copy of backend/data/dictionary.json) ----------------

interface DictWord {
  indonesian: string
  english: string
  emoji: string
  hue: number
  distractors: string[]
}

const DICTIONARY: DictWord[] = [
  { indonesian: 'kucing', english: 'cat', emoji: '🐱', hue: 30, distractors: ['dog', 'cow', 'bag'] },
  { indonesian: 'anjing', english: 'dog', emoji: '🐶', hue: 20, distractors: ['cat', 'cow', 'apple'] },
  { indonesian: 'sapi', english: 'cow', emoji: '🐮', hue: 90, distractors: ['cat', 'dog', 'apple'] },
  { indonesian: 'mobil', english: 'car', emoji: '🚗', hue: 210, distractors: ['book', 'bag', 'clock'] },
  { indonesian: 'buku', english: 'book', emoji: '📘', hue: 260, distractors: ['pencil', 'desk', 'bag'] },
  { indonesian: 'pensil', english: 'pencil', emoji: '✏️', hue: 45, distractors: ['book', 'desk', 'clock'] },
  { indonesian: 'meja', english: 'desk', emoji: '🪑', hue: 25, distractors: ['book', 'bag', 'clock'] },
  { indonesian: 'tas', english: 'bag', emoji: '🎒', hue: 340, distractors: ['book', 'pencil', 'clock'] },
  { indonesian: 'jam', english: 'clock', emoji: '⏰', hue: 0, distractors: ['book', 'car', 'apple'] },
  { indonesian: 'apel', english: 'apple', emoji: '🍎', hue: 5, distractors: ['cat', 'dog', 'cow'] },
]

const byEnglish = (e: string) => DICTIONARY.find((w) => w.english.toLowerCase() === e.toLowerCase())
const byIndonesian = (i: string) => DICTIONARY.find((w) => w.indonesian.toLowerCase() === i.toLowerCase())

// ---------------- Images (port of backend/smartclusive/images.py) ----------------

function svgDataUri(label: string, emoji: string, hue = 199): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200'>` +
    `<rect width='320' height='200' fill='hsl(${hue},70%,92%)'/>` +
    `<text x='160' y='96' font-size='72' text-anchor='middle'>${emoji}</text>` +
    `<text x='160' y='160' font-size='26' font-family='Segoe UI, sans-serif' ` +
    `font-weight='700' fill='hsl(${hue},45%,35%)' text-anchor='middle'>${label}</text>` +
    `</svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

function aslReferenceImage(ch: string): string {
  if (ch >= 'A' && ch <= 'Z') {
    return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(`Sign_language_${ch}.svg`)
  }
  // Number references are shipped in frontend/public/mock/asl/numbers.
  if (ch >= '0' && ch <= '9') return `/mock/asl/numbers/${ch}.${ch === '0' ? 'svg' : 'jpg'}`
  return svgDataUri(ch, '🤟', (ch.charCodeAt(0) * 17) % 360)
}

const wordImage = (w: DictWord) => svgDataUri(w.english, w.emoji, w.hue)

function fingerspellingFor(word: string): Fingerspelling {
  const clean = word.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return { word: clean, letters: clean.split('').map((letter) => ({ letter, image: aslReferenceImage(letter) })) }
}

// ---------------- Helpers ----------------

const MIN_DECK_SIZE = 3
const QUIZ_WORD_COUNT = 5
const VIDEO_QUIZ_LENGTH = 3

const rid = (prefix: string) => `${prefix}-${Math.random().toString(16).slice(2, 10)}`
const delay = <T>(value: T, ms = 250) => new Promise<T>((r) => setTimeout(() => r(value), ms))
const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const sample = <T>(arr: T[], n: number) => shuffle(arr).slice(0, n)
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

// ---------------- Demo state ----------------

// Seed a few learned words so the dashboard, deck and quizzes are unlocked.
const deck: DeckWord[] = [
  { english: 'cat', mastery: 5, days: 6 },
  { english: 'dog', mastery: 4, days: 5 },
  { english: 'apple', mastery: 3, days: 4 },
  { english: 'book', mastery: 2, days: 2 },
  { english: 'car', mastery: 0, days: 1 },
].map(({ english, mastery, days }) => {
  const w = byEnglish(english)!
  return { id: `dw-${english}`, indonesian: w.indonesian, english, image: wordImage(w), mastery, learnedAt: daysAgo(days) }
})

const VIDEOS: Video[] = [
  {
    id: 'v-letters',
    title: 'Alfabet ASL',
    type: 'letters',
    url: 'https://youtu.be/6byePgEZT2s',
    captionsUrl: '',
    completed: false,
  },
]
const completedVideos = new Set<string>()

const activeQuizzes = new Map<string, { mode: QuizMode | 'video'; items: QuizItem[]; results: Record<string, boolean> }>()

function bumpMastery(english: string) {
  const w = deck.find((d) => d.english.toLowerCase() === english.toLowerCase())
  if (w) w.mastery = Math.min(5, w.mastery + 1)
}

// ---------------- API (same surface as the real client) ----------------

const notAvailable = (): Promise<never> => Promise.reject({ status: 403, error: 'demo_mode' })

export const demoApi = {
  // Auth is disabled in demo mode — the demo student is always signed in.
  register: (_n: string, _e: string, _p: string): Promise<AuthResult> => notAvailable(),
  login: (_e: string, _p: string): Promise<AuthResult> => notAvailable(),
  resetPassword: (_e: string, _p: string): Promise<AuthResult> => notAvailable(),
  logout: async (): Promise<void> => {},
  me: async (): Promise<{ student: Student }> => ({ student: DEMO_STUDENT }),

  // ---------------- Deck ----------------
  getDeck: async (): Promise<{ words: DeckWord[] }> => delay({ words: deck.map((w) => ({ ...w })) }),

  async addToDeck(word: {
    indonesian: string
    english: string
    image: string
  }): Promise<{ added: boolean; duplicate: boolean; word: DeckWord }> {
    const existing = deck.find((w) => w.english.toLowerCase() === word.english.toLowerCase())
    if (existing) return delay({ added: false, duplicate: true, word: { ...existing } })
    const dict = byEnglish(word.english)
    const added: DeckWord = {
      id: rid('dw'),
      indonesian: word.indonesian,
      english: word.english,
      image: dict ? wordImage(dict) : word.image,
      mastery: 0,
      learnedAt: new Date().toISOString(),
    }
    deck.unshift(added)
    return delay({ added: true, duplicate: false, word: { ...added } })
  },

  // ---------------- Cards ----------------
  async nextCard(): Promise<Card> {
    const correct = DICTIONARY[Math.floor(Math.random() * DICTIONARY.length)]
    const distractors = correct.distractors.map(byEnglish).filter((w): w is DictWord => !!w && w !== correct)
    while (distractors.length < 3) {
      const other = DICTIONARY[Math.floor(Math.random() * DICTIONARY.length)]
      if (other !== correct && !distractors.includes(other)) distractors.push(other)
    }
    const options = shuffle([correct, ...distractors.slice(0, 3)]).map((o) => ({
      id: `opt-${o.english}`,
      english: o.english,
      image: wordImage(o),
    }))
    return delay({ cardId: rid('card'), indonesian: correct.indonesian, options })
  },

  async guess(indonesian: string, optionId: string): Promise<GuessResult> {
    const correct = byIndonesian(indonesian)
    if (!correct) return Promise.reject({ status: 404, error: 'card_not_found' })
    const guessedEnglish = optionId.replace(/^opt-/, '')
    const guessed = byEnglish(guessedEnglish)
    const revealedImage = svgDataUri(guessedEnglish, guessed?.emoji ?? '❓', guessed?.hue ?? 0)
    if (guessedEnglish.toLowerCase() === correct.english.toLowerCase()) {
      return delay({
        correct: true,
        revealedImage,
        correctOptionId: `opt-${correct.english}`,
        fingerspelling: fingerspellingFor(correct.english),
      })
    }
    return delay({ correct: false, revealedImage })
  },

  // ---------------- Capture ----------------
  // No object detector in demo mode: "detect" a random dictionary object.
  async detect(imageFile?: File | Blob): Promise<DetectResult> {
    if (!imageFile) return { detected: false }
    const w = DICTIONARY[Math.floor(Math.random() * DICTIONARY.length)]
    return delay(
      {
        detected: true,
        box: { x: 0.2, y: 0.18, w: 0.6, h: 0.62 },
        english: w.english,
        indonesian: w.indonesian,
        source: 'dictionary',
        fingerspelling: fingerspellingFor(w.english),
        alreadyInDeck: deck.some((d) => d.english.toLowerCase() === w.english.toLowerCase()),
      },
      700,
    )
  },

  // ---------------- Quiz ----------------
  async quizStart(mode: QuizMode): Promise<QuizStart> {
    if (deck.length < MIN_DECK_SIZE) {
      return Promise.reject({ status: 422, error: 'deck_too_small', needed: MIN_DECK_SIZE - deck.length })
    }
    let items: QuizItem[]
    if (mode === 'sign_word') {
      items = sample(deck, QUIZ_WORD_COUNT).map((w) => ({ id: rid('q'), kind: 'word', prompt: w.english.toUpperCase() }))
    } else if (mode === 'sign_letter') {
      const letters = [...new Set(deck.flatMap((w) => w.english.toUpperCase().replace(/[^A-Z]/g, '').split('')))]
      items = sample(letters, QUIZ_WORD_COUNT).map((l) => ({ id: rid('q'), kind: 'letter', prompt: l }))
    } else {
      items = Array.from({ length: QUIZ_WORD_COUNT }, () => ({
        id: rid('q'),
        kind: 'number' as const,
        prompt: String(Math.floor(Math.random() * 10)),
      }))
    }
    const quizId = rid('quiz')
    activeQuizzes.set(quizId, { mode, items, results: {} })
    return delay({ quizId, items })
  },

  async quizAnswer(quizId: string, itemId: string, correct: boolean): Promise<{ correct: boolean }> {
    const quiz = activeQuizzes.get(quizId)
    if (quiz) quiz.results[itemId] = correct
    return { correct }
  },

  async quizFinish(quizId: string, results: boolean[]): Promise<QuizResult> {
    const quiz = activeQuizzes.get(quizId)
    const total = quiz?.items.length ?? results.length
    const correct = quiz ? Object.values(quiz.results).filter(Boolean).length : results.filter(Boolean).length
    if (quiz?.mode === 'sign_word') {
      quiz.items.forEach((item) => quiz.results[item.id] && bumpMastery(item.prompt))
    }
    activeQuizzes.delete(quizId)
    return delay({ correct, incorrect: total - correct, total })
  },

  // ---------------- Videos ----------------
  getVideos: async (): Promise<{ videos: Video[] }> =>
    delay({ videos: VIDEOS.map((v) => ({ ...v, completed: completedVideos.has(v.id) })) }),

  async completeVideo(id: string): Promise<{ completed: boolean; quiz: QuizStart }> {
    const video = VIDEOS.find((v) => v.id === id)
    if (!video) return Promise.reject({ status: 404, error: 'video_not_found' })
    completedVideos.add(id)
    const items: QuizItem[] =
      video.type === 'letters'
        ? sample(['A', 'B', 'C', 'D', 'E'], VIDEO_QUIZ_LENGTH).map((p) => ({ id: rid('q'), kind: 'letter', prompt: p }))
        : video.type === 'numbers'
          ? sample(['1', '2', '3', '4', '5'], VIDEO_QUIZ_LENGTH).map((p) => ({ id: rid('q'), kind: 'number', prompt: p }))
          : sample(DICTIONARY, VIDEO_QUIZ_LENGTH).map((w) => ({ id: rid('q'), kind: 'word', prompt: w.english.toUpperCase() }))
    const quizId = `vq-${id}`
    activeQuizzes.set(quizId, { mode: 'video', items, results: {} })
    return delay({ completed: true, quiz: { quizId, items } })
  },
}

// ---------------- Sign recognition ----------------
// No ML model in demo mode: every captured frame counts as the next correct sign.

class DemoSignSession implements SignSession {
  private units: string[]
  private progress: SignProgress
  private stopped = false

  constructor(target: string) {
    const upper = target.toUpperCase()
    this.units = upper.replace(/[^A-Z0-9]/g, '').split('')
    this.progress = { matched: [], expected: this.units[0] ?? null, complete: this.units.length === 0, target: upper }
  }

  state(): SignProgress {
    return this.progress
  }

  async sendFrame(_imageDataUrl: string): Promise<SignProgress> {
    if (this.stopped || this.progress.complete) return this.progress
    const matched = this.units.slice(0, this.progress.matched.length + 1)
    const complete = matched.length >= this.units.length
    this.progress = { ...this.progress, matched, complete, expected: complete ? null : this.units[matched.length] }
    return delay(this.progress, 300)
  }

  stop(): void {
    this.stopped = true
  }
}

export const demoSignService = {
  async start(target: string, _kind: SignKind): Promise<SignSession> {
    return new DemoSignSession(target)
  },
}
