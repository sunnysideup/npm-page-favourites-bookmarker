// Simple wrapper for localStorage/sessionStorage with JSON helpers.
export class Store {
  /** @param {'local'|'session'} mode */
  constructor (mode = 'local') {
    this.backend =
      mode === 'session' ? window.sessionStorage : window.localStorage
  }
  get (key) {
    try {
      return this.backend.getItem(key)
    } catch {
      return null
    }
  }
  set (key, val) {
    try {
      this.backend.setItem(key, val)
    } catch {}
  }
  getJSON (key) {
    try {
      return JSON.parse(this.get(key) ?? '')
    } catch {
      return null
    }
  }
  setJSON (key, val) {
    this.set(key, JSON.stringify(val))
  }
}
