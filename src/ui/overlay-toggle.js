export class OverlayToggle {

  /**
   * @param {{
   *  onClick:(e:Event)=>void,
   *  numberOfBookmarks:()=>number,
   *  templates:{
   *    overlayToggle:Function
   *  },
   *  htmlClasses Record<string, string>,
   *  phrases Record<string, string>,
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
    const {outer, inner} = this.opts.templates.showOverlayToggle({
      onClick: (e) => this.opts.onClick(e),
      numberOfBookmarks: () => this.opts.numberOfBookmarks()
    })
    this.opts.appendTo.appendChild(outer)
    this.innerSpan = inner
    return outer
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
      this.el.className.remove(this.opts.htmlClasses.noBookmarks)
      this.el.className.add( this.opts.htmlClasses.hasBookmarks)
    } else {
      this.el.className.add( this.opts.htmlClasses.noBookmarks)
      this.el.className.remove( this.opts.htmlClasses.hasBookmarks)
    }
  }
}
