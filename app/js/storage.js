var Storage = {
  TOKEN_KEY: 'pocketiidx_token',
  MUSIC_CACHE_KEY: 'pocketiidx_music_cache',
  RADAR_CACHE_PREFIX: 'pocketiidx_radar_cache_',
  USERNAME_KEY: 'pocketiidx_username',
  PASSWORD_KEY: 'pocketiidx_password',
  REMEMBER_USERNAME_KEY: 'pocketiidx_remember_username',
  REMEMBER_PASSWORD_KEY: 'pocketiidx_remember_password',
  AUTO_LOGIN_KEY: 'pocketiidx_auto_login',

  // Token storage (localStorage for persistence across app restarts)
  getToken: function() {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (e) {
      return null;
    }
  },

  setToken: function(token) {
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
    } catch (e) {}
  },

  clearToken: function() {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
    } catch (e) {}
  },

  // Credentials storage
  getUsername: function() {
    try {
      return localStorage.getItem(this.USERNAME_KEY);
    } catch (e) {
      return null;
    }
  },

  setUsername: function(username) {
    try {
      localStorage.setItem(this.USERNAME_KEY, username);
    } catch (e) {}
  },

  clearUsername: function() {
    try {
      localStorage.removeItem(this.USERNAME_KEY);
    } catch (e) {}
  },

  getPassword: function() {
    try {
      return localStorage.getItem(this.PASSWORD_KEY);
    } catch (e) {
      return null;
    }
  },

  setPassword: function(password) {
    try {
      localStorage.setItem(this.PASSWORD_KEY, password);
    } catch (e) {}
  },

  clearPassword: function() {
    try {
      localStorage.removeItem(this.PASSWORD_KEY);
    } catch (e) {}
  },

  getRememberUsername: function() {
    try {
      return localStorage.getItem(this.REMEMBER_USERNAME_KEY) === '1';
    } catch (e) {
      return false;
    }
  },

  setRememberUsername: function(val) {
    try {
      localStorage.setItem(this.REMEMBER_USERNAME_KEY, val ? '1' : '0');
    } catch (e) {}
  },

  getRememberPassword: function() {
    try {
      return localStorage.getItem(this.REMEMBER_PASSWORD_KEY) === '1';
    } catch (e) {
      return false;
    }
  },

  setRememberPassword: function(val) {
    try {
      localStorage.setItem(this.REMEMBER_PASSWORD_KEY, val ? '1' : '0');
    } catch (e) {}
  },

  getAutoLogin: function() {
    try {
      return localStorage.getItem(this.AUTO_LOGIN_KEY) === '1';
    } catch (e) {
      return false;
    }
  },

  setAutoLogin: function(val) {
    try {
      localStorage.setItem(this.AUTO_LOGIN_KEY, val ? '1' : '0');
    } catch (e) {}
  },

  clearCredentials: function() {
    this.clearUsername();
    this.clearPassword();
    this.setRememberUsername(false);
    this.setRememberPassword(false);
    this.setAutoLogin(false);
  },

  // Music cache (localStorage)
  getCachedMusicList: function() {
    try {
      var data = localStorage.getItem(this.MUSIC_CACHE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {}
    return null;
  },

  setCachedMusicList: function(items) {
    try {
      localStorage.setItem(this.MUSIC_CACHE_KEY, JSON.stringify(items));
    } catch (e) {}
  },

  clearCachedMusicList: function() {
    try {
      localStorage.removeItem(this.MUSIC_CACHE_KEY);
    } catch (e) {}
  },

  // Check if music cache exists
  hasMusicCache: function() {
    try {
      return localStorage.getItem(this.MUSIC_CACHE_KEY) !== null;
    } catch (e) {
      return false;
    }
  },

  // Radar cache (localStorage)
  getRadarCache: function(playStyle) {
    try {
      var data = localStorage.getItem(this.RADAR_CACHE_PREFIX + playStyle);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {}
    return null;
  },

  setRadarCache: function(playStyle, cacheData) {
    try {
      localStorage.setItem(this.RADAR_CACHE_PREFIX + playStyle, JSON.stringify(cacheData));
    } catch (e) {}
  },

  clearRadarCache: function(playStyle) {
    try {
      localStorage.removeItem(this.RADAR_CACHE_PREFIX + playStyle);
    } catch (e) {}
  },

  clearAllRadarCaches: function() {
    this.clearRadarCache(0);
    this.clearRadarCache(1);
  },

  // Difficulty table cache
  DIFF_CACHE_PREFIX: 'pocketiidx_diff_cache_',

  getDiffCache: function(tableName) {
    try {
      var data = localStorage.getItem(this.DIFF_CACHE_PREFIX + tableName);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {}
    return null;
  },

  setDiffCache: function(tableName, cacheData) {
    try {
      localStorage.setItem(this.DIFF_CACHE_PREFIX + tableName, JSON.stringify(cacheData));
    } catch (e) {}
  },

  clearDiffCache: function(tableName) {
    try {
      localStorage.removeItem(this.DIFF_CACHE_PREFIX + tableName);
    } catch (e) {}
  },

  clearAllDiffCaches: function() {
    try {
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var key = localStorage.key(i);
        if (key && key.indexOf(this.DIFF_CACHE_PREFIX) === 0) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {}
  },

  // Recommendation cache
  REC_CACHE_PREFIX: 'pocketiidx_rec_cache_',

  getRecCache: function(playStyle, mode) {
    try {
      var key = this.REC_CACHE_PREFIX + playStyle + '_' + mode;
      var data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {}
    return null;
  },

  setRecCache: function(playStyle, mode, cacheData) {
    try {
      var key = this.REC_CACHE_PREFIX + playStyle + '_' + mode;
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (e) {}
  },

  clearRecCache: function(playStyle, mode) {
    try {
      var key = this.REC_CACHE_PREFIX + playStyle + '_' + mode;
      localStorage.removeItem(key);
    } catch (e) {}
  },

  clearAllRecCaches: function() {
    try {
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var key = localStorage.key(i);
        if (key && key.indexOf(this.REC_CACHE_PREFIX) === 0) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {}
  },

  // Music cache meta (for sync timestamp)
  MUSIC_CACHE_META_KEY: 'pocketiidx_music_cache_meta',

  getMusicCacheMeta: function() {
    try {
      var data = localStorage.getItem(this.MUSIC_CACHE_META_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {}
    return null;
  },

  setMusicCacheMeta: function(meta) {
    try {
      localStorage.setItem(this.MUSIC_CACHE_META_KEY, JSON.stringify(meta));
    } catch (e) {}
  },

  clearMusicCacheMeta: function() {
    try {
      localStorage.removeItem(this.MUSIC_CACHE_META_KEY);
    } catch (e) {}
  },

  // Clear all user-specific caches
  clearUserCaches: function() {
    this.clearAllRadarCaches();
    this.clearAllDiffCaches();
    this.clearAllRecCaches();
    this.clearFavorites();
  },

  // Clear all caches including music cache
  clearAllCaches: function() {
    this.clearUserCaches();
    this.clearCachedMusicList();
    this.clearMusicCacheMeta();
  },

  // Favorites storage
  FAVORITES_KEY: 'pocketiidx_favorites',

  getFavorites: function() {
    try {
      var data = localStorage.getItem(this.FAVORITES_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return [];
  },

  setFavorites: function(items) {
    try {
      localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(items));
    } catch (e) {}
  },

  isFavorite: function(musicId, playStyle, chartDifficulty) {
    var favorites = this.getFavorites();
    for (var i = 0; i < favorites.length; i++) {
      var f = favorites[i];
      if (f.musicId === musicId && f.playStyle === playStyle && f.chartDifficulty === chartDifficulty) {
        return true;
      }
    }
    return false;
  },

  toggleFavorite: function(musicId, playStyle, chartDifficulty, title) {
    var favorites = this.getFavorites();
    var idx = -1;
    for (var i = 0; i < favorites.length; i++) {
      var f = favorites[i];
      if (f.musicId === musicId && f.playStyle === playStyle && f.chartDifficulty === chartDifficulty) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) {
      favorites.splice(idx, 1);
      this.setFavorites(favorites);
      return false;
    } else {
      favorites.push({ musicId: musicId, playStyle: playStyle, chartDifficulty: chartDifficulty, title: title || '' });
      this.setFavorites(favorites);
      return true;
    }
  },

  clearFavorites: function() {
    try {
      localStorage.removeItem(this.FAVORITES_KEY);
    } catch (e) {}
  },

  // Collect all caches with stale timestamps
  getStaleCaches: function(latestTimestamp) {
    var stale = [];

    // Music list
    var musicMeta = this.getMusicCacheMeta();
    if (this.hasMusicCache() && (!musicMeta || musicMeta.syncTimestamp !== latestTimestamp)) {
      stale.push({ type: 'music' });
    }

    // Radar caches
    for (var ps = 0; ps <= 1; ps++) {
      var radar = this.getRadarCache(ps);
      if (radar && radar.syncTimestamp !== latestTimestamp) {
        stale.push({ type: 'radar', playStyle: ps });
      }
    }

    // Difficulty table caches
    try {
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var key = localStorage.key(i);
        if (key && key.indexOf(this.DIFF_CACHE_PREFIX) === 0) {
          var tableName = key.substring(this.DIFF_CACHE_PREFIX.length);
          var cache = this.getDiffCache(tableName);
          if (cache && cache.syncTimestamp !== latestTimestamp) {
            stale.push({ type: 'diff', tableName: tableName });
          }
        }
      }
    } catch (e) {}

    // Recommendation caches
    try {
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var key = localStorage.key(i);
        if (key && key.indexOf(this.REC_CACHE_PREFIX) === 0) {
          var suffix = key.substring(this.REC_CACHE_PREFIX.length);
          var parts = suffix.split('_');
          if (parts.length >= 2) {
            var playStyle = parseInt(parts[0], 10);
            var mode = parts.slice(1).join('_');
            var cache = this.getRecCache(playStyle, mode);
            if (cache && cache.syncTimestamp !== latestTimestamp) {
              stale.push({ type: 'rec', playStyle: playStyle, mode: mode });
            }
          }
        }
      }
    } catch (e) {}

    return stale;
  },

  // Calculate total cache size in bytes
  getCacheSize: function() {
    var total = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf('pocketiidx_') === 0) {
          var val = localStorage.getItem(key);
          if (val) {
            total += val.length * 2;
          }
        }
      }
    } catch (e) {}
    return total;
  },

  formatSize: function(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
};
