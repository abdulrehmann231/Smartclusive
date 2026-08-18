import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../store/i18n'

type Perm = 'idle' | 'requesting' | 'granted' | 'denied'

interface Box {
  x: number
  y: number
  w: number
  h: number
}

interface Props {
  active?: boolean
  box?: Box | null
  boxLabel?: string
  // Called with a data-URL snapshot when captureSignal changes (Feature 2).
  onCapture?: (dataUrl: string) => void
  captureSignal?: number
  overlay?: React.ReactNode
}

// Live camera with explicit permission gating + camera-denied state
// (fingerspelling-recognition spec: no capture until consent).
export function CameraView({ active = true, box, boxLabel, onCapture, captureSignal, overlay }: Props) {
  const { t } = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [perm, setPerm] = useState<Perm>('idle')

  async function requestCamera() {
    setPerm('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setPerm('granted')
    } catch {
      setPerm('denied')
    }
  }

  useEffect(() => {
    if (active) requestCamera()
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Snapshot when Feature 2 asks for a capture.
  useEffect(() => {
    if (!captureSignal || !onCapture) return
    const v = videoRef.current
    const canvas = document.createElement('canvas')
    const w = v?.videoWidth || 640
    const h = v?.videoHeight || 480
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (v && ctx && perm === 'granted') {
      ctx.drawImage(v, 0, 0, w, h)
      onCapture(canvas.toDataURL('image/png'))
    } else {
      // Fallback placeholder snapshot so the mock flow still works without a real camera.
      if (ctx) {
        ctx.fillStyle = '#0d1b22'
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = '#29abe2'
        ctx.font = 'bold 40px Segoe UI, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('📷 ' + t('cam.sampleObject'), w / 2, h / 2)
      }
      onCapture(canvas.toDataURL('image/png'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureSignal])

  return (
    <div className="camera">
      {perm === 'granted' && <video ref={videoRef} playsInline muted />}

      {(perm === 'idle' || perm === 'requesting') && (
        <div className="camera__denied">
          <div style={{ fontSize: 40 }}>📷</div>
          <p>{t('cam.needs')}</p>
          <button className="btn btn--accent" onClick={requestCamera} disabled={perm === 'requesting'}>
            {perm === 'requesting' ? t('cam.requesting') : t('cam.allow')}
          </button>
        </div>
      )}

      {perm === 'denied' && (
        <div className="camera__denied">
          <div style={{ fontSize: 40 }}>🚫</div>
          <p>{t('cam.denied')}</p>
          <button className="btn btn--ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)' }} onClick={requestCamera}>
            {t('common.retry')}
          </button>
        </div>
      )}

      {box && perm !== 'denied' && (
        <div
          className="camera__box"
          style={{
            left: `${box.x * 100}%`,
            top: `${box.y * 100}%`,
            width: `${box.w * 100}%`,
            height: `${box.h * 100}%`,
          }}
        >
          {boxLabel && <span className="camera__box-label">{boxLabel}</span>}
        </div>
      )}

      {overlay}
    </div>
  )
}
