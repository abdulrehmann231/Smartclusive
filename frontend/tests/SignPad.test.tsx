// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SignPad } from '../src/components/SignPad'
import { signService, type SignProgress } from '../src/services/signService'

vi.mock('../src/store/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('../src/services/signService', () => ({ signService: { start: vi.fn() } }))
vi.mock('../src/components/CameraView', async () => {
  const { useEffect } = await import('react')
  return { CameraView: ({ captureSignal, onCapture }: { captureSignal: number; onCapture: (s: string) => void }) => {
    useEffect(() => { if (captureSignal) onCapture('data:image/jpeg;base64,AA==') }, [captureSignal])
    return null
  } }
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}
const initial: SignProgress = { target: 'A', expected: 'A', matched: [], complete: false }
function session(sendFrame = vi.fn().mockResolvedValue(initial)) {
  return { state: () => initial, stop: vi.fn(), sendFrame }
}
async function flush() { await act(async () => { await Promise.resolve() }) }

beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks() })
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('SignPad request lifecycle', () => {
  it('waits for readiness and never queues frames behind an in-flight request', async () => {
    const start = deferred<ReturnType<typeof session>>()
    const frame = deferred<SignProgress>()
    const current = session(vi.fn().mockReturnValue(frame.promise))
    vi.mocked(signService.start).mockReturnValue(start.promise)
    render(<SignPad target="A" kind="letter" onComplete={vi.fn()} />)
    expect((screen.getByText('sp.startBtn') as HTMLButtonElement).disabled).toBe(true)
    await act(async () => start.resolve(current))
    fireEvent.click(screen.getByText('sp.startBtn'))
    await flush()
    await act(async () => { vi.advanceTimersByTime(1000) })
    expect(current.sendFrame).toHaveBeenCalledTimes(1)
    await act(async () => frame.resolve({ ...initial, feedback: 'uncertain' }))
    expect(screen.getByRole('status').textContent).toBe('sp.feedback.uncertain')
    await act(async () => { vi.advanceTimersByTime(100) })
    expect(current.sendFrame).toHaveBeenCalledTimes(2)
  })

  it('ignores the previous target response and stops its session', async () => {
    const frame = deferred<SignProgress>()
    const old = session(vi.fn().mockReturnValue(frame.promise))
    const next = session()
    vi.mocked(signService.start).mockResolvedValueOnce(old).mockResolvedValueOnce(next)
    const done = vi.fn()
    const view = render(<SignPad target="A" kind="letter" onComplete={done} />)
    await flush()
    fireEvent.click(screen.getByText('sp.startBtn'))
    view.rerender(<SignPad target="B" kind="letter" onComplete={done} />)
    await flush()
    await act(async () => frame.resolve({ ...initial, complete: true, matched: ['A'] }))
    await act(async () => { vi.advanceTimersByTime(1000) })
    expect(old.stop).toHaveBeenCalledTimes(1)
    expect(done).not.toHaveBeenCalled()
    expect(screen.queryByText('sp.success')).toBeNull()
  })

  it('shows startup failures instead of leaving an unhandled rejection', async () => {
    vi.mocked(signService.start).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(session())
    render(<SignPad target="A" kind="letter" onComplete={vi.fn()} />)
    await flush()
    expect(screen.getByText('sp.errGeneric')).toBeTruthy()
    fireEvent.click(screen.getByText('common.retry'))
    await flush()
    expect(vi.mocked(signService.start)).toHaveBeenCalledTimes(2)
    expect((screen.getByText('sp.startBtn') as HTMLButtonElement).disabled).toBe(false)
  })

  it('cancels the completion callback on unmount', async () => {
    const current = session(vi.fn().mockResolvedValue({ ...initial, complete: true }))
    vi.mocked(signService.start).mockResolvedValue(current)
    const done = vi.fn()
    const view = render(<SignPad target="A" kind="letter" onComplete={done} />)
    await flush()
    fireEvent.click(screen.getByText('sp.startBtn'))
    await flush()
    view.unmount()
    await act(async () => { vi.advanceTimersByTime(1000) })
    expect(done).not.toHaveBeenCalled()
    expect(current.stop).toHaveBeenCalledTimes(1)
  })
})
