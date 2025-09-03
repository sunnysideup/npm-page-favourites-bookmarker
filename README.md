# @sunnysideup/npm-page-favourites-bookmarker

Tiny in-page bookmark manager with a heart button, overlay list, and optional server sync including a "share list" functionality.

## Features

- Heart button on every page to toggle bookmark (saves URL, title, image and description).
- Overlay list of favourites (hotkey toggle), with remove and drag-to-sort.
- Uses `local storage` or `session storage`.
- Optional server sync:
  - Sends events on add/remove/sort.
  - If logged in, it can sync with existing list from user

- Very limited dependencies, plain ESM.

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
document.addEventListener('DOMContentLoaded', () => {
  pf.init()
})

```

### Per-page configuration (page wins)

Add a small script before you import/initialise:

```html
<script>
  window.npmPageFavouritesBookmarkerConfig = {
    // whether to render on this page (overrides defaults and constructor opts)
    loadOnThisPage: true,
    // login awareness for overlay
    userIsLoggedIn: false,
    loginUrl: '/account/login',
    // optional positioning overrides
    heartPositionLeftRight: 'right',
    heartPositionTopBottom: 'bottom',
    currentPageTitle: document.querySelector('h2.title')?.innerText || ''
    currentImagelink: document.querySelector('meta[property="og:image"]')?.content || ''
    currentDescription: document.querySelector('meta[property="og:description"]')?.content || ''
  }
</script>

```

### Adding snippets directly to your page

If the following class `pf-heart-for-current-page` is present on the page then the heart will be added in this holder
and not as per usual as an "floating" heart.

```html

<div class="pf-heart-for-current-page"></div>

```

You can also add "add to favourites" to other pages on the page (e.g. when you hvae a list of links to other pages).

This can be done as follows:

```html

<div class="pf-heart-for-another-page" data-pf-url="..." data-pf-title="..." data-pf-description="..." data-pf-imagelink="..." ></div>

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

On `init()`, if `syncOnLoad` is true and `userIsLoggedIn` is true, the client pulls favourites from {bookmarks} and merges with local.

This initial pull is run whenever the number of favourites on the server is not the same as the local ones. 

Every add/remove/reorder triggers a POST {events}.


## API

### Bookmark methods

- `add(url, title, imagelink, description)` → add a bookmark
- `remove(url)` → remove bookmark
- `toggleCurrent()` → toggle current page
- `list()` → get all favourites
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
