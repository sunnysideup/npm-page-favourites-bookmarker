// Fetch helpers + endpoint resolution
export class Net {
  /**
   * @param {{
   *   baseUrl?: string,
   *   endpoints?: Partial<{events:string,bookmarks:string}>,
   *   timeout?: number,
   *   headers?: HeadersInit,
   *   credentials?: 'omit'|'same-origin'|'include',
   *   fetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response>
   * }} opts
   */
  constructor (opts = {}) {
    this.baseUrl = (opts.baseUrl || '').replace(/\/+$/, '')
    this.endpoints = {
      events: 'events',
      bookmarks: 'bookmarks',
      ...(opts.endpoints || {})
    }
    this.timeout = opts.timeout || 0
    this.headers = opts.headers || { Accept: 'application/json' }
    this.credentials = opts.credentials ?? 'same-origin'
    this._fetch = (opts.fetch || globalThis.fetch).bind(globalThis)
  }

  url (pathLike = '', query) {
    const p = String(pathLike || '').replace(/^\/+/, '')
    const base = this.baseUrl ? `${this.baseUrl}/` : '/'
    const u = new URL(p, base)
    if (query && typeof query === 'object') {
      for (const [k, v] of Object.entries(query)) {
        if (v == null) continue
        Array.isArray(v) ? v.forEach(x => u.searchParams.append(k, String(x))) : u.searchParams.set(k, String(v))
      }
    }
    return u.toString()
  }

  async request (method, pathLike, { body, query, headers, signal } = {}) {
    const controller = !signal && this.timeout ? new AbortController() : null
    const timer = controller ? setTimeout(() => controller.abort(new DOMException('Timeout', 'AbortError')), this.timeout) : null
    try {
      const res = await this._fetch(this.url(pathLike, query), {
        method,
        credentials: this.credentials,
        headers: {
          ...this.headers,
          ...headers,
          ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {})
        },
        body: body == null ? undefined : (body instanceof FormData ? body : JSON.stringify(body)),
        signal: signal ?? controller?.signal
      })

      const ct = res.headers.get('content-type') || ''
      let data = null
      if (res.status !== 204) {
        if (ct.includes('application/json')) {
          try { data = await res.json() } catch { data = null }
        } else {
          try { data = await res.text() } catch { data = '' }
        }
      }

      return {
        ok: res.ok,
        status: res.status,
        headers: res.headers,
        data,
        error: res.ok ? undefined : (data && typeof data === 'object' && 'message' in data ? data.message : res.statusText)
      }
    } catch (err) {
      return { ok: false, status: 0, headers: undefined, data: null, error: err?.message || 'Network error' }
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  get (pathLike, opts) { return this.request('GET', pathLike, opts) }
  post (pathLike, body, o) { return this.request('POST', pathLike, { ...o, body }) }
  put (pathLike, body, o) { return this.request('PUT', pathLike, { ...o, body }) }
  patch (pathLike, body, o) { return this.request('PATCH', pathLike, { ...o, body }) }
  del (pathLike, opts) { return this.request('DELETE', pathLike, opts) }
}
