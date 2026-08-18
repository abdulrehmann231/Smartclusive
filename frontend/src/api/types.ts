// Shared contract types — mirror the API contract in frontend.md.
// Single source of truth so mock + real implementations stay in sync.

export interface Student {
  id: string
  name: string
  email: string
}

export interface AuthResult {
  token: string
  student: Student
}

export interface Letter {
  letter: string
  image: string
}

export interface Fingerspelling {
  word: string
  letters: Letter[]
}

export interface DeckWord {
  id: string
  indonesian: string
  english: string
  image: string
  mastery: number // 0..5 (0 = unmastered)
  learnedAt: string
}

export interface CardOption {
  id: string
  english: string
  image: string
}

export interface Card {
  cardId: string
  indonesian: string
  options: CardOption[] // exactly 4
}

export interface GuessResult {
  correct: boolean
  revealedImage: string
  correctOptionId?: string
  fingerspelling?: Fingerspelling
}

export interface DetectResult {
  detected: boolean
  box?: { x: number; y: number; w: number; h: number }
  english?: string
  indonesian?: string
  source?: 'dictionary' | 'translated'
  fingerspelling?: Fingerspelling
  alreadyInDeck?: boolean // contract addition (flagged gap): duplicate signal
}

export type QuizMode = 'sign_word' | 'sign_letter' | 'sign_number'
export type SignKind = 'word' | 'letter' | 'number'

export interface QuizItem {
  id: string
  kind: SignKind
  prompt: string
}

export interface QuizStart {
  quizId: string
  items: QuizItem[]
}

export interface QuizResult {
  correct: number
  incorrect: number
  total: number
}

export interface Video {
  id: string
  title: string
  type: 'letters' | 'numbers'
  url: string
  captionsUrl: string
  completed: boolean
}

export interface ApiError {
  error: string
  needed?: number
}
