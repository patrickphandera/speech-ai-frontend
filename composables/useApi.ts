function stored(storage: 'local' | 'session', key: string) {
  try { return (storage === 'local' ? localStorage : sessionStorage).getItem(key) || '' } catch { return '' }
}
function store(storage: 'local' | 'session', key: string, value: string) {
  try {
    const s = storage === 'local' ? localStorage : sessionStorage
    value ? s.setItem(key, value) : s.removeItem(key)
  } catch {}
}

export function useApi() {
  const base = useRuntimeConfig().public.apiBase as string
  // Two separate sessions: the admin (this tab only) and the contributor (kept for 30 days).
  const token = useState<string>('adminToken', () => stored('session', 'adminToken'))
  const speakerToken = useState<string>('speakerToken', () => stored('local', 'speakerToken'))

  function setToken(value: string) {
    token.value = value
    store('session', 'adminToken', value)
  }
  function setSpeakerToken(value: string) {
    speakerToken.value = value
    store('local', 'speakerToken', value)
  }

  const isAdminPath = (path: string) => path.startsWith('/api/admin/')

  async function api<T = any>(path: string, opts: { method?: string, json?: unknown, form?: FormData } = {}): Promise<T> {
    const headers: Record<string, string> = {}
    const auth = isAdminPath(path) ? token.value : speakerToken.value
    if (auth) headers.Authorization = `Bearer ${auth}`
    let body: BodyInit | undefined
    if (opts.json !== undefined) {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(opts.json)
    } else if (opts.form) {
      body = opts.form
    }
    let res: Response
    try {
      res = await fetch(base + path, { method: opts.method || (body ? 'POST' : 'GET'), headers, body })
    } catch {
      throw new Error('Cannot reach the server. Is the Flask backend running?')
    }
    const data = await res.json().catch(() => ({}))
    if (res.status === 401) {
      if (isAdminPath(path) && !path.endsWith('/verify')) setToken('')
      else if (!isAdminPath(path) && path !== '/api/auth/login') setSpeakerToken('')
    }
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
    return data as T
  }

  /** URL with the session token as a query param, for <audio>, <img> and file downloads. */
  function authUrl(path: string, params: Record<string, string> = {}) {
    const auth = isAdminPath(path) ? token.value : speakerToken.value
    const q = new URLSearchParams({ ...params, token: auth })
    return `${base}${path}?${q}`
  }

  return { api, token, setToken, speakerToken, setSpeakerToken, authUrl }
}
