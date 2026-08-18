export function Loading({ label = 'Memuat…' }: { label?: string }) {
  return (
    <div className="state">
      <div className="spinner" />
      {label}
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
  return (
    <div className="state">
      <div className="state__icon">⚠️</div>
      <h3>Terjadi kesalahan</h3>
      <p className="muted">{message}</p>
      {onRetry && (
        <button className="btn btn--ghost mt" onClick={onRetry}>
          Coba lagi
        </button>
      )}
    </div>
  )
}

export function Alert({ kind, children }: { kind: 'error' | 'success' | 'info'; children: React.ReactNode }) {
  return <div className={`alert alert--${kind}`}>{children}</div>
}
