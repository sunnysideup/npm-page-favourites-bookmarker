export const defaultTemplates = Object.freeze({
  showOverlayToggle: ({ onClick, htmlClasses, phrases }) => {
    const btn = document.createElement('button')
    btn.className = htmlClasses.showBookmarks
    btn.setAttribute('aria-label', phrases.showFavouritesListExplanation)
    btn.title = phrases.showFavouritesTitle
    btn.textContent = phrases.heartSymbol
    btn.addEventListener('click', onClick)

    const span = document.createElement('span')
    span.className = htmlClasses.numberOfBookmarks
    btn.appendChild(span)
    return { btn, span }
  },

  heart: ({
    onClick,
    onShowOverlay,
    position,
    additionalClasses,
    htmlClasses,
    phrases
  }) => {
    const wrap = document.createElement('div')
    wrap.className = htmlClasses.heartWrap
    if (position) {
      wrap.classList.add(
        `${htmlClasses.heartWrap}--${
          position.leftRight === 'left' ? 'left' : 'right'
        }`
      )
      wrap.classList.add(
        `${htmlClasses.heartWrap}--${
          position.topBottom === 'top' ? 'top' : 'bottom'
        }`
      )
    }
    if (additionalClasses && Array.isArray(additionalClasses)) {
      additionalClasses.forEach(c => wrap.classList.add(c))
    }

    const showBtn = document.createElement('button')
    showBtn.className = htmlClasses.showBookmarks
    showBtn.title = phrases.showFavouritesTitle
    showBtn.textContent = phrases.menuSymbol
    showBtn.setAttribute('aria-label', phrases.showFavouritesListExplanation)
    showBtn.addEventListener('click', onShowOverlay)
    wrap.appendChild(showBtn)

    const heartBtn = document.createElement('button')
    heartBtn.className = htmlClasses.heart
    heartBtn.textContent = phrases.heartSymbol
    heartBtn.setAttribute('aria-label', phrases.toggleBookmarkLabel)
    heartBtn.addEventListener('click', onClick)
    wrap.appendChild(heartBtn)

    return { wrap, heartBtn, showBtn }
  },

  overlayBar: ({
    onClose,
    onShare,
    hasBookmarks,
    userIsLoggedIn,
    loginUrl,
    shareLink,
    emailLink,
    htmlClasses,
    phrases
  }) => {
    const bar = document.createElement('div')
    bar.className = htmlClasses.bar

    // title
    const title = document.createElement('strong')
    title.className = htmlClasses.title
    title.textContent = phrases.favouritesTitle
    bar.appendChild(title)

    // login call to action
    if (hasBookmarks) {
      if (loginUrl && !userIsLoggedIn) {
        const login = document.createElement('a')
        login.className = `${htmlClasses.btn} ${htmlClasses.login}`
        login.href = loginUrl
        login.textContent = phrases.saveText
        login.title = phrases.saveExplanation
        login.setAttribute('aria-label', phrases.saveExplanation)
        bar.append(login)
      }

      // share button
      if (shareLink) {
        const share = document.createElement('button')
        share.className = `${htmlClasses.btn} ${htmlClasses.share}`
        share.type = 'button'
        share.textContent = phrases.shareText
        share.title = phrases.shareExplanation
        share.setAttribute('aria-label', phrases.shareExplanation)
        share.addEventListener('click', e => onShare(e, share))
        bar.append(share)
      }
      if (emailLink) {
        const emailBtn = document.createElement('a')
        emailBtn.className = `${htmlClasses.btn} ${htmlClasses.email}`
        emailBtn.href = emailLink
        emailBtn.textContent = phrases.emailLinkText
        emailBtn.title = phrases.emailLinkExplanation
        emailBtn.setAttribute('aria-label', phrases.emailLinkExplanation)
        bar.append(emailBtn)
      }
    }

    // universal close button
    const close = document.createElement('button')
    close.className = `${htmlClasses.btn} ${htmlClasses.close}`
    close.type = 'button'
    close.title = phrases.closeTitle
    close.textContent = phrases.closeSymbol
    close.setAttribute('aria-label', phrases.closeExplanation)
    close.addEventListener('click', onClose)
    bar.appendChild(close)

    return bar
  },

  overlayShell: ({ htmlClasses, phrases }) => {
    const wrap = document.createElement('section')
    wrap.className = htmlClasses.overlay
    const list = document.createElement('div')
    list.className = htmlClasses.list
    wrap.append(list)
    return { wrap, list }
  },

  overlayNoBookmarks: ({ htmlClasses, phrases }) => {
    const noBookmarks = document.createElement('div')
    noBookmarks.className = htmlClasses.noBookmarksList
    noBookmarks.textContent = phrases.noBookmarksText || 'No bookmarks yet'
    return noBookmarks
  },


  overlayRow: ({ item, index, onRemove, onReorder, htmlClasses, phrases }) => {
    const row = document.createElement('div')
    row.className = htmlClasses.row
    row.draggable = true

    const drag = document.createElement('span')
    drag.className = htmlClasses.sort
    drag.title = phrases.dragTitle
    drag.textContent = phrases.dragSymbol

    const a = document.createElement('a')
    a.className = htmlClasses.link
    a.href = item.url
    a.target = '_blank'
    a.rel = 'noopener'
    a.textContent = item.title || item.url

    const del = document.createElement('button')
    del.className = `${htmlClasses.btn} ${htmlClasses.del}`
    del.type = 'button'
    del.textContent = phrases.heartSymbol
    del.addEventListener('click', (e) => onRemove(e, item.url, index))

    let imgLink
    if (item.imagelink) {
      imgLink = document.createElement('a')
      imgLink.className = htmlClasses.imageLink || ''
      imgLink.href = item.url
      imgLink.target = '_blank'
      imgLink.rel = 'noopener'

      const img = document.createElement('img')
      img.src = item.imagelink
      img.alt = item.title || ''
      img.height = 50
      img.loading = 'lazy'

      imgLink.append(img)
    }

    let p
    if (item.description) {
      p = document.createElement('p')
      p.textContent = item.description
    }

    row.append(drag, ...(imgLink ? [imgLink] : []), a, ...(p ? [p] : []), del)

    row.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', String(index))
    })
    row.addEventListener('dragover', (e) => e.preventDefault())
    row.addEventListener('drop', (e) => {
      e.preventDefault()
      const from = Number(e.dataTransfer.getData('text/plain'))
      const to = index
      onReorder(from, to)
    })

    return row
  }
})
