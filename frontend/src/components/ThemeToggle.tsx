import { useTheme } from '../store/theme'
import { useI18n } from '../store/i18n'

// Light/Dark theme toggle — sits in the nav next to the language switcher.
export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const { t } = useI18n()
  const dark = theme === 'dark'
  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={dark ? t('theme.toLight') : t('theme.toDark')}
      title={dark ? t('theme.toLight') : t('theme.toDark')}
    >
      <span className="theme-toggle__icon">{dark ? '☀️' : '🌙'}</span>
    </button>
  )
}
