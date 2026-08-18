import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'

const LINKS = [
  { to: '/', label: 'Beranda', end: true },
  { to: '/learn/cards', label: 'Kartu Kata' },
  { to: '/learn/capture', label: 'Kamera' },
  { to: '/quiz', label: 'Kuis' },
  { to: '/videos', label: 'Video' },
  { to: '/deck', label: 'Koleksi' },
]

export function Nav() {
  const { student, logout } = useAuth()
  const navigate = useNavigate()

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="nav">
      <div className="nav__inner">
        <NavLink to="/" className="brand">
          <span className="brand__logo">S</span>
          <span>
            <div className="brand__name">SMARTCLUSIVE</div>
            <div className="brand__tag">Belajar Bahasa Isyarat ASL</div>
          </span>
        </NavLink>

        {student && (
          <nav className="nav__links">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => 'nav__link' + (isActive ? ' active' : '')}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}

        {student ? (
          <div className="row">
            <span className="pill pill--accent">👤 {student.name}</span>
            <button className="btn btn--ghost btn--sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)' }} onClick={onLogout}>
              Keluar
            </button>
          </div>
        ) : (
          <NavLink to="/login" className="nav__link">
            Masuk
          </NavLink>
        )}
      </div>
    </header>
  )
}
