import { useI18n } from '../store/i18n'

export function Loading({ label }: { label?: string }) {
  const { t } = useI18n()
  return (
    <div className="state">
      <div className="spinner" />
      {label ?? t('common.loading')}
    </div>
  )
}

export function EmptyState({ icon = '📭', title, hint }: { icon?: string; title: string; hint?: string }) {
  return (
    <div className="state">
      <div className="state__icon">{icon}</div>
      <h3>{title}</h3>
      {hint && <p className="muted">{hint}</p>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div className="state">
      <div className="state__icon">⚠️</div>
      <h3>{t('common.error')}</h3>
      <p className="muted">{message}</p>
      {onRetry && (
        <button className="btn btn--ghost mt" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  )
}

export function Alert({ kind, children }: { kind: 'error' | 'success' | 'info'; children: React.ReactNode }) {
  return <div className={`alert alert--${kind}`}>{children}</div>
}
