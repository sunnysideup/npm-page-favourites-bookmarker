export class WatchDom {
  #observer
  #added = new Set()
  #removed = new Set()
  #scheduled = false
  #root
  #className
  #onAdd
  #onRemove
  #observeToggles

  constructor ({
    root = document,
    className,
    onAdd = () => {},
    onRemove = () => {},
    observeToggles = true
  } = {}) {
    if (!className) throw new Error('className is required')
    this.#root = root
    this.#className = className
    this.#onAdd = onAdd
    this.#onRemove = onRemove
    this.#observeToggles = observeToggles
    this.#observer = new MutationObserver(muts => this.#handle(muts))
  }

  start () {
    this.#observer.observe(this.#root, {
      childList: true,
      subtree: true,
      attributes: this.#observeToggles,
      attributeFilter: this.#observeToggles ? ['class'] : undefined,
      attributeOldValue: this.#observeToggles
    })
    return this
  }

  stop () {
    this.#observer.disconnect()
    this.#added.clear()
    this.#removed.clear()
    this.#scheduled = false
  }

  destroy () {
    // hard stop and drop references so GC can reclaim
    this.stop()
    this.#observer = null
    this.#root = null
    this.#onAdd = null
    this.#onRemove = null
  }

  setCallbacks ({ onAdd, onRemove } = {}) {
    if (onAdd) this.#onAdd = onAdd
    if (onRemove) this.#onRemove = onRemove
    return this
  }

  // internals
  #queueFlush () {
    if (this.#scheduled) return
    this.#scheduled = true
    requestAnimationFrame(() => this.#flush())
  }

  #flush () {
    this.#scheduled = false
    const addNow = Array.from(this.#added); this.#added.clear()
    const remNow = Array.from(this.#removed); this.#removed.clear()
    for (const el of addNow) this.#onAdd?.(el)
    for (const el of remNow) this.#onRemove?.(el)
  }

  #handle (mutations) {
    const cls = this.#className
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(n => {
          if (n instanceof Element && n.classList.contains(cls)) this.#added.add(n)
        })
        m.removedNodes.forEach(n => {
          if (n instanceof Element && n.classList.contains(cls)) this.#removed.add(n)
        })
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
}
