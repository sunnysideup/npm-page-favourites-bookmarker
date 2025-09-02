export class Heart {
  /**
   * @param {{
   *  position:{
   *    leftRight:'left'|'right',
   *    topBottom:'top'|'bottom'
   *  },
   *  isOn:()=>boolean,
   *  hasBookmarks:()=>boolean,
   *  onToggle:()=>void,
   *  onShowOverlay:()=>void,
   *  template:(args:{
   *    onClick:(e?:Event)=>void,
   *    onShowOverlay:()=>void,
   *    position:{
   *      leftRight:'left'|'right',
   *      topBottom:'top'|'bottom'
   *    },
   *    isOn:()=>boolean,
   *    hasBookmarks:()=>boolean
   *  })=>HTMLElement
   * }} opts
   */
  constructor (opts) {
    this.opts = opts
    this.mainHeartOnPage = null
    this.appendTo = null
  }

  mount () {
    if (this.mainHeartOnPage) return
    this.mainHeartOnPage = this.opts.template({
      onClick: e => {
        this.opts.onToggle()
        // show helper for ~1s
        const has = this.opts.hasBookmarks()
        if (has) {
          this.mainHeartOnPage.classList.add('pf-show-temp')
          setTimeout(() => this.mainHeartOnPage?.classList.remove('pf-show-temp'), this.opts.heartsLoadingDelay)
        }
      },
      onShowOverlay: this.opts.onShowOverlay,
      position: this.opts.position,
      isOn: this.opts.isOn,
      hasBookmarks: this.opts.hasBookmarks
    })
    this.appendTo = this.opts.appendTo
    this.appendTo.appendChild(this.mainHeartOnPage)
    this.update()
  }

  update () {
    if (!this.mainHeartOnPage) return
    const heartBtn = this.mainHeartOnPage.matches('.pf-heart')
      ? this.mainHeartOnPage
      : this.mainHeartOnPage.querySelector('.pf-heart')
    if (heartBtn) {
      const on = this.opts.isOn()
      heartBtn.classList.toggle('pf-on', on)
      heartBtn.textContent = on ? '❤' : '❤' // ♡
    }
    const showBtn = this.mainHeartOnPage.querySelector?.('.pf-show-bookmarks')
    if (showBtn) {
      const visible = this.opts.hasBookmarks()
      showBtn.style.display = visible ? '' : 'none'
    }
  }
  unmount () {
    this.mainHeartOnPage?.remove()
    this.mainHeartOnPage = null
  }
}
