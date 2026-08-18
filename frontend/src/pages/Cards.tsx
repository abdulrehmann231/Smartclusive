import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Card, Fingerspelling } from '../api/types'
import { useI18n } from '../store/i18n'
import { Loading, ErrorState, Alert } from '../components/StateViews'
import { FingerspellReference } from '../components/FingerspellReference'
import { SignPad } from '../components/SignPad'
import { Confetti } from '../components/Confetti'

type Step = 'guess' | 'fingerspell' | 'done'

export function Cards() {
  const { t } = useI18n()
  const [card, setCard] = useState<Card | null>(null)
  const [error, setError] = useState('')
  const [revealed, setRevealed] = useState<Record<string, string>>({}) // optionId -> image
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set())
  const [correctId, setCorrectId] = useState<string | null>(null)
  const [fs, setFs] = useState<Fingerspelling | null>(null)
  const [step, setStep] = useState<Step>('guess')
  const [deckMsg, setDeckMsg] = useState('')

  const loadCard = useCallback(() => {
    setError('')
    setCard(null)
    setRevealed({})
    setWrongIds(new Set())
    setCorrectId(null)
    setFs(null)
    setStep('guess')
    setDeckMsg('')
    api.nextCard().then(setCard).catch(() => setError(t('cards.errLoad')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(loadCard, [loadCard])

  async function onGuess(optionId: string) {
    if (!card || revealed[optionId] || step !== 'guess') return
    const res = await api.guess(card.indonesian, optionId)
    setRevealed((r) => ({ ...r, [optionId]: res.revealedImage }))
    if (res.correct) {
      setCorrectId(optionId)
      setFs(res.fingerspelling ?? null)
      // Let the green "correct" card show/flip before advancing to fingerspelling.
      setTimeout(() => setStep('fingerspell'), 900)
    } else {
      setWrongIds((s) => new Set(s).add(optionId))
    }
  }

  async function onSigned() {
    if (!card || !correctId) return
    const opt = card.options.find((o) => o.id === correctId)!
    const displayWord = `${card.indonesian} (${opt.english})`
    const res = await api.addToDeck({ indonesian: card.indonesian, english: opt.english, image: opt.image })
    setDeckMsg(res.duplicate ? t('cards.duplicate') : t('cards.addedDeck', { word: displayWord }))
    setStep('done')
  }

  function practiceAgain() {
    setStep('fingerspell')
  }

  return (
    <div className="page page--narrow">
      <div className="page-head">
        <div className="eyebrow">{t('cards.eyebrow')}</div>
        <h1>{t('cards.title')}</h1>
      </div>

      {error ? (
        <div className="card"><ErrorState message={error} onRetry={loadCard} /></div>
      ) : !card ? (
        <div className="card"><Loading /></div>
      ) : (
        <div className="card card--pad-lg">
          <div className="center">
            <div className="card__sub">{t('cards.prompt')}</div>
            <span className="pill">{t('cards.indonesianLabel')}</span>
            <h2 style={{ fontSize: 34, textTransform: 'capitalize', margin: '6px 0 18px' }}>{card.indonesian}</h2>
          </div>

          {step === 'guess' && (
            <>
              {wrongIds.size > 0 && <Alert kind="info">{t('cards.tryAgain')}</Alert>}
              <div className="card__sub" style={{ marginBottom: 10 }}>{t('cards.englishOptions')}</div>
              <div className="options">
                {card.options.map((o) => {
                  const img = revealed[o.id]
                  const isWrong = wrongIds.has(o.id)
                  const isCorrect = correctId === o.id
                  return (
                    <button
                      key={o.id}
                      className={
                        'tile' +
                        (img ? ' tile--revealed' : '') +
                        (isCorrect ? ' tile--correct' : '') +
                        (isWrong ? ' tile--wrong' : '')
                      }
                      onClick={() => onGuess(o.id)}
                      disabled={!!img}
                    >
                      {img ? (
                        <span className="tile__pic">
                          <span className="tile__mark">{isCorrect ? '✅' : '❌'}</span>
                          <img src={img} alt={o.english} />
                          <span className="tile__caption">{o.english}</span>
                        </span>
                      ) : (
                        o.english
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {step === 'fingerspell' && fs && (
            <>
              <Alert kind="success">{t('cards.correct')}</Alert>
              <div className="stack">
                <FingerspellReference fs={fs} />
                <SignPad target={fs.word} kind="word" onComplete={onSigned} />
              </div>
            </>
          )}

          {step === 'done' && (
            <div className="center anim-pop" style={{ position: 'relative' }}>
              <Confetti />
              <div className="state__icon">🎉</div>
              <Alert kind="success">{deckMsg}</Alert>
              <div className="row mt">
                <button className="btn btn--accent" onClick={practiceAgain}>
                  {t('cards.practiceAgain')}
                </button>
                <button className="btn btn--primary" onClick={loadCard}>
                  {t('cards.learnMore')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
