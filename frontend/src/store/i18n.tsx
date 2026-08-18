import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'id' | 'en'

type Dict = Record<string, { id: string; en: string }>

// UI chrome strings. Word/content data still comes from the API in both languages.
const DICT: Dict = {
  // Nav
  'nav.tag': { id: 'Belajar Bahasa Inggris melalui ASL', en: 'Learn English through ASL' },
  'nav.home': { id: 'Beranda', en: 'Home' },
  'nav.cards': { id: 'Kartu Kata', en: 'Word Cards' },
  'nav.camera': { id: 'Kamera', en: 'Camera' },
  'nav.quiz': { id: 'Kuis', en: 'Quiz' },
  'nav.videos': { id: 'Video', en: 'Videos' },
  'nav.deck': { id: 'Koleksi', en: 'Deck' },
  'nav.signin': { id: 'Masuk', en: 'Sign In' },
  'nav.signout': { id: 'Keluar', en: 'Sign Out' },

  // Auth
  'auth.signin': { id: 'Masuk', en: 'Sign In' },
  'auth.register': { id: 'Buat Akun', en: 'Create Account' },
  'auth.subtitle': {
    id: 'Belajar Bahasa Inggris melalui American Sign Language (ASL) bersama Smart Clusive',
    en: 'Learn English through American Sign Language (ASL) with Smart Clusive',
  },
  'auth.name': { id: 'Nama', en: 'Name' },
  'auth.email': { id: 'Email', en: 'Email' },
  'auth.password': { id: 'Kata Sandi', en: 'Password' },
  'auth.namePlaceholder': { id: 'Nama lengkap', en: 'Full name' },
  'auth.emailPlaceholder': { id: 'nama@contoh.com', en: 'name@example.com' },
  'auth.errName': { id: 'Nama minimal 2 karakter.', en: 'Name must be at least 2 characters.' },
  'auth.errEmail': { id: 'Format email tidak valid.', en: 'Invalid email format.' },
  'auth.errPassword': { id: 'Kata sandi wajib diisi.', en: 'Password is required.' },
  'auth.errTaken': { id: 'Email sudah terdaftar. Silakan masuk.', en: 'Email already registered. Please sign in.' },
  'auth.errInvalid': { id: 'Email atau kata sandi salah.', en: 'Wrong email or password.' },
  'auth.errGeneric': { id: 'Gagal memproses. Coba lagi.', en: 'Something went wrong. Try again.' },
  'auth.processing': { id: 'Memproses…', en: 'Processing…' },
  'auth.register.btn': { id: 'Daftar', en: 'Register' },
  'auth.haveAccount': { id: 'Sudah punya akun?', en: 'Already have an account?' },
  'auth.noAccount': { id: 'Belum punya akun?', en: "Don't have an account?" },

  // Common
  'common.loading': { id: 'Memuat…', en: 'Loading…' },
  'common.error': { id: 'Terjadi kesalahan', en: 'Something went wrong' },
  'common.retry': { id: 'Coba lagi', en: 'Try again' },
  'common.next': { id: 'Berikutnya', en: 'Next' },
  'common.finish': { id: 'Selesai', en: 'Finish' },
  'common.cancel': { id: 'Batal', en: 'Cancel' },
  'common.start': { id: 'Mulai', en: 'Start' },
  'common.startLearning': { id: 'Mulai Belajar', en: 'Start Learning' },

  // Theme toggle
  'theme.toDark': { id: 'Mode gelap', en: 'Dark mode' },
  'theme.toLight': { id: 'Mode terang', en: 'Light mode' },

  // Dashboard
  'dash.welcome': { id: 'Selamat datang', en: 'Welcome' },
  'dash.hi': { id: 'Halo, {name} 👋', en: 'Hi, {name} 👋' },
  'dash.lead': {
    id: 'Bangun kosakata Bahasa Inggris yang bisa kamu kenali dan isyaratkan sendiri dalam American Sign Language (ASL).',
    en: 'Build English vocabulary you can both recognize and sign yourself in American Sign Language (ASL).',
  },
  'dash.viewDeck': { id: 'Lihat Koleksi', en: 'View Deck' },
  'dash.statLearned': { id: 'Kata Dipelajari', en: 'Words Learned' },
  'dash.statLearnedDesc': { id: 'di koleksimu', en: 'in your deck' },
  'dash.statMastered': { id: 'Dikuasai', en: 'Mastered' },
  'dash.statMasteredDesc': { id: 'mastery 4+', en: 'mastery 4+' },
  'dash.statToQuiz': { id: 'Menuju Kuis', en: 'Until Quiz' },
  'dash.statToQuizDesc': { id: 'kata lagi diperlukan', en: 'more words needed' },
  'dash.features': { id: 'Fitur', en: 'Features' },
  'dash.errDeck': { id: 'Gagal memuat koleksi.', en: 'Failed to load deck.' },
  'feat.cards.title': { id: 'Kartu Kata', en: 'Word Cards' },
  'feat.cards.desc': { id: 'Tebak arti kata lalu isyaratkan.', en: 'Guess the meaning, then sign it.' },
  'feat.camera.title': { id: 'Kamera', en: 'Camera' },
  'feat.camera.desc': { id: 'Foto objek dan pelajari isyaratnya.', en: 'Photograph objects and learn their signs.' },
  'feat.quiz.title': { id: 'Kuis', en: 'Quiz' },
  'feat.quiz.desc': { id: 'Uji kata, huruf, dan angka.', en: 'Test words, letters and numbers.' },
  'feat.videos.title': { id: 'Video', en: 'Videos' },
  'feat.videos.desc': { id: 'Pelajaran alfabet & angka ASL.', en: 'ASL alphabet & number lessons.' },

  // Deck
  'deck.eyebrow': { id: 'Koleksi', en: 'Deck' },
  'deck.title': { id: 'Kata yang Kamu Kuasai', en: 'Words You Have Learned' },
  'deck.lead': {
    id: 'Sumber utama untuk kuis. Kuasai kata dengan menjawab kuis dengan benar.',
    en: 'The source for quizzes. Master words by answering quizzes correctly.',
  },
  'deck.mastered': { id: 'Dikuasai', en: 'Mastered' },
  'deck.emptyTitle': { id: 'Koleksi masih kosong', en: 'Your deck is empty' },
  'deck.emptyHint': {
    id: 'Pelajari kata pertamamu lewat Kartu Kata atau Kamera.',
    en: 'Learn your first word via Word Cards or Camera.',
  },

  // Cards (Feature 1)
  'cards.eyebrow': { id: 'Fitur 1 · Kartu Kata', en: 'Feature 1 · Word Cards' },
  'cards.title': { id: 'Tebak & Isyaratkan', en: 'Guess & Sign' },
  'cards.prompt': { id: 'Apa arti kata Indonesia ini?', en: 'What does this Indonesian word mean?' },
  'cards.indonesianLabel': { id: 'Bahasa Indonesia', en: 'Indonesian' },
  'cards.englishOptions': { id: 'Pilih arti dalam Bahasa Inggris:', en: 'Choose the English meaning:' },
  'cards.tryAgain': { id: 'Coba lagi — pilih opsi lain.', en: 'Try again — pick another option.' },
  'cards.correct': { id: 'Benar! Sekarang isyaratkan katanya.', en: 'Correct! Now sign the word.' },
  'cards.addedDeck': { id: '“{word}” ditambahkan ke koleksi!', en: '“{word}” added to your deck!' },
  'cards.duplicate': { id: 'Kata ini sudah ada di koleksimu.', en: 'This word is already in your deck.' },
  'cards.nextCard': { id: 'Kartu Berikutnya', en: 'Next Card' },
  'cards.practiceAgain': { id: 'Latih Kata Ini Lagi', en: 'Practice this word again' },
  'cards.learnMore': { id: 'Pelajari Kata Lain', en: 'Learn more words' },
  'cards.errLoad': { id: 'Gagal memuat kartu.', en: 'Failed to load card.' },

  // Capture (Feature 2)
  'cap.eyebrow': { id: 'Fitur 2 · Kamera', en: 'Feature 2 · Camera' },
  'cap.title': { id: 'Foto & Pelajari Objek', en: 'Photograph & Learn Objects' },
  'cap.take': { id: '📸 Ambil Foto', en: '📸 Take Photo' },
  'cap.detecting': { id: 'Mendeteksi objek…', en: 'Detecting object…' },
  'cap.notFound': { id: 'Objek tidak dikenali. Silakan foto ulang.', en: 'Object not recognized. Please retake.' },
  'cap.retake': { id: 'Foto Ulang', en: 'Retake' },
  'cap.dict': { id: 'Kamus', en: 'Dictionary' },
  'cap.translated': { id: 'Terjemahan', en: 'Translated' },
  'cap.continueSign': { id: 'Lanjut Isyaratkan', en: 'Continue to Sign' },
  'cap.another': { id: 'Foto Objek Lain', en: 'Photograph Another' },

  // Quiz (Feature 3)
  'quiz.eyebrow': { id: 'Fitur 3 · Kuis', en: 'Feature 3 · Quiz' },
  'quiz.choose': { id: 'Pilih Mode Kuis', en: 'Choose a Quiz Mode' },
  'quiz.lead': { id: 'Kuis diambil dari kata yang sudah kamu kuasai.', en: 'Quizzes are drawn from words you have learned.' },
  'quiz.running': { id: 'Kuis Berlangsung', en: 'Quiz in Progress' },
  'quiz.tooSmall': { id: 'Koleksimu belum cukup. Pelajari {n} kata lagi.', en: 'Your deck is too small. Learn {n} more words.' },
  'quiz.learnNow': { id: 'Belajar sekarang →', en: 'Learn now →' },
  'quiz.errStart': { id: 'Gagal memulai kuis.', en: 'Failed to start the quiz.' },
  'quiz.starting': { id: 'Memulai…', en: 'Starting…' },
  'quiz.mode.word.title': { id: 'Isyaratkan Kata', en: 'Sign the Word' },
  'quiz.mode.word.desc': { id: 'Eja seluruh kata dari koleksimu.', en: 'Spell out a whole word from your deck.' },
  'quiz.mode.letter.title': { id: 'Isyaratkan Huruf', en: 'Sign a Letter' },
  'quiz.mode.letter.desc': { id: 'Satu huruf per soal.', en: 'One letter per question.' },
  'quiz.mode.number.title': { id: 'Isyaratkan Angka', en: 'Sign a Number' },
  'quiz.mode.number.desc': { id: 'Angka 0–9.', en: 'Numbers 0–9.' },

  // QuizRunner
  'qr.word': { id: 'Kata', en: 'Word' },
  'qr.letter': { id: 'Huruf', en: 'Letter' },
  'qr.number': { id: 'Angka', en: 'Number' },
  'qr.signThis': { id: 'Isyaratkan {kind} ini:', en: 'Sign this {kind}:' },
  'qr.question': { id: 'Soal {a} / {b}', en: 'Question {a} / {b}' },
  'qr.score': { id: 'Skor: {a}/{b}', en: 'Score: {a}/{b}' },
  'qr.summary': { id: 'Benar {c} · Salah {i} · {p}%', en: 'Correct {c} · Wrong {i} · {p}%' },
  'qr.cantDo': { id: 'Tidak bisa? Lewati soal ini.', en: "Can't do it? Skip this question." },
  'qr.skip': { id: 'Lewati (salah)', en: 'Skip (wrong)' },

  // SignPad
  'sp.letter': { id: 'huruf', en: 'letter' },
  'sp.number': { id: 'angka', en: 'number' },
  'sp.word': { id: 'kata', en: 'word' },
  'sp.multiDigit': { id: 'Angka ditandatangani digit demi digit.', en: 'The number is signed digit by digit.' },
  'sp.success': { id: '{Kind} berhasil ditandatangani!', en: '{Kind} signed successfully!' },
  'sp.wrong': { id: 'Belum cocok. Isyaratkan {x} lalu coba lagi.', en: "Not a match. Sign {x} and try again." },
  'sp.signThe': { id: 'Isyaratkan {kind}: {x}', en: 'Sign the {kind}: {x}' },
  'sp.checking': { id: 'Memeriksa…', en: 'Checking…' },
  'sp.signBtn': { id: 'Isyaratkan “{x}”', en: 'Sign “{x}”' },
  'sp.simWrong': { id: 'Simulasikan salah', en: 'Simulate wrong' },
  'sp.mockNote': {
    id: 'Tombol di atas menggantikan pengenalan kamera nyata (mock SignService).',
    en: 'The buttons above stand in for real camera recognition (mock SignService).',
  },
  'sp.errGeneric': { id: 'Gagal mengirim frame. Coba lagi.', en: 'Failed to send frame. Try again.' },
  'sp.startPrompt': {
    id: 'Klik mulai, lalu tunjukkan tanganmu di depan kamera.',
    en: 'Click start, then show your hand in front of the camera.',
  },
  'sp.startBtn': { id: 'Mulai Isyaratkan', en: 'Start Signing' },
  'sp.stopBtn': { id: 'Berhenti', en: 'Stop' },
  'sp.liveNote': {
    id: 'Frame kamera dikirim ke backend untuk dikenali model ASL.',
    en: 'Camera frames are sent to the backend ASL model for recognition.',
  },

  // Fingerspell reference
  'fs.ref': { id: 'Referensi jari untuk {word} (ASL)', en: 'Fingerspelling reference for {word} (ASL)' },
  'fs.letterN': { id: 'huruf {n}', en: 'letter {n}' },

  // Camera view
  'cam.needs': { id: 'Verifikasi isyarat membutuhkan kamera.', en: 'Sign verification requires the camera.' },
  'cam.allow': { id: 'Izinkan Kamera', en: 'Allow Camera' },
  'cam.requesting': { id: 'Meminta izin…', en: 'Requesting permission…' },
  'cam.denied': {
    id: 'Akses kamera ditolak. Aktifkan izin kamera di browser untuk melihat pratinjau.',
    en: 'Camera access denied. Enable the camera permission in your browser to see the preview.',
  },
  'cam.unavailable': {
    id: 'Kamera tidak tersedia di perangkat ini.',
    en: 'No camera is available on this device.',
  },
  'cam.hint': {
    id: 'Izinkan kamera agar model dapat mengenali isyaratmu.',
    en: 'Allow the camera so the model can recognize your signs.',
  },
  'cam.sampleObject': { id: 'contoh objek', en: 'sample object' },

  // Videos (Feature 5)
  'vid.eyebrow': { id: 'Fitur 5 · Video', en: 'Feature 5 · Videos' },
  'vid.title': { id: 'Pelajaran Video ASL', en: 'ASL Video Lessons' },
  'vid.lead': {
    id: 'Tonton sampai selesai untuk membuka kuis. Teks berbahasa Indonesia bisa dinyalakan/dimatikan.',
    en: 'Watch to the end to unlock the quiz. Indonesian captions can be toggled on/off.',
  },
  'vid.quizEyebrow': { id: 'Fitur 5 · Kuis Video', en: 'Feature 5 · Video Quiz' },
  'vid.quizLetters': { id: 'Kuis Huruf', en: 'Letter Quiz' },
  'vid.quizNumbers': { id: 'Kuis Angka', en: 'Number Quiz' },
  'vid.done': { id: 'Video selesai ditonton.', en: 'Video watched to the end.' },
  'vid.startQuiz': { id: 'Mulai Kuis', en: 'Start Quiz' },
  'vid.errLoad': { id: 'Gagal memuat video.', en: 'Failed to load videos.' },
  'vid.captions': { id: 'Teks Indonesia', en: 'Indonesian captions' },
  'vid.pause': { id: 'Jeda', en: 'Pause' },
  'vid.resume': { id: 'Lanjut', en: 'Resume' },
  'vid.letters': { id: 'Huruf', en: 'Letters' },
  'vid.numbers': { id: 'Angka', en: 'Numbers' },

  // Translate (Feature 4)
  'tr.eyebrow': { id: 'Fitur 4 · Terjemahan', en: 'Feature 4 · Translation' },
  'tr.title': { id: 'Terjemahan Isyarat', en: 'Sign Translation' },
  'tr.review': { id: 'Dalam Peninjauan', en: 'Under Review' },
  'tr.reviewDesc': {
    id: 'Penerjemahan isyarat kamera → teks (BISINDO) masih dalam tahap riset dan belum tersedia pada versi ini.',
    en: 'Camera-to-text sign translation (BISINDO) is still research-stage and not available in this version.',
  },

  // Footer
  'footer.copy': { id: '© 2026 Smart Clusive · Belajar Bahasa Inggris melalui ASL', en: '© 2026 Smart Clusive · Learn English through ASL' },
  'footer.tag': { id: 'Membuka akses ke dunia Tuli 🤟', en: 'Opening access to the Deaf world 🤟' },

  // Landing (public, pre-login)
  'land.badge': { id: '✋ Belajar sambil bermain', en: '✋ Learn while you play' },
  'land.title1': { id: 'Belajar Bahasa Inggris', en: 'Learn English' },
  'land.title2': { id: 'lewat American Sign Language', en: 'through American Sign Language' },
  'land.lead': {
    id: 'Kenali kata, isyaratkan sendiri di depan kamera, dan kumpulkan kata baru — seru seperti bermain game.',
    en: 'Recognize words, sign them yourself on camera, and collect new words — as fun as playing a game.',
  },
  'land.learner': { id: 'Aku Pelajar', en: "I'm a Learner" },
  'land.haveAccount': { id: 'Sudah punya akun? Masuk', en: 'Already have an account? Sign in' },
  'land.chip1': { id: '🔤 Alfabet ASL', en: '🔤 ASL Alphabet' },
  'land.chip2': { id: '🔢 Angka ASL', en: '🔢 ASL Numbers' },
  'land.chip3': { id: '🎯 Kuis seru', en: '🎯 Fun quizzes' },
  'land.chip4': { id: '📷 Belajar dari kamera', en: '📷 Learn from camera' },
  'land.signHi': { id: 'Halo!', en: 'Hi!' },

  // Gamified dashboard
  'dash.level': { id: 'Level {n}', en: 'Level {n}' },
  'dash.xp': { id: '{xp} XP', en: '{xp} XP' },
  'dash.streak': { id: 'Runtunan', en: 'Streak' },
  'dash.streakDays': { id: '{n} hari', en: '{n} days' },
  'dash.gems': { id: 'Permata', en: 'Gems' },
  'dash.continue': { id: 'Lanjutkan', en: 'Continue' },
  'dash.journey': { id: 'Perjalanan Belajarmu', en: 'Your Learning Journey' },
  'dash.warmup': { id: 'Pemanasan', en: 'Warm Up' },
  'dash.warmupMeta': { id: 'Kenali kata pertamamu', en: 'Recognize your first words' },
  'dash.nodeCardsMeta': { id: 'Tebak & isyaratkan kata', en: 'Guess & sign words' },
  'dash.nodeCaptureMeta': { id: 'Foto objek nyata', en: 'Photograph real objects' },
  'dash.nodeVideoMeta': { id: 'Tonton pelajaran ASL', en: 'Watch ASL lessons' },
  'dash.nodeQuizMeta': { id: 'Uji kemampuanmu', en: 'Test your skills' },
  'dash.locked': { id: 'Terkunci', en: 'Locked' },
  'dash.done': { id: 'Selesai', en: 'Done' },
  'dash.weekMon': { id: 'S', en: 'M' },
  'dash.weekTue': { id: 'S', en: 'T' },
  'dash.weekWed': { id: 'R', en: 'W' },
  'dash.weekThu': { id: 'K', en: 'T' },
  'dash.weekFri': { id: 'J', en: 'F' },
}

interface I18nState {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: keyof typeof DICT | string, vars?: Record<string, string | number>) => string
}

const I18nCtx = createContext<I18nState | null>(null)
const LANG_KEY = 'sc.lang'

function interpolate(s: string, vars?: Record<string, string | number>) {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`))
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem(LANG_KEY) as Lang) || 'id')

  const value = useMemo<I18nState>(
    () => ({
      lang,
      setLang(l) {
        localStorage.setItem(LANG_KEY, l)
        setLangState(l)
      },
      t(key, vars) {
        const entry = DICT[key as string]
        if (!entry) return String(key)
        return interpolate(entry[lang], vars)
      },
    }),
    [lang],
  )

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>
}

export function useI18n(): I18nState {
  const ctx = useContext(I18nCtx)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
