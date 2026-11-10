import type { SignKind } from '../api/types'
import { DEMO_MODE } from '../config'
import { demoSignService } from '../api/demo'

export interface SignProgress {
  matched: string[]
  expected: string | null
  complete: boolean
  target: string
  feedback?: 'ready' | 'no_hand' | 'uncertain' | 'different_sign' | 'hold' | 'accepted' | 'release_hand' | 'complete' | 'model_unavailable'
  candidates?: { label: string; score: number }[]
  timingsMs?: { landmarks: number; classification: number }
}

export interface SignSession {
  state(): SignProgress
  sendFrame(imageDataUrl: string): Promise<SignProgress>
  stop(): void
}

function inferApiBase(): string {
  const env = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  if (env) return env
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

export async function signRequest<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const url = `${API_BASE}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token()}`,
    'Content-Type': 'application/json',
    // Skip ngrok's free-tier browser-warning interstitial, which is returned
    // without CORS headers and otherwise surfaces as a "CORS error" in the browser.
    'ngrok-skip-browser-warning': 'true',
  }
  const res = await fetch(url, {
    method,
    headers,
    signal,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw { status: res.status, error: data.error || 'unknown' }
  }
  return data as T
}

function stripDataUrlPrefix(dataUrl: string): string {
  const idx = dataUrl.indexOf(',')
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl
}

class RestSignSession implements SignSession {
  private sessionId: string
  private progress: SignProgress
  private stopped = false
  private frameId = 0
  private pending: AbortController | null = null

  constructor(sessionId: string, initial: SignProgress) {
    this.sessionId = sessionId
    this.progress = initial
  }

  state(): SignProgress {
    return this.progress
  }

  async sendFrame(imageDataUrl: string): Promise<SignProgress> {
    if (this.stopped) return this.progress
    if (this.pending) throw { error: 'frame_in_flight' }
    const controller = new AbortController()
    this.pending = controller
    const timeout = window.setTimeout(() => controller.abort(), 8000)
    try {
      const res = await signRequest<SignProgress>('POST', '/api/sign/frame', {
        sessionId: this.sessionId,
        image: stripDataUrlPrefix(imageDataUrl),
        frameId: this.frameId++,
      }, controller.signal)
      if (!this.stopped) this.progress = res
      return this.progress
    } finally {
      window.clearTimeout(timeout)
      if (this.pending === controller) this.pending = null
    }
  }

  stop(): void {
    this.stopped = true
    this.pending?.abort()
    signRequest('POST', '/api/sign/stop', { sessionId: this.sessionId }).catch(() => {})
  }
}

const restSignService = {
  async start(target: string, kind: SignKind): Promise<SignSession> {
    const res = await signRequest<{ sessionId: string; state: SignProgress }>('POST', '/api/sign/start', {
      target,
      kind,
    })
    return new RestSignSession(res.sessionId, res.state)
  },
}

export const signService: typeof restSignService = DEMO_MODE ? demoSignService : restSignService
