// @vitest-environment jsdom
import React from 'react'
import { act, fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import RecognitionTest from '../src/pages/RecognitionTest'
const request = vi.hoisted(() => vi.fn())
vi.mock('../src/services/signService', () => ({ signRequest: request }))
vi.mock('../src/config', () => ({ DEMO_MODE: false }))
vi.mock('../src/components/CameraView', () => ({ CameraView: ({onCapture}: any) => <button onClick={() => onCapture('data:image/jpeg;base64,YQ==')}>Capture frame</button> }))
beforeEach(() => {
  vi.useFakeTimers()
  request.mockImplementation(async (_method, path) => path.endsWith('/start') ? {sessionId:'test-session'} : path.endsWith('/frame') ? {
    frameId:0, candidates:[{label:'R',score:.7}], landmarks:[], stableLabel:null, feedback:'hold', modelMode:'model', featureSchema:'legacy-v2-77'
  } : {ok:true})
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks() })
it('sends frames without intended label and stops the session on unmount', async () => {
  const view = render(<RecognitionTest />)
  await act(async () => { fireEvent.click(screen.getByText('Start camera')) })
  await act(async () => { fireEvent.click(screen.getByText('Capture frame')) })
  const payload = request.mock.calls.find(c => c[1].endsWith('/frame'))![2]
  expect(payload).toEqual({sessionId:'test-session',frameId:0,image:'YQ=='})
  expect(screen.getByText('R', {selector:'strong'})).toBeTruthy()
  view.unmount()
  expect(request).toHaveBeenCalledWith('POST','/api/sign/test/stop',{sessionId:'test-session'})
})
it('records only after explicit click and freezes the intended label', async () => {
  render(<RecognitionTest />)
  await act(async () => { fireEvent.click(screen.getByText('Start camera')) })
  await act(async () => { fireEvent.click(screen.getByText('Capture frame')) })
  fireEvent.click(screen.getByText('Record 4-second example'))
  expect((screen.getByLabelText('Intended letter') as HTMLSelectElement).disabled).toBe(true)
  await act(async () => { fireEvent.click(screen.getByText('Capture frame')) })
  await act(async () => { vi.advanceTimersByTime(4000) })
  expect(screen.getByText('Download example (1 frames)')).toBeTruthy()
  expect((screen.getByLabelText('Intended letter') as HTMLSelectElement).disabled).toBe(false)
})
