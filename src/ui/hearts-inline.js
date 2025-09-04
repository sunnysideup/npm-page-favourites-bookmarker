import { Heart } from './heart.js'

const createOtherPageHearts = (el, opts) => {
  if (!el || el.__pfHeartAttached) return null
  el.__pfHeartAttached = true

  const { pfUrl: url, pfTitle: title, pfDescription: description, pfImagelink: imagelink } = el.dataset

  const heart = new Heart({
    appendTo: el,
    position: opts.position,
    isOn: () => opts.isBookmarked(url),
    numberOfBookmarks: () => Number(opts.numberOfBookmarks?.() ?? 0),
    onToggle: () => opts.onToggle({ url, title, description, imagelink, el }),
    onShowOverlay: opts.onShowOverlay,
    template: args => {
      const node = opts.template(args)
      node.classList.add('pf-heart--inline')
      return node
    }
  })

  heart.mount()
  return heart
}


const isHeart = (heart) =>
  !!heart && heart instanceof Heart

export function AttachInlineHearts(opts, root = document) {
  /** @type {Heart[]} */
  const hearts = [...root.querySelectorAll('.pf-heart-for-another-page')]
    .map(el => createOtherPageHearts(el, opts))
    .filter(isHeart)      // keep only real Heart instances
  return hearts
}
