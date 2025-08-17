import { Store } from './store.js'

export class State {
  /**
   * @param {{storage:'local'|'session', storageKey:string}} opts
   */
  constructor (opts) {
    this.opts = opts
    this.store = new Store(opts.storage) // use caller's choice

    // initial load
    this.bookmarks = this.store.getJSON(opts.storageKey) || []
    this.listeners = new Set()

    // cross-tab / external updates
    this.store.onChange(key => {
      let changed = false
      if (key === this.opts.storageKey) {
        const next = this.store.getJSON(this.opts.storageKey) || []
        if (JSON.stringify(next) !== JSON.stringify(this.bookmarks)) {
          this.bookmarks = next
          changed = true
        }
      }

      if (changed) this.#emit()
    })
  }

  onChange (fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  #emit () {
    this.listeners.forEach(fn => fn(this))
  }

  list () {
    return [...this.bookmarks]
  }
  has (url) {
    return this.bookmarks.some(b => b.url === url)
  }

  add (url, title) {
    if (this.has(url)) return false
    this.bookmarks.push({ url, title, ts: Date.now() })
    this.persist()
    return true
  }

  remove (url) {
    const before = this.bookmarks.length
    this.bookmarks = this.bookmarks.filter(b => b.url !== url)
    if (this.bookmarks.length !== before) {
      this.persist()
      return true
    }
    return false
  }

  reorder (from, to) {
    if (from === to) return
    const arr = [...this.bookmarks]
    const [m] = arr.splice(from, 1)
    arr.splice(to, 0, m)
    this.bookmarks = arr
    this.persist()
  }

  setIdentity ({ email = '', phone = '' }) {
    this.identity = { email: email.trim(), phone: phone.trim() }
    this.persist()
    return this.identity
  }

  setVerified (v) {
    this.verified = !!v
    this.persist()
  }

  persist () {
    this.store.setJSON(this.opts.storageKey, this.bookmarks)
    this.#emit()
  }

  mergeFromServer (serverList = []) {
    if (!Array.isArray(serverList)) return
    const map = new Map(this.bookmarks.map(b => [b.url, b]))
    for (const it of serverList) {
      const ts = it.ts || Date.now()
      map.set(it.url, { url: it.url, title: it.title, ts })
    }
    this.bookmarks = Array.from(map.values()).sort((a, b) =>
      a.title.localeCompare(b.title)
    )
    this.persist()
  }
}
