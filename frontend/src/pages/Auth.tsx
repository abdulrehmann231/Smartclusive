import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useI18n } from '../store/i18n'
import { Alert } from '../components/StateViews'
import { Mascot } from '../components/Mascot'

function validEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const isRegister = mode === 'register'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  function validate() {
    const e: typeof errors = {}
    if (isRegister && name.trim().length < 2) e.name = t('auth.errName')
    if (!validEmail(email)) e.email = t('auth.errEmail')
    if (!password) e.password = t('auth.errPassword')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setFormError('')
    if (!validate()) return
    setBusy(true)
    try {
      if (isRegister) await register(name.trim(), email, password)
      else await login(email, password)
      navigate('/', { replace: true })
    } catch (err: any) {
      if (err?.error === 'email_taken') setFormError(t('auth.errTaken'))
      else if (err?.error === 'invalid_credentials') setFormError(t('auth.errInvalid'))
      else setFormError(t('auth.errGeneric'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page page--narrow">
      <div className="center anim-up" style={{ marginBottom: 18 }}>
        <div style={{ marginBottom: 6 }}>
          <Mascot size={92} float wave />
        </div>
        <h1 style={{ marginBottom: 4 }}>{isRegister ? t('auth.register') : t('auth.signin')}</h1>
        <p className="muted">{t('auth.subtitle')}</p>
      </div>

      <form className="card card--pad-lg" onSubmit={onSubmit} noValidate>
        {formError && <Alert kind="error">{formError}</Alert>}

        {isRegister && (
          <div className="field">
            <label htmlFor="name">{t('auth.name')}</label>
            <input
              id="name"
              className={'input' + (errors.name ? ' input--error' : '')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('auth.namePlaceholder')}
            />
            {errors.name && <div className="field__error">{errors.name}</div>}
          </div>
        )}

        <div className="field">
          <label htmlFor="email">{t('auth.email')}</label>
          <input
            id="email"
            type="email"
            className={'input' + (errors.email ? ' input--error' : '')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
          />
          {errors.email && <div className="field__error">{errors.email}</div>}
        </div>

        <div className="field">
          <label htmlFor="password">{t('auth.password')}</label>
          <input
            id="password"
            type="password"
            className={'input' + (errors.password ? ' input--error' : '')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          {errors.password && <div className="field__error">{errors.password}</div>}
        </div>

        <button className="btn btn--primary btn--block mt" disabled={busy}>
          {busy ? t('auth.processing') : isRegister ? t('auth.register.btn') : t('auth.signin')}
        </button>

        <p className="center mt muted" style={{ fontSize: 14 }}>
          {isRegister ? (
            <>
              {t('auth.haveAccount')} <Link to="/login">{t('auth.signin')}</Link>
            </>
          ) : (
            <>
              {t('auth.noAccount')} <Link to="/register">{t('auth.register.btn')}</Link>
            </>
          )}
        </p>
      </form>
    </div>
  )
}

export function Login() {
  return <AuthForm mode="login" />
}
export function Register() {
  return <AuthForm mode="register" />
}
