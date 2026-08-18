import { useEffect, useRef, useState } from 'react'
import type { Video } from '../api/types'
import { api } from '../api/client'

interface Props {
  video: Video
  onEnded: () => void
}

// Mock VideoPlayer: real <video> assets don't exist in the mock, so we simulate
// playback with a progress bar and cycling Indonesian captions (toggleable).
// "Ended" fires only on watch-to-end (learning-videos completion rule).
export function VideoPlayer({ video, onEnded }: Props) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [captionsOn, setCaptionsOn] = useState(true)
  const captions = api.captionsFor(video.type)
  const timer = useRef<number | null>(null)
  const endedRef = useRef(false)

  useEffect(() => {
    if (!playing) return
    timer.current = window.setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + 4)
        if (next >= 100 && !endedRef.current) {
          endedRef.current = true
          setPlaying(false)
          setTimeout(onEnded, 300)
        }
        return next
      })
    }, 220)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [playing, onEnded])

  const cueIdx = Math.min(captions.length - 1, Math.floor((progress / 100) * captions.length))

  return (
    <div>
      <div className="video-thumb">
        <div style={{ fontSize: 20, fontWeight: 800 }}>{video.title}</div>
        {!playing && progress < 100 && (
          <button
            className="video-thumb__play"
            style={{ position: 'absolute' }}
            onClick={() => setPlaying(true)}
            aria-label="Putar"
          >
            ▶
          </button>
        )}
        {progress >= 100 && <div style={{ position: 'absolute', fontSize: 40 }}>✅</div>}
        {captionsOn && playing && captions[cueIdx] && <div className="captions">{captions[cueIdx]}</div>}
      </div>

      <div style={{ height: 8, background: 'var(--line)', borderRadius: 4, marginTop: 10, overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--brand)' }} />
      </div>

      <div className="row row--between mt">
        <label className="row" style={{ gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={captionsOn} onChange={(e) => setCaptionsOn(e.target.checked)} />
          Teks Indonesia
        </label>
        {progress > 0 && progress < 100 && (
          <button className="btn btn--ghost btn--sm" onClick={() => setPlaying((p) => !p)}>
            {playing ? 'Jeda' : 'Lanjut'}
          </button>
        )}
      </div>
    </div>
  )
}
