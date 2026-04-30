# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PocketIIDX is a KaiOS 2.5.2 app for querying iidx.pro data on Nokia 2720 (Gecko 48 / Firefox 48). It is a pure frontend single-page application with no build system or bundler.

## Build & Development

There is no build step, package manager, or test suite. All code is hand-written static files served directly.

- **Serve locally**: `python3 -m http.server 8000` from `app/`, then open `http://localhost:8000`
- **Desktop testing**: Open `app/index.html` in a browser. `js/polyfill.js` mocks KaiOS APIs (`widget`, `menu`) for desktop environments.
- **Deploy**: Zip the `app/` directory (keeping internal structure) and sideload to KaiOS device via WebIDE, KaiOSrt, adb, or Wallace Toolbox.

## Critical Technical Constraints

All code must target KaiOS 2.5.2 (Gecko 48). This means:

- **No ES6+ syntax**: Use `var` and traditional `function` declarations. No arrow functions, destructuring, template literals, `const`/`let`, or classes.
- **No async/await or Promises**: All asynchronous code uses callbacks in the form `callback(error, result)`.
- **No `fetch`**: Use `new XMLHttpRequest({ mozSystem: true })` for all network requests (required for cross-domain access to iidx.pro).
- **No `Element.closest()`**: Manually traverse `parentNode` chains when needed.
- **Memory limit**: ~256MB RAM. The song library (~900KB raw) is field-cropped before caching. Search results are capped at 100 items.
- **Screen**: Fixed 240x320 portrait. CSS uses fixed pixel values.

The `manifest.webapp` must declare `"type": "privileged"` and `"permissions": { "systemXHR": {} }` for cross-origin requests.

## Architecture

### Page System

All pages are `<section class="page">` elements inside `app/index.html`. Only one page is visible at a time via the `.active` class.

Each page is a JavaScript object registered in `App.pageHandlers[pageId]`, implementing optional hooks:

| Hook | Purpose |
|------|---------|
| `onShow(data)` | Called when page becomes visible. Receives data from the page that navigated here. |
| `onEnter()` | Called when user presses Enter/Accept on a focused item. |
| `onArrowUp/Down/Left/Right()` | Direction key handlers. If not defined, Up/Down fall back to moving focus through `.list-item`/`.input-row` elements. |
| `onSoftLeft/SoftRight()` | Soft key handlers (also triggered by F1/F2). |
| `onBack()` | Called on Back key. Return `true` to prevent default `goBack()` behavior. |

Page files live in `js/pages/` and self-register at the bottom:

```js
App.pageHandlers['login'] = LoginPage;
```

### Navigation Stack

`App.navStack` is an array of visited page IDs. `App.showPage(pageId, data)` hides the current page, shows the new one, and pushes to the stack (avoiding consecutive duplicates).

`App.goBack()` pops the current page and shows the previous one. Pages can intercept back navigation via `onBack()`.

**Important**: Some "sub-pages" (`diff-songs`, `rec-songs`) do **not** use `App.showPage()`. They manipulate the DOM directly and are pushed onto `navStack` manually. Their parent pages (`difficulty`, `recommend`) handle stack cleanup in `onBack()`.

### Focus Management

`App.focusableItems` is a live `NodeList` of `.list-item` and `.input-row` elements within the current page. `App.moveFocus(delta)` updates `currentFocusIndex` with wrap-around behavior and applies the `.focused` class.

`App.renderFocus()` also handles auto-scrolling within `.scrollable` ancestors (manual offset calculation, no `scrollIntoView`) and updates `.list-counter` elements.

Some pages (e.g., `login`) have their own focus system for input rows that operates independently of `App.focusableItems`.

### API & Authentication

`Api` in `js/api.js` wraps `XMLHttpRequest` with a token refresh cascade:

1. Every request carries `Authorization: Bearer {token}`.
2. On HTTP 401, silently call `POST /api/refresh` (relies on HttpOnly cookie).
3. If refresh succeeds, update `localStorage` token and retry the original request.
4. If refresh fails, attempt auto-relogin with saved credentials.
5. If relogin fails, clear token and return 401 to the caller.

All API methods follow the callback signature `function(error, result, status)`.

### Data Flow Patterns

- **Difficulty tables**: State machine `type → level → lamp → songs`. API returns full `rank_groups` object; frontend switches groups locally with left/right keys.
- **Search**: Full song list fetched once, field-cropped to ~12 fields, cached in `localStorage`. Filtering is done client-side via `Utils.fuzzyMatch()` on `title`, `plainTitle`, `artist`, and `genre`.
- **Song detail**: Receives `musicId`, `playStyle`, `chartDifficulty`. Displays best/recent scores and a flat list of `difficulty_tables` entries. Right soft key opens a chart-switch menu.

### Storage Keys

`Storage` in `js/storage.js` uses `localStorage` for everything (token, credentials, music cache):

| Key | Purpose |
|-----|---------|
| `pocketiidx_token` | Bearer token |
| `pocketiidx_music_cache` | Cropped song library |
| `pocketiidx_username/password` | Saved credentials |
| `pocketiidx_remember_username/password` | Boolean flags |
| `pocketiidx_auto_login` | Auto-login flag |

### File Loading Order

Scripts in `index.html` load in this order:

1. `polyfill.js`
2. `utils.js`
3. `storage.js`
4. `api.js`
5. `app.js`
6. `pages/*.js` (login, menu, difficulty, recommend, search, song)
7. `init.js`

`init.js` calls `App.init()` immediately if `document.readyState === 'complete'`, otherwise on `window.onload`.
