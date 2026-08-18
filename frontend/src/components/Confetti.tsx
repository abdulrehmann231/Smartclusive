// Lightweight confetti burst — used on success moments for engagement.
const COLORS = ['#29abe2', '#ffd400', '#34c759', '#ff6ba6', '#7c5cff']

export function Confetti({ count = 24 }: { count?: number }) {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const left = (i / count) * 100 + (i % 3) * 4
        const delay = (i % 6) * 0.08
        const color = COLORS[i % COLORS.length]
        return (
          <i
            key={i}
            style={{ left: `${left}%`, background: color, animationDelay: `${delay}s`, transform: `rotate(${i * 40}deg)` }}
          />
        )
      })}
    </div>
  )
}
