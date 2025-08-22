// Cookie backend (last-resort; 10y expiry, 4KB per key)
class CookieStore {
  get (k) {
    const m = document.cookie.match(
      new RegExp('(?:^|; )' + encodeURIComponent(k) + '=([^;]*)')
    )
    return m ? decodeURIComponent(m[1]) : null
  }
  set (k, v, days = 365 * 10) {
    // ~10 years
    const exp = new Date(Date.now() + days * 864e5).toUTCString()
    document.cookie = `${encodeURIComponent(k)}=${encodeURIComponent(
      v
    )}; Path=/; Expires=${exp}; SameSite=Lax`
  }
  getJSON (k) {
    try {
      return JSON.parse(this.get(k) ?? '')
    } catch {
      return null
    }
  }
  setJSON (k, v) {
    this.set(k, JSON.stringify(v))
  }
}

// LocalStorage backend (preferred)
class LocalStore {
  constructor (mode = 'local') {
    this.backend =
      mode === 'session' ? window.sessionStorage : window.localStorage
  }
  get (k) {
    try {
      return this.backend.getItem(k)
    } catch {
      return null
    }
  }
  set (k, v) {
    try {
      this.backend.setItem(k, v)
    } catch (e) {
      console.error('Failed to set item in LocalStore', e)
    }
  }
  getJSON (k) {
    try {
      return JSON.parse(this.get(k) ?? '')
    } catch {
      return null
    }
  }
  setJSON (k, v) {
    this.set(k, JSON.stringify(v))
  }
}

// Hybrid + cross-tab sync
export class Store {
  /**
   * @param {'local'|'session'} mode
   * @param String nameOfStore
   */
  constructor (mode = 'local', nameOfStore = 'pf_store') {
    this.mode = mode
    this.nameOfStore = nameOfStore
    this.primary = this.#detectPrimary(mode)
    this.fallback = new CookieStore()
    // realtime cross-tab updates
    this.channel =
      'BroadcastChannel' in window
        ? new BroadcastChannel(this.nameOfStore)
        : null
    this.listeners = new Set()

    window.addEventListener('storage', e => {
      if (!e.key) return
      this.#emit(e.key)
    })
    this.channel?.addEventListener('message', e => {
      if (e?.data?.type === this.nameOfStore + '-changed')
        this.#emit(e.data.key)
    })
  }

  onChange (fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getSharedData () {
    if (localStorage.getItem('pf-store-updated-bookmark-list')) {
      const sharedStore = new LocalStore('local')
      return (sharedBookmarks = sharedStore.getJSON(
        'pf-store-updated-bookmark-list'
      ))
    }
    return null
  }

  clearSharedData () {
    if (localStorage.getItem('pf-store-updated-bookmark-list')) {
      localStorage.removeItem('pf-store-updated-bookmark-list')
      return true
    }
    return false
  }

  #emit (key) {
    this.listeners.forEach(fn => fn(key))
  }

  get (k) {
    const v = this.primary.get(k)
    return v != null ? v : this.mode === 'local' ? this.fallback.get(k) : null
  }

  set (k, v) {
    this.primary.set(k, v)
    if (this.mode === 'local') this.fallback.set(k, v) // keep a tiny mirror if you want server access; remove if not needed
    this.channel?.postMessage({ type: this.nameOfStore + '-changed', key: k })
    this.#emit(k)
  }
  getJSON (k) {
    const v = this.primary.getJSON(k)
    return v != null
      ? v
      : this.mode === 'local'
      ? this.fallback.getJSON(k)
      : null
  }
  setJSON (k, v) {
    this.primary.setJSON(k, v)
    if (this.mode === 'local') this.fallback.setJSON(k, v)
    this.channel?.postMessage({ type: this.nameOfStore + '-changed', key: k })
    this.#emit(k)
  }

  #detectPrimary (mode) {
    try {
      const test = `__${this.nameOfStore}_${Math.random()
        .toString(36)
        .slice(2)}`
      const myLocalStore = new LocalStore(mode)
      myLocalStore.set(test, '1')
      if (myLocalStore.get(test) !== '1') throw new Error('LocalStore blocked')
      myLocalStore.set(test, '')
      return myLocalStore
    } catch {
      return new CookieStore()
    }
  }
}
