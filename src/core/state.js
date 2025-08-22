import { Store } from './store.js'

export class State {
  /**
   * @param {{storage:'local'|'session', storageKey:string}} opts
   */
  constructor (opts) {
    this.opts = opts
    this.store = new Store(opts.storage, opts.storageKey) // use caller's choice
    this.bookmarkStorageKey = opts.storageKey + '_bookmarks'
    // initial load
    this.bookmarks = this.store.getJSON(opts.bookmarkStorageKey) || []
    this.listeners = new Set()

    // cross-tab / external updates
    this.store.onChange(key => {
      let changed = false
      if (key === this.bookmarkStorageKey) {
        const next = this.store.getJSON(this.bookmarkStorageKey) || []
        if (JSON.stringify(next) !== JSON.stringify(this.bookmarks)) {
          this.bookmarks = next
          changed = true
        }
      }

      if (changed) this.#emit()
    })
    this.mergeFromShare()
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
    const newTitle = this.#testUrlAndTitle(url, title)
    if (!newTitle) return false // skip invalid entries
    this.bookmarks.push({ url, title: newTitle, ts: Date.now() })
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

  persist () {
    this.store.setJSON(this.bookmarkStorageKey, this.bookmarks)
    this.#emit()
  }

  mergeFromShare () {
    const sharedBookmarks = this.store.getSharedData()
    if (
      sharedBookmarks &&
      Array.isArray(sharedBookmarks) &&
      sharedBookmarks.length
    ) {
      this.mergeFromServer(sharedBookmarks, true)
      this.store.removeSharedData()
    }
  }

  mergeFromServer (serverList = [], fullReplace = false) {
    if (!Array.isArray(serverList)) return
    const map = fullReplace
      ? new Map()
      : new Map(this.bookmarks.map(b => [b.url, b]))

    for (const it of serverList) {
      const newTitle = this.#testUrlAndTitle(it.url, it.title)
      if (!newTitle) continue // skip invalid entries
      const ts = it.ts || Date.now()
      map.set(it.url, { url: it.url, title: newTitle, ts })
    }
    // this.bookmarks = Array.from(map.values()).sort((a, b) =>
    //   a.title.localeCompare(b.title)
    // )
    this.persist()
  }

  #sanitizeHtml (str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
  #isValidUrl (string) {
    try {
      new URL(string)
      return true
    } catch {
      return false
    }
  }
  #testUrlAndTitle (url, title) {
    const newTitle = this.#sanitizeHtml(title || '')
    if (this.#isValidUrl(url) && newTitle) return newTitle
    return ''
  }
}
