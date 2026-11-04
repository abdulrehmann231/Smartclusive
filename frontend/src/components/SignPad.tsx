import { useEffect, useMemo, useRef, useState } from 'react'
import type { SignKind } from '../api/types'
import { signService, type SignProgress, type SignSession } from '../services/signService'
import { CameraView } from './CameraView'
import { useI18n } from '../store/i18n'
import { DEMO_MODE } from '../config'

interface Props {
  target: string
  kind: SignKind
  onComplete: () => void
  onCancel?: () => void
}

const FRAME_INTERVAL_MS = 100

export function SignPad({ target, kind, onComplete, onCancel }: Props) {
  const { t } = useI18n()
  const units = useMemo(() => target.toUpperCase().replace(/[^A-Z0-9]/g, '').split(''), [target])
  const [progress, setProgress] = useState<SignProgress>({
    matched: [],
    expected: units[0] ?? null,
    complete: units.length === 0,
    target: target.toUpperCase(),
  })
  const [capturing, setCapturing] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [captureSignal, setCaptureSignal] = useState(0)
  const [attempt, setAttempt] = useState(0)

  const sessionRef = useRef<SignSession | null>(null)
  const timerRef = useRef<number | null>(null)
  const capturingRef = useRef(false)
  const busyRef = useRef(false)
  const generationRef = useRef(0)
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete

  function stopCapturing() {
    capturingRef.current = false
    setCapturing(false)
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }

  useEffect(() => {
    let alive = true
    generationRef.current += 1
    busyRef.current = false
    stopCapturing()
    sessionRef.current = null
    setReady(false)
    setError('')
    setProgress({ matched: [], expected: units[0] ?? null, complete: false, target })
    signService.start(target, kind).then((session) => {
      if (!alive) { session.stop(); return }
      sessionRef.current = session
      setProgress(session.state())
      setReady(true)
    }).catch(() => { if (alive) setError(t('sp.errGeneric')) })
    return () => {
      alive = false
      generationRef.current += 1
      capturingRef.current = false
      sessionRef.current?.stop()
      sessionRef.current = null
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
    // A language change must not reset a signing session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, kind, attempt])

  function scheduleCapture() {
    if (!capturingRef.current) return
    timerRef.current = window.setTimeout(() => {
      if (capturingRef.current) setCaptureSignal((n) => n + 1)
    }, FRAME_INTERVAL_MS)
  }

  async function handleCapture(dataUrl: string) {
    const session = sessionRef.current
    if (!session || !capturingRef.current || busyRef.current) return
    const generation = generationRef.current
    busyRef.current = true
    try {
      const next = await session.sendFrame(dataUrl)
      if (generation !== generationRef.current) return
      setProgress(next)
      if (next.complete) {
        stopCapturing()
        timerRef.current = window.setTimeout(() => completeRef.current(), 300)
      } else if (next.feedback === 'model_unavailable') {
        stopCapturing()
        setError(t('sp.modelUnavailable'))
      }
    } catch {
      if (generation === generationRef.current) {
        stopCapturing()
        setError(t('sp.errGeneric'))
      }
    } finally {
      if (generation === generationRef.current) {
        busyRef.current = false
        scheduleCapture()
      }
    }
  }

  function startCapturing() {
    if (capturingRef.current || busyRef.current || !ready || progress.complete) return
    setError('')
    capturingRef.current = true
    setCapturing(true)
    setCaptureSignal((n) => n + 1)
  }

  function captureUnavailable() {
    stopCapturing()
    setError(t('cam.hint'))
  }

  const multiDigit = kind === 'number' && units.length > 1
  const noun = t(kind === 'letter' ? 'sp.letter' : kind === 'number' ? 'sp.number' : 'sp.word')
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1)

  return (
    <div>
      {/* Demo mode grades no real frames, so it keeps the placeholder fallback for visitors without a camera. */}
      <CameraView active signing={!DEMO_MODE} onCapture={handleCapture} onCaptureError={captureUnavailable} captureSignal={captureSignal} />

      <div className="signpad__target">
        {units.map((u, i) => {
          const matched = i < progress.matched.length
          const expected = i === progress.matched.length && !progress.complete
          return (
            <span key={i} className={'signpad__slot' + (matched ? ' matched' : '') + (expected ? ' expected' : '')}>
              {u}
            </span>
          )
        })}
      </div>

      {capturing && progress.feedback && (
        <p role="status" style={{ marginTop: 12 }}>
          {t(`sp.feedback.${progress.feedback}`, {
            x: progress.candidates?.[0]?.label ?? '',
          })}
        </p>
      )}

      {multiDigit && <div className="card__sub">{t('sp.multiDigit')}</div>}

      {error && (
        <div className="alert alert--error" style={{ marginTop: 12 }}>
          <span>{error}</span>
          <button className="btn btn--ghost" onClick={() => setAttempt((n) => n + 1)}>
            {t('common.retry')}
          </button>
        </div>
      )}

      {progress.complete ? (
        <div className="alert alert--success" style={{ marginTop: 12 }}>
          ✅ {t('sp.success', { Kind: Noun })}
        </div>
      ) : (
        <>
          <div className="alert alert--info" style={{ marginTop: 12 }}>
            {capturing
              ? t('sp.signThe', { kind: noun, x: progress.expected ?? '' })
              : t('sp.startPrompt', { kind: noun })}
          </div>
          <div className="row mt">
            {!capturing ? (
              <button className="btn btn--primary" onClick={startCapturing} disabled={!ready}>
                {t('sp.startBtn')}
              </button>
            ) : (
              <button className="btn btn--ghost" onClick={stopCapturing}>
                {t('sp.stopBtn')}
              </button>
            )}
            {onCancel && (
              <button className="btn btn--ghost" onClick={onCancel}>
                {t('common.cancel')}
              </button>
            )}
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            {t('sp.liveNote')}
          </p>
        </>
      )}
    </div>
  )
}
