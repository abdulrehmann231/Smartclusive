import { useState } from 'react'
import type { QuizItem } from '../api/types'
import { api } from '../api/client'
import { SignPad } from './SignPad'
import { Alert } from './StateViews'

interface Props {
  quizId: string
  items: QuizItem[]
  onExit: () => void
}

// Iterates quiz items by kind, each verified via SignPad (fingerspelling-recognition),
// then shows a score summary (sign-quiz spec).
export function QuizRunner({ quizId, items, onExit }: Props) {
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [summary, setSummary] = useState<{ correct: number; incorrect: number; total: number } | null>(null)

  const item = items[idx]
  const kindLabel = (k: string) => (k === 'letter' ? 'Huruf' : k === 'number' ? 'Angka' : 'Kata')

  async function record(correct: boolean) {
    await api.quizAnswer(quizId, item.id, correct)
    const next = [...results, correct]
    setResults(next)
    if (idx + 1 < items.length) {
      setIdx(idx + 1)
    } else {
      const res = await api.quizFinish(next)
      setSummary(res)
    }
  }

  if (summary) {
    const pct = Math.round((summary.correct / summary.total) * 100)
    return (
      <div className="center">
        <div className="state__icon">{pct >= 60 ? '🏆' : '💪'}</div>
        <h2>Skor: {summary.correct}/{summary.total}</h2>
        <p className="muted">
          Benar {summary.correct} · Salah {summary.incorrect} · {pct}%
        </p>
        <button className="btn btn--primary mt" onClick={onExit}>Selesai</button>
      </div>
    )
  }

  return (
    <div>
      <div className="row row--between" style={{ marginBottom: 12 }}>
        <span className="pill">{kindLabel(item.kind)}</span>
        <span className="muted">
          Soal {idx + 1} / {items.length}
        </span>
      </div>

      <div className="center">
        <div className="card__sub">Isyaratkan {kindLabel(item.kind).toLowerCase()} ini:</div>
        <h2 style={{ fontSize: 40, letterSpacing: 2, margin: '4px 0 14px' }}>{item.prompt}</h2>
      </div>

      <SignPad
        key={item.id}
        target={item.prompt}
        kind={item.kind}
        onComplete={() => record(true)}
      />

      <Alert kind="info">
        <div className="row row--between">
          <span>Tidak bisa? Lewati soal ini.</span>
          <button className="btn btn--ghost btn--sm" onClick={() => record(false)}>
            Lewati (salah)
          </button>
        </div>
      </Alert>
    </div>
  )
}
