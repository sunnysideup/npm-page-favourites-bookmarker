export const qs = (root, sel) =>
  /** @type {HTMLElement} */ (root.querySelector(sel))
export const qsa = (root, sel) => Array.from(root.querySelectorAll(sel))
