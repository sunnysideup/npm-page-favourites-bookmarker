export class Overlay {
  /**
   * @param {{
   *   getList:()=>Array<{url:string,title:string,ts:number}>,
   *   onRemove:(url:string)=>void,
   *   onReorder:(from:number,to:number)=>void,
   *   onClose:()=>void,
   *   onSync:()=>Promise<void>,
   *   onShare:()=>Promise<void>,
   *   isLoggedIn?: ()=>boolean,
   *   loginUrl?: string,
   *   templates:{
   *     overlayBar:Function,
   *     overlayShell:Function,
   *     overlayRow:Function
   *   }
   * }} opts
   */
  constructor (opts) {
    this.opts = opts
    this.el = null
    this.listEl = null
  }

  show () {
    this.el ? (this.el.style.display = 'flex') : this.mount()
  }

  hide () {
    this.el?.remove()
    this.el = this.listEl = null
  }

  mount () {
    const { wrap, list } = this.opts.templates.overlayShell()
    const bar = this.opts.templates.overlayBar({
      onClose: (event) => this.opts.onClose(event),
      onSync: (event) => this.opts.onSync(event),
      onShare: (event) => this.opts.onShare(event),
      isLoggedIn: this.opts.isLoggedIn,
      loginUrl: this.opts.loginUrl,
      shareLink: this.opts.shareLink
    })
    wrap.prepend(bar)
    document.body.appendChild(wrap)
    this.el = wrap
    this.listEl = list
    this.renderList()
  }

  renderList () {
    if (!this.listEl) return
    this.listEl.innerHTML = ''
    const frag = document.createDocumentFragment()
    this.opts.getList().forEach((item, i) => {
      const row = this.opts.templates.overlayRow({
        item,
        index: i,
        onRemove: url => this.opts.onRemove(url),
        onReorder: (from, to) => this.opts.onReorder(from, to)
      })
      frag.appendChild(row)
    })
    this.listEl.appendChild(frag)
  }
}
