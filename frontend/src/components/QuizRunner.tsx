import { useState } from 'react'
import type { QuizItem } from '../api/types'
import { api } from '../api/client'
import { SignPad } from './SignPad'
import { Alert } from './StateViews'
import { Confetti } from './Confetti'
import { useI18n } from '../store/i18n'

interface Props {
  quizId: string
  items: QuizItem[]
  onExit: () => void
}

// Iterates quiz items by kind, each verified via SignPad (fingerspelling-recognition),
// then shows a score summary (sign-quiz spec).
export function QuizRunner({ quizId, items, onExit }: Props) {
  const { t } = useI18n()
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [summary, setSummary] = useState<{ correct: number; incorrect: number; total: number } | null>(null)

  const item = items[idx]
  const kindLabel = (k: string) => t(k === 'letter' ? 'qr.letter' : k === 'number' ? 'qr.number' : 'qr.word')

  async function record(correct: boolean) {
    await api.quizAnswer(quizId, item.id, correct)
    const next = [...results, correct]
    setResults(next)
    if (idx + 1 < items.length) {
      setIdx(idx + 1)
    } else {
      const res = await api.quizFinish(quizId, next)
      setSummary(res)
    }
  }

  if (summary) {
    const pct = Math.round((summary.correct / summary.total) * 100)
    return (
      <div className="center anim-pop" style={{ position: 'relative' }}>
        {pct >= 60 && <Confetti />}
        <div className="state__icon">{pct >= 60 ? '🏆' : '💪'}</div>
        <h2>{t('qr.score', { a: summary.correct, b: summary.total })}</h2>
        <p className="muted">{t('qr.summary', { c: summary.correct, i: summary.incorrect, p: pct })}</p>
        <button className="btn btn--primary mt" onClick={onExit}>
          {t('common.finish')}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="row row--between" style={{ marginBottom: 12 }}>
        <span className="pill">{kindLabel(item.kind)}</span>
        <span className="muted">{t('qr.question', { a: idx + 1, b: items.length })}</span>
      </div>

      <div className="center">
        <div className="card__sub">{t('qr.signThis', { kind: kindLabel(item.kind).toLowerCase() })}</div>
        <h2 style={{ fontSize: 40, letterSpacing: 2, margin: '4px 0 14px' }}>{item.prompt}</h2>
      </div>

      <SignPad key={item.id} target={item.prompt} kind={item.kind} onComplete={() => record(true)} />

      <Alert kind="info">
        <div className="row row--between">
          <span>{t('qr.cantDo')}</span>
          <button className="btn btn--ghost btn--sm" onClick={() => record(false)}>
            {t('qr.skip')}
          </button>
        </div>
      </Alert>
    </div>
  )
}
