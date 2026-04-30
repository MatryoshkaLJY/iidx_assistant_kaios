var FavoritesPage = {
  favorites: [],

  onShow: function() {
    this.loadFavorites();
  },

  loadFavorites: function() {
    var all = Storage.getFavorites();
    all.sort(function(a, b) {
      var at = (a.title || '').toLowerCase();
      var bt = (b.title || '').toLowerCase();
      if (at < bt) return -1;
      if (at > bt) return 1;
      return 0;
    });
    this.favorites = all;
    this.render();
  },

  render: function() {
    var list = document.getElementById('favorites-list');
    list.innerHTML = '';

    if (this.favorites.length === 0) {
      list.innerHTML = '<li class="list-item">暂无收藏歌曲</li>';
    } else {
      for (var i = 0; i < this.favorites.length; i++) {
        var fav = this.favorites[i];
        var li = document.createElement('li');
        li.className = 'list-item';
        var title = Utils.escapeHtml(fav.title || 'Unknown');
        var diffText = Utils.chartDiffText(fav.chartDifficulty);
        var styleText = Utils.playStyleText(fav.playStyle);
        var sub = styleText + ' ' + diffText;
        li.innerHTML = '<span class="favorite-bar"></span><span class="item-title">' + title + '</span><span class="sub">' + sub + '</span>';
        li.setAttribute('data-fav-idx', i);
        list.appendChild(li);
      }
    }

    App.updateFocusableItems();
    App.currentFocusIndex = 0;
    App.renderFocus();
  },

  onEnter: function() {
    var item = App.getFocusedItem();
    if (!item) return;
    var idx = parseInt(item.getAttribute('data-fav-idx'), 10);
    var fav = this.favorites[idx];
    if (!fav) return;
    App.showPage('song', {
      musicId: fav.musicId,
      playStyle: fav.playStyle,
      chartDifficulty: fav.chartDifficulty
    });
  },

  onSoftLeft: function() {
    App.goBack();
  },

  onSoftRight: function() {
    var item = App.getFocusedItem();
    if (!item) return;
    var idx = parseInt(item.getAttribute('data-fav-idx'), 10);
    var fav = this.favorites[idx];
    if (!fav) return;
    Storage.toggleFavorite(fav.musicId, fav.playStyle, fav.chartDifficulty, fav.title);
    this.loadFavorites();
  },

  onBack: function() {
    return false;
  }
};

App.pageHandlers['favorites'] = FavoritesPage;
