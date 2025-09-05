//classes
import { State } from './core/state.js'
import { Net } from './core/net.js'
import { HeartsOtherPages } from './ui/hearts-other-pages.js'
import { Heart } from './ui/heart.js'
import { Overlay } from './ui/overlay.js'
import { OverlayToggle } from './ui/overlay-toggle.js'

// functions
import { deepMerge, toRelativeUrl,toAbsoluteUrl } from './core/utils.js'

// objects
import { defaultTemplates } from './definitions/templates.js'
import { phrases } from "./lang/phrases.js"
import { htmlClasses } from "./definitions/html-classes.js"
export class PageFaves {

  static DEFAULTS = {
    // templates
    templates: defaultTemplates, // templates
    phrases: phrases, // phrases

    // class names
    classNames: {
      heartIsHot: 'pf-heart-is-hot',
      showBookmarks: 'pf-show-bookmarks',
      numberOfBookmarks: 'pf-number-of-bookmarks',
      heartWrap: 'pf-heart-wrap',
      heart: 'pf-heart',
      bar: 'pf-bar',
      title: 'pf-title',
      btn: 'pf-btn',
      login: 'pf-login',
      share: 'pf-share',
      close: 'pf-close',
      overlay: 'pf-overlay',
      list: 'pf-list',
      row: 'pf-row',
      sort: 'pf-sort',
      link: 'pf-link',
      del: 'pf-del',
      on: 'pf-on',
      off: 'pf-off',
      heartForAnotherPage: 'pf-heart-for-another-page',
      heartForAnotherPageInner: 'pf-heart-for-another-page-inner',
      noBookmarks: 'pf-no-bookmarks',
      hasBookmarks: 'pf-has-bookmarks',
      heartForCurrentPage: 'pf-heart-for-current-page',
    },

    // does it load?
    loadByDefault: true, // load on page?
    loadOnThisPage: undefined, // load on this specific page?

    // syncs and merge:

    syncOnLoad: false, // do we sync with server at all?
    mergeOnLoad: undefined,

    // heart this page
    heartPositionLeftRight: 'right', // position of heart icon
    heartPositionTopBottom: 'bottom', // position of heart icon
    heartingHotkey: 'KeyH', // key used to (un)heart the current page
    heartsLoadingDelay: 1000, // in ms, how long hearts stay 'hot' after being clicked

    // current page
    currentPageUrl: undefined,
    currentPageTitle: undefined,
    currentPageImagelink: undefined,
    currentPageDescription: undefined,
    selectorForTitle: 'h1', // e.g. h1

    // overlay
    overlayHotkey: 'KeyB', // key used to show / hide overlay

    // storage
    storage: 'local', // how to store data
    storageKey: 'pf_store', // storage key
    nameOfTemporarySharedStore: 'pf_store_share_bookmark_list',  // name of temporary shared store for sharing data
    mode: 'local',
    nameOfStore: 'pf_store',
    nameOfTemporarySharedStore: 'pf_store_share_bookmark_list',

    // server
    baseUrl: '', // base url for all links
    endpoints: {
      events: 'events',
      bookmarks: 'bookmarks'
    },
    timeout: undefined, // in ms
    headers: undefined, // additional headers for net requests
    credentials: undefined, // e.g. 'include' for cookies
    fetch: undefined, // custom fetch implementation

    // login
    userIsLoggedIn: false,
    loginUrl: '',

  }

  isInSync = false

  /** @param {object} siteWideOpts */
  constructor (siteWideOpts = {}) {
    const pageConfig =
      window.npmPageFavouritesBookmarkerConfig &&
      typeof window.npmPageFavouritesBookmarkerConfig === 'object'
        ? window.npmPageFavouritesBookmarkerConfig
        : {}
    // precedence: defaults < siteWideOpts < pageConfig
    this.opts = deepMerge(PageFaves.DEFAULTS, siteWideOpts, pageConfig)

    this.#setupState()
    this.#setupNet()

    this.#createHearts()
    this.#createOverlay()
    this.#createOverlayToggle()

    this.unsubscribe = this.state.onChange(() => {
      this.updateScreen()
    })

    if (this.state.mergeFromShareIfAvailable?.()) {
      this.showOverlay()
    }
  }

  #started = false
  #initPromise = null

  init ({
    delayMs = 20,
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

  reinitialize () {
    this.#started = false
    this.#createHearts()
    this.#start()
  }

  updateScreen() {
    this.allHearts.forEach(h => h.update())
    this.overlayToggle?.update()
  }

  async #start () {
    if (this.#started) return
    this.#started = true

    this.allHearts.forEach(h => h.mount())

    // sync if needed -
    // @TODO: throttle this! / check if this works
    if (this.opts.syncOnLoad && this.opts.userIsLoggedIn) {
      this.#syncIfStale().catch(e => {
        console.error('Sync failed', e)
        this.isInSync = false
      })
    }

    this.updateScreen()

    this.#bindHotkeys()
  }

  destroy () {
    try { this.unsubscribe?.() } catch {}
    this.allHearts?.forEach(h => h.unmount?.())
    this.overlay?.unmount()
    this.overlayToggle?.unmount()
    this.state = null
    this.net = null
    this.heart = null
    this.otherHearts = null
    this.allHearts = null
    this.overlay = null
    this.overlayToggle = null
    this.#started = false

    if (this.#hotkeyListeners) {
      window.removeEventListener('keydown', this.#hotkeyListeners)
      this.#hotkeyListeners = null
    }

  }


  toggleFromElement (el) {
    const url = el?.dataset?.pfUrl || el?.href || ''

    if (!url) return false
    if (this.isBookmarked(url)) {
      return this.remove(url)
    }
    const title = el.dataset.pfTitle || el.innerText || el.textContent || url
    const imagelink = el.dataset.pfImagelink || ''
    const description = el.dataset.pfDescription || ''
    return this.add(url, title, imagelink, description)
  }

  // Public API
  addCurrent () {
    return this.add(
      this.opts.currentPageUrl || window.location.href,
      this.#getCurrentTitle(),
      this.opts.currentPageImagelink || '',
      this.opts.currentPageDescription ||  ''
    )
  }

  removeCurrent () {
    return this.remove(window.location.href)
  }

  isBookmarked (url = window.location.href) {
    return this.state.has(toRelativeUrl(url))
  }

  list () {
    return this.state.list()
  }

  getLocalBookmarkCount () {
    return this.state.list().length
  }

  toggleCurrent () {
    if(this.shouldLoad === false) return false
    return this.isBookmarked() ? this.removeCurrent() : this.addCurrent()
  }

  showOverlay () {
    if (this.overlay.isShown()) {
      return this.overlay.show()
    } else {
      return this.overlay.show()
    }

  }

  hideOverlay () {
    if (!this.overlay.isShown()) {
      return this.overlay.show()
    } else {
      return this.overlay.hide()
    }

  }

  add (url, title, imagelink = '', description = '') {
    url = toRelativeUrl(url)
    const ok = this.state.add(url, title, imagelink, description)
    if (ok) this.#ping('added', { url, title, imagelink, description })
    return ok
  }

  remove (url) {
    url = toRelativeUrl(url)
    const ok = this.state.remove(url)
    if (ok) this.#ping('removed', { url })
    return ok
  }

  clear () {
    this.state.clear()
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
        const localCount = this.getLocalBookmarkCount()
        if (Number.isFinite(data.numberOfBookmarks) && localCount !== data.numberOfBookmarks) {
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

  async copyShareLink (event) {
    event.preventDefault()
    const el = event.target
    let link = this.state.getShareLink()
    if (!link) return false
    link = toAbsoluteUrl(link)
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = link
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        textarea.remove()
      }
      el.innerText = '✓ copied'
      return true
    } catch {
      return false
    }
  }

  async shareFromServer () {
    await this.syncFromServer()
    this.overlay.update()
  }

  // Private
  #hotkeyListeners = null

  #bindHotkeys () {
    if(this.#hotkeyListeners === null) {
      this.#hotkeyListeners = (e) => {
        const tag = (e.target && e.target.tagName) || ''
        if (e.repeat) return
        if (/(INPUT|TEXTAREA|SELECT)/.test(tag)) return
        if (e.target?.isContentEditable) return
        const sameMods = e.ctrlKey && e.shiftKey && !e.metaKey && !e.altKey
        if (sameMods) {
          if (e.code === this.opts.overlayHotkey) {
            e.preventDefault()
            this.showOverlay()
          } else if (e.code === this.opts.heartingHotkey) {
            e.preventDefault()
            this.toggleCurrent()
          }
        }
      }
      window.addEventListener('keydown', this.#hotkeyListeners)
    }
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
    this.#createPageHeart()
    this.#createOtherPageHearts()
    this.allHearts = [this.heart, ...(this.otherHearts ?? [])].filter(Boolean)
  }


  #createPageHeart() {
    this.shouldLoad =
      typeof this.opts.loadOnThisPage === 'boolean' ? this.opts.loadOnThisPage : !!this.opts.loadByDefault
    if (this.shouldLoad && !this.heart) {
      this.heart = new Heart({
        appendTo: document.querySelector(this.opts.classNames.heartForCurrentPage) ?? document.body,
        position: {
          leftRight: this.opts.heartPositionLeftRight,
          topBottom: this.opts.heartPositionTopBottom
        },
        isOn: () => this.isBookmarked(),
        numberOfBookmarks: () => this.state.list().length,
        onToggle: () => this.toggleCurrent(),
        onShowOverlay: () => this.showOverlay(),
        template: this.opts.templates.heart,
        classNames: this.opts.classNames,
        heartsLoadingDelay: this.opts.heartsLoadingDelay
      })
      this.heart.mount()
    } else {
      this.heart = null
    }

  }

  #createOtherPageHearts() {

    const heartsOtherPages = HeartsOtherPages(
      {
        isBookmarked: (url) => this.isBookmarked(url),
        numberOfBookmarks: () => this.state.list().length,
        onToggle: (ctx) => this.toggleFromElement(ctx?.el ?? null),
        onShowOverlay: () => this.showOverlay(),
        template: this.opts.templates.heart,
        classNames: this.opts.classNames,
      }
    )
    heartsOtherPages.mount()
    this.otherHearts = heartsOtherPages.getEls()
  }

  #createOverlay() {
    this.overlay = new Overlay({
      getList: () => this.state.list(),
      onRemove: url => {
        this.remove(url)
        this.overlay.update()
        this.updateScreen()
      },
      // CHANGED: ping on reorder too
      onReorder: (from, to) => {
        this.state.reorder(from, to)
        this.#ping('reordered', { from, to })
        this.overlay.update()
      },
      onClose: (event) => this.hideOverlay(event),
      onSync: (event) => this.syncFromServer(event),
      onShare: (event) => this.copyShareLink(event),
      // NEW: pass login awareness to overlay (for CTA)
      isLoggedIn: () => !!this.opts.userIsLoggedIn,
      loginUrl: this.opts.loginUrl,
      shareLink: () => this.state.getShareLink(),
      templates: {
        overlayBar: this.opts.templates.overlayBar,
        overlayShell: this.opts.templates.overlayShell,
        overlayRow: this.opts.templates.overlayRow
      },
      classNames: this.opts.classNames,
    })
  }

  #createOverlayToggle() {
    this.overlayToggle = new OverlayToggle({
      onClick: (e) => { e.preventDefault(); e.stopPropagation(); this.showOverlay() },
      numberOfBookmarks: () => this.state.list().length
    })
    this.overlayToggle.mount()
  }

  #getCurrentTitle () {
    return (
      this.opts.currentPageTitle ||
      document.querySelector(this.opts.selectorForTitle)?.textContent?.trim() ||
      document.title ||
      ''
    )
  }

  #canServer () {
    return !!this.net?.baseUrl
  }

  async #syncIfStale () {
    if (this.isInSync === true) return
    await this.syncFromServer()
  }

  #queue = []

  #pingScheduled = false

  #schedulePing (type, payload) {
    this.#queue.push({type, payload})
    if (this.#pingScheduled) return
    this.#pingScheduled = true
    setTimeout(async () => {
      const batch = this.#queue.splice(0)
      this.#pingScheduled = false
      await this.#ping('batch', batch)
    }, 150)
  }
}
