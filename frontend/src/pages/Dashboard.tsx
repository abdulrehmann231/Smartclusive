import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { DeckWord } from '../api/types'
import { useAuth } from '../store/auth'
import { useI18n } from '../store/i18n'
import { Loading, ErrorState } from '../components/StateViews'

const FEATURES = [
  { to: '/learn/cards', icon: '🃏', titleKey: 'feat.cards.title', descKey: 'feat.cards.desc' },
  { to: '/learn/capture', icon: '📷', titleKey: 'feat.camera.title', descKey: 'feat.camera.desc' },
  { to: '/quiz', icon: '🎯', titleKey: 'feat.quiz.title', descKey: 'feat.quiz.desc' },
  { to: '/videos', icon: '🎬', titleKey: 'feat.videos.title', descKey: 'feat.videos.desc' },
]

export function Dashboard() {
  const { student } = useAuth()
  const { t } = useI18n()
  const [deck, setDeck] = useState<DeckWord[] | null>(null)
  const [error, setError] = useState('')

  function load() {
    setError('')
    setDeck(null)
    api.getDeck().then((r) => setDeck(r.words)).catch(() => setError(t('dash.errDeck')))
  }
  useEffect(load, [])

  const mastered = deck?.filter((w) => w.mastery >= 4).length ?? 0

  return (
    <div className="page">
      <div className="hero">
        <div className="eyebrow" style={{ color: 'var(--accent)' }}>{t('dash.welcome')}</div>
        <h1>{t('dash.hi', { name: student?.name ?? '' })}</h1>
        <p>{t('dash.lead')}</p>
        <div className="row mt">
          <Link to="/learn/cards" className="btn btn--accent">{t('common.startLearning')}</Link>
          <Link to="/deck" className="btn btn--ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.6)' }}>
            {t('dash.viewDeck')}
          </Link>
        </div>
      </div>

      {error ? (
        <div className="card mt"><ErrorState message={error} onRetry={load} /></div>
      ) : !deck ? (
        <div className="card mt"><Loading /></div>
      ) : (
        <>
          <div className="grid grid--3 mt">
            <div className="card stat">
              <div className="stat__label">{t('dash.statLearned')}</div>
              <div className="stat__num">{deck.length}</div>
              <div className="stat__desc">{t('dash.statLearnedDesc')}</div>
            </div>
            <div className="card stat">
              <div className="stat__label">{t('dash.statMastered')}</div>
              <div className="stat__num">{mastered}</div>
              <div className="stat__desc">{t('dash.statMasteredDesc')}</div>
            </div>
            <div className="card stat">
              <div className="stat__label">{t('dash.statToQuiz')}</div>
              <div className="stat__num">{Math.max(0, 3 - deck.length)}</div>
              <div className="stat__desc">{t('dash.statToQuizDesc')}</div>
            </div>
          </div>

          <h2 className="mt" style={{ marginTop: 30 }}>{t('dash.features')}</h2>
          <div className="grid grid--auto">
            {FEATURES.map((f) => (
              <Link key={f.to} to={f.to} className="card" style={{ display: 'block' }}>
                <div style={{ fontSize: 34 }}>{f.icon}</div>
                <div className="card__title mt" style={{ marginTop: 10 }}>{t(f.titleKey)}</div>
                <div className="card__sub">{t(f.descKey)}</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
