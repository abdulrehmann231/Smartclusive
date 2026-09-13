export function inferApiBase(): string {
  const env = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  if (env) return env
  const host = window.location.hostname
  if (host.endsWith('.daytonaproxy01.net') && host.startsWith('5173-')) {
    return `https://5000-${host.slice(5)}`
  }
  return ''
}

export const API_BASE = inferApiBase()

export function getToken(): string {
  return localStorage.getItem('sc.token') || ''
}

export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: { multipart?: boolean } = {},
): Promise<T> {
  const url = `${API_BASE}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getToken()}`,
    'ngrok-skip-browser-warning': 'true',
  }
  let fetchBody: BodyInit | undefined

  if (options.multipart) {
    fetchBody = body as FormData
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    fetchBody = JSON.stringify(body)
  }

  const res = await fetch(url, { method, headers, body: fetchBody })

  let data: Record<string, unknown> = {}
  try {
    data = await res.json()
  } catch {
    data = {}
  }

  if (!res.ok) {
    const err: Record<string, unknown> = { status: res.status, error: (data as any).error || 'unknown' }
    if ((data as any).needed !== undefined) err.needed = (data as any).needed
    throw err
  }
  return data as T
}
