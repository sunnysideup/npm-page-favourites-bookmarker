import { Heart } from './heart.js'

export class HeartsOtherPages {
  /**
   * @param {{
    *  position:null | {
    *    leftRight:'left'|'right',
    *    topBottom:'top'|'bottom'
    *  },
    *  isBookmarked:(url:string)=>boolean,
    *  numberOfBookmarks:()=>number,
    *  onToggle:(args:{url:string,title:string,description?:string,imagelink?:string,el:HTMLElement})=>void,
    *  onShowOverlay:()=>void,
    *  template:(args:{
    *    onClick:(e?:Event)=>void,
    *    onShowOverlay:(e?:Event)=>void,
    *    position:{
    *      leftRight:'left'|'right',
    *      topBottom:'top'|'bottom'
    *    },
    *    isOn:()=>boolean,
    *    numberOfBookmarks:()=>number
    *  })=>HTMLElement,
    *  heartsOtherPagesSelector: null | string,
    *  htmlClasses Record<string, string>,
    *  phrases Record<string, string>,
    *  appendTo?:HTMLElement,
   * }} opts
   */
  constructor (opts) {
    this.opts = opts
    this.hearts = []
  }

  getHearts() {
    return this.hearts.map(heart => heart).filter(this.#isHeart) || []
  }

  mount() {
    this.unmount()
    const outerSelector = this.opts.heartsOtherPagesSelector || 'body'
    const outerHeartsContainer = document.querySelector(outerSelector) || document.body
    if (!outerHeartsContainer) return []
    /** @type {Heart[]} */
    outerHeartsContainer.querySelectorAll('.' + this.opts.htmlClasses.heartForAnotherPage)
      .forEach(el => this.createAndMountHeart(el))
    return this.hearts
  }

  update() {
    this.hearts.forEach(heart => heart.update())
  }

  unmount() {
    this.hearts.forEach(heart => heart.unmount())
    this.hearts = []
  }

  createAndMountHeart = (el, forceUpdate = false) => {
    if (!el || el.__pfHeartAttached) return null
    el.__pfHeartAttached = true

    const { pfUrl: url, pfTitle: title, pfDescription: description, pfImagelink: imagelink } = el.dataset

    const heart = new Heart({
      appendTo: el,
      position: this.opts.position,
      isOn: () => this.opts.isBookmarked(url),
      numberOfBookmarks: () => Number(this.opts.numberOfBookmarks?.() ?? 0),
      onToggle: () => this.opts.onToggle({ url, title, description, imagelink, el }),
      onShowOverlay: this.opts.onShowOverlay,
      template: args => {
        const node = this.opts.template(args)
        node.classList.add(this.opts.htmlClasses.heartForAnotherPageInner)
        return node
      }
    })
    heart.mount()
    if(forceUpdate) {
      heart.update()
    }
    this.hearts.push(heart)

    return heart
  }

  removeHeart(el) {

  }

  #isHeart (heart) {
    !!heart && heart instanceof Heart
  }
}
