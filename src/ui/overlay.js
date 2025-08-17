export class Overlay {
  /**
   * @param {{
   *   getList:()=>Array<{url:string,title:string,ts:number}>,
   *   onRemove:(url:string)=>void,
   *   onReorder:(from:number,to:number)=>void,
   *   onClose:()=>void,
   *   onSaveIdentity:(id:{email:string,phone:string})=>void,
   *   onRequestVerification:()=>Promise<void>,
   *   onVerifyCode:(code:string)=>Promise<boolean>,
   *   onSync:()=>Promise<void>,
   *   getIdentity:()=>({email?:string,phone?:string}|null),
   *   // NEW (optional)
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
      onClose: () => this.opts.onClose(),
      onSaveIdentity: id => this.opts.onSaveIdentity(id),
      onRequestVerification: () => this.opts.onRequestVerification(),
      onVerifyCode: code => this.opts.onVerifyCode(code),
      onSync: () => this.opts.onSync(),
      identity: this.opts.getIdentity?.(),
      // NEW: pass login awareness to template
      isLoggedIn: this.opts.isLoggedIn,
      loginUrl: this.opts.loginUrl
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
