export const qs = (root, sel) =>
  /** @type {HTMLElement} */ (root.querySelector(sel))
export const qsa = (root, sel) => Array.from(root.querySelectorAll(sel))

// utils/merge.js
const isObj = x => x && typeof x === 'object' && !Array.isArray(x)
export function deepMerge (...sources) {
  const out = {}
  for (const src of sources) {
    if (!isObj(src)) continue
    for (const k of Object.keys(src)) {
      const v = src[k]
      out[k] = isObj(v) && isObj(out[k]) ? deepMerge(out[k], v) : v
    }
  }
  return out
}

export function makeAlphaNumCode (length = 12) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const charLen = chars.length
  let result = ''

  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * charLen)
    result += chars[idx]
  }

  return result
}

export const makeAbsoluteUrl = relativeUrl => {
  return new URL(relativeUrl, window.location.origin).href
}
