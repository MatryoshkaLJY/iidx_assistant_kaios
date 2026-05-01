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
| `onArrowUp/Down/Left/Right()` | Direction key handlers. If not defined, Up/Down fall back to moving focus through `.list-item`/`.input-row` elements. Left/Right fall back to `moveFocus(-5/+5)` fast navigation. |
| `onDigit(digit)` | Number key handlers (1-9). |
| `onSoftLeft/SoftRight()` | Soft key handlers (also triggered by F1/F2). |
| `onBack()` | Called on Back key. Return `true` to prevent default `goBack()` behavior. |
| `onFocusChanged()` | Called after `App.renderFocus()` completes. Use to update dynamic softkey labels based on the newly focused item. |

Page files live in `js/pages/` and self-register at the bottom:

```js
App.pageHandlers['login'] = LoginPage;
```

### Navigation Stack

`App.navStack` is an array of visited page IDs. `App.showPage(pageId, data)` hides the current page, shows the new one, and pushes to the stack (avoiding consecutive duplicates).

`App.goBack()` pops the current page and shows the previous one. Pages can intercept back navigation via `onBack()`.

**Important**: Some "sub-pages" (`diff-songs`, `rec-songs`) do **not** use `App.showPage()`. They manipulate the DOM directly and are pushed onto `navStack` manually. Their parent pages (`difficulty`, `recommend`) handle stack cleanup in `onBack()`.

Similarly, `radar-detail` and `radar-rec` toggle between each other via direct DOM manipulation and **replace** the nav stack top entry (`App.navStack[App.navStack.length - 1]`), so Back returns to `radar` regardless of how many times the user toggled.

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

- **Difficulty tables**: State machine `type → level → lamp → songs`. API returns full `rank_groups` object; frontend switches groups locally with digit keys `1`/`3`. Left/right arrows perform fast vertical navigation (`moveFocus(-5/+5)`) globally. Digit `2` toggles between list view and 6-column grid view. Grid cells show clear-flag tinted backgrounds (compact 40×25px). A 3px progress bar below the group bar visualizes clear-flag distribution for the current group. **Browsing state (group index, view mode) is saved immediately on every change** (group switch, view mode toggle) and restored when re-entering the same table. State is stored per-table, per-playStyle.
- **Recommendations**: Three modes (`hot_hand`, `progress`, `ascension`). Results sorted by `recommendation_score` descending.
- **Radar**: Six dimensions (`notes`, `peak`, `scratch`, `soflan`, `charge`, `chord`). On first load, all 6 dimensions' detail + recommendation data are prefetched in parallel (12 requests) and cached together.
- **Search**: Full song list fetched once, field-cropped to ~12 fields, cached in `localStorage`. Filtering is done client-side via `Utils.fuzzyMatch()` on `title`, `plainTitle`, `artist`, and `genre`.
- **Song detail**: Receives `musicId`, `playStyle`, `chartDifficulty`. Displays best/recent scores and a flat list of `difficulty_tables` entries. Right soft key opens a chart-switch menu. Favorited songs show `★` in the header.
- **Favorites**: Local-only feature. Toggle via right soft key in `diff-songs`, `rec-songs`, `radar-detail`, and `radar-rec` lists. Visual indicator: gold `.favorite-bar` (4px on right edge of list item). Favorites page shows all saved songs sorted alphabetically.
- **Radar detail/rec toggle**: Digit `3` on `radar-detail` switches to `radar-rec`; digit `1` on `radar-rec` switches back. The toggle replaces the current nav stack entry (does not push), so Back returns directly to the radar overview.
- **Sync & Cache**: `App.fetchSyncStatus()` is a singleton — concurrent calls are deduplicated and all callbacks receive the same result. It queries `/api/scores` first (using the first score's `play_time` as the authoritative sync timestamp) and falls back to `/api/sync/status`. `App.fullSync()` updates only stale caches. `App.fetchAllData()` force-refetches all data types with a `(done/total)` progress indicator.

### Storage Keys

`Storage` in `js/storage.js` uses `localStorage` for everything (token, credentials, music cache):

| Key | Purpose |
|-----|---------|
| `pocketiidx_token` | Bearer token |
| `pocketiidx_music_cache` | Cropped song library |
| `pocketiidx_username/password` | Saved credentials |
| `pocketiidx_remember_username/password` | Boolean flags |
| `pocketiidx_auto_login` | Auto-login flag |
| `pocketiidx_favorites` | Array of `{musicId, playStyle, chartDifficulty, title}` |
| `pocketiidx_radar_cache_{playStyle}` | Radar summary + dimensions + dimensionData |
| `pocketiidx_diff_cache_{tableName}` | Difficulty table data |
| `pocketiidx_rec_cache_{playStyle}_{mode}` | Recommendation songs array |
| `pocketiidx_diff_state_{playStyle}` | Difficulty table browsing state — object mapping `tableName → {groupIndex, viewMode}` |

### File Loading Order

Scripts in `index.html` load in this order:

1. `polyfill.js`
2. `utils.js`
3. `storage.js`
4. `api.js`
5. `app.js`
6. `pages/*.js` (login, menu, difficulty, recommend, search, radar, song, favorites)
7. `init.js`

`init.js` calls `App.init()` immediately if `document.readyState === 'complete'`, otherwise on `window.onload`.
