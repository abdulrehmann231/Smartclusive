import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { QuizItem, QuizMode } from '../api/types'
import { useI18n } from '../store/i18n'
import { Alert } from '../components/StateViews'
import { QuizRunner } from '../components/QuizRunner'

const MODES: { mode: QuizMode; icon: string; titleKey: string; descKey: string }[] = [
  { mode: 'sign_word', icon: '🔤', titleKey: 'quiz.mode.word.title', descKey: 'quiz.mode.word.desc' },
  { mode: 'sign_letter', icon: '🅰️', titleKey: 'quiz.mode.letter.title', descKey: 'quiz.mode.letter.desc' },
  { mode: 'sign_number', icon: '🔢', titleKey: 'quiz.mode.number.title', descKey: 'quiz.mode.number.desc' },
]

export function Quiz() {
  const { t } = useI18n()
  const [quiz, setQuiz] = useState<{ quizId: string; items: QuizItem[] } | null>(null)
  const [tooSmall, setTooSmall] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [busyMode, setBusyMode] = useState<QuizMode | null>(null)

  async function start(mode: QuizMode) {
    setError('')
    setTooSmall(null)
    setBusyMode(mode)
    try {
      const res = await api.quizStart(mode)
      setQuiz(res)
    } catch (err: any) {
      if (err?.error === 'deck_too_small') setTooSmall(err.needed ?? 1)
      else setError(t('quiz.errStart'))
    } finally {
      setBusyMode(null)
    }
  }

  if (quiz) {
    return (
      <div className="page page--narrow">
        <div className="page-head">
          <div className="eyebrow">{t('quiz.eyebrow')}</div>
          <h1>{t('quiz.running')}</h1>
        </div>
        <div className="card card--pad-lg">
          <QuizRunner quizId={quiz.quizId} items={quiz.items} onExit={() => setQuiz(null)} />
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="eyebrow">{t('quiz.eyebrow')}</div>
        <h1>{t('quiz.choose')}</h1>
        <p>{t('quiz.lead')}</p>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {tooSmall !== null && (
        <Alert kind="info">
          {t('quiz.tooSmall', { n: tooSmall })} <Link to="/learn/cards">{t('quiz.learnNow')}</Link>
        </Alert>
      )}

      <div className="grid grid--3">
        {MODES.map((m) => (
          <div className="card" key={m.mode}>
            <div style={{ fontSize: 34 }}>{m.icon}</div>
            <div className="card__title mt" style={{ marginTop: 10 }}>{t(m.titleKey)}</div>
            <div className="card__sub">{t(m.descKey)}</div>
            <button className="btn btn--primary btn--block mt" onClick={() => start(m.mode)} disabled={busyMode === m.mode}>
              {busyMode === m.mode ? t('quiz.starting') : t('common.start')}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
