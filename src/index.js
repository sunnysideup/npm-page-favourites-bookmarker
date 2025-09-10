// classes
import { State } from './core/state.js'
import { Net } from './core/net.js'
import { HeartsOtherPages } from './ui/hearts-other-pages.js'
import { Heart } from './ui/heart.js'
import { Overlay } from './ui/overlay.js'
import { WatchDom } from './core/watch-dom.js'
import { OverlayToggle } from './ui/overlay-toggle.js'

// functions
import {
  deepMerge,
  toRelativeUrl,
  toAbsoluteUrl,
  noBubbleFn
} from './core/utils.js'

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

    syncLoggedInUsersToServer: true, // do we sync with server at all?
    mergeOnLoad: false,

    // heart this page
    heartPositionLeftRight: 'right', // position of heart icon
    heartPositionTopBottom: 'bottom', // position of heart icon
    heartingHotkey: 'KeyH', // key used to (un)heart the current page
    // other hearts
    heartsOtherPagesSelector: '', // CSS selector for sections to scan for hearts being added / removed to dom
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
  }

  #started = false
  #isInSync = false
  #hotkeyListeners = null
  #watchDom = null

  init ({} = {}) {
    requestAnimationFrame(() => {
      this.mount()
    })
  }

  mount () {
    if (this.#started) return
    this.#started = true
    this.#setupState()
    this.#setupNet()

    this.#createHearts()
    this.#createOverlay()
    this.#createOverlayToggle()

    if (this.state.mergeFromShareIfAvailable?.()) {
      this.showOverlay()
    }
    this.#watchDomInit()

    // sync if needed -
    // @TODO: throttle this! / check if this works

    if (this.opts.syncLoggedInUsersToServer && this.opts.userIsLoggedIn) {
      this.syncFromServer(true, true).catch(e => {
        console.error('Sync failed', e)
        this.#isInSync = false
      })
    } else if (this.opts.mergeOnLoad) {
      this.state.syncFromServer(false, false)
    }
    this.updateScreen()

    this.#bindHotkeys()
  }

  updateScreen () {
    this.allHearts.forEach(h => h.update())
    this.overlayToggle?.update()
    if (this.overlay.isShown()) {
      this.overlay.update()
    }
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

  toggleFromData (payload) {
    const { url, title, imagelink, description } = payload || {}

    if (!url) return false
    if (this.isBookmarked(url)) {
      return this.remove(url)
    }

    return this.add(url, title, imagelink, description)
  }

  add (url, title, imagelink = '', description = '') {
    url = toRelativeUrl(url)
    if (!url) return false
    const isOk = this.state.add(url, title, imagelink, description)
    if (isOk) this.#ping('added', { url, title, imagelink, description })
    return isOk
  }

  remove (url, index = null) {
    url = toRelativeUrl(url)
    if (!url) return false
    const isOk = this.state.remove(url, index)
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

  async syncFromServer (force = false, fullServerReplace = false) {
    if (!this.#canServer()) return
    if (force !== true && this.#isInSync === true) return
    const bookmarks = fullServerReplace ? [] : this.state.list()
    const { isOk, data } = await this.net.post(this.net.endpoints.bookmarks, {
      code: this.state.code,
      bookmarks: bookmarks
    })
    if (isOk && data?.status === 'success') {
      await this.state.setCodeAndShareLink(data)
      this.state.mergeFromServer(data, fullServerReplace)
    }
  }

  async copyShareLink (el) {
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
      if (el) {
        el.innerText = this.opts.phrases.copiedText
        setTimeout(() => {
          el.innerText = this.opts.phrases.shareText
        }, 2000)
      }
      return true
    } catch {
      return false
    }
  }

  clear () {
    this.state.clear()
  }

  destroy () {
    try {
      this.unsubscribe?.()
    } catch {}
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

  getEmailLink () {
    const shareLinkURL = this.getShareLinkAbsolute()
    const u = new URL('mailto:')
    u.searchParams.set(
      'subject',
      this.opts.phrases.favouritesTitle + ': ' + shareLinkURL
    )
    u.searchParams.set('body', shareLinkURL)
    return u.href
  }

  getShareLinkAbsolute () {
    const shareLink = this.state.getShareLink()
    if (!shareLink) return ''
    return new URL(shareLink, location.origin).href
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
        if (
          Number.isFinite(data.numberOfBookmarks) &&
          localCount !== data.numberOfBookmarks
        ) {
          this.#isInSync = false
          await this.syncFromServer()
        } else {
          this.#isInSync = true
        }
      } else {
        console.error('Ping not ok', type, payload, data)
        this.#isInSync = false
      }
    } catch (err) {
      console.error('Ping failed', err)
    }
  }

  #bindHotkeys () {
    if (this.#hotkeyListeners === null) {
      this.#hotkeyListeners = e => {
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
      typeof this.opts.loadOnThisPage === 'boolean'
        ? this.opts.loadOnThisPage
        : !!this.opts.loadByDefault
    if (this.shouldLoad && !this.heart) {
      this.heart = new Heart({
        onClick: noBubbleFn(() => this.toggleCurrent()),
        onShowOverlay: noBubbleFn(() => this.toggleOverlay()),
        numberOfBookmarks: () => this.state.list().length,
        isOn: () => this.isBookmarked(),
        appendTo:
          document.querySelector(
            '.' + this.opts.htmlClasses.heartForCurrentPageHolder
          ) ?? document.body,
        position: {
          leftRight: this.opts.heartPositionLeftRight,
          topBottom: this.opts.heartPositionTopBottom
        },
        heartsLoadingDelay: this.opts.heartsLoadingDelay,
        templates: {
          heart: this.opts.templates.heart
        },
        additionalClasses: [this.opts.htmlClasses.heartForCurrentPageInner],
        htmlClasses: this.opts.htmlClasses,
        phrases: this.opts.phrases
      })
      this.heart.mount()
    } else {
      this.heart = null
    }
  }

  #createOtherPageHearts () {
    this.otherHearts = new HeartsOtherPages({
      onClick: noBubbleFn(payload => this.toggleFromData(payload)),
      onShowOverlay: noBubbleFn(() => this.toggleOverlay()),
      numberOfBookmarks: () => this.state.list().length,
      isOn: url => this.isBookmarked(url),
      // no appendTo - hearts are appended to their own elements
      // no position - hearts are positioned via CSS
      heartsLoadingDelay: this.opts.heartsLoadingDelay,
      templates: {
        heart: this.opts.templates.heart
      },
      htmlClasses: this.opts.htmlClasses,
      phrases: this.opts.phrases
    })
    this.otherHearts.mount()
  }

  #setAllHearts () {
    this.allHearts = [
      this.heart,
      ...(this.otherHearts?.getHearts() || [])
    ].filter(Boolean)
  }

  #createOverlay () {
    this.overlay = new Overlay({
      getList: () => this.state.list(),
      onRemove: noBubbleFn((url, index) => {
        this.remove(url, index)
        this.overlay.update()
        this.updateScreen()
      }),
      // CHANGED: ping on reorder too
      onReorder: (from, to) => {
        this.state.reorder(from, to)
        this.#ping('reordered', { from, to })
        this.overlay.update()
      },
      onClose: noBubbleFn(() => this.hideOverlay()),
      onSync: noBubbleFn(() => this.syncFromServer(true, true)),
      onShare: noBubbleFn(el => this.copyShareLink(el)),
      // NEW: pass login awareness to overlay (for CTA)
      shareLink: this.state.getShareLink(),
      emailLink: this.getEmailLink(),
      userIsLoggedIn: !!this.opts.userIsLoggedIn,
      loginUrl: this.opts.loginUrl,
      templates: {
        overlayBar: this.opts.templates.overlayBar,
        overlayShell: this.opts.templates.overlayShell,
        overlayRow: this.opts.templates.overlayRow,
        overlayNoBookmarks: this.opts.templates.overlayNoBookmarks
      },
      htmlClasses: this.opts.htmlClasses,
      phrases: this.opts.phrases
    })
  }

  #createOverlayToggle () {
    this.overlayToggle = new OverlayToggle({
      onClick: noBubbleFn(() => {
        this.toggleOverlay()
      }),
      numberOfBookmarks: () => this.state.list().length,
      appendTo: document.querySelector(
        '.' + this.opts.htmlClasses.overlayToggleContainer
      ),
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

  #watchDomInit () {
    if (this.#watchDom) return
    if (!this.otherHearts) return
    if (!this.opts.heartsOtherPagesSelector) return

    const selector = this.opts.heartsOtherPagesSelector
    const root = document.querySelector(selector) || document.body
    if (!root) return
    this.#watchDom = new WatchDom({
      root: document.querySelector(this.opts.heartsOtherPagesSelector) ?? document.body,
      className: this.opts.htmlClasses.heartForAnotherPageHolder,
      onAdd: el => { this.otherHearts.createAndMountHeart(el); this.#setAllHearts() },
      onRemove: el => { this.otherHearts.removeHeart(el); this.#setAllHearts() },
      observeToggles: true,
      debug: true,
      immediateFlush: true
    }).start()
  }
}
