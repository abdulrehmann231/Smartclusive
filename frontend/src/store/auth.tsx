import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api } from '../api/client'
import type { Student } from '../api/types'
import { DEMO_MODE } from '../config'
import { DEMO_STUDENT } from '../api/demo'

interface AuthState {
  student: Student | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  resetPassword: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthCtx = createContext<AuthState | null>(null)

const TOKEN_KEY = 'sc.token'
const STUDENT_KEY = 'sc.student'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<Student | null>(() => {
    // Demo mode: always signed in as the demo student, no backend session.
    if (DEMO_MODE) return DEMO_STUDENT
    const raw = localStorage.getItem(STUDENT_KEY)
    return raw ? (JSON.parse(raw) as Student) : null
  })
  const [loading, setLoading] = useState(!DEMO_MODE)

  useEffect(() => {
    if (DEMO_MODE) return
    // Validate an existing token on boot; clear stale sessions.
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }
    api
      .me()
      .then(({ student }) => {
        setStudent(student)
        localStorage.setItem(STUDENT_KEY, JSON.stringify(student))
      })
      .catch(() => clearSession())
      .finally(() => setLoading(false))
  }, [])

  function persist(token: string, s: Student) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(STUDENT_KEY, JSON.stringify(s))
    setStudent(s)
  }
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(STUDENT_KEY)
    setStudent(null)
  }

  const value = useMemo<AuthState>(
    () => ({
      student,
      loading,
      async login(email, password) {
        const res = await api.login(email, password)
        persist(res.token, res.student)
      },
      async register(name, email, password) {
        const res = await api.register(name, email, password)
        persist(res.token, res.student)
      },
      async resetPassword(email, password) {
        const res = await api.resetPassword(email, password)
        persist(res.token, res.student)
      },
      async logout() {
        if (DEMO_MODE) return // demo student can't sign out
        await api.logout().catch(() => {})
        clearSession() // clear local cache so another student on this device sees nothing
      },
    }),
    [student, loading],
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { student, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <div className="state">
        <div className="spinner" />
        Memuat…
      </div>
    )
  }
  if (!student) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <>{children}</>
}
