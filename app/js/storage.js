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
  }
};
