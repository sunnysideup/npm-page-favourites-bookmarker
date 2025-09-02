const createOtherPageHearts = function (
  el,
  opts /* {
    position:{leftRight:'left'|'right', topBottom:'top'|'bottom'},
    isOn:(url:string)=>boolean,
    hasBookmarks:()=>boolean,
    onToggle:(ctx:{url:string,title?:string,description?:string,imagelink?:string,el:HTMLElement})=>void,
    onShowOverlay:()=>void,
    template: Heart['opts']['template']
  } */
) {
  if (!el || el.__pfHeartAttached) return null
  el.__pfHeartAttached = true

  const { pfUrl: url, pfTitle: title, pfDescription: description, pfImagelink: imagelink } = el.dataset

  const oneHeart = new Heart({
    appendTo: el,
    position: opts.position || undefined,
    isOn: () => opts.isBookmarked(url),
    hasBookmarks: opts.hasBookmarks,
    onToggle: () => opts.onToggle(el),
    onShowOverlay: opts.onShowOverlay,
    template: args => {
      const node = opts.template(args)
      node.classList.add('pf-heart--inline')
      return node
    }
  })

  // mount normally, then relocate into `el` (no change to Heart class needed)
  oneHeart.mount()

  return oneHeart
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
