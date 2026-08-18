import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { DeckWord } from '../api/types'
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
  const [words, setWords] = useState<DeckWord[] | null>(null)
  const [error, setError] = useState('')

  function load() {
    setError('')
    setWords(null)
    api.getDeck().then((r) => setWords(r.words)).catch(() => setError('Gagal memuat koleksi.'))
  }
  useEffect(load, [])

  return (
    <div className="page">
      <div className="page-head">
        <div className="eyebrow">Koleksi</div>
        <h1>Kata yang Kamu Kuasai</h1>
        <p>Sumber utama untuk kuis. Kuasai kata dengan menjawab kuis dengan benar.</p>
      </div>

      {error ? (
        <div className="card"><ErrorState message={error} onRetry={load} /></div>
      ) : !words ? (
        <div className="card"><Loading /></div>
      ) : words.length === 0 ? (
        <div className="card">
          <EmptyState icon="🗂️" title="Koleksi masih kosong" hint="Pelajari kata pertamamu lewat Kartu Kata atau Kamera." />
          <div className="center">
            <Link to="/learn/cards" className="btn btn--primary">Mulai Belajar</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid--auto">
          {words.map((w) => (
            <div className="card" key={w.id}>
              <img className="thumb" src={w.image} alt={w.english} />
              <div className="deck-word__top mt" style={{ marginTop: 12 }}>
                <span className="deck-word__id">{w.indonesian}</span>
                {w.mastery >= 4 && <span className="pill pill--success">Dikuasai</span>}
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
