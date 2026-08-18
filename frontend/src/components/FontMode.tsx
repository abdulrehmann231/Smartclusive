import { useEffect } from 'react'
import { useAuth } from '../store/auth'

// Switches the whole UI font by toggling a class on <body>:
//   - not signed in  -> "mode-hand" (simple handwriting font)
//   - signed in      -> "mode-app"  (animated display font)
export function FontMode() {
  const { student } = useAuth()

  useEffect(() => {
    const body = document.body
    body.classList.toggle('mode-hand', !student)
    body.classList.toggle('mode-app', !!student)
    return () => body.classList.remove('mode-hand', 'mode-app')
  }, [student])

  return null
}
