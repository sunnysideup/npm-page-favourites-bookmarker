# @sunnysideup/npm-page-favourites-bookmarker

Tiny in-page bookmark manager with a heart button, overlay list, and optional server sync (email/phone verification supported).

## Features

- Heart button on every page to toggle bookmark (saves URL + title).
- Overlay list of bookmarks (hotkey toggle), with remove and drag-to-sort.
- Uses `localStorage` or `sessionStorage`.
- Optional server sync:
  - Sends events on add/remove/sort.
  - If logged in, it can sync with existing lists
- Zero dependencies, plain ESM.

## Install

```bash
npm i  @sunnysideup/npm-page-favourites-bookmarker
```

## Usage

### with a bundler (Vite/Webpack/Rollup)

```js
import { PageFaves } from '@sunnysideup/npm-page-favourites-bookmarker';
```

```scss
@import "@sunnysideup/npm-page-favourites-bookmarker/styles";
```

### without a bundler (Vite/Webpack/Rollup)

Check where `node_modules` lives ...and then add this (with additional path segments, if needed).

```html
<link rel="stylesheet" href="/node_modules/@sunnysideup/npm-page-favourites-bookmarker/src/index.css">
<script type="module">
  import { PageFaves } from '/node_modules/@sunnysideup/npm-page-favourites-bookmarker/src/index.js'
</script>

```

### initialising the module (with or without a bundler (Vite/Webpack/Rollup))

#### Initialising the module

```js
import { PageFaves } from '@sunnysideup/npm-page-favourites-bookmarker'

const pf = new PageFaves({
  storage: 'local', // or 'session'
  baseUrl: 'https://api.example.com/my-controller', // enables server I/O
  endpoints: {
    events: '/track',
    bookmarks: '/user/bookmarks'
  },
  heartPositionLeftRight: 'right', // 'left' | 'right'
  heartPositionTopBottom: 'bottom', // 'top' | 'bottom'
  overlayHotkey: 'KeyB', // press CTRL+SHIFT+B
  syncOnLoad: true
})
pf.init()

```

### Per-page configuration (page wins)

Add a small script before you import/initialise:

```html
<script>
  window.npmPageFavouritesBookmarker = {
    // whether to render on this page (overrides defaults and constructor opts)
    loadOnThisPage: true,
    // login awareness for overlay
    userIsLoggedIn: false,
    loginUrl: '/account/login',
    // optional positioning overrides
    heartPositionLeftRight: 'right',
    heartPositionTopBottom: 'bottom'
  }
</script>

```

### Customising templates (optional)

You can override any template in templates. Example:

```js
import { PageFaves } from '@sunnysideup/npm-page-favourites-bookmarker'
import { defaultTemplates } from '@sunnysideup/npm-page-favourites-bookmarker/src/ui/templates.js'
import '@sunnysideup/npm-page-favourites-bookmarker/src/index.css'

const pf = new PageFaves({
  templates: {
    heart: ({ onClick, onShowOverlay, position, isOn }) => {
      const wrap = document.createElement('div')
      wrap.className = `my-heart-wrap my-${position.leftRight} my-${position.topBottom}`

      const open = document.createElement('button')
      open.textContent = '≡'
      open.addEventListener('click', e => { e.preventDefault(); onShowOverlay() })
      wrap.append(open)

      const btn = document.createElement('button')
      btn.textContent = isOn() ? '★' : '☆'
      btn.addEventListener('click', e => { e.preventDefault(); onClick() })
      wrap.append(btn)

      return wrap
    },
    overlayBar: (args) => defaultTemplates.overlayBar(args),
    overlayShell: () => {
      const wrap = document.createElement('div'); wrap.className = 'my-overlay'
      const list = document.createElement('div'); list.className = 'my-overlay-list'
      wrap.append(list); return { wrap, list }
    },
    overlayRow: ({ item }) => {
      const row = document.createElement('div')
      row.className = 'my-row'
      row.textContent = item.title || item.url
      row.addEventListener('click', () => window.open(item.url, '_blank'))
      return row
    }
  }
})
pf.init()
```

## Hotkeys

- **Open overlay:** CTRL + SHIFT + B (uses overlayHotkey: 'KeyB').
- **Close overlay:** ESC.

## Server sync behaviour

No network calls are made unless `baseUrl` is provided.

On `init()`, if `syncOnLoad` is true and `userIsLoggedIn` is true, the client pulls bookmarks from {bookmarks} and merges with local.

This initial pull is run whenever the number of bookmarks on the server is not the same as the local ones. 

Every add/remove/reorder triggers a POST {events}.


## API

### Bookmark methods

- `add(url, title)` → add a bookmark
- `remove(url)` → remove bookmark
- `toggleCurrent()` → toggle current page
- `list()` → get all bookmarks
- `isBookmarked(url)` → check if URL is saved

### Overlay

- `showOverlay()`  
- `hideOverlay()`  

### sync

- `syncFromServer()` → pull bookmarks and and merge with local (only if baseUrl set)

#### Server Endpoints

You can override each endpoint individually in `endpoints`.

- `POST {events}` → `{ type, payload, at }` (called on add/remove/reorder)  
- `GET {bookmarks}` → `[{ url, title, ts }]`  

## Back-end Server Integration

If you use Silverstripe CMS, check out the integration package:

[sunnysideup/silverstripe-page-favourites-bookmarker](https://github.com/sunnysideup/silverstripe-page-favourites-bookmarker)
