import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { QuizItem, QuizMode } from '../api/types'
import { Alert } from '../components/StateViews'
import { QuizRunner } from '../components/QuizRunner'

const MODES: { mode: QuizMode; icon: string; title: string; desc: string }[] = [
  { mode: 'sign_word', icon: '🔤', title: 'Isyaratkan Kata', desc: 'Eja seluruh kata dari koleksimu.' },
  { mode: 'sign_letter', icon: '🅰️', title: 'Isyaratkan Huruf', desc: 'Satu huruf per soal.' },
  { mode: 'sign_number', icon: '🔢', title: 'Isyaratkan Angka', desc: 'Angka 0–9.' },
]

export function Quiz() {
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
      else setError('Gagal memulai kuis.')
    } finally {
      setBusyMode(null)
    }
  }

  if (quiz) {
    return (
      <div className="page page--narrow">
        <div className="page-head">
          <div className="eyebrow">Fitur 3 · Kuis</div>
          <h1>Kuis Berlangsung</h1>
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
        <div className="eyebrow">Fitur 3 · Kuis</div>
        <h1>Pilih Mode Kuis</h1>
        <p>Kuis diambil dari kata yang sudah kamu kuasai.</p>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {tooSmall !== null && (
        <Alert kind="info">
          Koleksimu belum cukup. Pelajari <strong>{tooSmall}</strong> kata lagi.{' '}
          <Link to="/learn/cards">Belajar sekarang →</Link>
        </Alert>
      )}

      <div className="grid grid--3">
        {MODES.map((m) => (
          <div className="card" key={m.mode}>
            <div style={{ fontSize: 34 }}>{m.icon}</div>
            <div className="card__title mt" style={{ marginTop: 10 }}>{m.title}</div>
            <div className="card__sub">{m.desc}</div>
            <button className="btn btn--primary btn--block mt" onClick={() => start(m.mode)} disabled={busyMode === m.mode}>
              {busyMode === m.mode ? 'Memulai…' : 'Mulai'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
