import { useRef, useState } from 'react'
import type { Video } from '../api/types'
import { useI18n } from '../store/i18n'

interface Props {
  video: Video
  onEnded: () => void
}

// Real video player with Indonesian captions track.
// Completion is reported only when the student watches to the end.
export function VideoPlayer({ video, onEnded }: Props) {
  const { t } = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [captionsOn, setCaptionsOn] = useState(true)
  const [ended, setEnded] = useState(video.completed)

  function handleEnded() {
    setEnded(true)
    onEnded()
  }

  return (
    <div>
      <video
        ref={videoRef}
        src={video.url}
        controls
        playsInline
        style={{ width: '100%', borderRadius: 8, background: '#000' }}
        onEnded={handleEnded}
      >
        {captionsOn && video.captionsUrl && (
          <track
            kind="subtitles"
            src={video.captionsUrl}
            srcLang="id"
            label="Indonesia"
            default
          />
        )}
      </video>

      <div className="row row--between mt">
        <label className="row" style={{ gap: 6, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={captionsOn}
            onChange={(e) => setCaptionsOn(e.target.checked)}
          />
          {t('vid.captions')}
        </label>
        {ended && <span className="pill">{t('vid.done')}</span>}
      </div>
    </div>
  )
}
