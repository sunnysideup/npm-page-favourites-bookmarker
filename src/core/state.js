import { Store } from './store.js'

export class State {
  /**
   * @param {{storage:'local'|'session', storageKey:string, identKey:string, verifiedKey:string}} opts
   */
  constructor (opts) {
    this.opts = opts
    this.store = new Store(opts.storage)
    this.bookmarks = this.store.getJSON(opts.storageKey) || []
    this.identity = this.store.getJSON(opts.identKey) || null
    this.verified = this.store.get(opts.verifiedKey) === '1'
    this.listeners = new Set()
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

  /** Public persist (saves all state + notifies listeners) */
  persist () {
    this.store.setJSON(this.opts.storageKey, this.bookmarks)
    if (this.identity) this.store.setJSON(this.opts.identKey, this.identity)
    this.store.set(this.opts.verifiedKey, this.verified ? '1' : '')
    this.#emit()
  }

  /** Merge bookmarks from server by URL (keeps latest ts if provided) */
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
