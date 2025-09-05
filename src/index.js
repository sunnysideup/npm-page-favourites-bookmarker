// classes
import { State } from './core/state.js'
import { Net } from './core/net.js'
import { HeartsOtherPages } from './ui/hearts-other-pages.js'
import { Heart } from './ui/heart.js'
import { Overlay } from './ui/overlay.js'
import { WatchDom } from './core/watch-dom.js'
import { OverlayToggle } from './ui/overlay-toggle.js'

// functions
import { deepMerge, toRelativeUrl, toAbsoluteUrl } from './core/utils.js'

// objects
import { defaultTemplates } from './definitions/templates.js'
import { phrases } from './lang/phrases.js'
import { htmlClasses } from './definitions/html-classes.js'

export class PageFaves {
  static DEFAULTS = {
    // templates
    templates: defaultTemplates, // templates
    phrases, // phrases
    htmlClasses, // class names

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
    // other hearts
    heartsOtherPagesSelector: '', // CSS selector for sections to scan for hearts
    // all hearts
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
    nameOfTemporarySharedStore: 'pf_store_share_bookmark_list', // name of temporary shared store for sharing data

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
    loginUrl: ''

  }

  /**
   * @param {object} siteWideOpts
   **/
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

    if (this.state.mergeFromShareIfAvailable?.()) {
      this.showOverlay()
    }
    this.#watchDomInit()
  }

  #started = false
  #initPromise = null
  #isInSync = false
  #hotkeyListeners = null
  #watchDom = null

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
          document.addEventListener(evt, fire, { once: true, passive: true, signal })
        )
      }

      if (waitForLoad && document.readyState !== 'complete') {
        document.addEventListener('load', schedule, { once: true })
      } else {
        schedule()
      }
    })

    return this.#initPromise
  }

  updateScreen () {
    this.allHearts.forEach(h => h.update())
    this.overlayToggle?.update()
  }

  async #start () {
    if (this.#started) return
    this.#started = true

    // sync if needed -
    // @TODO: throttle this! / check if this works
    if (this.opts.syncOnLoad && this.opts.userIsLoggedIn) {
      this.#syncIfStale().catch(e => {
        console.error('Sync failed', e)
        this.#isInSync = false
      })
    }

    this.updateScreen()

    this.#bindHotkeys()
  }

  addCurrent () {
    return this.add(
      this.opts.currentPageUrl || window.location.href,
      this.#getCurrentTitle(),
      this.opts.currentPageImagelink || '',
      this.opts.currentPageDescription || ''
    )
  }

  removeCurrent () {
    return this.remove(this.opts.currentPageUrl || window.location.href)
  }

  toggleCurrent () {
    if (this.shouldLoad === false) return false
    return this.isBookmarked() ? this.removeCurrent() : this.addCurrent()
  }

  isBookmarked (url = '') {
    if (!url) {
      url = this.opts.currentPageUrl || window.location.href
    }
    return this.state.has(toRelativeUrl(url))
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

  add (url, title, imagelink = '', description = '') {
    url = toRelativeUrl(url)
    if (!url) return false
    const isOk = this.state.add(url, title, imagelink, description)
    if (isOk) this.#ping('added', { url, title, imagelink, description })
    return isOk
  }

  remove (url) {
    url = toRelativeUrl(url)
    if (!url) return false
    const isOk = this.state.remove(url)
    if (isOk) this.#ping('removed', { url })
    return isOk
  }

  list () {
    return this.state.list()
  }

  getLocalBookmarkCount () {
    return this.state.list().length
  }

  toggleOverlay () {
    if (this.overlay.isShown()) {
      return this.overlay.hide()
    } else {
      return this.overlay.show()
    }
  }

  showOverlay () {
    return this.overlay.show()
  }

  hideOverlay () {
    if (this.overlay.isShown()) {
      return this.overlay.hide()
    }
  }

  async syncFromServer () {
    if (!this.#canServer()) return
    const { isOk, data } = await this.net.post(this.net.endpoints.bookmarks, {
      code: this.state.code,
      bookmarks: this.state.list()
    })
    if (isOk && data?.status === 'success') {
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

  clear () {
    this.state.clear()
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
      document.removeEventListener('keydown', this.#hotkeyListeners)
      this.#hotkeyListeners = null
    }
    this.#watchDom?.destroy()
    this.#watchDom = null
  }

  async #ping (type, payload) {
    if (!this.#canServer()) return
    try {
      const { isOk, data } = await this.net.post(this.net.endpoints.events, {
        code: this.state.code,
        type,
        payload,
        at: Date.now()
      })

      if (isOk && data?.status === 'success') {
        await this.state.setCodeAndShareLink(data)
        const localCount = this.getLocalBookmarkCount()
        if (Number.isFinite(data.numberOfBookmarks) && localCount !== data.numberOfBookmarks) {
          this.#isInSync = false
          await this.syncFromServer()
        } else {
          this.#isInSync = true
        }
      }
    } catch (err) {
      console.error('Ping failed', err)
    }
  }

  #bindHotkeys () {
    if (this.#hotkeyListeners === null) {
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
      document.addEventListener('keydown', this.#hotkeyListeners)
    }
  }

  #setupState () {
    this.state = new State({
      storage: this.opts.storage,
      storageKey: this.opts.storageKey,
      nameOfTemporarySharedStore: this.opts.nameOfTemporarySharedStore
    })
    this.unsubscribe = this.state.onChange(() => {
      this.updateScreen()
    })
  }

  #setupNet () {
    this.net = new Net({
      baseUrl: this.opts.baseUrl,
      endpoints: this.opts.endpoints
    })
  }

  #createHearts () {
    this.#createPageHeart()
    this.#createOtherPageHearts()
    this.#setAllHearts()
  }

  #createPageHeart () {
    this.shouldLoad =
      typeof this.opts.loadOnThisPage === 'boolean' ? this.opts.loadOnThisPage : !!this.opts.loadByDefault
    if (this.shouldLoad && !this.heart) {
      this.heart = new Heart({
        numberOfBookmarks: () => this.state.list().length,
        onClick: () => this.toggleCurrent(),
        onShowOverlay: () => this.showOverlay(),
        appendTo: document.querySelector('.' + this.opts.htmlClasses.heartForCurrentPage) ?? document.body,
        position: {
          leftRight: this.opts.heartPositionLeftRight,
          topBottom: this.opts.heartPositionTopBottom
        },
        heartsLoadingDelay: this.opts.heartsLoadingDelay,
        templates: {
          heart: this.opts.templates.heart
        },
        htmlClasses: this.opts.htmlClasses,
        phrases: this.opts.phrases
      })
      this.heart.mount()
    } else {
      this.heart = null
    }
  }

  #createOtherPageHearts () {
    this.otherHearts = new HeartsOtherPages(
      {
        onClick: (ctx) => this.toggleFromElement(ctx?.el ?? null),
        onShowOverlay: () => this.showOverlay(),
        numberOfBookmarks: () => this.state.list().length,
        // no appendTo - hearts are appended to their own elements
        // no position - hearts are positioned via CSS
        heartsLoadingDelay: this.opts.heartsLoadingDelay,
        templates: {
          heart: this.opts.templates.heart
        },
        htmlClasses: this.opts.htmlClasses,
        phrases: this.opts.phrases
      }
    )
    this.otherHearts.mount()
  }

  #setAllHearts () {
    this.allHearts = [this.heart, ...(this.otherHearts?.getHearts() || [])].filter(Boolean)
  }

  #createOverlay () {
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
      shareLink: () => this.state.getShareLink(),
      userIsLoggedIn: !!this.opts.userIsLoggedIn,
      loginUrl: this.opts.loginUrl,
      templates: {
        overlayBar: this.opts.templates.overlayBar,
        overlayShell: this.opts.templates.overlayShell,
        overlayRow: this.opts.templates.overlayRow
      },
      htmlClasses: this.opts.htmlClasses,
      phrases: this.opts.phrases
    })
  }

  #createOverlayToggle () {
    this.overlayToggle = new OverlayToggle({
      onClick: (e) => { e.preventDefault(); e.stopPropagation(); this.showOverlay() },
      numberOfBookmarks: () => this.state.list().length,
      appendTo: document.querySelector('.' + this.opts.htmlClasses.overlayToggleContainer),
      templates: {
        showOverlayToggle: this.opts.templates.showOverlayToggle
      },
      htmlClasses: this.opts.htmlClasses,
      phrases: this.opts.phrases
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
    if (this.#isInSync === true) return
    await this.syncFromServer()
  }

  #watchDomInit () {
    if (this.#watchDom) return
    if (!this.otherHearts) return
    if (!this.opts.heartsOtherPagesSelector) return

    const selector = this.opts.heartsOtherPagesSelector
    const root = document.querySelector(selector) || document.body
    if (!root) return

    this.#watchDom = new WatchDom({
      root,
      className: this.opts.htmlClasses.heartForAnotherPage,
      onAdd: el => {
        this.otherHearts.createAndMountHeart(el)
        this.#setAllHearts()
      },
      onRemove: el => {
        this.otherHearts.removeHeart(el)
        this.#setAllHearts()
      },
      observeToggles: false
    }).start()
  }
}
