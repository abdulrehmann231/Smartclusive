import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { QuizItem, Video } from '../api/types'
import { useI18n } from '../store/i18n'
import { Loading, ErrorState, Alert } from '../components/StateViews'
import { VideoPlayer } from '../components/VideoPlayer'
import { QuizRunner } from '../components/QuizRunner'

export function Videos() {
  const { t } = useI18n()
  const [videos, setVideos] = useState<Video[] | null>(null)
  const [error, setError] = useState('')
  const [quiz, setQuiz] = useState<{ quizId: string; items: QuizItem[]; forTitle: string } | null>(null)
  const [readyQuizFor, setReadyQuizFor] = useState<Record<string, { quizId: string; items: QuizItem[] }>>({})

  function load() {
    setError('')
    setVideos(null)
    api.getVideos().then((r) => setVideos(r.videos)).catch(() => setError(t('vid.errLoad')))
  }
  useEffect(load, [])

  async function onEnded(v: Video) {
    const res = await api.completeVideo(v.id)
    setReadyQuizFor((m) => ({ ...m, [v.id]: res.quiz }))
    setVideos((vs) => vs?.map((x) => (x.id === v.id ? { ...x, completed: true } : x)) ?? vs)
  }

  if (quiz) {
    return (
      <div className="page page--narrow">
        <div className="page-head">
          <div className="eyebrow">{t('vid.quizEyebrow')}</div>
          <h1>{quiz.forTitle}</h1>
        </div>
        <div className="card card--pad-lg">
          <QuizRunner
            quizId={quiz.quizId}
            items={quiz.items}
            onExit={() => {
              setQuiz(null)
              load()
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="eyebrow">{t('vid.eyebrow')}</div>
        <h1>{t('vid.title')}</h1>
        <p>{t('vid.lead')}</p>
      </div>

      {error ? (
        <div className="card"><ErrorState message={error} onRetry={load} /></div>
      ) : !videos ? (
        <div className="card"><Loading /></div>
      ) : (
        <div className="grid grid--2">
          {videos.map((v) => {
            const readyQuiz = readyQuizFor[v.id]
            return (
              <div className="card" key={v.id}>
                <div className="row row--between" style={{ marginBottom: 10 }}>
                  <div className="card__title">{v.title}</div>
                  <span className="pill">{v.type === 'letters' ? t('vid.letters') : v.type === 'numbers' ? t('vid.numbers') : t('vid.words')}</span>
                </div>
                <VideoPlayer video={v} onEnded={() => onEnded(v)} />
                {v.completed && <Alert kind="success">{t('vid.done')}</Alert>}
                {readyQuiz && (
                  <button
                    className="btn btn--accent btn--block"
                    onClick={() =>
                      setQuiz({
                        quizId: readyQuiz.quizId,
                        items: readyQuiz.items,
                        forTitle:
                          v.type === 'letters'
                            ? t('vid.quizLetters')
                            : v.type === 'numbers'
                              ? t('vid.quizNumbers')
                              : t('vid.quizWords'),
                      })
                    }
                  >
                    {t('vid.startQuiz')}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
