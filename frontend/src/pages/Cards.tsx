import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Card, Fingerspelling } from '../api/types'
import { Loading, ErrorState, Alert } from '../components/StateViews'
import { FingerspellReference } from '../components/FingerspellReference'
import { SignPad } from '../components/SignPad'

type Step = 'guess' | 'fingerspell' | 'done'

export function Cards() {
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
    api.nextCard().then(setCard).catch(() => setError('Gagal memuat kartu.'))
  }, [])

  useEffect(loadCard, [loadCard])

  async function onGuess(optionId: string) {
    if (!card || revealed[optionId] || step !== 'guess') return
    const res = await api.guess(card.indonesian, optionId)
    setRevealed((r) => ({ ...r, [optionId]: res.revealedImage }))
    if (res.correct) {
      setCorrectId(optionId)
      setFs(res.fingerspelling ?? null)
      setStep('fingerspell')
    } else {
      setWrongIds((s) => new Set(s).add(optionId))
    }
  }

  async function onSigned() {
    if (!card || !correctId) return
    const opt = card.options.find((o) => o.id === correctId)!
    const res = await api.addToDeck({ indonesian: card.indonesian, english: opt.english, image: opt.image })
    setDeckMsg(res.duplicate ? 'Kata ini sudah ada di koleksimu.' : `“${opt.english}” ditambahkan ke koleksi!`)
    setStep('done')
  }

  return (
    <div className="page page--narrow">
      <div className="page-head">
        <div className="eyebrow">Fitur 1 · Kartu Kata</div>
        <h1>Tebak &amp; Isyaratkan</h1>
      </div>

      {error ? (
        <div className="card"><ErrorState message={error} onRetry={loadCard} /></div>
      ) : !card ? (
        <div className="card"><Loading /></div>
      ) : (
        <div className="card card--pad-lg">
          <div className="center">
            <div className="card__sub">Apa arti kata Indonesia ini?</div>
            <h2 style={{ fontSize: 34, textTransform: 'capitalize', margin: '6px 0 18px' }}>{card.indonesian}</h2>
          </div>

          {step === 'guess' && (
            <>
              {wrongIds.size > 0 && <Alert kind="info">Coba lagi — pilih opsi lain.</Alert>}
              <div className="options">
                {card.options.map((o) => {
                  const img = revealed[o.id]
                  const isWrong = wrongIds.has(o.id)
                  const isCorrect = correctId === o.id
                  return (
                    <button
                      key={o.id}
                      className={'tile' + (isCorrect ? ' tile--correct' : '') + (isWrong ? ' tile--wrong' : '')}
                      onClick={() => onGuess(o.id)}
                      disabled={!!img}
                    >
                      {img ? (
                        <span className="tile__pic">
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
              <Alert kind="success">Benar! Sekarang isyaratkan katanya.</Alert>
              <div className="stack">
                <FingerspellReference fs={fs} />
                <SignPad target={fs.word} kind="word" onComplete={onSigned} />
              </div>
            </>
          )}

          {step === 'done' && (
            <div className="center">
              <div className="state__icon">🎉</div>
              <Alert kind="success">{deckMsg}</Alert>
              <button className="btn btn--primary mt" onClick={loadCard}>Kartu Berikutnya</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
