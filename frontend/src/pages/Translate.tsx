import { useI18n } from '../store/i18n'

// Feature 4 — review-only / not implemented (see sign-language-translation spec).
export function Translate() {
  const { t } = useI18n()
  return (
    <div className="page page--narrow">
      <div className="page-head">
        <div className="eyebrow">{t('tr.eyebrow')}</div>
        <h1>{t('tr.title')}</h1>
      </div>
      <div className="card card--pad-lg center">
        <div className="state__icon">🔬</div>
        <h3>{t('tr.review')}</h3>
        <p className="muted">{t('tr.reviewDesc')}</p>
      </div>
    </div>
  )
}
