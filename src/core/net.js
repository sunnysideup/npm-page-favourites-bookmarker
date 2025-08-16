// Fetch helpers + endpoint resolution
export class Net {
  /**
   * @param {{ baseUrl?: string, endpoints?: Partial<{events:string,identityRequest:string,identityVerify:string,bookmarks:string}> }} opts
   */
  constructor (opts = {}) {
    this.baseUrl = (opts.baseUrl || '').replace(/\/+$/, '')
    this.endpoints = Object.assign(
      {
        events: 'events',
        identityRequest: 'identity/request',
        identityVerify: 'identity/verify',
        bookmarks: 'bookmarks'
      },
      opts.endpoints || {}
    )
  }

  url (pathLike) {
    const p = String(pathLike || '').replace(/^\/+/, '')
    return this.baseUrl ? `${this.baseUrl}/${p}` : p
  }

  async post (pathLike, body) {
    if (!this.baseUrl) return {}
    const res = await fetch(this.url(pathLike), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    })
    return await res.json().catch(() => ({}))
  }

  async getJSON (pathLike) {
    const res = await fetch(this.url(pathLike), { credentials: 'include' })
    return await res.json().catch(() => ({}))
  }
}
