import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireAuth, useAuth } from './store/auth'
import { I18nProvider, useI18n } from './store/i18n'
import { ThemeProvider } from './store/theme'
import { Nav } from './components/Nav'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Landing } from './pages/Landing'
import { ForgotPassword, Login, Register } from './pages/Auth'
import { Dashboard } from './pages/Dashboard'

const Cards = lazy(() => import('./pages/Cards').then((m) => ({ default: m.Cards })))
const Capture = lazy(() => import('./pages/Capture').then((m) => ({ default: m.Capture })))
const Quiz = lazy(() => import('./pages/Quiz').then((m) => ({ default: m.Quiz })))
const Videos = lazy(() => import('./pages/Videos').then((m) => ({ default: m.Videos })))
const Deck = lazy(() => import('./pages/Deck').then((m) => ({ default: m.Deck })))
const Translate = lazy(() => import('./pages/Translate').then((m) => ({ default: m.Translate })))

function PageLoader() {
  return <div className="state"><div className="spinner" /></div>
}

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="app">
      <Nav />
      <main>{children}</main>
      <footer className="footer">
        <div className="footer__inner">
          <span>{t('footer.copy')}</span>
          <span>{t('footer.tag')}</span>
        </div>
      </footer>
    </div>
  )
}

const guard = (el: React.ReactNode) => <RequireAuth>{el}</RequireAuth>

// Home: Brilliant-style landing when logged out, the gamified dashboard when in.
function Home() {
  const { student, loading } = useAuth()
  if (loading) return <div className="state"><div className="spinner" />…</div>
  return student ? <Dashboard /> : <Landing />
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <I18nProvider>
      <AuthProvider>
        <ErrorBoundary>
        <Shell>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/" element={<Home />} />
            <Route path="/learn/cards" element={guard(<Cards />)} />
            <Route path="/learn/capture" element={guard(<Capture />)} />
            <Route path="/quiz" element={guard(<Quiz />)} />
            <Route path="/videos" element={guard(<Videos />)} />
            <Route path="/deck" element={guard(<Deck />)} />
            <Route path="/translate" element={guard(<Translate />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </Shell>
        </ErrorBoundary>
      </AuthProvider>
      </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
