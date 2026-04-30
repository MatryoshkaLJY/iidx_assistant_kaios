var MenuPage = {
  menuVisible: false,
  menuFocusIndex: 0,
  savedFocusIndex: 0,

  onShow: function() {
    this.menuVisible = false;
    this.menuFocusIndex = 0;
    this.hideMenu();
    App.updateFocusableItems();
    App.currentFocusIndex = 0;
    App.renderFocus();
  },

  execAction: function(action) {
    switch (action) {
      case 'sp-diff':
        App.showPage('difficulty', { playStyle: 0 });
        break;
      case 'dp-diff':
        App.showPage('difficulty', { playStyle: 1 });
        break;
      case 'sp-rec':
        App.showPage('recommend', { playStyle: 0 });
        break;
      case 'dp-rec':
        App.showPage('recommend', { playStyle: 1 });
        break;
      case 'sp-radar':
        App.showPage('radar', { playStyle: 0 });
        break;
      case 'dp-radar':
        App.showPage('radar', { playStyle: 1 });
        break;
      case 'search':
        App.showPage('search');
        break;
      case 'quick-rec':
        alert('功能开发中');
        break;
      case 'favorites':
        App.showPage('favorites');
        break;
    }
  },

  onEnter: function() {
    if (this.menuVisible) {
      var items = document.querySelectorAll('#app-menu-list .app-menu-item');
      if (this.menuFocusIndex >= 0 && this.menuFocusIndex < items.length) {
        var cmd = items[this.menuFocusIndex].getAttribute('data-menu-cmd');
        this.execMenuCmd(cmd);
      }
      return;
    }

    var item = App.getFocusedItem();
    if (!item) return;

    var action = item.getAttribute('data-action');
    if (!action) return;
    this.execAction(action);
  },

  onArrowUp: function() {
    if (this.menuVisible) {
      this.menuFocusIndex--;
      if (this.menuFocusIndex < 0) {
        this.menuFocusIndex = 0;
      }
      this.updateMenuFocus();
      return;
    }
    var idx = App.currentFocusIndex;
    if (idx >= 3) {
      App.currentFocusIndex = idx - 3;
      App.renderFocus();
    }
  },

  onArrowDown: function() {
    if (this.menuVisible) {
      this.menuFocusIndex++;
      var items = document.querySelectorAll('#app-menu-list .app-menu-item');
      if (this.menuFocusIndex >= items.length) {
        this.menuFocusIndex = items.length - 1;
      }
      this.updateMenuFocus();
      return;
    }
    var idx = App.currentFocusIndex;
    if (idx < 6) {
      App.currentFocusIndex = idx + 3;
      App.renderFocus();
    }
  },

  onArrowLeft: function() {
    if (this.menuVisible) return;
    var idx = App.currentFocusIndex;
    if (idx % 3 !== 0) {
      App.currentFocusIndex = idx - 1;
      App.renderFocus();
    }
  },

  onArrowRight: function() {
    if (this.menuVisible) return;
    var idx = App.currentFocusIndex;
    if (idx % 3 !== 2) {
      App.currentFocusIndex = idx + 1;
      App.renderFocus();
    }
  },

  onDigit: function(num) {
    if (this.menuVisible) return;
    var cells = document.querySelectorAll('#menu-grid .menu-cell');
    for (var i = 0; i < cells.length; i++) {
      var cellNum = parseInt(cells[i].getAttribute('data-num'), 10);
      if (cellNum === num) {
        App.currentFocusIndex = i;
        App.renderFocus();
        var action = cells[i].getAttribute('data-action');
        this.execAction(action);
        break;
      }
    }
  },

  onSoftRight: function() {
    if (this.menuVisible) {
      this.hideMenu();
    } else {
      this.showMenu();
    }
  },

  onSoftLeft: function() {
    if (this.menuVisible) {
      this.hideMenu();
      return;
    }
    App.goBack();
  },

  onBack: function() {
    if (this.menuVisible) {
      this.hideMenu();
      return true;
    }
    return false;
  },

  showMenu: function() {
    this.menuVisible = true;
    this.menuFocusIndex = 0;
    this.savedFocusIndex = App.currentFocusIndex;

    // Remove focus from page items
    var pageItems = document.querySelectorAll('#menu-grid .menu-cell');
    for (var i = 0; i < pageItems.length; i++) {
      pageItems[i].classList.remove('focused');
    }

    var menuEl = document.getElementById('app-menu');
    if (menuEl) menuEl.style.display = 'block';

    this.updateMenuLabels();
    this.updateMenuFocus();
    this.updateSoftkeyLabels('关闭', '');
  },

  updateMenuLabels: function() {
    var items = document.querySelectorAll('#app-menu-list .app-menu-item');
    for (var i = 0; i < items.length; i++) {
      var cmd = items[i].getAttribute('data-menu-cmd');
      if (cmd === 'clear-cache') {
        var size = Storage.getCacheSize();
        var label = Storage.formatSize(size);
        items[i].textContent = '清除缓存 (' + label + ')';
      } else if (cmd === 'logout') {
        var username = Storage.getUsername();
        items[i].textContent = username ? '退出登录 (' + username + ')' : '退出登录';
      }
    }
  },

  hideMenu: function() {
    this.menuVisible = false;

    var menuEl = document.getElementById('app-menu');
    if (menuEl) menuEl.style.display = 'none';

    // Remove focus from menu items
    var menuItems = document.querySelectorAll('#app-menu-list .app-menu-item');
    for (var i = 0; i < menuItems.length; i++) {
      menuItems[i].classList.remove('focused');
    }

    // Restore page focus
    App.currentFocusIndex = this.savedFocusIndex;
    App.renderFocus();
    this.updateSoftkeyLabels('菜单', '');
  },

  updateMenuFocus: function() {
    var items = document.querySelectorAll('#app-menu-list .app-menu-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove('focused');
    }
    if (items.length > 0 && this.menuFocusIndex >= 0 && this.menuFocusIndex < items.length) {
      items[this.menuFocusIndex].classList.add('focused');
    }
  },

  updateSoftkeyLabels: function(right, center) {
    var rightEl = document.getElementById('menu-soft-right');
    var centerEl = document.getElementById('menu-soft-center');
    if (rightEl) rightEl.textContent = right || '';
    if (centerEl) centerEl.textContent = center || '选择';
  },

  execMenuCmd: function(cmd) {
    this.hideMenu();
    if (cmd === 'logout') {
      Storage.clearToken();
      Storage.clearCredentials();
      Storage.clearUserCaches();
      App.navStack = [];
      App.showPage('login');
    } else if (cmd === 'profile') {
      alert('用户信息功能待实现');
    } else if (cmd === 'clear-cache') {
      Storage.clearAllCaches();
      alert('缓存已清除');
    }
  }
};

App.pageHandlers['menu'] = MenuPage;
