// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { CameraView } from '../src/components/CameraView'

vi.mock('../src/store/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('stops a camera stream that resolves after unmount', async () => {
  let resolve!: (value: MediaStream) => void
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
    getUserMedia: vi.fn(() => new Promise<MediaStream>((r) => { resolve = r })),
  } })
  const stop = vi.fn()
  const view = render(<CameraView />)
  view.unmount()
  await act(async () => resolve({ getTracks: () => [{ stop }] } as unknown as MediaStream))
  expect(stop).toHaveBeenCalledTimes(1)
})

it('does not send placeholder images when signing without camera access', async () => {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
    getUserMedia: vi.fn().mockRejectedValue({ name: 'NotAllowedError' }),
  } })
  const onCapture = vi.fn(), onCaptureError = vi.fn()
  const view = render(<CameraView signing onCapture={onCapture} onCaptureError={onCaptureError} />)
  await act(async () => { await Promise.resolve() })
  view.rerender(<CameraView signing captureSignal={1} onCapture={onCapture} onCaptureError={onCaptureError} />)
  expect(onCapture).not.toHaveBeenCalled()
  expect(onCaptureError).toHaveBeenCalledTimes(1)
})

it('resizes signing frames and reuses the JPEG capture canvas', async () => {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
    getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
  } })
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const drawImage = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as never)
  const encode = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,AA==')
  const captured = vi.fn()
  const view = render(<CameraView signing onCapture={captured} />)
  await act(async () => { await Promise.resolve() })
  const video = view.container.querySelector('video')!
  Object.defineProperties(video, { videoWidth: { value: 1280 }, videoHeight: { value: 720 }, readyState: { value: 4 } })
  view.rerender(<CameraView signing onCapture={captured} captureSignal={1} />)
  view.rerender(<CameraView signing onCapture={captured} captureSignal={2} />)
  expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 640, 360)
  expect(encode).toHaveBeenCalledWith('image/jpeg', .85)
  expect(encode.mock.instances[0]).toBe(encode.mock.instances[1])
})
