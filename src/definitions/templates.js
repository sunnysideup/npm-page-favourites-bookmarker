export const defaultTemplates = {

  showOverlayToggle: ({ onClick, classNames, phrases }) => {
    const btn = document.createElement('button')
    btn.className = classNames.showBookmarks
    btn.setAttribute('aria-label', phrases.showFavouritesListLabel)
    btn.title = phrases.showFavouritesTitle
    btn.textContent = phrases.heartSymbol
    btn.addEventListener('click', e => onClick(e))

    const span = document.createElement('span')
    span.className = classNames.numberOfBookmarks
    btn.appendChild(span)

    return { btn, span }
  },

  heart: ({ onClick, onShowOverlay, position, classNames, phrases }) => {
    const wrap = document.createElement('div')
    wrap.className = classNames.heartWrap
    if (position) {
      wrap.classList.add(`pf-heart-wrap--${position.leftRight === 'left' ? 'left' : 'right'}`)
      wrap.classList.add(`pf-heart-wrap--${position.topBottom === 'top' ? 'top' : 'bottom'}`)
    }

    const showBtn = document.createElement('button')
    showBtn.className = classNames.showBookmarks
    showBtn.title = phrases.showFavouritesTitle
    showBtn.textContent = phrases.menuSymbol
    showBtn.setAttribute('aria-label', phrases.showFavouritesListLabel)
    showBtn.addEventListener('click', (e) => onShowOverlay(e))
    wrap.appendChild(showBtn)

    const heartBtn = document.createElement('button')
    heartBtn.className = classNames.heart
    heartBtn.textContent = phrases.heartSymbol
    heartBtn.setAttribute('aria-label', phrases.toggleBookmarkLabel)
    heartBtn.addEventListener('click', (e) => onClick(e))
    wrap.appendChild(heartBtn)

    return { wrap, heartBtn, showBtn }
  },

  overlayBar: ({
    onClose,
    onShare,
    isLoggedIn,
    loginUrl,
    shareLink,
    classNames,
    phrases
  }) => {
    const bar = document.createElement('div')
    bar.className = classNames.bar

    // title
    const title = document.createElement('strong')
    title.className = classNames.title
    title.textContent = phrases.favouritesTitle
    bar.appendChild(title)

    // login call to action
    if (loginUrl && !isLoggedIn()) {
      const login = document.createElement('a')
      login.className = `${classNames.btn} ${classNames.login}`
      login.href = loginUrl
      login.textContent = phrases.saveText
      bar.append(login)
    }

    // share button
    if (shareLink) {
      const share = document.createElement('button')
      share.className = `${classNames.btn} ${classNames.share}`
      share.type = 'button'
      share.textContent = phrases.shareText
      share.setAttribute('aria-label', phrases.shareLabel)
      share.addEventListener('click', (e) => onShare(e))
      bar.append(share)
    }

    // universal close button
    const close = document.createElement('button')
    close.className = `${classNames.btn} ${classNames.close}`
    close.type = 'button'
    close.title = phrases.closeTitle
    close.textContent = phrases.closeSymbol
    close.setAttribute('aria-label', phrases.closeLabel)
    close.addEventListener('click', (e) => onClose(e))
    bar.appendChild(close)

    return bar
  },

  overlayShell: ({ classNames, phrases}) => {
    const wrap = document.createElement('section')
    wrap.className = classNames.overlay
    const list = document.createElement('div')
    list.className = classNames.list
    wrap.append(list)
    return { wrap, list }
  },

  overlayRow: ({ item, index, onRemove, onReorder, classNames, phrases }) => {
    const row = document.createElement('div')
    row.className = classNames.row
    row.draggable = true

    const drag = document.createElement('span')
    drag.className = classNames.sort
    drag.title = phrases.dragTitle
    drag.textContent = phrases.dragSymbol

    const a = document.createElement('a')
    a.className = classNames.link
    a.href = item.url
    a.target = '_blank'
    a.rel = 'noopener'
    a.textContent = item.title || item.url

    const del = document.createElement('button')
    del.className = `${classNames.btn} ${classNames.del}`
    del.type = 'button'
    del.textContent = phrases.heartSymbol
    del.addEventListener('click', () => onRemove(item.url))

    let img
    if (item.imagelink) {
      img = document.createElement('img')
      img.src = item.imagelink
      img.alt = item.title || ''
      img.height = 50
      img.loading = 'lazy'
    }

    let p
    if (item.description) {
      p = document.createElement('p')
      p.textContent = item.description
    }

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
