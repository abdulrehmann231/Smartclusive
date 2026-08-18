import { useEffect, useRef, useState } from 'react'
import { useI18n, type Lang } from '../store/i18n'

const OPTIONS: { code: Lang; label: string; flag: string }[] = [
  { code: 'id', label: 'Indonesia', flag: '🇮🇩' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
]

// Language toggle (Indonesian / English) — top-right of the nav, GERKATIN-style.
export function LangSwitcher() {
  const { lang, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = OPTIONS.find((o) => o.code === lang)!

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className="lang" ref={ref}>
      <button className="lang__btn" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <span className="lang__flag">{current.flag}</span>
        <span className="lang__code">{current.code.toUpperCase()}</span>
        <span className={'lang__caret' + (open ? ' open' : '')}>▾</span>
      </button>
      {open && (
        <ul className="lang__menu" role="listbox">
          {OPTIONS.map((o) => (
            <li key={o.code}>
              <button
                role="option"
                aria-selected={o.code === lang}
                className={'lang__item' + (o.code === lang ? ' active' : '')}
                onClick={() => {
                  setLang(o.code)
                  setOpen(false)
                }}
              >
                <span className="lang__flag">{o.flag}</span>
                {o.label}
                {o.code === lang && <span className="lang__check">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
