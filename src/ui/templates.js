// Default templates (override them via opts.templates)
export const defaultTemplates = {
  heart: ({ onClick, position, isOn }) => {
    const btn = document.createElement('button')
    btn.className = `pf-heart pf-heart--${
      position === 'left' ? 'left' : 'right'
    }`
    btn.setAttribute('aria-label', 'Toggle bookmark')
    btn.textContent = isOn() ? '❤' : '♡'
    btn.addEventListener('click', onClick)
    return btn
  },

  overlayBar: ({
    onClose,
    onSaveIdentity,
    onRequestVerification,
    onVerifyCode,
    onSync,
    identity
  }) => {
    const bar = document.createElement('div')
    bar.className = 'pf-bar'

    const title = document.createElement('strong')
    title.className = 'pf-title'
    title.textContent = 'Bookmarks'

    const email = document.createElement('input')
    email.className = 'pf-input pf-email'
    email.type = 'text'
    email.placeholder = 'Email'
    const phone = document.createElement('input')
    phone.className = 'pf-input pf-phone'
    phone.type = 'text'
    phone.placeholder = 'Phone'
    if (identity) {
      email.value = identity.email || ''
      phone.value = identity.phone || ''
    }

    const mkBtn = (cls, label, handler) => {
      const b = document.createElement('button')
      b.className = `pf-btn ${cls}`
      b.type = 'button'
      b.textContent = label
      b.addEventListener('click', handler)
      return b
    }

    const save = mkBtn('pf-saveid', 'Save contact', () =>
      onSaveIdentity({ email: email.value, phone: phone.value })
    )
    const verify = mkBtn('pf-verify', 'Verify', async () => {
      await onRequestVerification().catch(() => {})
      const code = prompt('Enter verification code:') || ''
      if (!code) return
      const ok = await onVerifyCode(code).catch(() => false)
      alert(ok ? 'Verified!' : 'Verification failed')
    })
    const sync = mkBtn('pf-sync', 'Sync', () => onSync())
    const close = mkBtn('pf-close', 'Close', () => onClose())

    bar.append(title, email, phone, save, verify, sync, close)
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
    drag.textContent = '⋮⋮'

    const a = document.createElement('a')
    a.className = 'pf-link'
    a.href = item.url
    a.target = '_blank'
    a.rel = 'noopener'
    a.textContent = item.title || item.url

    const del = document.createElement('button')
    del.className = 'pf-btn pf-del'
    del.type = 'button'
    del.textContent = 'Remove'
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
