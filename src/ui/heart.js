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
    this.el = null
  }
  mount () {
    if (this.el) return
    this.el = this.opts.template({
      onClick: e => {
        this.opts.onToggle()
        // show helper for ~1s
        const has = this.opts.hasBookmarks()
        if (has) {
          this.el.classList.add('pf-show-temp')
          setTimeout(() => this.el?.classList.remove('pf-show-temp'), 2000)
        }
      },
      onShowOverlay: this.opts.onShowOverlay,
      position: this.opts.position,
      isOn: this.opts.isOn,
      hasBookmarks: this.opts.hasBookmarks
    })
    document.body.appendChild(this.el)
    this.update()
  }

  update () {
    if (!this.el) return
    const heartBtn = this.el.matches('.pf-heart')
      ? this.el
      : this.el.querySelector('.pf-heart')
    if (heartBtn) {
      const on = this.opts.isOn()
      heartBtn.classList.toggle('pf-on', on)
      heartBtn.textContent = on ? '❤' : '❤' // ♡
    }
    const showBtn = this.el.querySelector?.('.pf-show-bookmarks')
    if (showBtn) {
      const visible = this.opts.hasBookmarks()
      showBtn.style.display = visible ? '' : 'none'
    }
  }
  unmount () {
    this.el?.remove()
    this.el = null
  }
}
