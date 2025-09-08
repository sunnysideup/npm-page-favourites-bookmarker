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
  baseUrl: 'https://api.example.com/my-controller', // enables server I/O

})
document.addEventListener('DOMContentLoaded', () => {
  pf.init()
})

```

### making the api available in the global space

```js
import { PageFaves } from '@sunnysideup/npm-page-favourites-bookmarker'

window.myPageFavourites = new PageFaves({
  baseUrl: 'https://api.example.com/my-controller', // enables server I/O
  loginUrl: '/my-account',
})
document.addEventListener('DOMContentLoaded', () => {
  window.myPageFavourites.init()
})
```

### Config options

To see the config options (and there are many), you can have a look at this file:

[`main configs`](src/index.js) - see `DEFAULTS`

with the main config you can also set alternatives for these:

[`templates`](src/definitions/templates.js)
[`html classes`](src/definitions/html-classes.js)
[`phrases (translations)`](src/lang/phrases.js)

### Per-page configuration (page wins)

Add a small script before you import/initialise
and you can set any of the configs above on a page by page basis

```html
<script>
  window.npmPageFavouritesBookmarkerConfig = {
    // whether to render on this page (overrides defaults and constructor opts)
    loadOnThisPage: true,
    // login awareness for overlay
    userIsLoggedIn: false,
    // optional positioning overrides
    heartPositionLeftRight: 'right',
    heartPositionTopBottom: 'bottom',
    currentPageTitle: document.querySelector('h2.title')?.innerText || ''
    currentImagelink: document.querySelector('meta[property="og:image"]')?.content || ''
    currentDescription: document.querySelector('meta[property="og:description"]')?.content || ''
    phrases: {
      favouritesTitle: 'My Favourite blog entries',
      noBookmarksText: 'You do not have any favourites yet. To add some, on any page, click on the ❤ icon on the bottom right of your screen.'
    }
  }
</script>

```

### Adding snippets directly to your page

If the following class `pf-heart-for-current-page` is present on the page then the heart will be added in this holder
and not as per usual as the last element to the body.

```html

<div class="pf-heart-for-current-page"></div>

```

You can also add "add to favourites" for other pages on the page (e.g. when you have a list of links to other pages).

This can be done as follows:

```html

<div class="pf-heart-for-another-page" data-pf-url="..." data-pf-title="..." data-pf-description="..." data-pf-imagelink="..." ></div>

```

where ... is a different value for each page (description and imagelink are optional)

## Hotkeys

- **Open overlay:** CTRL + SHIFT + B (uses overlayHotkey: 'KeyB').
- **Close overlay:** ESC.

## Server sync behaviour

No network calls are made unless `baseUrl` is provided.

On `init()`, if `syncLoggedInUsersToServer` is true and `userIsLoggedIn` is true, the client pulls favourites from {bookmarks} and **replaces** them with local.

This initial pull is run whenever the number of favourites on the server is not the same as the local ones. 

Every add/remove/reorder triggers a POST {events}.

## API

### General methods

- `updateScreen` → align all the hearts on the page.

### Bookmark methods

- `addCurrent` → add a bookmark for the current page.
- `removeCurrent` → remove bookmark for the current page.
- `toggleCurrent` → toggle bookmark for the current page.
- `isBookmarked(url)` → check if URL is bookmarked
- `toggleFromData(el)` → add a bookmark for another page (see above for structure of el)
- `add(url, title, imagelink, description)` → add a bookmark
- `remove(url)` → remove bookmark

### List and overlay

- `list()` → get all favourites
- `getLocalBookmarkCount()` → get a count of local bookmarks
- `toggleOverlay()` → show or hide overlay (showing all favourites)
- `showOverlay()` → show overlay
- `hideOverlay()` → hide overlay


### Server Related

- `syncFromServer()` → pull bookmarks and and merge with local (only if baseUrl set)
- `copyShareLink()` → copy sharelink to clipboard

### clear and destroy

- `clear()` → remove all bookmarks
- `destroy` → the opposite of init - remove ALL and reset all

#### Server Endpoints

You can override each endpoint individually in `endpoints`.

- `POST {events}` → `{ type, payload, at }` (types are add/remove/reorder)  
- `GET {bookmarks}` → `[{ url, title, imagelink, description, ts }]`  

## Back-end Server Integration

If you use Silverstripe CMS, check out the integration package:

[sunnysideup/silverstripe-page-favourites-bookmarker](https://github.com/sunnysideup/silverstripe-page-favourites-bookmarker)
