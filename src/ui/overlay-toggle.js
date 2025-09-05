export class OverlayToggle {
  /**
   * @param {{
   *  onClick:(e:Event)=>void,
   *  numberOfBookmarks:()=>number,
   *  appendTo:HTMLElement,
   *  templates:{
   *    overlayToggle:Function
   *  },
   *  htmlClasses Record<string, string>,
   *  phrases Record<string, string>,
   * }} opts
   **/

  constructor (opts) {
    this.unmount()
    this.opts = opts
  }

  unmount () {
    this.el?.remove()
    this.el = null
    this.innerSpan = null
  }

  mount () {
    if (this.opts.appendTo) {
      const { outer, inner } = this.opts.templates.showOverlayToggle({
        onClick: (e) => this.opts.onClick(e),
        htmlClasses: this.opts.htmlClasses,
        phrases: this.opts.phrases
      })
      this.opts.appendTo.appendChild(outer)
      this.innerSpan = inner
    }
  }

  update () {
    if (!this.el) {
      return
    }
    const numberOfBookmarks = this.opts.numberOfBookmarks()
    if (numberOfBookmarks > 0) {
      this.el.className.remove(this.opts.htmlClasses.noBookmarks)
      this.el.className.add(this.opts.htmlClasses.hasBookmarks)
    } else {
      this.el.className.add(this.opts.htmlClasses.noBookmarks)
      this.el.className.remove(this.opts.htmlClasses.hasBookmarks)
    }
    if (this.innerSpan) {
      if (numberOfBookmarks > 0) {
        this.innerSpan.textContent = String(numberOfBookmarks)
        this.innerSpan.style.display = ''
      } else {
        this.innerSpan.textContent = '0'
        this.innerSpan.style.display = 'none'
      }
    }
  }
}
