// Build-time feature flags (Vite inlines import.meta.env at build time).

// VITE_DEMO_MODE=true → the app runs entirely on in-browser demo data:
// no backend calls, a demo student is always "signed in", and the
// login / register / forgot-password pages are hidden.
export const DEMO_MODE = String(import.meta.env.VITE_DEMO_MODE ?? '').toLowerCase() === 'true'
