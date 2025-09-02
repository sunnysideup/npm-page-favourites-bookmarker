import { State } from './core/state.js'
import { Net } from './core/net.js'
import { defaultTemplates } from './ui/templates.js'
import { Heart } from './ui/heart.js'
import { AttachInlineHearts } from './ui/hearts-inline.js'
import { Overlay } from './ui/overlay.js'

import { deepMerge } from './core/utils.js'
import { makeAbsoluteUrl } from './core/utils.js'
export class PageFaves {
  isInSync = false

  /** @param {object} siteWideOpts */
  constructor (siteWideOpts = {}) {
    const pageConfig =
      window.npmPageFavouritesBookmarkerConfig &&
      typeof window.npmPageFavouritesBookmarkerConfig === 'object'
        ? window.npmPageFavouritesBookmarkerConfig
        : {}

    const defaults = {
      loadByDefault: true,
      loadOnThisPage: undefined,
      heartPositionLeftRight: 'right',
      heartPositionTopBottom: 'bottom',
      overlayHotkey: 'KeyB',
      storage: 'local',
      storageKey: 'pf_store',
      nameOfTemporarySharedStore: 'pf_store_share_bookmark_list',
      baseUrl: '',
      endpoints: {
        events: 'events',
        bookmarks: 'bookmarks'
      },
      // NEW: login + throttling
      userIsLoggedIn: false,
      loginUrl: '',
      syncOnLoad: false, // do we sync with server at all?
      templates: defaultTemplates,
      currentPageUrl: undefined,
      currentPageTitle: undefined,
      currentPageImagelink: undefined,
      currentPageDescription: undefined,
      mergeOnLoad: undefined,
      selectorForTitle: 'h1'
    }

    // precedence: defaults < siteWideOpts < pageConfig
    this.opts = deepMerge(defaults, siteWideOpts, pageConfig)

    const { loadByDefault, loadOnThisPage } = this.opts
    this.shouldLoad =
      typeof loadOnThisPage === 'boolean' ? loadOnThisPage : !!loadByDefault
    if (!this.shouldLoad) return

    this.#setupState()
    this.#setupNet()
    this.#createHearts()
    this.#createOverlay()


    this.unsubscribe = this.state.onChange(() => {
      this.allHearts.forEach(h => h.update())
    })


    if (typeof globalThis !== 'undefined') {
      const api = {
        toggleFromElement: this.toggleFromElement,
        toggleCurrent: this.toggleCurrent,
        showOverlay: this.showOverlay,
        hideOverlay: this.hideOverlay,
        add: this.add,
        remove: this.remove,
        isBookmarked: this.isBookmarked,
        getLocalBookmarkCount: this.getLocalBookmarkCount,
      }
      globalThis.npmPageFavouritesBookmarker = Object.freeze({ ...(globalThis.npmPageFavouritesBookmarker ?? {}), ...api })
    }

    if (this.state.mergeFromShareIfAvailable()) {
      this.showOverlay()
    }

  }

  #started = false
  #initPromise = null

  // replace your current init()
  init ({
    delayMs = 2000,
    waitForLoad = true,
    interactionEvents = [
      'scroll',
      'pointerdown',
      'click',
      'keydown',
      'wheel',
      'touchstart',
      'mousemove'
    ]
  } = {}) {
    if (this.#initPromise) return this.#initPromise

    this.#initPromise = new Promise(resolve => {
      const schedule = () => {
        if (this.#started) {
          resolve()
          return
        }

        const controller = new AbortController()
        const { signal } = controller
        const start = async () => {
          if (this.#started) return
          controller.abort()
          clearTimeout(timer)
          await this.#start()
          resolve()
        }

        const timer = setTimeout(start, delayMs)
        const fire = () => {
          clearTimeout(timer)
          start()
        }
        interactionEvents.forEach(evt =>
          addEventListener(evt, fire, { once: true, passive: true, signal })
        )
      }

      if (waitForLoad && document.readyState !== 'complete') {
        addEventListener('load', schedule, { once: true })
      } else {
        schedule()
      }
    })

    return this.#initPromise
  }

  // new: the real initializer (what your old init did)
  async #start () {
    if (this.#started) return
    this.#started = true

    this.allHearts.forEach(h => h.mount())
    this.#bindHotkey()

    if (this.opts.syncOnLoad && this.opts.userIsLoggedIn) {
      this.#syncIfStale().catch(e => {
        console.error('Sync failed', e)
        this.isInSync = false
      })
    }

    this.allHearts.forEach(h => h.update())
  }

  toggleFromElement(el) {
    const url = el.dataset.pfUrl || el.href || ''
    if(this.isBookmarked) {
      return this.remove(url)
    } else {
      const title = el.dataset.pfTitle || el.innerText || el.textContent || url || ''
      const imagelink = el.dataset.pfImagelink || ''
      const description = el.dataset.pfDescription || ''
      return this.add(url, title, imagelink, description)
    }
  }

  // Public API
  addCurrent () {
    return this.add(
      this.opts.currentPageUrl || window.location.href,
      this.opts.currentPageTitle || document.querySelector(this.opts.selectorForTitle)?.innerText || document.title || window.location.href,
      this.opts.currentPageImagelink  || document.querySelector('meta[property="og:image"]')?.content || '',
      this.opts.currentPageDescription || document.querySelector('meta[property="og:description"]')?.content || ''
    )
  }
  removeCurrent () {
    return this.remove(window.location.href)
  }
  isBookmarked (url = window.location.href) {
    return this.state.has(url)
  }
  list () {
    return this.state.list()
  }
  getLocalBookmarkCount () {
    return this.state.list().length
  }
  toggleCurrent () {
    this.isBookmarked() ? this.removeCurrent() : this.addCurrent()
  }
  #escListener = null

  showOverlay () {
    this.overlay.show()
    if (this.#escListener) return
    this.#escListener = e => {
      if (e.code === 'Escape') this.hideOverlay()
    }
    window.addEventListener('keydown', this.#escListener)
  }
  hideOverlay () {
    this.overlay.hide()
    if (this.#escListener) {
      window.removeEventListener('keydown', this.#escListener)
      this.#escListener = null
    }
  }

  add (url, title, imagelink = '', description = '') {
    const ok = this.state.add(url, title, imagelink, description)
    if (ok) this.#ping('added', { url, title, imagelink, description })
    return ok
  }
  remove (url) {
    const ok = this.state.remove(url)
    if (ok) this.#ping('removed', { url })
    return ok
  }

  async #ping (type, payload) {
    if (!this.#canServer()) return
    try {
      const { ok, data } = await this.net.post(this.net.endpoints.events, {
        code: this.state.code,
        type,
        payload,
        at: Date.now()
      })

      if (ok && data?.status === 'success') {
        await this.state.setCodeAndShareLink(data)
        const localCount = await this.getLocalBookmarkCount()
        if (localCount !== data.numberOfBookmarks) {
          this.isInSync = false
          await this.syncFromServer()
        } else {
          this.isInSync = true
        }
      }
    } catch (err) {
      console.error('Ping failed', err)
    }
  }

  async syncFromServer () {
    if (!this.#canServer()) return
    const { ok, data } = await this.net.post(this.net.endpoints.bookmarks, {
      code: this.state.code,
      bookmarks: this.state.list()
    })
    if (ok && data?.status === 'success') {
      await this.state.setCodeAndShareLink(data)
      this.state.mergeFromServer(data)
    }
  }

  async copyShareLink () {
    let link = this.state.getShareLink()
    if (!link) return false
    link = makeAbsoluteUrl(link)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(link)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = link
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      return Promise.resolve()
    }
    alert('The share link has been copied to your clipboard.')
  }

  async shareFromServer () {
    await this.syncFromServer()
    this.overlay.renderList()
  }

  // Private
  #bindHotkey () {
    window.addEventListener('keydown', e => {
      if (
        e.code === this.opts.overlayHotkey &&
        e.ctrlKey &&
        e.shiftKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault()
        this.showOverlay()
      }
    })
  }

  #canServer () {
    return !!this.net?.baseUrl
  }

  async #syncIfStale () {
    if (this.state.isInSync === true) return
    await this.syncFromServer()
  }

  #setupState(){
    this.state = new State({
      storage: this.opts.storage,
      storageKey: this.opts.storageKey,
      nameOfTemporarySharedStore: this.opts.nameOfTemporarySharedStore
    })
  }

  #setupNet(){
    this.net = new Net({
      baseUrl: this.opts.baseUrl,
      endpoints: this.opts.endpoints
    })
  }

  #createHearts() {
    this.heart = new Heart({
      appendTo: document.querySelector('.pf-heart-for-current-page') ?? document.body,
      position: {
        leftRight: this.opts.heartPositionLeftRight,
        topBottom: this.opts.heartPositionTopBottom
      },
      isOn: () => this.isBookmarked(),
      hasBookmarks: () => this.state.list().length > 0,
      onToggle: () => this.toggleCurrent(),
      onShowOverlay: () => this.showOverlay(),
      template: this.opts.templates.heart,
    })

    this.otherHearts = AttachInlineHearts(
      {
        isBookmarked: () => this.isBookmarked(),
        hasBookmarks: () => this.state.list().length > 0,
        onToggle: () => this.toggleFromElement(),
        onShowOverlay: () => this.showOverlay(),
        template: this.opts.templates.heart,
      },
      document
    )

    this.allHearts = [this.heart, ...(this.otherHearts ?? [])].filter(Boolean)
  }

  #createOverlay() {
    this.overlay = new Overlay({
      getList: () => this.state.list(),
      onRemove: url => {
        this.remove(url)
        this.overlay.renderList()
        this.allHearts.forEach(h => h.update())
      },
      // CHANGED: ping on reorder too
      onReorder: (from, to) => {
        this.state.reorder(from, to)
        this.#ping('reordered', { from, to })
        this.overlay.renderList()
      },
      onClose: () => this.hideOverlay(),
      onSync: () => this.syncFromServer(),
      onShare: () => this.copyShareLink(),
      // NEW: pass login awareness to overlay (for CTA)
      isLoggedIn: () => !!this.opts.userIsLoggedIn,
      loginUrl: this.opts.loginUrl,
      shareLink: this.state.getShareLink(),
      templates: {
        overlayBar: this.opts.templates.overlayBar,
        overlayShell: this.opts.templates.overlayShell,
        overlayRow: this.opts.templates.overlayRow
      }
    })
  }
}
