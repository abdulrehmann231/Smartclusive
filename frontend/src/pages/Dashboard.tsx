import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { DeckWord } from '../api/types'
import { useAuth } from '../store/auth'
import { Loading, ErrorState } from '../components/StateViews'

const FEATURES = [
  { to: '/learn/cards', icon: '🃏', title: 'Kartu Kata', desc: 'Tebak arti kata lalu isyaratkan.' },
  { to: '/learn/capture', icon: '📷', title: 'Kamera', desc: 'Foto objek dan pelajari isyaratnya.' },
  { to: '/quiz', icon: '🎯', title: 'Kuis', desc: 'Uji kata, huruf, dan angka.' },
  { to: '/videos', icon: '🎬', title: 'Video', desc: 'Pelajaran alfabet & angka ASL.' },
]

export function Dashboard() {
  const { student } = useAuth()
  const [deck, setDeck] = useState<DeckWord[] | null>(null)
  const [error, setError] = useState('')

  function load() {
    setError('')
    setDeck(null)
    api.getDeck().then((r) => setDeck(r.words)).catch(() => setError('Gagal memuat koleksi.'))
  }
  useEffect(load, [])

  const mastered = deck?.filter((w) => w.mastery >= 4).length ?? 0

  return (
    <div className="page">
      <div className="hero">
        <div className="eyebrow" style={{ color: 'var(--accent)' }}>Selamat datang</div>
        <h1>Halo, {student?.name} 👋</h1>
        <p>Bangun kosakata yang bisa kamu kenali dan isyaratkan sendiri dalam Bahasa Isyarat Amerika (ASL).</p>
        <div className="row mt">
          <Link to="/learn/cards" className="btn btn--accent">Mulai Belajar</Link>
          <Link to="/deck" className="btn btn--ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.6)' }}>
            Lihat Koleksi
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
              <div className="stat__label">Kata Dipelajari</div>
              <div className="stat__num">{deck.length}</div>
              <div className="stat__desc">di koleksimu</div>
            </div>
            <div className="card stat">
              <div className="stat__label">Dikuasai</div>
              <div className="stat__num">{mastered}</div>
              <div className="stat__desc">mastery 4+</div>
            </div>
            <div className="card stat">
              <div className="stat__label">Menuju Kuis</div>
              <div className="stat__num">{Math.max(0, 3 - deck.length)}</div>
              <div className="stat__desc">kata lagi diperlukan</div>
            </div>
          </div>

          <h2 className="mt" style={{ marginTop: 30 }}>Fitur</h2>
          <div className="grid grid--auto">
            {FEATURES.map((f) => (
              <Link key={f.to} to={f.to} className="card" style={{ display: 'block' }}>
                <div style={{ fontSize: 34 }}>{f.icon}</div>
                <div className="card__title mt" style={{ marginTop: 10 }}>{f.title}</div>
                <div className="card__sub">{f.desc}</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
