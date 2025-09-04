export const defaultTemplates = {

  showOverlayButton: ({ onClick, numberOfBookmarks }) => {
    const btn = document.createElement('button')
    btn.className = 'pf-show-bookmarks'
    btn.setAttribute('aria-label', 'Show favourites list')
    btn.title = 'Show favourites'
    btn.textContent = '❤'
    if ((numberOfBookmarks?.() ?? 0) < 1) btn.style.display = 'none'
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); onClick?.() })
    return btn
  },

  heart: ({ onClick, onShowOverlay, position, isOn, numberOfBookmarks }) => {
    const wrap = document.createElement('div')
    wrap.className = 'pf-heart-wrap'
    if (position) {
      wrap.classList.add(`pf-heart-wrap--${position.leftRight === 'left' ? 'left' : 'right'}`)
      wrap.classList.add(`pf-heart-wrap--${position.topBottom === 'top' ? 'top' : 'bottom'}`)
    }

    const showBtn = document.createElement('button')
    showBtn.className = 'pf-show-bookmarks'
    showBtn.setAttribute('aria-label', 'Show favourites list')
    showBtn.title = 'Show favourites'
    showBtn.textContent = '☰'
    showBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); onShowOverlay?.() })
    if ((numberOfBookmarks?.() ?? 0) < 1) showBtn.style.display = 'none'
    wrap.appendChild(showBtn)

    const btn = document.createElement('button')
    btn.className = 'pf-heart'
    btn.setAttribute('aria-label', 'Toggle bookmark')

    btn.addEventListener('click', (e) => onClick(e));

    wrap.appendChild(btn)

    return wrap
  },

  overlayBar: ({
    onClose,
    onSync,
    onShare,
    isLoggedIn,
    loginUrl,
    shareLink
  }) => {
    const bar = document.createElement('div')
    bar.className = 'pf-bar'

    // title
    const title = document.createElement('strong')
    title.className = 'pf-title'
    title.textContent = 'Favourites'
    bar.appendChild(title)

    // login call to action
    if (loginUrl && !isLoggedIn()) {
      const login = document.createElement('a')
      login.className = 'pf-btn pf-login'
      login.href = loginUrl
      login.textContent = 'save'

      bar.append(login)
    }

    // sync button
    // const sync = document.createElement('button')
    // sync.className = 'pf-btn pf-sync'
    // sync.type = 'button'
    // sync.textContent = 'Sync'
    // sync.addEventListener('click', onSync)
    // sync.title = 'Sync with server'
    // sync.setAttribute('aria-label', 'Sync with server')
    // bar.append(sync)

    // share button
    if (shareLink) {
      const share = document.createElement('button')
      share.className = 'pf-btn pf-share'
      share.type = 'button'
      share.textContent = 'share'
      share.setAttribute('aria-label', 'Share favourites list by copying link to clipboard')
      share.addEventListener('click', (e) => onShare(e));
      bar.append(share)
    }

    // universal close button
    const close = document.createElement('button')
    close.className = 'pf-btn pf-close'
    close.title = 'Close'
    close.type = 'button'
    close.textContent = '×'
    close.setAttribute('aria-label', 'Close favourites list')
    close.addEventListener('click', (e) => onClose(e) )
    bar.appendChild(close)
    //
    return bar
  },

  overlayShell: () => {
    const wrap = document.createElement('section')
    wrap.className = 'pf-overlay'
    const list = document.createElement('div')
    list.className = 'pf-list'
    wrap.append(list)
    return { wrap, list }
  },

  overlayRow: ({ item, index, onRemove, onReorder }) => {
    const row = document.createElement('div')
    row.className = 'pf-row'
    row.draggable = true

    const drag = document.createElement('span')
    drag.className = 'pf-sort'
    drag.title = 'Drag'
    drag.textContent = '⋮'

    const a = document.createElement('a')
    a.className = 'pf-link'
    a.href = item.url
    a.target = '_blank'
    a.rel = 'noopener'
    a.textContent = item.title || item.url

    const del = document.createElement('button')
    del.className = 'pf-btn pf-del'
    del.type = 'button'
    del.textContent = '❤'
    del.addEventListener('click', () => onRemove(item.url))

    // optional image
    let img
    if (item.imagelink) {
      img = document.createElement('img')
      img.src = item.imagelink
      img.alt = item.title || ''
      img.height = 50
      img.loading = 'lazy'
    }

    // optional description
    let p
    if (item.description) {
      p = document.createElement('p')
      p.textContent = item.description
    }

    // build
    row.append(
      drag,
      ...(img ? [img] : []),
      a,
      ...(p ? [p] : []),
      del
    )

    row.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', String(index))
    })
    row.addEventListener('dragover', e => e.preventDefault())
    row.addEventListener('drop', e => {
      e.preventDefault()
      const from = Number(e.dataTransfer.getData('text/plain'))
      const to = index
      onReorder(from, to)
    })

    return row
  }
}
