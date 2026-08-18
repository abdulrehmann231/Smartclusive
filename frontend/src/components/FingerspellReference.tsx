import type { Fingerspelling } from '../api/types'

// Ordered per-letter ASL reference (frontend.md shared component).
export function FingerspellReference({ fs }: { fs: Fingerspelling }) {
  return (
    <div>
      <div className="card__sub" style={{ marginBottom: 8 }}>
        Referensi jari untuk <strong>{fs.word}</strong> (ASL)
      </div>
      <div className="fs-ref">
        {fs.letters.map((l, i) => (
          <div className="fs-letter" key={i}>
            <div className="fs-letter__box">{l.letter}</div>
            <div className="fs-letter__label">huruf {i + 1}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
