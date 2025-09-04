// Efficient DOM-change hook with batching + selector filtering
export function watchDom({
  root = document,
  selectors = [],            // e.g. ['.needs-init', '[data-autobind]']
  onAdd = () => {},
  onRemove = () => {},
  observeAttributes = false, // set true if you also care about attr changes
  attributeFilter = []       // e.g. ['class','data-state']
} = {}) {
  const sel = selectors.length ? selectors.join(',') : null
  const added = new Set()
  const removed = new Set()
  let scheduled = false

  const flush = () => {
    scheduled = false
    // snapshot & clear to avoid re-entrancy issues
    const addNow = Array.from(added); added.clear()
    const remNow = Array.from(removed); removed.clear()
    for (const node of addNow) onAdd(node)
    for (const node of remNow) onRemove(node)
  }

  const queueFlush = () => {
    if (!scheduled) {
      scheduled = true
      // rAF batches work after layout; use requestIdleCallback if preferred
      requestAnimationFrame(flush)
    }
  }

  const markIfMatch = node => {
    if (!(node instanceof Element)) return
    if (!sel) { added.add(node); return }
    if (node.matches(sel)) added.add(node)
    // Also find matches inside this subtree
    for (const el of node.querySelectorAll(sel)) added.add(el)
  }

  const markRemovedIfMatch = node => {
    if (!(node instanceof Element)) return
    if (!sel) { removed.add(node); return }
    if (node.matches(sel)) removed.add(node)
    for (const el of node.querySelectorAll(sel)) removed.add(el)
  }

  const obs = new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(markIfMatch)
        m.removedNodes.forEach(markRemovedIfMatch)
      } else if (m.type === 'attributes') {
        const el = m.target
        if (!sel) { added.add(el); removed.add(el) }
        else if (el.matches(sel)) { added.add(el); removed.add(el) }
      }
    }
    if (added.size || removed.size) queueFlush()
  })

  obs.observe(root, {
    childList: true,
    subtree: true,
    attributes: observeAttributes,
    attributeFilter: observeAttributes && attributeFilter.length ? attributeFilter : undefined
  })

  return {
    disconnect: () => obs.disconnect()
  }
}
