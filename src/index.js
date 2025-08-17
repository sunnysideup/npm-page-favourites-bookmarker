import { deepMerge } from './core/utils.js'
import { State } from './core/state.js'
import { Net } from './core/net.js'
import { defaultTemplates } from './ui/templates.js'
import { Heart } from './ui/heart.js'
import { Overlay } from './ui/overlay.js'

export class PageFaves {
  /** @param {object} opts */
  constructor (siteWideOpts = {}) {
    const pageConfig =
      window.npmPageFavouritesBookmarker &&
      typeof window.npmPageFavouritesBookmarker === 'object'
        ? window.npmPageFavouritesBookmarker
        : {}

    const defaults = {
      loadByDefault: true, // used when loadOnThisPage is undefined
      loadOnThisPage: undefined, // allow per-page override; undefined -> fall back to loadByDefault
      heartPositionLeftRight: 'right', // 'left' | 'right'
      heartPositionTopBottom: 'bottom', // 'top'  | 'bottom'
      overlayHotkey: 'KeyB',
      storage: 'local',
      storageKey: 'pf.bookmarks',
      baseUrl: '',
      endpoints: {
        events: 'events',
        bookmarks: 'bookmarks'
      },
      syncOnLoad: false,
      templates: defaultTemplates
    }

    // precedence: defaults < pageConfig < constructor opts
    this.opts = deepMerge(defaults, siteWideOpts, pageConfig)

    // resolve final load flag
    const { loadByDefault } = this.opts
    const { loadOnThisPage } = this.opts
    this.shouldLoad =
      typeof loadOnThisPage === 'boolean' ? loadOnThisPage : !!loadByDefault
    if (!this.shouldLoad) {
      return
    }
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
      hasBookmarks: () => this.state.list().length > 0, // NEW
      onToggle: () => this.toggleCurrent(),
      onShowOverlay: () => this.showOverlay(), // NEW
      template: this.opts.templates.heart
    })

    this.overlay = new Overlay({
      getList: () => this.state.list(),
      onRemove: url => {
        this.remove(url)
        this.overlay.renderList()
        this.heart.update()
      },
      onReorder: (from, to) => {
        this.state.reorder(from, to)
        this.overlay.renderList()
      },
      onClose: () => this.hideOverlay(),
      onSaveIdentity: id => {
        this.saveIdentity(id)
      },
      onRequestVerification: () => this.requestVerification(),
      onVerifyCode: code => this.verifyCode(code),
      onSync: () => this.syncFromServer().then(() => this.overlay.renderList()),
      getIdentity: () => this.state.identity,
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

  init () {
    this.heart.mount()
    this.#bindHotkey()
    if (this.opts.syncOnLoad && this.state.verified)
      this.syncFromServer().catch(() => {})
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
    const serverList = await this.net.getJSON(this.net.endpoints.bookmarks)
    this.state.mergeFromServer(serverList)
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
    if (!this.net.baseUrl) return
    try {
      await this.net.post(this.net.endpoints.events, {
        type,
        payload,
        at: Date.now()
      })
    } catch {}
  }
}
