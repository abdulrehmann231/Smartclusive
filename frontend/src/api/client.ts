import { request } from './http'
import type {
  AuthResult,
  Card,
  DeckWord,
  DetectResult,
  GuessResult,
  QuizMode,
  QuizResult,
  QuizStart,
  Student,
  Video,
} from './types'

export const api = {
  // ---------------- Auth ----------------
  async register(name: string, email: string, password: string): Promise<AuthResult> {
    return request('POST', '/api/auth/register', { name, email, password })
  },

  async login(email: string, password: string): Promise<AuthResult> {
    return request('POST', '/api/auth/login', { email, password })
  },

  async resetPassword(email: string, oldPassword: string, newPassword: string): Promise<AuthResult> {
    return request('POST', '/api/auth/reset-password', { email, oldPassword, newPassword })
  },

  async logout(): Promise<void> {
    await request('POST', '/api/auth/logout', undefined)
  },

  async me(): Promise<{ student: Student }> {
    return request('GET', '/api/auth/me')
  },

  // ---------------- Deck ----------------
  async getDeck(): Promise<{ words: DeckWord[] }> {
    return request('GET', '/api/deck')
  },

  async addToDeck(word: {
    indonesian: string
    english: string
    image: string
  }): Promise<{ added: boolean; duplicate: boolean; word: DeckWord }> {
    return request('POST', '/api/deck', word)
  },

  // ---------------- Cards ----------------
  async nextCard(): Promise<Card> {
    return request('GET', '/api/cards/next')
  },

  async guess(indonesian: string, optionId: string): Promise<GuessResult> {
    return request('POST', '/api/cards/guess', { indonesian, optionId })
  },

  // ---------------- Capture ----------------
  async detect(imageFile?: File | Blob): Promise<DetectResult> {
    if (!imageFile) return { detected: false }
    const form = new FormData()
    form.append('image', imageFile)
    return request('POST', '/api/detect', form, { multipart: true })
  },

  // ---------------- Quiz ----------------
  async quizStart(mode: QuizMode): Promise<QuizStart> {
    return request('POST', `/api/quiz/start?mode=${mode}`)
  },

  async quizAnswer(quizId: string, itemId: string, correct: boolean): Promise<{ correct: boolean }> {
    return request('POST', `/api/quiz/${quizId}/answer`, { itemId, correct })
  },

  async quizFinish(quizId: string, results: boolean[]): Promise<QuizResult> {
    return request('POST', `/api/quiz/${quizId}/finish`, { results })
  },

  // ---------------- Videos ----------------
  async getVideos(): Promise<{ videos: Video[] }> {
    return request('GET', '/api/videos')
  },

  async completeVideo(id: string): Promise<{ completed: boolean; quiz: QuizStart }> {
    return request('POST', `/api/videos/${id}/complete`)
  },
}

export type Api = typeof api

// Re-export for the detect service seam.
export { api as detectService }
