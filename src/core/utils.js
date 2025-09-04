import DOMPurify from 'dompurify'

// utils/merge.js
const isPlainObject = (x) => x && typeof x === 'object' && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype

export function deepMerge (...sources) {
  const out = {}
  for (const src of sources) {
    if (!isPlainObject(src)) continue
    for (const k of Object.keys(src)) {
      const v = src[k]
      if (Array.isArray(v)) out[k] = Array.isArray(out[k]) ? [...out[k], ...v] : [...v]   // or: out[k] = [...v]
      else out[k] = isPlainObject(v) && isPlainObject(out[k]) ? deepMerge(out[k], v) : v
    }
  }
  return out
}

export function makeAlphaNumCode (length = 12) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const out = []
  const rnd = new Uint8Array(length)
  if (globalThis.crypto?.getRandomValues) {
    crypto.getRandomValues(rnd)
    for (let i = 0; i < length; i++) out.push(chars[rnd[i] % chars.length])
  } else {
    for (let i = 0; i < length; i++) out.push(chars[Math.floor(Math.random()*chars.length)])
  }
  return out.join('')
}


// Standardise to relative URLs only; drop or return '' if external
export const toRelativeUrl = (url = '') => {
  const s = String(url ?? '').trim()
  if (!s) return ''
  try {
    const u = new URL(s, window.location.origin)
    if (u.origin !== window.location.origin) return ''
    const rel = u.pathname + u.search + u.hash
    return rel.startsWith('/') ? rel : '/' + rel
  } catch {
    return s.startsWith('/') ? s : '/' + s
  }
}

export function toAbsoluteUrl (url = '') {
  const s = String(url ?? '').trim()
  if (!s) return ''
  try {
    const u = new URL(s, window.location.origin)
    return u.href
  } catch {
    return s.startsWith('http') ? s : 'https://' + s
  }
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

export const stripTags = (str) => {
  return DOMPurify.sanitize(String(str ?? ''), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
  // const tmp = document.createElement('div')
  // tmp.innerHTML = String(input ?? '')
  // return tmp.textContent || ''
}

export const stripToText = (str = '') => {
  const cleaned = stripTags(str)
  const tmp = document.createElement('textarea')
  tmp.innerHTML = cleaned
  return tmp.value // decoded text
}
