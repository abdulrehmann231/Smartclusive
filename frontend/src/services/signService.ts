import type { SignKind } from '../api/types'
import { request } from '../api/http'

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
