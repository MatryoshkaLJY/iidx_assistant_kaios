var API_BASE = 'https://iidx.pro';

var Api = {
  // Internal XHR helper
  _xhr: function(method, url, data, headers, callback) {
    var xhr = new XMLHttpRequest({ mozSystem: true });
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    if (headers) {
      for (var key in headers) {
        if (headers.hasOwnProperty(key)) {
          xhr.setRequestHeader(key, headers[key]);
        }
      }
    }

    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        var result = null;
        var error = null;

        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            if (xhr.responseText) {
              result = JSON.parse(xhr.responseText);
            }
          } else {
            error = { status: xhr.status, message: xhr.statusText };
          }
        } catch (e) {
          error = { status: xhr.status, message: 'Parse error' };
        }

        callback(error, result, xhr.status);
      }
    };

    xhr.onerror = function() {
      callback({ status: 0, message: 'Network error' }, null, 0);
    };

    xhr.ontimeout = function() {
      callback({ status: 0, message: 'Timeout' }, null, 0);
    };

    xhr.send(data || null);
  },

  // Request with auth header and auto-refresh / auto-relogin on 401
  _requestWithAuth: function(method, url, data, callback) {
    var self = this;
    var token = Storage.getToken();
    var headers = {};

    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    this._xhr(method, url, data, headers, function(error, result, status) {
      if (status === 401 && token) {
        // Step 1: Try refresh token
        self._refreshToken(function(refreshErr, refreshResult) {
          if (!refreshErr) {
            // Refresh succeeded, retry with new token
            var newToken = Storage.getToken();
            var newHeaders = {};
            if (newToken) {
              newHeaders['Authorization'] = 'Bearer ' + newToken;
            }
            self._xhr(method, url, data, newHeaders, callback);
            return;
          }

          // Step 2: Refresh failed, try auto-login with saved credentials
          var savedUsername = Storage.getUsername();
          var savedPassword = Storage.getPassword();
          if (savedUsername && savedPassword) {
            self.login(savedUsername, savedPassword, function(loginErr, loginResult) {
              if (loginErr || !loginResult || !loginResult.access_token) {
                Storage.clearToken();
                callback({ status: 401, message: 'Session expired' }, null, 401);
                return;
              }
              // Auto-login succeeded, retry original request
              var newToken = Storage.getToken();
              var newHeaders = {};
              if (newToken) {
                newHeaders['Authorization'] = 'Bearer ' + newToken;
              }
              self._xhr(method, url, data, newHeaders, callback);
            });
          } else {
            Storage.clearToken();
            callback({ status: 401, message: 'Session expired' }, null, 401);
          }
        });
      } else {
        callback(error, result, status);
      }
    });
  },

  // Refresh token
  _refreshToken: function(callback) {
    var self = this;
    this._xhr('POST', API_BASE + '/api/refresh', null, null, function(error, result, status) {
      if (!error && result && result.access_token) {
        Storage.setToken(result.access_token);
      }
      callback(error, result);
    });
  },

  // Login
  login: function(username, password, callback) {
    var data = 'username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password);
    var self = this;
    this._xhr('POST', API_BASE + '/api/login', data, null, function(error, result, status) {
      if (!error && result && result.access_token) {
        Storage.setToken(result.access_token);
      }
      callback(error, result);
    });
  },

  // Get difficulty table
  getDifficultyTable: function(tableName, callback) {
    this._requestWithAuth('GET', API_BASE + '/api/difficulty-tables/' + encodeURIComponent(tableName), null, callback);
  },

  // Get recommendations
  getRecommendations: function(playStyle, mode, callback) {
    var url = API_BASE + '/api/recommendation/difficulty/' + playStyle + '?mode=' + encodeURIComponent(mode);
    this._requestWithAuth('GET', url, null, callback);
  },

  // Get music list
  getMusicList: function(callback) {
    this._requestWithAuth('GET', API_BASE + '/api/music/list', null, callback);
  },

  // Get music detail
  getMusicDetail: function(musicId, playStyle, chartDifficulty, callback) {
    var url = API_BASE + '/api/music/' + musicId + '/' + playStyle + '/' + chartDifficulty;
    this._requestWithAuth('GET', url, null, callback);
  },

  // Get radar summary
  getRadarSummary: function(playStyle, callback) {
    var url = API_BASE + '/api/radar/' + playStyle + '/summary';
    this._requestWithAuth('GET', url, null, callback);
  },

  // Get radar dimension detail
  getRadarDimension: function(playStyle, dimension, callback) {
    var url = API_BASE + '/api/radar/' + playStyle + '/dimension/' + encodeURIComponent(dimension);
    this._requestWithAuth('GET', url, null, callback);
  },

  // Get radar-based recommendations
  getRadarRecommendations: function(playStyle, dimension, callback) {
    var url = API_BASE + '/api/recommendation/player-radar/' + playStyle + '?radar_dimension=' + encodeURIComponent(dimension);
    this._requestWithAuth('GET', url, null, callback);
  },

  // Get all personal scores
  getScores: function(callback) {
    this._requestWithAuth('GET', API_BASE + '/api/scores', null, callback);
  },

  // Get sync status for an external source
  getSyncStatus: function(ext, callback) {
    var url = API_BASE + '/api/sync/status/' + encodeURIComponent(ext);
    this._requestWithAuth('GET', url, null, callback);
  }
};
