import { useEffect, useRef, useState } from 'react'
import { CameraView } from '../components/CameraView'
import { signRequest } from '../services/signService'
import { DEMO_MODE } from '../config'
import './RecognitionTest.css'

type Result = {
  frameId: number; landmarks: number[][]; handedness: string | null
  candidates: { label: string; score: number }[]; stableLabel: string | null
  feedback: string; modelMode: string; featureSchema: string
  timingsMs?: { landmarks: number; classification: number }
}
type Sample = { capturedAt: string; image: string; result: Result; roundTripMs: number }
type Recording = { intendedLabel: string; signerId: string; startedAt: string; samples: Sample[] }
const edges = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]]

export default function RecognitionTest() {
  const [label, setLabel] = useState('D')
  const [signer, setSigner] = useState('signer-01')
  const [running, setRunning] = useState(false)
  const [signal, setSignal] = useState(0)
  const [sample, setSample] = useState<Sample | null>(null)
  const [message, setMessage] = useState('Choose a letter, then start the camera.')
  const [recording, setRecording] = useState(false)
  const [saved, setSaved] = useState<Recording | null>(null)
  const generation = useRef(0)
  const session = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const recordTimer = useRef<ReturnType<typeof setTimeout>>()
  const controller = useRef<AbortController | null>(null)
  const frameId = useRef(0)
  const capture = useRef<Recording | null>(null)

  function finishRecording() {
    clearTimeout(recordTimer.current)
    if (capture.current) setSaved(capture.current)
    capture.current = null
    setRecording(false)
  }
  function cleanup() {
    generation.current++
    clearTimeout(timer.current)
    clearTimeout(recordTimer.current)
    controller.current?.abort()
    pending.current = false
    const sid = session.current
    session.current = null
    if (sid) void signRequest('POST', '/api/sign/test/stop', { sessionId: sid }).catch(() => {})
  }
  useEffect(() => () => { cleanup() }, [])
  function stop() {
    finishRecording()
    cleanup()
    setRunning(false)
    setMessage('Stopped. Any recorded examples are ready to download.')
  }
  function schedule(run: number) {
    if (run === generation.current) timer.current = setTimeout(() => setSignal(n => n + 1), 150)
  }
  async function start() {
    cleanup()
    const run = generation.current
    setSample(null)
    setMessage('Connecting to the real recognition backend…')
    setRunning(true)
    const abort = new AbortController()
    controller.current = abort
    const timeout = setTimeout(() => abort.abort(), 8000)
    try {
      const res = await signRequest<{ sessionId: string }>('POST', '/api/sign/test/start', {}, abort.signal)
      if (run !== generation.current) {
        void signRequest('POST', '/api/sign/test/stop', res).catch(() => {})
        return
      }
      session.current = res.sessionId
      frameId.current = 0
      setMessage('Hold one sign steady. Raw guesses can change while your hand moves.')
      schedule(run)
    } catch (err) {
      if (run !== generation.current) return
      setRunning(false)
      setMessage(`Could not start: ${(err as {error?: string}).error || 'connection timed out'}. Check your backend and login.`)
    } finally { clearTimeout(timeout) }
  }
  async function onFrame(image: string) {
    const sid = session.current
    if (!sid || pending.current) return
    const run = generation.current
    const abort = new AbortController()
    controller.current = abort
    pending.current = true
    const timeout = setTimeout(() => abort.abort(), 8000)
    const started = performance.now()
    const capturedAt = new Date().toISOString()
    const recordingAtCapture = capture.current
    try {
      const result = await signRequest<Result>('POST', '/api/sign/test/frame', {
        sessionId: sid, frameId: frameId.current++, image: image.split(',')[1],
      }, abort.signal)
      if (run !== generation.current) return
      if (!Array.isArray(result.candidates)) throw new Error('Invalid diagnostic response')
      const next = { image, result, capturedAt, roundTripMs: Math.round(performance.now() - started) }
      setSample(next)
      if (recordingAtCapture && capture.current === recordingAtCapture && recordingAtCapture.samples.length < 20) {
        recordingAtCapture.samples.push(next)
        if (recordingAtCapture.samples.length >= 20) finishRecording()
      }
      if (result.feedback === 'model_unavailable') {
        stop()
        setMessage('The real model is unavailable. Check the backend model files; demo guesses are disabled here.')
        return
      }
      schedule(run)
    } catch (err) {
      if (run !== generation.current) return
      stop()
      setMessage(`Recognition stopped: ${(err as {error?: string}).error || 'connection or response error'}. Start again to retry.`)
    } finally {
      clearTimeout(timeout)
      if (run === generation.current) pending.current = false
    }
  }
  const pending = useRef(false)
  function record() {
    const next = { intendedLabel: label, signerId: signer.trim() || 'anonymous', startedAt: new Date().toISOString(), samples: [] }
    capture.current = next
    setSaved(null)
    setRecording(true)
    recordTimer.current = setTimeout(finishRecording, 4000)
  }
  function download() {
    if (!saved?.samples.length) return
    const blob = new Blob([JSON.stringify({ schemaVersion: 1, labelStatus: 'user-intended-unreviewed',
      imageMirrored: false, ...saved }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `smartclusive-${saved.intendedLabel}-${saved.startedAt.replace(/[:.]/g, '-')}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const result = sample?.result
  return <main className="recognition-test">
    <header><p className="test-eyebrow">RECOGNITION LAB</p><h1>Test one sign at a time</h1>
      <p>Check D, S and K without starting a quiz. This page does not change your scores or train the model.</p></header>
    {DEMO_MODE ? <section className="test-panel"><h2>Real backend required</h2><p>This build uses demo mode. Set VITE_DEMO_MODE=false, configure VITE_API_URL, rebuild, and sign in to test the real model.</p></section> : <>
    <section className="test-panel test-controls">
      <label>Intended letter<select value={label} disabled={recording} onChange={e => setLabel(e.target.value)}>
        {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => <option key={l}>{l}</option>)}<option value="UNKNOWN">No valid sign / no hand</option>
      </select></label>
      <label>Signer nickname<input value={signer} disabled={recording} maxLength={40} onChange={e => setSigner(e.target.value)} /></label>
      <button className="btn btn--accent" onClick={running ? stop : start}>{running ? 'Stop camera' : 'Start camera'}</button>
      <p role="status">{message}</p>
    </section>
    <div className="test-grid">
      <section className="test-panel"><h2>Live camera</h2>{running ? <CameraView signing captureSignal={signal} onCapture={onFrame} onCaptureError={() => schedule(generation.current)} /> : <p>Camera is off.</p>}
        <p>Camera frames are sent to your backend while running. The analyzed image below is unmirrored.</p>
        <button className="btn btn--accent" disabled={!running || !sample || recording} onClick={record}>{recording ? 'Recording…' : 'Record 4-second example'}</button>{' '}
        <button className="btn" disabled={!saved?.samples.length || recording} onClick={download}>Download example{saved ? ` (${saved.samples.length} frames)` : ''}</button>
        <p>Recording keeps up to 20 frames in this tab. Download includes camera images, which may show your face and room. Nothing is added to a training dataset automatically. Download before recording another example.</p>
      </section>
      <section className="test-panel"><h2>Model output</h2>
        <p className="test-result">{result?.stableLabel || '—'} <small>{result?.stableLabel ? 'stable prediction' : result?.feedback.replace(/_/g, ' ') || 'waiting'}</small></p>
        <p>A stable prediction can still be wrong. Your selected letter is only a recording label.</p>
        <ol>{result?.candidates.map(c => <li key={c.label}><strong>{c.label}</strong> <meter min="0" max="1" value={c.score} /> {(c.score * 100).toFixed(1)}%</li>)}</ol>
        <p>Scores are model estimates, not measured accuracy.</p>
        {sample && <p>Request: {sample.roundTripMs} ms · Landmarks: {result?.timingsMs?.landmarks ?? '—'} ms · Classifier: {result?.timingsMs?.classification ?? '—'} ms</p>}
        <p>Tracker handedness: {result?.handedness || 'none'} (tracker label, not a verified hand identity)</p>
      </section>
    </div>
    {sample && <section className="test-panel"><h2>Analyzed frame and hand landmarks</h2><p>These points belong to this exact frame. Check whether the fingertips and thumb are tracked correctly.</p>
      <div className="test-frame"><img src={sample.image} alt="Exact frame analyzed by the model" />
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-label="Detected hand skeleton">{edges.map(([a,b]) => result?.landmarks[a] && result.landmarks[b] && <line key={`${a}-${b}`} x1={result.landmarks[a][0]} y1={result.landmarks[a][1]} x2={result.landmarks[b][0]} y2={result.landmarks[b][1]} />)}{result?.landmarks.map((p,i) => <circle key={i} cx={p[0]} cy={p[1]} r="0.008" />)}</svg>
      </div></section>}
    </>}
    <section className="test-panel"><h2>Issues to reproduce</h2><ul><li>Intended D → R, V or uncertain.</li><li>F-like pose accepted as D; sideways pose suggested H. Labels need review.</li><li>Intended S → M or A.</li><li>K → briefly U, then K. Compare the raw guesses with the stable prediction.</li></ul>
      <p>Start with D, S and K: record five separate steady attempts per letter, including mistakes. Also record correct predictions and “no valid sign” examples. J and Z need motion; this frame classifier cannot validate their full movement.</p></section>
  </main>
}
