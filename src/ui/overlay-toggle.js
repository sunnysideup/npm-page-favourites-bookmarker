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
      const { btn, span } = this.opts.templates.showOverlayToggle({
        onClick: this.opts.onClick,
        htmlClasses: this.opts.htmlClasses,
        phrases: this.opts.phrases
      })
      this.el = btn
      this.opts.appendTo.appendChild(btn)
      this.innerSpan = span
    }
  }

  update () {
    if (!this.el) {
      return
    }
    const numberOfBookmarks = this.opts.numberOfBookmarks()
    if (numberOfBookmarks > 0) {
      this.el.classList.remove(this.opts.htmlClasses.noBookmarks)
      this.el.classList.add(this.opts.htmlClasses.hasBookmarks)
    } else {
      this.el.classList.add(this.opts.htmlClasses.noBookmarks)
      this.el.classList.remove(this.opts.htmlClasses.hasBookmarks)
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
