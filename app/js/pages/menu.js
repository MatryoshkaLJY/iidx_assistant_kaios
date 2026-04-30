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
      case 'search':
        App.showPage('search');
        break;
    }
  },

  onArrowUp: function() {
    if (this.menuVisible) {
      this.menuFocusIndex--;
      if (this.menuFocusIndex < 0) {
        this.menuFocusIndex = 0;
      }
      this.updateMenuFocus();
    } else {
      App.moveFocus(-1);
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
    } else {
      App.moveFocus(1);
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
    var pageItems = document.querySelectorAll('#menu-list .list-item');
    for (var i = 0; i < pageItems.length; i++) {
      pageItems[i].classList.remove('focused');
    }

    var menuEl = document.getElementById('app-menu');
    if (menuEl) menuEl.style.display = 'block';

    this.updateMenuFocus();
    this.updateSoftkeyLabels('关闭', '');
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
      App.navStack = [];
      App.showPage('login');
    } else if (cmd === 'profile') {
      alert('用户信息功能待实现');
    }
  }
};

App.pageHandlers['menu'] = MenuPage;
