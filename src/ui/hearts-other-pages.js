import { Heart } from './heart.js'

export class HeartsOtherPages {
  /**
    * @param {{
    *  onClick:(args:{url:string,title:string,description?:string,imagelink?:string,el:HTMLElement})=>void,
    *  onShowOverlay:()=>void,
    *  appendTo?:HTMLElement,
    *  position:null | {
    *    leftRight:'left'|'right',
    *    topBottom:'top'|'bottom'
    *  },
    *  templates:{
    *    heart:Function
    *  },
    *  heartsOtherPagesSelector: null | string,
    *  htmlClasses: Record<string, string>,
    *  phrases: Record<string, string>,
    * }} opts
    */
  constructor (opts) {
    this.opts = opts
    this.hearts = []
  }

  getHearts () {
    return this.hearts.map(heart => heart).filter(this.#isHeart) || []
  }

  mount () {
    this.unmount()
    const outerSelector = this.opts.heartsOtherPagesSelector || 'body'
    const outerHeartsContainer = document.querySelector(outerSelector) || document.body
    if (!outerHeartsContainer) return []
    /** @type {Heart[]} */
    outerHeartsContainer.querySelectorAll('.' + this.opts.htmlClasses.heartForAnotherPage)
      .forEach(el => this.createAndMountHeart(el))
    return this.hearts
  }

  update () {
    this.hearts.forEach(heart => heart.update())
  }

  unmount () {
    this.hearts.forEach(heart => heart.unmount())
    this.hearts = []
  }

  createAndMountHeart = (el, alsoUpdate = false) => {
    if (!el || el.__pfHeartAttached) return null
    el.__pfHeartAttached = true

    const { pfUrl: url, pfTitle: title, pfDescription: description, pfImagelink: imagelink } = el.dataset

    const heart = new Heart({
      onClick: () => this.opts.onToggle({ url, title, description, imagelink, el }),
      onShowOverlay: this.opts.onShowOverlay,
      numberOfBookmarks: () => Number(this.opts.numberOfBookmarks?.() ?? 0),
      appendTo: el,
      heartsLoadingDelay: this.opts.heartsLoadingDelay,
      templates: {
        heart: args => {
          const { wrap, heartBtn, showBtn } = this.opts.templates.heart(args)
          wrap.classList.add(this.opts.htmlClasses.heartForAnotherPageInner)
          return { wrap, heartBtn, showBtn }
        }
      },
      htmlClasses: this.opts.htmlClasses,
      phrases: this.opts.phrases
    })

    heart.mount()
    if (alsoUpdate) {
      heart.update()
    }
    this.hearts.push(heart)

    return heart
  }

  removeHeart (el) {
    return this.hearts.find((heart, i) => {
      if (heart.getEl() === el) {
        heart.unmount()
        this.hearts.splice(i, 1)
        return true
      }
      return false
    }) || null
  }

  #isHeart (heart) {
    return !!heart && heart instanceof Heart
  }
}
