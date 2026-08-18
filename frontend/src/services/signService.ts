import type { SignKind } from '../api/types'

export interface SignProgress {
  matched: string[]
  expected: string | null
  complete: boolean
  target: string
}

export interface SignSession {
  state(): SignProgress
  sendFrame(imageDataUrl: string): Promise<SignProgress>
  stop(): void
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function token() {
  return localStorage.getItem('sc.token') || ''
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${API_BASE}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token()}`,
    'Content-Type': 'application/json',
  }
  const res = await fetch(url, {
    method,
    headers,
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

  constructor(sessionId: string, initial: SignProgress) {
    this.sessionId = sessionId
    this.progress = initial
  }

  state(): SignProgress {
    return this.progress
  }

  async sendFrame(imageDataUrl: string): Promise<SignProgress> {
    if (this.stopped) return this.progress
    const image = stripDataUrlPrefix(imageDataUrl)
    const res = await request<SignProgress>('POST', '/api/sign/frame', {
      sessionId: this.sessionId,
      image,
    })
    this.progress = res
    return res
  }

  stop(): void {
    this.stopped = true
    request('POST', '/api/sign/stop', { sessionId: this.sessionId }).catch(() => {})
  }
}

export const signService = {
  async start(target: string, kind: SignKind): Promise<SignSession> {
    const res = await request<{ sessionId: string; state: SignProgress }>('POST', '/api/sign/start', {
      target,
      kind,
    })
    return new RestSignSession(res.sessionId, res.state)
  },
}
