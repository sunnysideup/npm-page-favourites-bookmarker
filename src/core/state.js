import { Store } from './store.js'
import { makeAlphaNumCode } from './utils.js'

export class State {
  /**
   * @param {{storage:'local'|'session', storageKey:string}} opts
   */
  constructor (opts) {
    this.opts = opts
    this.store = new Store(opts.storage, opts.storageKey) // use caller's choice
    this.bookmarkStorageKey = opts.storageKey + '_bookmarks'
    this.codeStorageKey = opts.storageKey + '_code'
    // initial load
    this.bookmarks = this.store.getJSON(this.bookmarkStorageKey) || []
    this.code = this.store.get(codeStorageKey) || makeAlphaNumCode(12)
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
    this.mergeFromShareIfAvailable()
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
    this.store.set(this.codeStorageKey, this.code)
    this.#emit()
  }

  mergeFromShareIfAvailable () {
    const sharedBookmarks = this.store.getTemporarySharedData()
    if (sharedBookmarks) {
      this.mergeFromServer(sharedBookmarks, true)
      this.store.removeTemporarySharedData()
    }
  }

  mergeFromServer (serverList = {}, fullReplace = false) {
    // set code only if provided & non-empty
    if (typeof serverList.code === 'string' && serverList.code.trim()) {
      this.code = serverList.code.trim()
    }

    const map = fullReplace
      ? new Map()
      : new Map(this.bookmarks.map(b => [b.url, b]))

    if (Array.isArray(serverList.bookmarks)) {
      for (const { url, title, ts } of serverList.bookmarks) {
        const newTitle = this.#testUrlAndTitle(url, title)
        if (!newTitle) continue
        map.set(url, {
          url,
          title: newTitle,
          ts: Number.isFinite(ts) ? ts : Date.now()
        })
      }
    } else if (fullReplace) {
      // explicit replace requested but no bookmarks provided -> clear
    }

    this.bookmarks = [...map.values()]
    this.persist()
  }
  #testUrlAndTitle (url, title) {
    const newTitle = this.#sanitizeHtml(title || '')
    if (this.#isValidUrl(url) && newTitle) return newTitle
    return ''
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
}
