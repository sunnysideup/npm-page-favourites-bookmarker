// Cookie backend (last resort; 10y expiry, ~4KB/key)
class CookieStore {
  get (k) {
    const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + encodeURIComponent(k) + '=([^;]*)'))
    return m ? decodeURIComponent(m[1]) : null
  }

  set (k, v, days = 3650) {
    const exp = new Date(Date.now() + days * 864e5).toUTCString()
    const secure = location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${encodeURIComponent(k)}=${encodeURIComponent(v)}; Path=/; Expires=${exp}; SameSite=Lax${secure}`
  }

  remove (k) {
    document.cookie = `${encodeURIComponent(k)}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
  }

  getJSON (k) { try { return JSON.parse(this.get(k) ?? '') } catch { return null } }

  setJSON (k, v) { this.set(k, JSON.stringify(v)) }

  removeJSON (k) { this.remove(k) }
}

// Local/Session Storage backend (preferred)
class LocalStore {
  constructor (mode = 'local') {
    this.mode = mode
    this.backend = mode === 'session' ? window.sessionStorage : window.localStorage
  }
  get (k) { try { return this.backend.getItem(k) } catch { return null } }
  set (k, v) { try { this.backend.setItem(k, v) } catch (e) { console.error('LocalStore set failed', e) } }
  remove (k) { try { this.backend.removeItem(k) } catch {} }
  getJSON (k) { try { return JSON.parse(this.get(k) ?? '') } catch { return null } }
  setJSON (k, v) { this.set(k, JSON.stringify(v)) }
  removeJSON (k) { this.remove(k) }
}

// Hybrid + cross-tab sync
export class Store {
  /**
   * @param {'local'|'session'} mode
   * @param {string} nameOfStore
   * @param {string} nameOfTemporarySharedStore
   */
  constructor (mode = 'local', nameOfStore = 'pf_store', nameOfTemporarySharedStore = 'pf_store_share_bookmark_list') {
    this.mode = mode
    this.nameOfStore = nameOfStore
    this.nameOfTemporarySharedStore = nameOfTemporarySharedStore
    this.primary = this.#detectPrimary(mode)
    this.fallback = new CookieStore()
    this.listeners = new Set()

    this._onStorage = (e) => { if (e?.key) this.#emit(e.key) }
    window.addEventListener('storage', this._onStorage)

    try {
      this.channel = 'BroadcastChannel' in window ? new BroadcastChannel(this.nameOfStore) : null
      this._onMessage = (e) => { if (e?.data?.type === this.nameOfStore + '-changed') this.#emit(e.data.key) }
      this.channel?.addEventListener('message', this._onMessage)
    } catch { this.channel = null }
  }

  destroy () {
    window.removeEventListener('storage', this._onStorage)
    if (this.channel) {
      this.channel.removeEventListener('message', this._onMessage)
      this.channel.close()
      this.channel = null
    }
    this.listeners.clear()
  }

  onChange (fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn)
  }


  // Sharing helpers (kept in local storage)
  getTemporarySharedData () {
    try {
      const raw = window.localStorage.getItem(this.nameOfTemporarySharedStore)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  removeTemporarySharedData () {
    window.localStorage.removeItem(this.nameOfTemporarySharedStore)
    this.channel?.postMessage({ type: this.nameOfStore + '-changed', key: this.nameOfTemporarySharedStore })
    this.#emit(this.nameOfTemporarySharedStore)
    return true
  }

  get (k) {
    const v = this.primary.get(k)
    return v != null ? v : (this.mode === 'local' ? this.fallback.get(k) : null)
  }

  set (k, v) {
    this.primary.set(k, v)
    if (this.mode === 'local') this.fallback.set(k, v) // remove if you don't want cookie mirror
    this.channel?.postMessage({ type: this.nameOfStore + '-changed', key: k })
    this.#emit(k)
  }

  remove (k) {
    this.primary.remove(k)
    if (this.mode === 'local') this.fallback.remove(k)
    this.channel?.postMessage({ type: this.nameOfStore + '-changed', key: k })
    this.#emit(k)
  }

  getJSON (k) {
    const v = this.primary.getJSON(k)
    return v != null ? v : (this.mode === 'local' ? this.fallback.getJSON(k) : null)
  }

  setJSON (k, v) {
    this.primary.setJSON(k, v)
    if (this.mode === 'local') this.fallback.setJSON(k, v)
    this.channel?.postMessage({ type: this.nameOfStore + '-changed', key: k })
    this.#emit(k)
  }

  removeJSON (k) {
    this.remove(k)
  }

  clear () {
    // only clears known keys in your app; for full wipe, iterate your key list
    // intentionally not implemented here to avoid nuking unrelated keys
  }

  #detectPrimary (mode) {
    try {
      const test = `__${this.nameOfStore}_${Math.random().toString(36).slice(2)}`
      const store = new LocalStore(mode)
      store.set(test, '1')
      const ok = store.get(test) === '1'
      store.remove(test)
      if (!ok) throw new Error('LocalStore blocked')
      return store
    } catch {
      return new CookieStore()
    }
  }

  #emit (key) {
    this.listeners.forEach(fn => fn(key))
  }
}
