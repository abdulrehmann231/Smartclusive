import { Link } from 'react-router-dom'
import { useI18n } from '../store/i18n'
import { Mascot } from '../components/Mascot'

// Public, pre-login landing — Brilliant-style hero with the animated mascot.
export function Landing() {
  const { t } = useI18n()
  return (
    <div className="landing">
      {/* drifting background blobs */}
      <span className="landing__blob" style={{ width: 240, height: 240, left: -60, top: 40, background: 'var(--brand-100)' }} />
      <span className="landing__blob" style={{ width: 180, height: 180, right: 20, top: 220, background: '#fff2b3', animationDelay: '1.2s' }} />
      <span className="landing__blob" style={{ width: 120, height: 120, left: '40%', bottom: -30, background: 'var(--brand-050)', animationDelay: '2.4s' }} />

      <div className="landing__hero">
        <div>
          <span className="pill pill--accent anim-up d1">{t('land.badge')}</span>
          <h1 className="landing__title anim-up d2" style={{ marginTop: 14 }}>
            <span className="hl">{t('land.title1')}</span> {t('land.title2')}
          </h1>
          <p className="landing__lead anim-up d3">{t('land.lead')}</p>

          <div className="row anim-up d4" style={{ gap: 14 }}>
            <Link to="/register" className="btn btn--accent btn--xl">
              {t('land.learner')} <span aria-hidden>→</span>
            </Link>
          </div>
          <p className="anim-up d5" style={{ marginTop: 16 }}>
            <Link to="/login">{t('land.haveAccount')}</Link>
          </p>

          <div className="chips anim-up d6" style={{ marginTop: 26 }}>
            <span className="chip">{t('land.chip1')}</span>
            <span className="chip">{t('land.chip2')}</span>
            <span className="chip">{t('land.chip3')}</span>
            <span className="chip">{t('land.chip4')}</span>
          </div>
        </div>

        <div className="landing__art anim-pop d3">
          <div className="landing__stage">
            <span className="landing__spark" style={{ top: 24, left: 34 }}>✨</span>
            <span className="landing__spark" style={{ bottom: 40, right: 30, animationDelay: '.8s' }}>💛</span>
            <span className="landing__spark" style={{ top: 60, right: 44, animationDelay: '1.4s' }}>⭐</span>
            <Mascot size={220} float wave />
            <span
              className="pill"
              style={{ position: 'absolute', top: 28, right: -6, transform: 'rotate(6deg)', boxShadow: 'var(--shadow-sm)' }}
            >
              👋 {t('land.signHi')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
