// In-memory mock data + tiny SVG image factory (so no binary assets are needed).
import type { CardOption, DeckWord, Video } from '../api/types'

// Data-URI SVG "photo" for a word — colored card with an emoji + label.
export function pic(label: string, emoji: string, hue = 199): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200'>
    <rect width='320' height='200' fill='hsl(${hue},70%,92%)'/>
    <text x='160' y='96' font-size='72' text-anchor='middle'>${emoji}</text>
    <text x='160' y='160' font-size='26' font-family='Segoe UI, sans-serif' font-weight='700'
      fill='hsl(${hue},45%,35%)' text-anchor='middle'>${label}</text>
  </svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

interface WordSeed {
  indonesian: string
  english: string
  emoji: string
  hue: number
}

export const WORDS: WordSeed[] = [
  { indonesian: 'kucing', english: 'cat', emoji: '🐱', hue: 30 },
  { indonesian: 'anjing', english: 'dog', emoji: '🐶', hue: 20 },
  { indonesian: 'sapi', english: 'cow', emoji: '🐮', hue: 90 },
  { indonesian: 'mobil', english: 'car', emoji: '🚗', hue: 210 },
  { indonesian: 'buku', english: 'book', emoji: '📘', hue: 260 },
  { indonesian: 'pensil', english: 'pencil', emoji: '✏️', hue: 45 },
  { indonesian: 'meja', english: 'desk', emoji: '🪑', hue: 25 },
  { indonesian: 'tas', english: 'bag', emoji: '🎒', hue: 340 },
  { indonesian: 'jam', english: 'clock', emoji: '⏰', hue: 0 },
  { indonesian: 'apel', english: 'apple', emoji: '🍎', hue: 5 },
]

export function seedWord(w: WordSeed): CardOption {
  return { id: 'opt-' + w.english, english: w.english, image: pic(w.english, w.emoji, w.hue) }
}

// The learner's starting deck (2 words pre-learned so quizzes can be explored).
export function initialDeck(): DeckWord[] {
  return [
    {
      id: 'w-cat',
      indonesian: 'kucing',
      english: 'cat',
      image: pic('cat', '🐱', 30),
      mastery: 2,
      learnedAt: '2026-01-05T09:00:00Z',
    },
    {
      id: 'w-book',
      indonesian: 'buku',
      english: 'book',
      image: pic('book', '📘', 260),
      mastery: 1,
      learnedAt: '2026-01-06T09:00:00Z',
    },
  ]
}

export const VIDEOS: Video[] = [
  {
    id: 'v-letters',
    title: 'Alfabet ASL',
    type: 'letters',
    url: '/mock/letters.mp4',
    captionsUrl: '/mock/letters.id.vtt',
    completed: false,
  },
  {
    id: 'v-numbers',
    title: 'Angka ASL',
    type: 'numbers',
    url: '/mock/numbers.mp4',
    captionsUrl: '/mock/numbers.id.vtt',
    completed: false,
  },
]

// Fake Indonesian caption cues keyed by video type.
export const CAPTIONS: Record<string, string[]> = {
  letters: [
    'Selamat datang di pelajaran alfabet ASL.',
    'Mari kita mulai dengan huruf A.',
    'Kepalkan tangan dengan ibu jari di samping.',
    'Sekarang huruf B, jari lurus rapat.',
    'Bagus! Lanjut ke huruf berikutnya.',
  ],
  numbers: [
    'Selamat datang di pelajaran angka ASL.',
    'Angka satu: telunjuk ke atas.',
    'Angka dua: telunjuk dan jari tengah.',
    'Angka tiga: tambahkan ibu jari.',
    'Hebat! Kamu siap untuk kuis.',
  ],
}
