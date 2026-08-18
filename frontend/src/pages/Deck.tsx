import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { DeckWord } from '../api/types'
import { useI18n } from '../store/i18n'
import { Loading, ErrorState, EmptyState } from '../components/StateViews'

function Mastery({ level }: { level: number }) {
  return (
    <div className="mastery" title={`Mastery ${level}/5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={'mastery__dot' + (i < level ? ' on' : '')} />
      ))}
    </div>
  )
}

export function Deck() {
  const { t } = useI18n()
  const [words, setWords] = useState<DeckWord[] | null>(null)
  const [error, setError] = useState('')

  function load() {
    setError('')
    setWords(null)
    api.getDeck().then((r) => setWords(r.words)).catch(() => setError(t('dash.errDeck')))
  }
  useEffect(load, [])

  return (
    <div className="page">
      <div className="page-head">
        <div className="eyebrow">{t('deck.eyebrow')}</div>
        <h1>{t('deck.title')}</h1>
        <p>{t('deck.lead')}</p>
      </div>

      {error ? (
        <div className="card"><ErrorState message={error} onRetry={load} /></div>
      ) : !words ? (
        <div className="card"><Loading /></div>
      ) : words.length === 0 ? (
        <div className="card">
          <EmptyState icon="🗂️" title={t('deck.emptyTitle')} hint={t('deck.emptyHint')} />
          <div className="center">
            <Link to="/learn/cards" className="btn btn--primary">{t('common.startLearning')}</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid--auto">
          {words.map((w) => (
            <div className="card" key={w.id}>
              <img className="thumb" src={w.image} alt={w.english} />
              <div className="deck-word__top mt" style={{ marginTop: 12 }}>
                <span className="deck-word__id">{w.indonesian}</span>
                {w.mastery >= 4 && <span className="pill pill--success">{t('deck.mastered')}</span>}
              </div>
              <div className="deck-word__en">{w.english}</div>
              <Mastery level={w.mastery} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
