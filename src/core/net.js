// Fetch helpers + endpoint resolution
export class Net {
  /**
   * @param {{ baseUrl?: string, endpoints?: Partial<{events:string,bookmarks:string}> }} opts
   */
  constructor (opts = {}) {
    this.baseUrl = (opts.baseUrl || '').replace(/\/+$/, '')
    this.endpoints = Object.assign(
      {
        events: 'events',
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
    if (!this.baseUrl) return { ok: false, data: {} }

    const res = await fetch(this.url(pathLike), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    })

    let data = {}
    try {
      data = await res.json()
    } catch (e) {
      console.error('Failed to parse JSON', e)
    }
    return { ok: res.status === 200, data }
  }

  async getJSON (pathLike, code) {
    const res = await fetch(this.url(pathLike), { code })
    return await res.json().catch(e => {
      console.error('Failed to parse JSON', e)
      return {}
    })
  }
}
