import { useEffect, useMemo, useRef, useState } from 'react'
import type { SignKind } from '../api/types'
import { signService, type SignProgress, type SignSession } from '../services/signService'
import { CameraView } from './CameraView'

interface Props {
  target: string
  kind: SignKind
  onComplete: () => void
  onCancel?: () => void
}

// Shows expected target + matched-so-far + retry (frontend.md shared component).
// Delegates recognition to signService; drives it with mock "Sign / Wrong" buttons
// standing in for real MediaPipe frames.
export function SignPad({ target, kind, onComplete, onCancel }: Props) {
  const units = useMemo(() => target.toUpperCase().replace(/[^A-Z0-9]/g, '').split(''), [target])
  const [progress, setProgress] = useState<SignProgress>({
    matched: [],
    expected: units[0] ?? null,
    complete: units.length === 0,
    target: target.toUpperCase(),
  })
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<'idle' | 'wrong'>('idle')
  const sessionRef = useRef<SignSession | null>(null)
  const doneRef = useRef(false)

  useEffect(() => {
    sessionRef.current = signService.start(target, kind)
    setProgress(sessionRef.current.state())
    doneRef.current = false
  }, [target, kind])

  async function signCorrect() {
    if (busy || !sessionRef.current) return
    setBusy(true)
    setFeedback('idle')
    const p = await sessionRef.current.signNext()
    setProgress(p)
    setBusy(false)
    if (p.complete && !doneRef.current) {
      doneRef.current = true
      setTimeout(onComplete, 500)
    }
  }

  async function signWrong() {
    if (busy || !sessionRef.current) return
    setBusy(true)
    const p = await sessionRef.current.signWrong()
    setProgress(p)
    setBusy(false)
    setFeedback('wrong')
  }

  const multiDigit = kind === 'number' && units.length > 1
  const noun = kind === 'letter' ? 'huruf' : kind === 'number' ? 'angka' : 'kata'

  return (
    <div>
      <CameraView active />

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

      {multiDigit && <div className="card__sub">Angka ditandatangani digit demi digit.</div>}

      {progress.complete ? (
        <div className="alert alert--success" style={{ marginTop: 12 }}>
          ✅ {noun.charAt(0).toUpperCase() + noun.slice(1)} berhasil ditandatangani!
        </div>
      ) : (
        <>
          {feedback === 'wrong' && (
            <div className="alert alert--error" style={{ marginTop: 12 }}>
              Belum cocok. Isyaratkan <strong>{progress.expected}</strong> lalu coba lagi.
            </div>
          )}
          {feedback !== 'wrong' && (
            <div className="alert alert--info" style={{ marginTop: 12 }}>
              Isyaratkan {noun}: <strong>{progress.expected}</strong>
            </div>
          )}
          <div className="row mt">
            <button className="btn btn--primary" onClick={signCorrect} disabled={busy}>
              {busy ? 'Memeriksa…' : `Isyaratkan “${progress.expected}”`}
            </button>
            <button className="btn btn--ghost" onClick={signWrong} disabled={busy}>
              Simulasikan salah
            </button>
            {onCancel && (
              <button className="btn btn--ghost" onClick={onCancel} disabled={busy}>
                Batal
              </button>
            )}
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Tombol di atas menggantikan pengenalan kamera nyata (mock SignService).
          </p>
        </>
      )}
    </div>
  )
}
