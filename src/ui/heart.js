export class Heart {
  /**
   * @param {{
   *  position:'left'|'right',
   *  isOn:()=>boolean,
   *  onToggle:()=>void,
   *  template:(args:{onClick:()=>void, position:'left'|'right', isOn:()=>boolean})=>HTMLElement
   * }} opts
   */
  constructor (opts) {
    this.opts = opts
    this.el = null
  }

  mount () {
    if (this.el) return
    this.el = this.opts.template({
      onClick: () => this.opts.onToggle(),
      position: this.opts.position,
      isOn: this.opts.isOn
    })
    document.body.appendChild(this.el)
    this.update()
  }

  update () {
    if (!this.el) return
    this.el.textContent = this.opts.isOn() ? '❤' : '♡'
    this.el.classList.toggle('pf-on', this.opts.isOn())
  }

  unmount () {
    this.el?.remove()
    this.el = null
  }
}
