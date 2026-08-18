import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireAuth, useAuth } from './store/auth'
import { I18nProvider, useI18n } from './store/i18n'
import { FontMode } from './components/FontMode'
import { Nav } from './components/Nav'
import { Landing } from './pages/Landing'
import { Login, Register } from './pages/Auth'
import { Dashboard } from './pages/Dashboard'
import { Cards } from './pages/Cards'
import { Capture } from './pages/Capture'
import { Quiz } from './pages/Quiz'
import { Videos } from './pages/Videos'
import { Deck } from './pages/Deck'
import { Translate } from './pages/Translate'

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="app">
      <Nav />
      {children}
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
      <I18nProvider>
      <AuthProvider>
        <FontMode />
        <Shell>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Home />} />
            <Route path="/learn/cards" element={guard(<Cards />)} />
            <Route path="/learn/capture" element={guard(<Capture />)} />
            <Route path="/quiz" element={guard(<Quiz />)} />
            <Route path="/videos" element={guard(<Videos />)} />
            <Route path="/deck" element={guard(<Deck />)} />
            <Route path="/translate" element={guard(<Translate />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Shell>
      </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  )
}
