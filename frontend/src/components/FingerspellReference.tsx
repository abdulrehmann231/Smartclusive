import type { Fingerspelling } from '../api/types'
import { useI18n } from '../store/i18n'

// Ordered per-letter ASL reference with real hand-shape images.
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
            <img
              className="fs-letter__img"
              src={l.image}
              alt={`ASL ${l.letter}`}
              style={{
                width: 80,
                height: 100,
                objectFit: 'contain',
                background: '#f4f6f8',
                borderRadius: 8,
                padding: 4,
              }}
            />
            <div className="fs-letter__box" style={{ marginTop: 6 }}>
              {l.letter}
            </div>
            <div className="fs-letter__label">{t('fs.letterN', { n: i + 1 })}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
