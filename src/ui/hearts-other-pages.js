import { Heart } from './heart.js'

export class HeartOtherPages {
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
    *  appendTo?:HTMLElement,
   * }} opts
   */
  constructor (opts) {
    this.opts = opts
    this.hearts = []
  }

  getEls() {
    return this.hearts.map(heart => heart.getEl()).filter(this.#isHeart) || []
  }

  mount() {
    /** @type {Heart[]} */
    this.hearts = [...root.querySelectorAll('.pf-heart-for-another-page')]
      .map(el => this.#createAndMountHeart(el))
      .filter(this.#isHeart)      // keep only real Heart instances
    return this.hearts
  }

  update() {
    this.hearts.forEach(heart => heart.update())
  }

  unmount() {
    this.hearts.forEach(heart => heart.unmount())
    this.hearts = []
  }

  #createAndMountHeart = (el) => {
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
        node.classList.add('pf-heart--other-pages')
        return node
      }
    })
    heart.mount()

    return heart
  }

  #isHeart (heart) {
    !!heart && heart instanceof Heart
  }
}
