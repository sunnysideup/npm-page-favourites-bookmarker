export class Heart {
  /**
   * @param {{
   *  onClick:()=>void,
   *  onShowOverlay:()=>void,
   *  appendTo?:HTMLElement,
   *  position:{
   *    leftRight:'left'|'right',
   *    topBottom:'top'|'bottom'
   *  },
   *  heartsLoadingDelay?:number,
   *  templates:{
   *    heart:Function
   *  },
   *  htmlClasses Record<string, string>,
   *  phrases Record<string, string>,
   * }} opts
   */
  constructor (opts) {
    this.unmount()
    this.opts = opts
  }

  getEl () {
    return this.myHeart
  }

  mount () {
    if (this.myHeart) return
    const { wrap, heartBtn, showBtn } = this.opts.templates.heart({
      onClick: e => {
        this.opts.onClick()
        // show helper for ~1s
        this.update()
        const has = this.opts.numberOfBookmarks() > 0
        if (has) {
          this.myHeart.classList.add(this.opts.htmlClasses.heartIsHot)
          const delay = this.opts.heartsLoadingDelay ? this.opts.heartsLoadingDelay : 1000
          setTimeout(() => this.myHeart?.classList.remove(this.opts.htmlClasses.heartIsHot), delay)
        }
      },
      onShowOverlay: this.opts.onShowOverlay,
      position: this.opts.position,
      isOn: this.opts.isOn,
      numberOfBookmarks: this.opts.numberOfBookmarks,
      htmlClasses: this.opts.htmlClasses,
      phrases: this.opts.phrases
    })
    this.myHeart = wrap
    this.heartBtn = heartBtn
    this.showBtn = showBtn
    const appendTo = this.opts.appendTo || document.body
    appendTo.appendChild(this.myHeart)
    // this.update()
    return this
  }

  update () {
    if (!this.myHeart) return

    if (this.heartBtn) {
      const on = this.opts.isOn()
      this.heartBtn.classList.toggle(this.opts.htmlClasses.on, on)
      this.heartBtn.textContent = on ? this.opts.phrases.heartOn : this.opts.phrases.heartOff
      this.heartBtn.title = on ? this.opts.phrases.removeBookmark : this.opts.phrases.addBookmark
    }
    if (this.showBtn) {
      const visible = this.opts.numberOfBookmarks() > 0
      this.showBtn.style.display = visible ? '' : 'none'
    }
  }

  unmount () {
    this.myHeart?.remove()
    this.myHeart = null
    this.heartBtn = null
    this.showBtn = null
  }
}
