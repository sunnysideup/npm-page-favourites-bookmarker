export class WatchDom {
  #observer; #added=new Set(); #removed=new Set(); #scheduled=false
  #root; #className; #onAdd; #onRemove; #observeToggles; #debug; #immediate

  constructor ({
    root = document,
    className,
    onAdd = () => {},
    onRemove = () => {},
    observeToggles = true,
    debug = false,
    immediateFlush = false
  } = {}) {
    if (!className) throw new Error('className is required')
    this.#root = root
    this.#className = String(className).replace(/^\./, '').trim() // ← no leading dot
    this.#onAdd = onAdd
    this.#onRemove = onRemove
    this.#observeToggles = observeToggles
    this.#debug = debug
    this.#immediate = immediateFlush
    this.#observer = new MutationObserver(muts => this.#handle(muts))
  }

  start () {
    this.#log('start', {root: this.#root, cls: this.#className, toggles: this.#observeToggles})
    this.#root.querySelectorAll('.' + this.#className).forEach(el => this.#added.add(el))
    if (this.#added.size) this.#queueFlush()
    this.#observer.observe(this.#root, {
      childList: true, subtree: true,
      attributes: this.#observeToggles,
      attributeFilter: this.#observeToggles ? ['class'] : undefined,
      attributeOldValue: this.#observeToggles
    })
    return this
  }

  stop () { this.#observer.disconnect(); this.#added.clear(); this.#removed.clear(); this.#scheduled = false }
  destroy () { this.stop(); this.#observer = null; this.#root = null; this.#onAdd = null; this.#onRemove = null }

  setCallbacks ({ onAdd, onRemove } = {}) { if (onAdd) this.#onAdd = onAdd; if (onRemove) this.#onRemove = onRemove; return this }

  #queueFlush () {
    if (this.#scheduled) return
    this.#scheduled = true
    if (this.#immediate) this.#flush()
    else requestAnimationFrame(() => this.#flush())
  }

  #flush () {
    this.#scheduled = false
    const addNow = [...this.#added]; this.#added.clear()
    const remNow = [...this.#removed]; this.#removed.clear()
    this.#log('flush', {add: addNow.length, remove: remNow.length, addNow, remNow})
    for (const el of addNow) this.#safe(this.#onAdd, el, 'onAdd')
    for (const el of remNow) this.#safe(this.#onRemove, el, 'onRemove')
  }

  #collectMatchesDeep (node, set) {
    if (!(node instanceof Element)) return
    if (node.classList.contains(this.#className)) set.add(node)
    node.querySelectorAll('.' + this.#className).forEach(el => set.add(el))
  }

  #handle (mutations) {
    this.#log('mutations', {count: mutations.length})
    const cls = this.#className
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(n => this.#collectMatchesDeep(n, this.#added))
        m.removedNodes.forEach(n => this.#collectMatchesDeep(n, this.#removed))
      } else if (m.type === 'attributes' && m.attributeName === 'class') {
        const el = /** @type {Element} */ (m.target)
        const had = (m.oldValue ?? '').split(/\s+/).includes(cls)
        const has = el.classList.contains(cls)
        if (has && !had) this.#added.add(el)
        else if (!has && had) this.#removed.add(el)
      }
    }
    if (this.#added.size || this.#removed.size) this.#queueFlush()
  }

  #safe (fn, el, label) { try { fn?.(el) } catch (e) { this.#log(label + ' error', {e, el}) } }
  #log (msg, data) { if (this.#debug) console.debug(`[WatchDom:${this.#className}] ${msg}`, data ?? '') }
}
