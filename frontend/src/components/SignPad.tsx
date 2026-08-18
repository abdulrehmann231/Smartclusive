import { useEffect, useMemo, useRef, useState } from 'react'
import type { SignKind } from '../api/types'
import { signService, type SignProgress, type SignSession } from '../services/signService'
import { CameraView } from './CameraView'
import { useI18n } from '../store/i18n'

interface Props {
  target: string
  kind: SignKind
  onComplete: () => void
  onCancel?: () => void
}

const FRAME_INTERVAL_MS = 400

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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [captureSignal, setCaptureSignal] = useState(0)

  const sessionRef = useRef<SignSession | null>(null)
  const intervalRef = useRef<number | null>(null)
  const doneRef = useRef(false)

  useEffect(() => {
    let alive = true
    signService.start(target, kind).then((session) => {
      if (!alive) {
        session.stop()
        return
      }
      sessionRef.current = session
      setProgress(session.state())
      doneRef.current = false
    })
    return () => {
      alive = false
      sessionRef.current?.stop()
      if (intervalRef.current) window.clearInterval(intervalRef.current)
    }
  }, [target, kind])

  async function handleCapture(dataUrl: string) {
    const session = sessionRef.current
    if (!session || !capturing || busy || doneRef.current) return
    setBusy(true)
    try {
      const p = await session.sendFrame(dataUrl)
      setProgress(p)
      if (p.complete && !doneRef.current) {
        doneRef.current = true
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setCapturing(false)
        setTimeout(onComplete, 500)
      }
    } catch (err: any) {
      setError(err?.error || t('sp.errGeneric'))
    } finally {
      setBusy(false)
    }
  }

  function startCapturing() {
    if (capturing) return
    setError('')
    setCapturing(true)
    setCaptureSignal((n) => n + 1)
    intervalRef.current = window.setInterval(() => {
      setCaptureSignal((n) => n + 1)
    }, FRAME_INTERVAL_MS)
  }

  function stopCapturing() {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setCapturing(false)
  }

  const multiDigit = kind === 'number' && units.length > 1
  const noun = t(kind === 'letter' ? 'sp.letter' : kind === 'number' ? 'sp.number' : 'sp.word')
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1)

  return (
    <div>
      <CameraView active onCapture={handleCapture} captureSignal={captureSignal} />

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

      {multiDigit && <div className="card__sub">{t('sp.multiDigit')}</div>}

      {error && (
        <div className="alert alert--error" style={{ marginTop: 12 }}>
          {error}
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
              <button className="btn btn--primary" onClick={startCapturing}>
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
