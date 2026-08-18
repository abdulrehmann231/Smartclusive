import type { Fingerspelling } from '../api/types'
import { useI18n } from '../store/i18n'

// Ordered per-letter ASL reference (frontend.md shared component).
export function FingerspellReference({ fs }: { fs: Fingerspelling }) {
  const { t } = useI18n()
  return (
    <div>
      <div className="card__sub" style={{ marginBottom: 8 }}>
        {t('fs.ref', { word: fs.word })}
      </div>
      <div className="fs-ref">
        {fs.letters.map((l, i) => (
          <div className="fs-letter" key={i}>
            <div className="fs-letter__box">{l.letter}</div>
            <div className="fs-letter__label">{t('fs.letterN', { n: i + 1 })}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
