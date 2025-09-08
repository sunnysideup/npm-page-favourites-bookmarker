import { Store } from './store.js'
import { makeAlphaNumCode, sanitizeHtml, stripTags, toRelativeUrl } from './utils.js'

export class State {
  /**
   * @param {
   *   {
   *     storage:'local'|'session',
   *     storageKey:string
   *   }
   * } opts
   */
  constructor (opts = {}) {
    this.opts = opts
    this.store = new Store(opts) // use caller's choice
    this.bookmarkStorageKey = opts.storageKey + '_bookmarks'
    this.codeStorageKey = opts.storageKey + '_code'
    this.shareLinkStorageKey = opts.storageKey + '_share_link'
    // initial load
    this.bookmarks = this.store.getJSON(this.bookmarkStorageKey) || []
    this.code = this.store.get(this.codeStorageKey) || makeAlphaNumCode(12)
    this.shareLink = this.store.get(this.shareLinkStorageKey) || ''
    this.listeners = new Set()

    // cross-tab / external updates
    this.store.onChange(
      key => {
        let changed = false
        if (key === this.bookmarkStorageKey) {
          const next = this.store.getJSON(this.bookmarkStorageKey) || []
          if (next.length !== this.bookmarks.length ||
              next.some((b, i) => b.url !== this.bookmarks[i]?.url || b.ts !== this.bookmarks[i]?.ts)) {
            this.bookmarks = next
            changed = true
          }
        } else if (key === this.codeStorageKey) {
          const next = this.store.get(this.codeStorageKey) || ''
          if (next !== this.code) { this.code = next; changed = true }
        }
        // else if (key === this.shareLinkStorageKey) {
        //   const next = this.store.get(this.shareLinkStorageKey) || ''
        //   if (next !== this.shareLink) { this.shareLink = next; changed = true }
        // }
        if (changed) this.#emit()
      }
    )
  }

  #loggedInUserHasBeenSyncedFromServer = false

  get loggedInUserHasBeenSyncedFromServer () {
    return this.#loggedInUserHasBeenSyncedFromServer
  }

  set loggedInUserHasBeenSyncedFromServer (v) {
    this.#loggedInUserHasBeenSyncedFromServer = Boolean(v)
  }

  onChange (fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  list () {
    return this.bookmarks.map(b => ({ ...b }))
  }

  has (url) {
    url = toRelativeUrl(url)
    if (!url) return false
    return this.bookmarks.some(b => b.url === url)
  }

  add (url, title, imagelink, description) {
    const { newUrl, newTitle, newImagelink, newDescription } =
      this.#testVarsForBookmark({ url, title, imagelink, description })
    if (!newUrl || !newTitle) return false
    if (this.has(newUrl)) return false
    this.bookmarks.push({
      url: newUrl,
      title: newTitle,
      imagelink: newImagelink,
      description: newDescription,
      ts: Date.now()
    })
    this.persist()
    return true
  }

  remove (url, index = null) {
    const before = this.bookmarks.length
    this.bookmarks = this.bookmarks.filter(b => b.url !== url)
    let after = this.bookmarks.length
    if(before === after) {
      if( index !== null && index >= 0 && index < this.bookmarks.length) {
          this.bookmarks.splice(index, 1)
      }
    }
    after = this.bookmarks.length
    if (after !== before) {
      this.persist()
      return true
    }
    return false
  }

  reorder (from, to) {
    const len = this.bookmarks.length
    if (!Number.isInteger(from) || !Number.isInteger(to)) return
    if (from < 0 || from >= len || to < 0 || to >= len || from === to) return
    const arr = [...this.bookmarks]
    const [m] = arr.splice(from, 1)
    if (!m) return
    arr.splice(to, 0, m)
    this.bookmarks = arr
    this.persist()
  }

  /**
   * Clear stored data.
   * @param {{ keepCode?: boolean, keepShareLink?: boolean, keepBookmarks?: boolean }} [opts]
   */
  clear (opts = {}) {
    if (!opts.keepCode) {
      this.code = ''
    }
    if (!opts.keepShareLink) {
      this.shareLink = ''
    }
    if (!opts.keepBookmarks) {
      this.bookmarks = []
    }
    this.persist() //
    return true
  }

  setCodeAndShareLink (data) {
    this.#setCode(data.code || '')
    this.#setShareLink(data.shareLink || '')
  }

  getCode () {
    return this.code || this.store.get(this.codeStorageKey)
  }

  getShareLink () {
    return this.shareLink || this.store.get(this.shareLinkStorageKey)
  }

  persist () {
    try {
      this.store.setJSON(this.bookmarkStorageKey, this.bookmarks)
      this.store.set(this.codeStorageKey, this.code)
      this.store.set(this.shareLinkStorageKey, this.shareLink)
      this.#emit()
    } catch (e) {
      console.error('Persist failed', e)
    }
  }

  mergeFromShareIfAvailable () {
    const sharedBookmarks = this.store.getTemporarySharedData()
    if (sharedBookmarks) {
      this.mergeFromServer(sharedBookmarks, true)
      this.store.removeTemporarySharedData()
      return true
    }
    return false
  }

  mergeFromServer (serverList = {}, fullReplace = false) {
    if (typeof serverList.code === 'string' && serverList.code.trim()) {
      this.code = serverList.code.trim()
    }

    const map = fullReplace ? new Map() : new Map(this.bookmarks.map(b => [b.url, b]))
    console.log(serverList);
    if (Array.isArray(serverList.bookmarks)) {
      for (const { url, title, imagelink, description, ts } of serverList.bookmarks) {
        const { newUrl, newTitle, newImagelink, newDescription } =
          this.#testVarsForBookmark({ url, title, imagelink, description })
        if (!newUrl || !newTitle) continue
        map.set(newUrl, {
          url: newUrl,
          title: newTitle,
          imagelink: newImagelink,
          description: newDescription,
          ts: Number.isFinite(ts) ? ts : Date.now()
        })
      }
    }
    this.bookmarks = [...map.values()]
    this.persist()
  }

  #setCode (code) {
    if (typeof code !== 'string' || !code.trim()) {
      if (!this.code) {
        this.code = makeAlphaNumCode(12)
      }
    } else {
      this.code = code.trim()
    }
    this.store.set(this.codeStorageKey, this.code)
  }

  #setShareLink (link) {
    if (typeof link !== 'string' || !link.trim()) {
      if (!this.shareLink) {
        this.shareLink = ''
      }
    } else {
      this.shareLink = link.trim()
    }
    this.store.set(this.shareLinkStorageKey, this.shareLink)
  }

  #emit () {
    this.listeners.forEach(fn => fn(this))
  }

  #testVarsForBookmark ({ url = '', title = '', imagelink = '', description = '' } = {}) {
    const newUrl = toRelativeUrl(url)
    if (!newUrl) {
      console.warn('Invalid URL:', url)
      return {}
    }
    const newTitle = stripTags(title)
    if (!newTitle) {
      console.warn('Invalid Title:', title)
      return {}
    }
    const newImagelink = toRelativeUrl(imagelink) // may be ''
    const newDescription = sanitizeHtml(description)
    return { newUrl, newTitle, newImagelink, newDescription }
  }
}
