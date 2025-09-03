import DOMPurify from 'dompurify'

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

// If already absolute (has a scheme or starts with //), return as-is; else make absolute to current origin
export const toAbsoluteUrl = (url = window.location.href) => {
  const s = String(url ?? '')
  if (!s) return ''
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(s) || s.startsWith('//')) return s
  try { return new URL(s, window.location.origin).href } catch { return s }
}

export const sanitizeHtml = function (str) {
  // https://github.com/cure53/DOMPurify/tree/main/demos#what-is-this
  return DOMPurify.sanitize(str)
  // return str
  //   .replace(/&/g, '&amp;')
  //   .replace(/</g, '&lt;')
  //   .replace(/>/g, '&gt;')
  //   .replace(/"/g, '&quot;')
  //   .replace(/'/g, '&#39;')
}
