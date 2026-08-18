import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { DeckWord } from '../api/types'
import { useAuth } from '../store/auth'
import { useI18n } from '../store/i18n'
import { Loading, ErrorState } from '../components/StateViews'
import { Mascot } from '../components/Mascot'

interface Node {
  to: string
  icon: string
  titleKey: string
  metaKey: string
  status: 'done' | 'active' | 'locked'
}

export function Dashboard() {
  const { student } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [deck, setDeck] = useState<DeckWord[] | null>(null)
  const [error, setError] = useState('')

  function load() {
    setError('')
    setDeck(null)
    api.getDeck().then((r) => setDeck(r.words)).catch(() => setError(t('dash.errDeck')))
  }
  useEffect(load, [])

  const learned = deck?.length ?? 0
  const mastered = deck?.filter((w) => w.mastery >= 4).length ?? 0
  const xp = learned * 40 + mastered * 60
  const level = Math.max(1, Math.floor(xp / 200) + 1)
  const xpInLevel = xp % 200
  const streakDays = Math.min(5, learned)
  const canQuiz = learned >= 3

  const nodes: Node[] = [
    { to: '/learn/cards', icon: '🌱', titleKey: 'dash.warmup', metaKey: 'dash.warmupMeta', status: 'done' },
    { to: '/learn/cards', icon: '🃏', titleKey: 'feat.cards.title', metaKey: 'dash.nodeCardsMeta', status: 'active' },
    { to: '/learn/capture', icon: '📷', titleKey: 'feat.camera.title', metaKey: 'dash.nodeCaptureMeta', status: learned >= 1 ? 'active' : 'locked' },
    { to: '/videos', icon: '🎬', titleKey: 'feat.videos.title', metaKey: 'dash.nodeVideoMeta', status: learned >= 1 ? 'active' : 'locked' },
    { to: '/quiz', icon: '🎯', titleKey: 'feat.quiz.title', metaKey: 'dash.nodeQuizMeta', status: canQuiz ? 'active' : 'locked' },
  ]

  const week = ['dash.weekMon', 'dash.weekTue', 'dash.weekWed', 'dash.weekThu', 'dash.weekFri']

  return (
    <div className="page">
      {/* Gamified hero */}
      <div className="hero anim-up">
        <div className="row row--between" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="hud" style={{ marginBottom: 12 }}>
              <span className="hud__pill"><span className="ico">⚡</span> {t('dash.level', { n: level })}</span>
              <span className="hud__pill"><span className="ico">🔥</span> {t('dash.streakDays', { n: streakDays })}</span>
              <span className="hud__pill"><span className="ico">💎</span> {mastered}</span>
            </div>
            <h1 style={{ fontSize: 34 }}>{t('dash.hi', { name: student?.name ?? '' })}</h1>
            <p>{t('dash.lead')}</p>
            <div className="row mt" style={{ gap: 12 }}>
              <Link to={canQuiz ? '/quiz' : '/learn/cards'} className="btn btn--accent btn--xl">
                {t('dash.continue')} →
              </Link>
              <Link to="/deck" className="btn btn--ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.6)' }}>
                {t('dash.viewDeck')}
              </Link>
            </div>
          </div>
          <div style={{ flex: 'none' }} className="anim-pop d2">
            <Mascot size={110} float wave />
          </div>
        </div>
      </div>

      {error ? (
        <div className="card mt"><ErrorState message={error} onRetry={load} /></div>
      ) : !deck ? (
        <div className="card mt"><Loading /></div>
      ) : (
        <div className="grid dash-split" style={{ marginTop: 18 }}>
          {/* Left column: XP + streak + stats */}
          <div className="stack">
            <div className="card anim-up d1">
              <div className="row row--between">
                <div className="card__title">{t('dash.level', { n: level })}</div>
                <span className="pill pill--accent">{t('dash.xp', { xp })}</span>
              </div>
              <div className="xpbar mt">
                <div className="xpbar__fill" style={{ width: `${(xpInLevel / 200) * 100}%` }} />
              </div>
              <div className="card__sub" style={{ marginTop: 8 }}>{xpInLevel} / 200 XP</div>
            </div>

            <div className="card anim-up d2">
              <div className="card__title" style={{ marginBottom: 12 }}>🔥 {t('dash.streak')}</div>
              <div className="streak">
                {week.map((wk, i) => (
                  <div className="streak__day" key={wk + i}>
                    <div className={'streak__dot' + (i < streakDays ? ' on' : '')}>{i < streakDays ? '🔥' : ''}</div>
                    <div className="streak__lbl">{t(wk)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid--3 anim-up d3">
              <div className="card stat">
                <div className="stat__num" style={{ fontSize: 40 }}>{learned}</div>
                <div className="stat__desc">{t('dash.statLearned')}</div>
              </div>
              <div className="card stat">
                <div className="stat__num" style={{ fontSize: 40 }}>{mastered}</div>
                <div className="stat__desc">{t('dash.statMastered')}</div>
              </div>
              <div className="card stat">
                <div className="stat__num" style={{ fontSize: 40 }}>{Math.max(0, 3 - learned)}</div>
                <div className="stat__desc">{t('dash.statToQuizDesc')}</div>
              </div>
            </div>
          </div>

          {/* Right column: learning journey path */}
          <div className="card card--pad-lg anim-up d2">
            <div className="card__title" style={{ fontSize: 22, marginBottom: 4 }}>{t('dash.journey')}</div>
            <div className="path">
              <div className="path__line" />
              {nodes.map((n, i) => {
                const locked = n.status === 'locked'
                return (
                  <div
                    key={i}
                    className={'node node--' + n.status}
                    role="button"
                    tabIndex={locked ? -1 : 0}
                    onClick={() => !locked && navigate(n.to)}
                    onKeyDown={(e) => !locked && e.key === 'Enter' && navigate(n.to)}
                    style={{ cursor: locked ? 'not-allowed' : 'pointer' }}
                  >
                    <div className="node__badge">{n.status === 'done' ? '✓' : n.icon}</div>
                    <div className="node__body">
                      <div className="node__title">{t(n.titleKey)}</div>
                      <div className="node__meta">{t(n.metaKey)}</div>
                    </div>
                    <span className="pill" style={{ background: locked ? 'var(--line)' : undefined }}>
                      {n.status === 'done' ? t('dash.done') : locked ? t('dash.locked') : t('common.start')}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
