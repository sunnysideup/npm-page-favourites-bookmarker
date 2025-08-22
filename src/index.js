import { deepMerge } from './core/utils.js'
import { State } from './core/state.js'
import { Net } from './core/net.js'
import { defaultTemplates } from './ui/templates.js'
import { Heart } from './ui/heart.js'
import { Overlay } from './ui/overlay.js'

export class PageFaves {
  isInSync = false

  /** @param {object} siteWideOpts */
  constructor (siteWideOpts = {}) {
    const pageConfig =
      window.npmPageFavouritesBookmarker &&
      typeof window.npmPageFavouritesBookmarker === 'object'
        ? window.npmPageFavouritesBookmarker
        : {}

    const defaults = {
      loadByDefault: true,
      loadOnThisPage: undefined,
      heartPositionLeftRight: 'right',
      heartPositionTopBottom: 'bottom',
      overlayHotkey: 'KeyB',
      storage: 'local',
      storageKey: 'pf_store',
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
      mergeOnLoad: undefined
    }

    // precedence: defaults < siteWideOpts < pageConfig
    this.opts = deepMerge(defaults, siteWideOpts, pageConfig)

    const { loadByDefault, loadOnThisPage } = this.opts
    this.shouldLoad =
      typeof loadOnThisPage === 'boolean' ? loadOnThisPage : !!loadByDefault
    if (!this.shouldLoad) return

    this.state = new State({
      storage: this.opts.storage,
      storageKey: this.opts.storageKey
    })
    this.net = new Net({
      baseUrl: this.opts.baseUrl,
      endpoints: this.opts.endpoints
    })

    this.heart = new Heart({
      position: {
        leftRight: this.opts.heartPositionLeftRight,
        topBottom: this.opts.heartPositionTopBottom
      },
      isOn: () => this.isBookmarked(),
      hasBookmarks: () => this.state.list().length > 0,
      onToggle: () => this.toggleCurrent(),
      onShowOverlay: () => this.showOverlay(),
      template: this.opts.templates.heart
    })

    this.overlay = new Overlay({
      getList: () => this.state.list(),
      onRemove: url => {
        this.remove(url)
        this.overlay.renderList()
        this.heart.update()
      },
      // CHANGED: ping on reorder too
      onReorder: (from, to) => {
        this.state.reorder(from, to)
        this.#ping('reordered', { from, to })
        this.overlay.renderList()
      },
      onClose: () => this.hideOverlay(),
      onSaveIdentity: id => {
        this.saveIdentity?.(id)
      },
      onRequestVerification: () => this.requestVerification?.(),
      onVerifyCode: code => this.verifyCode?.(code),
      onSync: () => this.syncFromServer(),
      onShare: () => this.shareFromServer(),
      // NEW: pass login awareness to overlay (for CTA)
      isLoggedIn: () => !!this.opts.userIsLoggedIn,
      loginUrl: this.opts.loginUrl,
      templates: {
        overlayBar: this.opts.templates.overlayBar,
        overlayShell: this.opts.templates.overlayShell,
        overlayRow: this.opts.templates.overlayRow
      }
    })

    this.unsubscribe = this.state.onChange(() => {
      this.heart.update()
    })
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

    this.heart.mount()
    this.#bindHotkey()

    if (this.opts.syncOnLoad && this.opts.userIsLoggedIn) {
      this.#syncIfStale().catch(e => {
        console.error('Sync failed', e)
        this.isInSync = false
      })
    }

    this.heart.update()
  }

  // Public API
  addCurrent () {
    return this.add(
      window.location.href,
      document.title || window.location.href
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

  add (url, title) {
    const ok = this.state.add(url, title)
    if (ok) this.#ping('added', { url, title })
    return ok
  }
  remove (url) {
    const ok = this.state.remove(url)
    if (ok) this.#ping('removed', { url })
    return ok
  }

  async syncFromServer () {
    if (!this.#canServer()) return
    const serverList = await this.net.getJSON(this.net.endpoints.bookmarks)
    this.state.mergeFromServer(serverList)
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

  async #ping (type, payload) {
    if (!this.#canServer()) return
    try {
      const { ok, data } = await this.net.post(this.net.endpoints.events, {
        type,
        payload,
        at: Date.now()
      })

      if (
        ok &&
        data?.status === 'success' &&
        Number.isInteger(data.numberOfBookmarks)
      ) {
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
  #canServer () {
    return !!this.net?.baseUrl
  }

  async #syncIfStale () {
    if (this.state.isInSync === true) return
    await this.syncFromServer()
  }
}
