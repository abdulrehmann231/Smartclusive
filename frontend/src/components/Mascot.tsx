// "Signy" — the Smart Clusive mascot. A friendly character whose raised hand
// makes an ASL-ish sign. Animated purely with CSS (float, blink, wave).
interface Props {
  size?: number
  wave?: boolean
  float?: boolean
  className?: string
}

export function Mascot({ size = 48, wave = true, float = false, className = '' }: Props) {
  return (
    <svg
      className={`mascot${float ? ' mascot--float' : ''} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="Signy, the Smart Clusive mascot"
    >
      <defs>
        <linearGradient id="signyBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4cc3ee" />
          <stop offset="1" stopColor="#1f9fd4" />
        </linearGradient>
      </defs>

      {/* body */}
      <rect x="24" y="30" width="72" height="70" rx="30" fill="url(#signyBody)" />
      {/* belly highlight */}
      <ellipse cx="60" cy="72" rx="26" ry="22" fill="#eaf9ff" opacity="0.55" />

      {/* ears / antennae */}
      <circle cx="36" cy="30" r="8" fill="#1f9fd4" />
      <circle cx="84" cy="30" r="8" fill="#1f9fd4" />

      {/* eyes (blink) */}
      <g className="mascot__eyes">
        <circle cx="49" cy="58" r="7" fill="#12303c" />
        <circle cx="71" cy="58" r="7" fill="#12303c" />
        <circle cx="51.5" cy="55.5" r="2.4" fill="#fff" />
        <circle cx="73.5" cy="55.5" r="2.4" fill="#fff" />
      </g>

      {/* cheeks */}
      <circle cx="41" cy="70" r="5" fill="#ffb3c7" opacity="0.85" />
      <circle cx="79" cy="70" r="5" fill="#ffb3c7" opacity="0.85" />

      {/* smile */}
      <path d="M50 74 Q60 84 70 74" stroke="#12303c" strokeWidth="3.5" fill="none" strokeLinecap="round" />

      {/* waving hand doing a sign */}
      <g className={wave ? 'mascot__hand' : ''} style={{ transformOrigin: '96px 44px' }}>
        <rect x="90" y="20" width="9" height="26" rx="4.5" fill="#1f9fd4" />
        <g fill="#ffd400" stroke="#e6be00" strokeWidth="1.5">
          <circle cx="96" cy="18" r="11" />
          {/* little fingers */}
          <rect x="88" y="2" width="4.5" height="12" rx="2.2" />
          <rect x="94" y="0" width="4.5" height="14" rx="2.2" />
          <rect x="100" y="2" width="4.5" height="12" rx="2.2" />
        </g>
      </g>

      {/* left arm */}
      <rect x="21" y="60" width="9" height="24" rx="4.5" fill="#1f9fd4" transform="rotate(18 25 60)" />
    </svg>
  )
}
