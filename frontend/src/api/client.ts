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

function inferApiBase(): string {
  const env = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  if (env) return env
  // Inside the Daytona preview proxy, the frontend runs on port 5173 and the backend on 5000.
  const host = window.location.hostname
  if (host.endsWith('.daytonaproxy01.net') && host.startsWith('5173-')) {
    return `https://5000-${host.slice(5)}`
  }
  return ''
}

const API_BASE = inferApiBase()

function token() {
  return localStorage.getItem('sc.token') || ''
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: { multipart?: boolean } = {},
): Promise<T> {
  const url = `${API_BASE}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token()}`,
    // Skip ngrok's free-tier browser-warning interstitial, which is returned
    // without CORS headers and otherwise surfaces as a "CORS error" in the browser.
    'ngrok-skip-browser-warning': 'true',
  }
  let fetchBody: BodyInit | undefined

  if (options.multipart) {
    fetchBody = body as FormData
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    fetchBody = JSON.stringify(body)
  }

  const res = await fetch(url, {
    method,
    headers,
    body: fetchBody,
  })

  let data: any = {}
  try {
    data = await res.json()
  } catch {
    data = {}
  }

  if (!res.ok) {
    const err: any = { status: res.status, error: data.error || 'unknown' }
    if (data.needed !== undefined) err.needed = data.needed
    throw err
  }
  return data as T
}

export const api = {
  // ---------------- Auth ----------------
  async register(name: string, email: string, password: string): Promise<AuthResult> {
    return request('POST', '/api/auth/register', { name, email, password })
  },

  async login(email: string, password: string): Promise<AuthResult> {
    return request('POST', '/api/auth/login', { email, password })
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
