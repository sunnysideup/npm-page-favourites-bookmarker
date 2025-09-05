export class Heart {
  /**
   * @param {{
   *  position:{
   *    leftRight:'left'|'right',
   *    topBottom:'top'|'bottom'
   *  },
   *  isOn:()=>boolean,
   *  numberOfBookmarks:()=>number,
   *  onToggle:()=>void,
   *  onShowOverlay:()=>void,
   *  heartsLoadingDelay?:number,
   *  appendTo?:HTMLElement,
   *  template:(args:{})=>HTMLElement
   *  htmlClasses Record<string, string>,
   *  phrases Record<string, string>,
   * }} opts
   */
  constructor (opts) {
    this.opts = opts
    this.unmount()
  }

  getEl() {
    return this.myHeart
  }

  mount () {
    if (this.myHeart) return
    const {wrap, heartButton, showBtn} = this.opts.template({
      onClick: e => {
        this.opts.onToggle()
        // show helper for ~1s
        const has = this.opts.numberOfBookmarks > 0
        this.update()
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
    this.heartBtn = heartButton
    this.showBtn = showBtn
    (this.opts.appendTo || document.body).appendChild(this.myHeart)
    // this.update()
    return this;
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



