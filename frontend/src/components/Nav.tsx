import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useI18n } from '../store/i18n'
import { LangSwitcher } from './LangSwitcher'
import { Mascot } from './Mascot'

const LINKS = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/learn/cards', key: 'nav.cards' },
  { to: '/learn/capture', key: 'nav.camera' },
  { to: '/quiz', key: 'nav.quiz' },
  { to: '/videos', key: 'nav.videos' },
  { to: '/deck', key: 'nav.deck' },
]

export function Nav() {
  const { student, logout } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="nav">
      <div className="nav__inner">
        <NavLink to="/" className="brand">
          <span className="brand__logo brand__logo--mascot">
            <Mascot size={40} wave={false} />
          </span>
          <span>
            <div className="brand__name">Smart Clusive</div>
            <div className="brand__tag">{t('nav.tag')}</div>
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
                {t(l.key)}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="nav__right">
          {student ? (
            <>
              <span className="pill pill--accent nav__user" title={student.name}>
                👤 {student.name}
              </span>
              <button
                className="btn btn--ghost btn--sm"
                style={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)' }}
                onClick={onLogout}
              >
                {t('nav.signout')}
              </button>
            </>
          ) : (
            <NavLink to="/login" className="nav__link">
              {t('nav.signin')}
            </NavLink>
          )}
          {/* Translation feature: Indonesian / English toggle, top-right of the nav */}
          <LangSwitcher />
        </div>
      </div>
    </header>
  )
}
