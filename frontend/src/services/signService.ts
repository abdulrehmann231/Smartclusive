// Mock SignService — hides all camera/ML behind one interface (frontend.md rule 2).
// Simulates the Socket.IO sign:progress / sign:done flow: each "frame" advances
// the match by one letter after a short delay. Swap for real MediaPipe + backend later.

import type { SignKind } from '../api/types'

export interface SignProgress {
  matched: string[]
  expected: string | null
  complete: boolean
  target: string
}

export interface SignSession {
  // Simulate the learner producing the next expected sign correctly.
  signNext(): Promise<SignProgress>
  // Simulate signing a wrong sign (no advance); returns current progress + wrong flag.
  signWrong(): Promise<SignProgress & { wrong: boolean }>
  state(): SignProgress
}

class MockSignSession implements SignSession {
  private target: string
  private units: string[]
  private idx = 0

  constructor(target: string, _kind: SignKind) {
    this.target = target.toUpperCase()
    // words & multi-digit numbers are verified unit-by-unit; single letter/number = 1 unit
    this.units = this.target.replace(/[^A-Z0-9]/g, '').split('')
  }

  state(): SignProgress {
    return {
      matched: this.units.slice(0, this.idx),
      expected: this.idx < this.units.length ? this.units[this.idx] : null,
      complete: this.idx >= this.units.length,
      target: this.target,
    }
  }

  async signNext(): Promise<SignProgress> {
    await new Promise((r) => setTimeout(r, 650))
    if (this.idx < this.units.length) this.idx++
    return this.state()
  }

  async signWrong(): Promise<SignProgress & { wrong: boolean }> {
    await new Promise((r) => setTimeout(r, 650))
    return { ...this.state(), wrong: true }
  }
}

export const signService = {
  // emit "sign:start"
  start(target: string, kind: SignKind): SignSession {
    return new MockSignSession(target, kind)
  },
}

// DetectService is provided by api.detect() in this mock build; kept here as the
// documented seam so a real MediaPipe/YOLO detector can replace it without UI change.
export { api as detectService } from '../api/client'
