# Bug Report: Difficulty Table Cache Invalidated After "Fetch All Data"

## Symptom

After invoking "获取全部数据" (Fetch All Data) from the app menu, the request completes successfully and reports the data as up-to-date. However, when the user subsequently navigates into a difficulty table, the app **still issues a network request to the server** instead of serving the just-cached data.

Expected behavior: The freshly populated cache should satisfy `App.isCacheValid(cache)`, and `DifficultyPage.loadTable()` should short-circuit before reaching `Api.getDifficultyTable`.

## Reproduction

1. Launch the app while logged in.
2. Open the app menu and select "获取全部数据".
3. Wait for "获取完成" to appear.
4. Enter any difficulty table (e.g. SP 温火 ★12 H_CLEAR).
5. Observe that the loading overlay reappears and a network request is fired, even though the cache for that table was just written by step 2.

## Root Cause: Concurrent `fetchSyncStatus` Race

The cache validity check (`app.js:308-312`) compares the cached `syncTimestamp` against the in-memory `App.syncStatusTimestamp`:

```js
isCacheValid: function(cache) {
  if (!cache) return false;
  if (this.syncStatusTimestamp === 0) return false;
  return cache.syncTimestamp === this.syncStatusTimestamp;
}
```

`fetchAllData` (`app.js:475-527`) takes care to capture a stable `_fetchAllTimestamp` and writes it into every cache entry. The bug is **not** in the writer side — it is on the reader side: `App.syncStatusTimestamp` can be silently overwritten by a *different* concurrent call to `fetchSyncStatus`, after the bulk fetch has already persisted the older value.

### Sequence Triggering the Bug

1. **App start** — `App.init()` runs:
   ```js
   this.showPage('menu');
   this.fetchSyncStatus();   // XHR_A → /api/scores  (no callback, fire-and-forget)
   ```
2. **User clicks "获取全部数据" before XHR_A returns.** `fetchAllData` calls `fetchSyncStatus(callback)` (`app.js:485`), issuing **XHR_B** to the same endpoint.
3. XHR_B returns first. `fetchSyncStatus` sets `syncStatusTimestamp = T_B` and the `fetchAllData` callback runs, capturing `_fetchAllTimestamp = T_B`. All 121+ difficulty tables, recommendations, radar caches, and the music list are persisted with `syncTimestamp: T_B`.
4. `fetchAllData` finishes, alerts "获取完成", deletes `_fetchAllTimestamp`.
5. **XHR_A finally returns.** `fetchSyncStatus` runs to completion *again*, writing into `self.syncStatusTimestamp` a second time. Whether through:
   - the primary path (`firstScore.play_time` parsed via `new Date(...).getTime()`, `app.js:331`), or
   - the fallback path (`Api.getSyncStatus('bjmania')` → `_parseSyncTimestamp` traversing arbitrary fields via `for…in`, `app.js:343`),
   the resulting value is `T_A`, which is **not guaranteed to equal `T_B`**.
6. User enters a difficulty table:
   ```js
   var cache = Storage.getDiffCache(tableName);   // cache.syncTimestamp = T_B
   if (cache && App.isCacheValid(cache))          // T_B === T_A ?  →  false
   ```
   `isCacheValid` returns `false`, fall-through path executes `Api.getDifficultyTable`, which is exactly the symptom.

### Why `T_A !== T_B` Is Realistic

`fetchSyncStatus` has **two different code paths** that write to `syncStatusTimestamp`, and they use **different sources of truth**:

| Path | Source | Value derivation |
|------|--------|------------------|
| Primary (`app.js:321-336`) | `Api.getScores()` | `new Date(result[0].play_time).getTime()` |
| Fallback (`app.js:339-346`) | `Api.getSyncStatus('bjmania')` | `_parseSyncTimestamp(result2)` — first parseable number / date string found via `for…in` |

If XHR_A and XHR_B happen to land on different paths (e.g. one transient failure on `/api/scores` triggers the fallback for one of them while the other succeeds), the timestamps will differ. Even when both succeed, the `for…in` order in `_parseSyncTimestamp` is not specified and may select different fields across calls.

### Design Discrepancy

`CLAUDE.md` documents the intended contract:

> `App.fetchSyncStatus()` is a singleton — concurrent calls are deduplicated and all callbacks receive the same result.

The current implementation in `app.js:315-348` has **no deduplication, no in-flight guard, and no callback queue**. Every caller spawns its own XHR and races to write into shared state. The contract documented in `CLAUDE.md` was apparently never enforced in code.

## Impact

- Every successful `fetchAllData` is followed by silently invalidated caches the next time the app is opened slightly slowly, defeating the entire point of bulk pre-fetching.
- Users see "获取完成" and reasonably believe the app is now offline-friendly, but the next interaction still hits the network — burning their (potentially metered) KaiOS data plan.
- Affects all four cache families that go through `App.isCacheValid`: difficulty tables (`Storage.getDiffCache`), recommendations (`Storage.getRecCache`), radar (`Storage.getRadarCache`), and the music list meta (`Storage.getMusicCacheMeta`).

## Proposed Fix

Make `fetchSyncStatus` an actual singleton with a callback queue, matching the `CLAUDE.md` contract. Suggested shape:

```js
fetchSyncStatus: function(callback) {
  var self = this;
  if (self._syncStatusInFlight) {
    if (callback) self._syncStatusCallbacks.push(callback);
    return;
  }
  self._syncStatusInFlight = true;
  self._syncStatusCallbacks = callback ? [callback] : [];

  var finish = function(error, result) {
    var cbs = self._syncStatusCallbacks;
    self._syncStatusInFlight = false;
    self._syncStatusCallbacks = [];
    for (var i = 0; i < cbs.length; i++) cbs[i](error, result);
  };

  App.showLoading('正在获取服务器状态...');
  Api.getScores(function(error, result) {
    if (!error && Array.isArray(result) && result.length > 0) {
      var firstScore = result[0];
      var timestamp = 0;
      if (firstScore.play_time) {
        var d = new Date(firstScore.play_time).getTime();
        if (!isNaN(d)) timestamp = d;
      }
      if (timestamp > 0) {
        self.syncStatus = firstScore;
        self.syncStatusTimestamp = timestamp;
        App.hideLoading();
        finish(null, firstScore);
        return;
      }
    }
    Api.getSyncStatus('bjmania', function(error2, result2) {
      App.hideLoading();
      if (!error2 && result2) {
        self.syncStatus = result2;
        self.syncStatusTimestamp = self._parseSyncTimestamp(result2);
      }
      finish(error2, result2);
    });
  });
}
```

Effects:
- Concurrent callers share **one** XHR; `App.syncStatusTimestamp` is written exactly once per logical refresh.
- `_fetchAllTimestamp` and `App.syncStatusTimestamp` are guaranteed equal after `fetchAllData` completes.
- `isCacheValid` returns `true` for every entry written by the bulk fetch, eliminating the spurious server hit.

## Files Involved

| File | Lines | Role |
|------|-------|------|
| `app/js/app.js` | 20 | `init()` fires unguarded `fetchSyncStatus()` |
| `app/js/app.js` | 308–312 | `isCacheValid` — strict equality check |
| `app/js/app.js` | 315–348 | `fetchSyncStatus` — missing singleton/dedup |
| `app/js/app.js` | 350–374 | `_parseSyncTimestamp` — non-deterministic field selection via `for…in` |
| `app/js/app.js` | 475–527 | `fetchAllData` — captures `_fetchAllTimestamp` correctly |
| `app/js/pages/difficulty.js` | 267–326 | `loadTable` — read-side that observes the bug |
| `app/js/pages/login.js` | 147 | Another fire-and-forget caller of `fetchSyncStatus()` |
| `CLAUDE.md` | "Sync & Cache" section | Documents intended singleton behavior |

## Notes

- The previous fix in commit `833a2a6` ("fix(sync): capture shared timestamp in fetchAllData to prevent cache invalidation") addressed a related but different issue — it ensured all blocks within a single `fetchAllData` use the same timestamp. The remaining bug described here is at a higher level: the timestamp captured by `fetchAllData` can be invalidated by a *different* `fetchSyncStatus` call returning afterwards.
- Adding the singleton guard does not change cache schema or storage keys, so no migration is needed.
