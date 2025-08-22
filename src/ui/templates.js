export const defaultTemplates = {
  heart: ({ onClick, onShowOverlay, position, isOn, hasBookmarks }) => {
    const wrap = document.createElement('div')
    wrap.className = 'pf-heart-wrap'
    wrap.classList.add(
      `pf-heart-wrap--${position.leftRight === 'left' ? 'left' : 'right'}`
    )
    wrap.classList.add(
      `pf-heart-wrap--${position.topBottom === 'top' ? 'top' : 'bottom'}`
    )

    const showBtn = document.createElement('button')
    showBtn.className = 'pf-show-bookmarks'
    showBtn.setAttribute('aria-label', 'Show bookmarks list')
    showBtn.title = 'Show bookmarks'
    showBtn.textContent = '≡'
    showBtn.addEventListener('click', e => {
      e.preventDefault()
      onShowOverlay()
    })
    if (!hasBookmarks()) showBtn.style.display = 'none'
    wrap.appendChild(showBtn)

    const btn = document.createElement('button')
    btn.className = 'pf-heart'
    btn.setAttribute('aria-label', 'Toggle bookmark')
    const on = isOn()
    btn.textContent = on ? '❤' : '♡'
    btn.title = on ? 'Remove bookmark' : 'Add bookmark'
    btn.addEventListener('click', onClick)
    wrap.appendChild(btn)

    return wrap
  },

  overlayBar: ({ onClose, onSync, isLoggedIn, loginUrl }) => {
    const bar = document.createElement('div')
    bar.className = 'pf-bar'

    const title = document.createElement('strong')
    title.className = 'pf-title'
    title.textContent = 'Bookmarks'

    // universal close button
    const close = document.createElement('button')
    close.className = 'pf-btn pf-close'
    close.type = 'button'
    close.textContent = '×'
    close.title = 'Close'
    close.addEventListener('click', onClose)

    // Logged-out UI: explanation + login link
    if (isLoggedIn && !isLoggedIn() && loginUrl) {
      alert(loginUrl)
      const expl = document.createElement('span')
      expl.className = 'pf-expl'
      expl.textContent = ''

      const login = document.createElement('a')
      login.className = 'pf-btn pf-login'
      login.href = loginUrl
      login.textContent = 'Login / Create account to save'

      bar.append(title, expl, login, close)
      return bar
    }

    // Logged-in UI: share + close
    const share = document.createElement('button')
    share.className = 'pf-btn pf-share'
    share.type = 'button'
    share.textContent = 'share'
    share.addEventListener('click', onShare)

    bar.append(title, share, close)
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
    del.textContent = '×'
    del.addEventListener('click', () => onRemove(item.url))

    row.append(drag, a, del)

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
