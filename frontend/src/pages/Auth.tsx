import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { Alert } from '../components/StateViews'

function validEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth()
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
    if (isRegister && name.trim().length < 2) e.name = 'Nama minimal 2 karakter.'
    if (!validEmail(email)) e.email = 'Format email tidak valid.'
    if (!password) e.password = 'Kata sandi wajib diisi.'
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
      if (err?.error === 'email_taken') setFormError('Email sudah terdaftar. Silakan masuk.')
      else if (err?.error === 'invalid_credentials') setFormError('Email atau kata sandi salah.')
      else setFormError('Gagal memproses. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page page--narrow">
      <div className="center" style={{ marginBottom: 18 }}>
        <div className="brand__logo" style={{ margin: '0 auto 10px', width: 56, height: 56, fontSize: 26 }}>
          S
        </div>
        <h1 style={{ marginBottom: 4 }}>{isRegister ? 'Buat Akun' : 'Masuk'}</h1>
        <p className="muted">Belajar Bahasa Isyarat ASL bersama Smartclusive</p>
      </div>

      <form className="card card--pad-lg" onSubmit={onSubmit} noValidate>
        {formError && <Alert kind="error">{formError}</Alert>}

        {isRegister && (
          <div className="field">
            <label htmlFor="name">Nama</label>
            <input
              id="name"
              className={'input' + (errors.name ? ' input--error' : '')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama lengkap"
            />
            {errors.name && <div className="field__error">{errors.name}</div>}
          </div>
        )}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className={'input' + (errors.email ? ' input--error' : '')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@contoh.com"
          />
          {errors.email && <div className="field__error">{errors.email}</div>}
        </div>

        <div className="field">
          <label htmlFor="password">Kata Sandi</label>
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
          {busy ? 'Memproses…' : isRegister ? 'Daftar' : 'Masuk'}
        </button>

        <p className="center mt muted" style={{ fontSize: 14 }}>
          {isRegister ? (
            <>
              Sudah punya akun? <Link to="/login">Masuk</Link>
            </>
          ) : (
            <>
              Belum punya akun? <Link to="/register">Daftar</Link>
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
