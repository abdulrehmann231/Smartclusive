import { useState } from 'react'
import { api } from '../api/client'
import type { DetectResult } from '../api/types'
import { useI18n } from '../store/i18n'
import { Alert } from '../components/StateViews'
import { CameraView } from '../components/CameraView'
import { FingerspellReference } from '../components/FingerspellReference'
import { SignPad } from '../components/SignPad'

type Step = 'camera' | 'detecting' | 'notfound' | 'detected' | 'sign' | 'done'

export function Capture() {
  const { t } = useI18n()
  const [step, setStep] = useState<Step>('camera')
  const [captureSignal, setCaptureSignal] = useState(0)
  const [photo, setPhoto] = useState<string | null>(null)
  const [result, setResult] = useState<DetectResult | null>(null)
  const [deckMsg, setDeckMsg] = useState('')

  function reset() {
    setStep('camera')
    setPhoto(null)
    setResult(null)
    setDeckMsg('')
  }

  function takePhoto() {
    setCaptureSignal((n) => n + 1)
  }

  async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl)
    return res.blob()
  }

  async function onCaptured(dataUrl: string) {
    setPhoto(dataUrl)
    setStep('detecting')
    try {
      const blob = await dataUrlToBlob(dataUrl)
      const res = await api.detect(blob)
      setResult(res)
      setStep(res.detected ? 'detected' : 'notfound')
    } catch {
      setStep('notfound')
    }
  }

  async function onSigned() {
    if (!result?.detected) return
    const res = await api.addToDeck({
      indonesian: result.indonesian!,
      english: result.english!,
      image: photo ?? '',
    })
    const displayWord = `${result.indonesian!} (${result.english!})`
    setDeckMsg(res.duplicate ? t('cards.duplicate') : t('cards.addedDeck', { word: displayWord }))
    setStep('done')
  }

  return (
    <div className="page page--narrow">
      <div className="page-head">
        <div className="eyebrow">{t('cap.eyebrow')}</div>
        <h1>{t('cap.title')}</h1>
      </div>

      <div className="card card--pad-lg">
        {(step === 'camera' || step === 'detecting') && (
          <>
            <CameraView active onCapture={onCaptured} captureSignal={captureSignal} />
            <div className="center mt">
              {step === 'detecting' ? (
                <Alert kind="info">{t('cap.detecting')}</Alert>
              ) : (
                <button className="btn btn--accent" onClick={takePhoto}>{t('cap.take')}</button>
              )}
            </div>
          </>
        )}

        {step === 'notfound' && (
          <div className="center">
            {photo && <img className="thumb" src={photo} alt="foto" style={{ aspectRatio: '4/3' }} />}
            <Alert kind="error">{t('cap.notFound')}</Alert>
            <p className="muted" style={{ maxWidth: 320, margin: '12px auto 20px' }}>
              {t('cap.notClassifiedHint')}
            </p>
            <button className="btn btn--primary" onClick={reset}>{t('cap.retake')}</button>
          </div>
        )}

        {step === 'detected' && result?.detected && (
          <>
            <div className="camera" style={{ marginBottom: 12 }}>
              {photo && <img src={photo} alt="objek" />}
              {result.box && (
                <div
                  className="camera__box"
                  style={{
                    left: `${result.box.x * 100}%`,
                    top: `${result.box.y * 100}%`,
                    width: `${result.box.w * 100}%`,
                    height: `${result.box.h * 100}%`,
                  }}
                >
                  <span className="camera__box-label">{result.english}</span>
                </div>
              )}
            </div>

            <div className="row row--between">
              <div>
                <div className="deck-word__id" style={{ textTransform: 'capitalize' }}>{result.indonesian}</div>
                <div className="deck-word__en">{result.english}</div>
              </div>
              <span className="pill">{result.source === 'dictionary' ? t('cap.dict') : t('cap.translated')}</span>
            </div>

            {result.alreadyInDeck && <Alert kind="info">{t('cards.duplicate')}</Alert>}

            <div className="row mt">
              <button className="btn btn--primary" onClick={() => setStep('sign')}>{t('cap.continueSign')}</button>
              <button className="btn btn--ghost" onClick={reset}>{t('cap.retake')}</button>
            </div>
          </>
        )}

        {step === 'sign' && result?.fingerspelling && (
          <div className="stack">
            <FingerspellReference fs={result.fingerspelling} />
            <SignPad target={result.fingerspelling.word} kind="word" onComplete={onSigned} onCancel={reset} />
          </div>
        )}

        {step === 'done' && (
          <div className="center">
            <div className="state__icon">🎉</div>
            <Alert kind="success">{deckMsg}</Alert>
            <button className="btn btn--primary mt" onClick={reset}>{t('cap.another')}</button>
          </div>
        )}
      </div>
    </div>
  )
}
