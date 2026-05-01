var App = {
  navStack: [],
  currentPage: null,
  currentFocusIndex: 0,
  focusableItems: [],
  syncStatus: null,
  syncStatusTimestamp: 0,

  init: function() {
    // Disable touch navigation for D-pad control (KaiOS)
    if (typeof widget !== 'undefined' && typeof widget.setNavigationEnabled === 'function') {
      widget.setNavigationEnabled(false);
    }

    this.bindKeys();

    var token = Storage.getToken();
    if (token) {
      this.showPage('menu');
      this.fetchSyncStatus();
    } else {
      this.showPage('login');
    }
  },

  showPage: function(pageId, data) {
    // Blur any focused input to dismiss the virtual keyboard
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }

    // Hide current page
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) {
      pages[i].classList.remove('active');
    }

    // Show new page
    var pageEl = document.getElementById('page-' + pageId);
    if (pageEl) {
      pageEl.classList.add('active');
    }

    this.currentPage = pageId;
    this.currentFocusIndex = 0;

    // Push to nav stack (avoid duplicates at top)
    if (this.navStack.length === 0 || this.navStack[this.navStack.length - 1] !== pageId) {
      this.navStack.push(pageId);
    }

    // Notify page
    var handler = this.pageHandlers[pageId];
    if (handler && handler.onShow) {
      handler.onShow(data);
    }

    this.updateFocusableItems();
    this.renderFocus();
  },

  goBack: function() {
    // Blur any focused input to dismiss the virtual keyboard
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }

    var handler = this.pageHandlers[this.currentPage];
    if (handler && handler.onBack) {
      var handled = handler.onBack();
      if (handled) return;
    }

    // Pop current page
    this.navStack.pop();

    if (this.navStack.length === 0) {
      // If at root, go to menu or login
      var token = Storage.getToken();
      if (token) {
        this.showPage('menu');
      } else {
        this.showPage('login');
      }
      return;
    }

    // Show previous page
    var prevPage = this.navStack[this.navStack.length - 1];

    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) {
      pages[i].classList.remove('active');
    }

    var pageEl = document.getElementById('page-' + prevPage);
    if (pageEl) {
      pageEl.classList.add('active');
    }

    this.currentPage = prevPage;
    this.currentFocusIndex = 0;

    var prevHandler = this.pageHandlers[prevPage];
    if (prevHandler && prevHandler.onShow) {
      prevHandler.onShow();
    }

    this.updateFocusableItems();
    this.renderFocus();
  },

  updateFocusableItems: function() {
    var pageEl = document.getElementById('page-' + this.currentPage);
    if (!pageEl) {
      this.focusableItems = [];
      return;
    }

    this.focusableItems = pageEl.querySelectorAll('.list-item, .input-row');
  },

  renderFocus: function() {
    for (var i = 0; i < this.focusableItems.length; i++) {
      this.focusableItems[i].classList.remove('focused');
    }

    if (this.focusableItems.length > 0 && this.currentFocusIndex >= 0 && this.currentFocusIndex < this.focusableItems.length) {
      var item = this.focusableItems[this.currentFocusIndex];
      item.classList.add('focused');

      // Scroll into view (manual closest for Gecko 48 compatibility)
      var content = null;
      var parent = item.parentNode;
      while (parent) {
        if (parent.classList && parent.classList.contains('scrollable')) {
          content = parent;
          break;
        }
        parent = parent.parentNode;
      }
      if (content) {
        var itemTop = item.offsetTop;
        var itemBottom = itemTop + item.offsetHeight;
        var scrollTop = content.scrollTop;
        var viewHeight = content.clientHeight;

        if (itemTop < scrollTop) {
          content.scrollTop = itemTop;
        } else if (itemBottom > scrollTop + viewHeight) {
          content.scrollTop = itemBottom - viewHeight;
        }
      }
    }

    // Update list counter
    var counterEl = document.querySelector('#page-' + this.currentPage + ' .list-counter');
    if (counterEl) {
      var total = this.focusableItems.length;
      var current = total > 0 ? (this.currentFocusIndex + 1) : 0;
      counterEl.textContent = current + '/' + total;
    }

    // Notify page handler of focus change
    var handler = this.pageHandlers[this.currentPage];
    if (handler && handler.onFocusChanged) {
      handler.onFocusChanged();
    }
  },

  moveFocus: function(delta) {
    if (this.focusableItems.length === 0) return;

    this.currentFocusIndex += delta;
    if (this.currentFocusIndex < 0) {
      this.currentFocusIndex = this.focusableItems.length - 1;
    }
    if (this.currentFocusIndex >= this.focusableItems.length) {
      this.currentFocusIndex = 0;
    }

    this.renderFocus();
  },

  getFocusedItem: function() {
    if (this.focusableItems.length > 0 && this.currentFocusIndex >= 0 && this.currentFocusIndex < this.focusableItems.length) {
      return this.focusableItems[this.currentFocusIndex];
    }
    return null;
  },

  _isEditingInput: function() {
    var active = document.activeElement;
    if (!active) return false;
    var tag = active.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea';
  },

  showLoading: function(text) {
    var el = document.getElementById('loading-overlay');
    var txt = document.getElementById('loading-text');
    if (txt) txt.textContent = text || '加载中...';
    if (el) el.style.display = 'flex';
  },

  hideLoading: function() {
    var el = document.getElementById('loading-overlay');
    if (el) el.style.display = 'none';
  },

  bindKeys: function() {
    var self = this;
    var target = document.body || document;

    target.addEventListener('keydown', function(e) {
      var handler = self.pageHandlers[self.currentPage];

      switch (e.key) {
        case 'ArrowUp':
          if (handler && handler.onArrowUp) {
            e.preventDefault();
            handler.onArrowUp();
          } else if (self.focusableItems.length > 0) {
            e.preventDefault();
            self.moveFocus(-1);
          }
          break;

        case 'ArrowDown':
          if (handler && handler.onArrowDown) {
            e.preventDefault();
            handler.onArrowDown();
          } else if (self.focusableItems.length > 0) {
            e.preventDefault();
            self.moveFocus(1);
          }
          break;

        case 'ArrowLeft':
          if (handler && handler.onArrowLeft) {
            e.preventDefault();
            handler.onArrowLeft();
          } else if (self.focusableItems.length > 0 && !self._isEditingInput()) {
            e.preventDefault();
            self.moveFocus(-5);
          }
          break;

        case 'ArrowRight':
          if (handler && handler.onArrowRight) {
            e.preventDefault();
            handler.onArrowRight();
          } else if (self.focusableItems.length > 0 && !self._isEditingInput()) {
            e.preventDefault();
            self.moveFocus(5);
          }
          break;

        case 'Enter':
        case 'Accept':
          e.preventDefault();
          if (handler && handler.onEnter) {
            handler.onEnter();
          }
          break;

        case 'Backspace':
        case 'Back':
          e.preventDefault();
          self.goBack();
          break;

        case 'SoftLeft':
        case 'F1':
          e.preventDefault();
          if (handler && handler.onSoftLeft) {
            handler.onSoftLeft();
          }
          break;

        case 'SoftRight':
        case 'F2':
          e.preventDefault();
          if (handler && handler.onSoftRight) {
            handler.onSoftRight();
          }
          break;

        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          if (handler && handler.onDigit) {
            handler.onDigit(parseInt(e.key, 10));
          }
          break;
      }
    });
  },

  // Cache validation
  isCacheValid: function(cache) {
    if (!cache) return false;
    if (this.syncStatusTimestamp === 0) return false;
    return cache.syncTimestamp === this.syncStatusTimestamp;
  },

  // Sync status
  fetchSyncStatus: function(callback) {
    var self = this;
    App.showLoading('正在获取服务器状态...');

    // Use /api/scores for accurate latest-update timestamp.
    // The first score in the list carries the most recent timestamp.
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
          if (callback) callback(null, firstScore);
          return;
        }
      }

      // Fallback to /api/sync/status if scores endpoint fails
      Api.getSyncStatus('bjmania', function(error2, result2) {
        App.hideLoading();
        if (!error2 && result2) {
          self.syncStatus = result2;
          self.syncStatusTimestamp = self._parseSyncTimestamp(result2);
        }
        if (callback) callback(error2, result2);
      });
    });
  },

  _parseSyncTimestamp: function(result) {
    if (!result) return 0;
    if (typeof result === 'number') return result;
    if (typeof result === 'string') {
      var d = new Date(result).getTime();
      if (!isNaN(d)) return d;
      var n = parseInt(result, 10);
      if (!isNaN(n)) return n;
    }
    if (typeof result === 'object') {
      for (var key in result) {
        if (result.hasOwnProperty(key)) {
          var val = result[key];
          if (typeof val === 'number') return val;
          if (typeof val === 'string') {
            var d2 = new Date(val).getTime();
            if (!isNaN(d2)) return d2;
            var n2 = parseInt(val, 10);
            if (!isNaN(n2)) return n2;
          }
        }
      }
    }
    return 0;
  },

  fullSync: function() {
    var self = this;
    if (self._syncInProgress) {
      alert('同步正在进行中');
      return;
    }
    self._syncInProgress = true;
    App.showLoading('正在检查同步状态...');
    self.fetchSyncStatus(function(error, result) {
      if (error || self.syncStatusTimestamp === 0) {
        App.hideLoading();
        self._syncInProgress = false;
        alert('获取同步状态失败');
        return;
      }
      var staleCaches = Storage.getStaleCaches(self.syncStatusTimestamp);
      if (staleCaches.length === 0) {
        App.hideLoading();
        self._syncInProgress = false;
        alert('所有数据已是最新');
        return;
      }
      self._syncCount = { total: staleCaches.length, done: 0 };
      self._syncNextCache(staleCaches, 0, function() {
        App.hideLoading();
        self._syncInProgress = false;
        alert('同步完成');
      });
    });
  },

  _syncNextCache: function(caches, index, callback) {
    var self = this;
    if (index >= caches.length) {
      if (callback) callback();
      return;
    }
    var cache = caches[index];
    self._syncCount.done++;
    var progress = '(' + self._syncCount.done + '/' + self._syncCount.total + ') ';
    switch (cache.type) {
      case 'music':
        App.showLoading(progress + '正在同步曲库...');
        Api.getMusicList(function(error, result) {
          if (!error && result) {
            Storage.setCachedMusicList(result);
            Storage.setMusicCacheMeta({ syncTimestamp: self.syncStatusTimestamp });
          }
          self._syncNextCache(caches, index + 1, callback);
        });
        break;
      case 'diff':
        App.showLoading(progress + '正在同步难度表...');
        Api.getDifficultyTable(cache.tableName, function(error, result) {
          if (!error && result) {
            Storage.setDiffCache(cache.tableName, {
              syncTimestamp: self.syncStatusTimestamp,
              data: result
            });
          }
          self._syncNextCache(caches, index + 1, callback);
        });
        break;
      case 'rec':
        App.showLoading(progress + '正在同步推荐...');
        Api.getRecommendations(cache.playStyle, cache.mode, function(error, result) {
          if (!error && result) {
            var songs = [];
            if (Array.isArray(result)) {
              songs = result;
            } else if (result && Array.isArray(result.items)) {
              songs = result.items;
            } else if (result && typeof result === 'object') {
              for (var key in result) {
                if (result.hasOwnProperty(key) && Array.isArray(result[key])) {
                  songs = result[key];
                  break;
                }
              }
            }
            Storage.setRecCache(cache.playStyle, cache.mode, {
              syncTimestamp: self.syncStatusTimestamp,
              data: Utils.sortBy(songs, 'recommendation_score', true)
            });
          }
          self._syncNextCache(caches, index + 1, callback);
        });
        break;
      case 'radar':
        // Radar requires too many requests (1 summary + 12 dimension requests).
        // Clear the stale cache so it gets re-fetched when user enters radar page.
        Storage.clearRadarCache(cache.playStyle);
        self._syncNextCache(caches, index + 1, callback);
        break;
      default:
        self._syncNextCache(caches, index + 1, callback);
    }
  },

  fetchAllData: function() {
    var self = this;
    if (self._fetchAllInProgress) {
      alert('获取正在进行中');
      return;
    }
    self._fetchAllInProgress = true;

    // Fetch latest sync status first so all caches share the same timestamp
    App.showLoading('正在获取服务器状态...');
    self.fetchSyncStatus(function(error, result) {
      if (error || self.syncStatusTimestamp === 0) {
        App.hideLoading();
        self._fetchAllInProgress = false;
        alert('获取同步状态失败，无法开始');
        return;
      }

      // Capture timestamp so every block uses the same server timestamp
      self._fetchAllTimestamp = self.syncStatusTimestamp;

      var tasks = [];

      // 1. Music list
      tasks.push({ type: 'music', label: '曲库' });

      // 2. Radar (SP + DP)
      tasks.push({ type: 'radar', playStyle: 0, label: 'SP雷达' });
      tasks.push({ type: 'radar', playStyle: 1, label: 'DP雷达' });

      // 3. Recommendations (SP + DP × 3 modes)
      var modes = ['hot_hand', 'progress', 'ascension'];
      for (var ps = 0; ps <= 1; ps++) {
        for (var m = 0; m < modes.length; m++) {
          tasks.push({ type: 'rec', playStyle: ps, mode: modes[m], label: (ps === 0 ? 'SP' : 'DP') + '推荐' });
        }
      }

      // 4. Difficulty tables — all combinations
      var diffTasks = self._buildAllDiffTasks();
      tasks = tasks.concat(diffTasks);

      self._fetchAllCount = { total: tasks.length, done: 0 };
      App.showLoading('(0/' + tasks.length + ') 准备获取...');

      self._fetchNextTask(tasks, 0, function() {
        App.hideLoading();
        self._fetchAllInProgress = false;
        delete self._fetchAllTimestamp;
        alert('获取完成');
      });
    });
  },

  _buildAllDiffTasks: function() {
    var tasks = [];
    var seen = {};

    // Save and restore DifficultyPage state to avoid side effects
    var savedPlayStyle = DifficultyPage.playStyle;
    var savedType = DifficultyPage.selectedType;
    var savedLevel = DifficultyPage.selectedLevel;
    var savedLamp = DifficultyPage.selectedLamp;

    for (var ps = 0; ps <= 1; ps++) {
      DifficultyPage.playStyle = ps;
      var types = DifficultyPage.getTableTypes();

      for (var t = 0; t < types.length; t++) {
        var type = types[t];
        DifficultyPage.selectedType = type;

        if (type.needsLevel) {
          var levels = DifficultyPage.getLevels(type.id);
          for (var l = 0; l < levels.length; l++) {
            DifficultyPage.selectedLevel = levels[l];

            if (type.needsLamp) {
              var lamps = DifficultyPage.getLamps(type.id, levels[l]);
              for (var li = 0; li < lamps.length; li++) {
                DifficultyPage.selectedLamp = lamps[li];
                var tableName = DifficultyPage.buildTableName();
                if (tableName && !seen[tableName]) {
                  seen[tableName] = true;
                  tasks.push({ type: 'diff', tableName: tableName, label: (ps === 0 ? 'SP' : 'DP') + '难度表' });
                }
              }
            } else {
              DifficultyPage.selectedLamp = null;
              var tableName = DifficultyPage.buildTableName();
              if (tableName && !seen[tableName]) {
                seen[tableName] = true;
                tasks.push({ type: 'diff', tableName: tableName, label: (ps === 0 ? 'SP' : 'DP') + '难度表' });
              }
            }
          }
        } else if (type.needsLamp) {
          DifficultyPage.selectedLevel = null;
          var lamps = DifficultyPage.getLamps(type.id, '');
          for (var li = 0; li < lamps.length; li++) {
            DifficultyPage.selectedLamp = lamps[li];
            var tableName = DifficultyPage.buildTableName();
            if (tableName && !seen[tableName]) {
              seen[tableName] = true;
              tasks.push({ type: 'diff', tableName: tableName, label: (ps === 0 ? 'SP' : 'DP') + '难度表' });
            }
          }
        } else {
          DifficultyPage.selectedLevel = null;
          DifficultyPage.selectedLamp = null;
          var tableName = DifficultyPage.buildTableName();
          if (tableName && !seen[tableName]) {
            seen[tableName] = true;
            tasks.push({ type: 'diff', tableName: tableName, label: (ps === 0 ? 'SP' : 'DP') + '难度表' });
          }
        }
      }
    }

    // Restore state
    DifficultyPage.playStyle = savedPlayStyle;
    DifficultyPage.selectedType = savedType;
    DifficultyPage.selectedLevel = savedLevel;
    DifficultyPage.selectedLamp = savedLamp;

    return tasks;
  },

  _fetchNextTask: function(tasks, index, callback) {
    var self = this;
    if (index >= tasks.length) {
      if (callback) callback();
      return;
    }

    var task = tasks[index];
    self._fetchAllCount.done++;
    var progress = '(' + self._fetchAllCount.done + '/' + self._fetchAllCount.total + ') ';

    switch (task.type) {
      case 'music':
        App.showLoading(progress + '正在获取曲库...');
        Api.getMusicList(function(error, result) {
          if (!error && result) {
            Storage.setCachedMusicList(result);
            Storage.setMusicCacheMeta({ syncTimestamp: self._fetchAllTimestamp });
          }
          self._fetchNextTask(tasks, index + 1, callback);
        });
        break;

      case 'diff':
        App.showLoading(progress + '正在获取' + task.label + '...');
        Api.getDifficultyTable(task.tableName, function(error, result) {
          if (!error && result) {
            Storage.setDiffCache(task.tableName, {
              syncTimestamp: self._fetchAllTimestamp,
              data: result
            });
          }
          self._fetchNextTask(tasks, index + 1, callback);
        });
        break;

      case 'rec':
        App.showLoading(progress + '正在获取' + task.label + '...');
        Api.getRecommendations(task.playStyle, task.mode, function(error, result) {
          if (!error && result) {
            var songs = [];
            if (Array.isArray(result)) {
              songs = result;
            } else if (result && Array.isArray(result.items)) {
              songs = result.items;
            } else if (result && typeof result === 'object') {
              for (var key in result) {
                if (result.hasOwnProperty(key) && Array.isArray(result[key])) {
                  songs = result[key];
                  break;
                }
              }
            }
            Storage.setRecCache(task.playStyle, task.mode, {
              syncTimestamp: self._fetchAllTimestamp,
              data: Utils.sortBy(songs, 'recommendation_score', true)
            });
          }
          self._fetchNextTask(tasks, index + 1, callback);
        });
        break;

      case 'radar':
        App.showLoading(progress + '正在获取' + task.label + '...');
        self._fetchRadarFull(task.playStyle, function() {
          self._fetchNextTask(tasks, index + 1, callback);
        });
        break;

      default:
        self._fetchNextTask(tasks, index + 1, callback);
    }
  },

  _fetchRadarFull: function(playStyle, callback) {
    var self = this;
    Api.getRadarSummary(playStyle, function(error, result) {
      if (error || !result) {
        if (callback) callback();
        return;
      }

      var radarData = result;
      var dimensions = result && result.radar_summary ? result.radar_summary : [];
      var dimensionData = {};

      if (dimensions.length === 0) {
        Storage.setRadarCache(playStyle, {
          syncTimestamp: self._fetchAllTimestamp,
          summary: radarData,
          dimensions: dimensions,
          dimensionData: dimensionData
        });
        if (callback) callback();
        return;
      }

      var total = dimensions.length * 2;
      var completed = 0;

      function checkDone() {
        completed++;
        if (completed >= total) {
          Storage.setRadarCache(playStyle, {
            syncTimestamp: self._fetchAllTimestamp,
            summary: radarData,
            dimensions: dimensions,
            dimensionData: dimensionData
          });
          if (callback) callback();
        }
      }

      for (var i = 0; i < dimensions.length; i++) {
        var dim = dimensions[i].dimension;
        if (!dimensionData[dim]) {
          dimensionData[dim] = {};
        }

        Api.getRadarDimension(playStyle, dim, function(dimension) {
          return function(error, result) {
            if (!error && result) {
              dimensionData[dimension].detail = result;
            }
            checkDone();
          };
        }(dim));

        Api.getRadarRecommendations(playStyle, dim, function(dimension) {
          return function(error, result) {
            if (!error && result) {
              dimensionData[dimension].rec = result;
            }
            checkDone();
          };
        }(dim));
      }
    });
  },

  // Page handlers registry
  pageHandlers: {}
};
