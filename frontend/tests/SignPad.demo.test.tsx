// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SignPad } from '../src/components/SignPad'

vi.mock('../src/config', () => ({ DEMO_MODE: true }))
vi.mock('../src/store/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('still completes the demo signing flow when the camera is denied', async () => {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
    getUserMedia: vi.fn().mockRejectedValue({ name: 'NotAllowedError' }),
  } })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AA==')
  const done = vi.fn()
  render(<SignPad target="A" kind="letter" onComplete={done} />)
  await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
  fireEvent.click(screen.getByText('sp.startBtn'))
  await act(async () => { await new Promise((r) => setTimeout(r, 900)) })
  expect(screen.queryByText('cam.hint', { selector: 'span' })).toBeNull()
  expect(done).toHaveBeenCalledTimes(1)
})
