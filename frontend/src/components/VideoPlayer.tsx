import { useEffect, useRef, useState } from 'react'
import type { Video } from '../api/types'
import { useI18n } from '../store/i18n'

interface Props {
  video: Video
  onEnded: () => void
}

// Extract a YouTube video id from common URL shapes (youtu.be/ID, watch?v=ID, embed/ID).
function youtubeId(url: string): string | null {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/,
  )
  return m ? m[1] : null
}

// Load the YouTube IFrame Player API once and resolve when it is ready.
let ytApiPromise: Promise<void> | null = null
function loadYouTubeApi(): Promise<void> {
  if (ytApiPromise) return ytApiPromise
  ytApiPromise = new Promise<void>((resolve) => {
    const w = window as unknown as { YT?: unknown; onYouTubeIframeAPIReady?: () => void }
    if (w.YT) {
      resolve()
      return
    }
    const prev = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(s)
    }
  })
  return ytApiPromise
}

// Real video player with Indonesian captions track.
// Completion is reported only when the student watches to the end.
export function VideoPlayer({ video, onEnded }: Props) {
  const { t } = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [captionsOn, setCaptionsOn] = useState(true)
  const [ended, setEnded] = useState(video.completed)

  const ytId = youtubeId(video.url)

  function handleEnded() {
    setEnded(true)
    onEnded()
  }

  if (ytId) {
    return <YouTubeEmbed videoId={ytId} onEnded={handleEnded} ended={ended} doneLabel={t('vid.done')} />
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

interface YouTubeProps {
  videoId: string
  onEnded: () => void
  ended: boolean
  doneLabel: string
}

// Embed a YouTube video and report completion via the IFrame Player API.
function YouTubeEmbed({ videoId, onEnded, ended, doneLabel }: YouTubeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isEnded, setIsEnded] = useState(ended)
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded

  useEffect(() => {
    let player: { destroy?: () => void } | null = null
    let cancelled = false

    loadYouTubeApi().then(() => {
      if (cancelled || !containerRef.current) return
      const YT = (window as unknown as { YT: { Player: new (el: HTMLElement, opts: unknown) => unknown; PlayerState: { ENDED: number } } }).YT
      player = new YT.Player(containerRef.current, {
        videoId,
        width: '100%',
        playerVars: { rel: 0, modestbranding: 1, cc_load_policy: 1, hl: 'id' },
        events: {
          onStateChange: (e: { data: number }) => {
            if (e.data === YT.PlayerState.ENDED) {
              setIsEnded(true)
              onEndedRef.current()
            }
          },
        },
      }) as { destroy?: () => void }
    })

    return () => {
      cancelled = true
      player?.destroy?.()
    }
  }, [videoId])

  return (
    <div>
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 8, overflow: 'hidden', background: '#000' }}>
        <div
          ref={containerRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />
      </div>
      <div className="row row--between mt">
        <span />
        {isEnded && <span className="pill">{doneLabel}</span>}
      </div>
    </div>
  )
}
