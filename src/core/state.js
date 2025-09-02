import DOMPurify from 'dompurify'
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
    this.shareLinkStorageKey = opts.storageKey + '_share_link'
    // initial load
    this.bookmarks = this.store.getJSON(this.bookmarkStorageKey) || []
    this.code = this.store.get(this.codeStorageKey) || makeAlphaNumCode(12)
    this.shareLink = this.store.get(this.shareLinkStorageKey) || ''
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

  add (url, title, imagelink, description) {
    if (this.has(url)) return false
    const { newTitle, newImageLink, newDescription } = this.#testUrlAndTitle(url, title, imagelink, description)
    if (!newTitle) return false // skip invalid entries
    this.bookmarks.push(
      {
        url,
        title: newTitle,
        imagelink: newImageLink,
        description: newDescription,
        ts: Date.now()
      }
    )
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

  setCodeAndShareLink (data) {
    this.setCode(data.code || '')
    this.setShareLink(data.shareLink || '')
  }

  setCode (code) {
    if (typeof code !== 'string' || !code.trim()) {
      if (!this.code) {
        this.code = makeAlphaNumCode(12)
      }
    } else {
      this.code = code.trim()
    }
    this.store.set(this.codeStorageKey, this.code)
  }

  setShareLink (link) {
    if (typeof link !== 'string' || !link.trim()) {
      if (!this.shareLink) {
        this.shareLink = ''
      }
    } else {
      this.shareLink = link.trim()
    }
    this.store.set(this.shareLinkStorageKey, this.shareLink)
  }

  getCode () {
    return this.code || this.store.get(this.codeStorageKey)
  }

  getShareLink () {
    return this.shareLink || this.store.get(this.shareLinkStorageKey)
  }

  persist () {
    this.store.setJSON(this.bookmarkStorageKey, this.bookmarks)
    this.store.set(this.codeStorageKey, this.code)
    this.store.set(this.shareLinkStorageKey, this.shareLink)
    this.#emit()
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
    // set code only if provided & non-empty
    if (typeof serverList.code === 'string' && serverList.code.trim()) {
      this.code = serverList.code.trim()
    }

    const map = fullReplace
      ? new Map()
      : new Map(this.bookmarks.map(b => [b.url, b]))

    if (Array.isArray(serverList.bookmarks)) {
      for (const { url, title, imagelink, description, ts } of serverList.bookmarks) {
        const { newTitle, newImageLink, newDescription } = this.#testUrlAndTitle({ url, title, imagelink, description })
        if (!newTitle) continue
        map.set(url, {
          url,
          title: newTitle,
          imagelink: newImageLink,
          description: newDescription,
          ts: Number.isFinite(ts) ? ts : Date.now()
        })
      }
    } else if (fullReplace) {
      // explicit replace requested but no bookmarks provided -> clear
    }

    this.bookmarks = [...map.values()]
    this.persist()
  }

  #testUrlAndTitle ({ url = '', title = '', imagelink = '', description = '' } = {}) {
    if (this.#isValidUrl(url)) {
      const newTitle = this.#sanitizeHtml(title)
      if(newTitle) {
        const newImageLink = this.#isValidUrl(imagelink) ? imagelink : ''
        const newDescription = this.#sanitizeHtml(description)
        return { newTitle, newImageLink, newDescription }
      }
    }

    return {}
  }

  #sanitizeHtml (str) {
    // https://github.com/cure53/DOMPurify/tree/main/demos#what-is-this
    return DOMPurify.sanitize(str)
    // return str
    //   .replace(/&/g, '&amp;')
    //   .replace(/</g, '&lt;')
    //   .replace(/>/g, '&gt;')
    //   .replace(/"/g, '&quot;')
    //   .replace(/'/g, '&#39;')
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
