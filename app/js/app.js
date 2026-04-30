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
          e.preventDefault();
          if (handler && handler.onArrowLeft) {
            handler.onArrowLeft();
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (handler && handler.onArrowRight) {
            handler.onArrowRight();
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
      }
    });
  },

  // Sync status
  fetchSyncStatus: function() {
    var self = this;
    Api.getSyncStatus('bjmania', function(error, result) {
      if (!error && result) {
        self.syncStatus = result;
        self.syncStatusTimestamp = self._parseSyncTimestamp(result);
      }
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

  // Page handlers registry
  pageHandlers: {}
};
