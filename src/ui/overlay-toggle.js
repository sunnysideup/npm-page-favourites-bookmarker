export class OverlayToggle {

  /**
   * @param {{
   *  onClick:(e:Event)=>void,
   *  numberOfBookmarks:()=>number,
   *  templates:{
   *    overlayToggle:Function
   *  },
   *  appendTo:HTMLElement,
   * }} opts
   **/

  constructor (opts) {
    this.opts = opts
    this.el = null
    this.innerSpan = null
  }

  unmount() {
    this.el?.remove()
    this.el = null
    this.innerSpan = null
  }

  mount () {
    this.el = this.opts.templates.overlayToggle({
      onClick: (e) => this.opts.onClick(e),
      numberOfBookmarks: () => this.opts.numberOfBookmarks()
    })
    this.innerSpan = this.el.querySelector('.pf-number-of-bookmarks')
    this.opts.appendTo.appendChild(this.el)
    return this.el
  }

  update () {
    if (!this.el) this.mount()
    const numberOfBookmarks = this.opts.numberOfBookmarks()
    if(this.innerSpan) {
      if (numberOfBookmarks > 0) {
        this.innerSpan.textContent = String(numberOfBookmarks)
        this.innerSpan.style.display = ''
      } else {
        this.innerSpan.textContent = '0'
        this.innerSpan.style.display = 'none'
      }
    }
    if(numberOfBookmarks > 0) {
      this.el.className.remove( 'pf-no-bookmarks')
      this.el.className.add( 'pf-has-bookmarks')
    } else {
      this.el.className.add( 'pf-no-bookmarks')
      this.el.className.remove( 'pf-has-bookmarks')
    }
  }
}
