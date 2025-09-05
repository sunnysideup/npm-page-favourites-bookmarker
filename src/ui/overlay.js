export class Overlay {
  /**
   * @param {{
   *   getList:()=>Array<{url:string,title:string,ts:number}>,
   *   onRemove:(url:string)=>void,
   *   onReorder:(from:number,to:number)=>void,
   *   onClose:()=>void,
   *   onSync:()=>Promise<void>,
   *   onShare:()=>Promise<void>,
   *   shareLink?: string,
   *   userIsLoggedIn: boolean,
   *   loginUrl?: string,
   *   templates:{
   *     overlayBar:Function,
   *     overlayShell:Function,
   *     overlayRow:Function
   *   }
   *   htmlClasses Record<string, string>,
   *   phrases Record<string, string>,
   * }} opts
   */
  constructor (opts) {
    this.opts = opts
    this.el = null
    this.listEl = null
  }

  #isShown = false

  isShown () {
    return this.#isShown
  }

  toggle () {
    if (this.#isShown) {
      this.hide()
    } else {
      this.show()
    }
  }

  show () {
    if (!this.#isShown) {
      this.mount()
    }
  }

  hide () {
    this.unmount()
  }

  getEl () {
    return this.el
  }

  unmount () {
    document.removeEventListener('keydown', this.#escListener)
    this.el?.remove()
    this.el = this.listEl = null
    this.#escListener = null
    this.#isShown = false
  }

  mount () {
    const { wrap, list } = this.opts.templates.overlayShell(
      {
        htmlClasses: this.opts.htmlClasses,
        phrases: this.opts.phrases
      }
    )
    const bar = this.opts.templates.overlayBar({
      onClose: (event) => this.opts.onClose(event),
      onSync: (event) => this.opts.onSync(event),
      onShare: (event) => this.opts.onShare(event),
      userIsLoggedIn: this.opts.userIsLoggedIn,
      loginUrl: this.opts.loginUrl,
      shareLink: this.opts.shareLink,
      htmlClasses: this.opts.htmlClasses,
      phrases: this.opts.phrases
    })
    wrap.prepend(bar)
    document.body.appendChild(wrap)
    this.el = wrap
    this.listEl = list
    this.#renderList()
    this.#escListener = e => {
      if (e.code === 'Escape') {
        this.hide()
      }
    }
    document.addEventListener('keydown', this.#escListener)
    this.#isShown = true
  }

  update () {
    this.#renderList()
  }

  #renderList () {
    // once mounted, it should not be falsy
    if (!this.listEl) return
    this.listEl.innerHTML = ''
    const frag = document.createDocumentFragment()
    this.opts.getList().forEach((item, i) => {
      const row = this.opts.templates.overlayRow({
        item,
        index: i,
        onRemove: url => this.opts.onRemove(url),
        onReorder: (from, to) => this.opts.onReorder(from, to),
        htmlClasses: this.opts.htmlClasses,
        phrases: this.opts.phrases
      })
      frag.appendChild(row)
    })
    this.listEl.appendChild(frag)
  }

  #escListener = null
}
