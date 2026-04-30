var RecommendPage = {
  playStyle: 0,
  step: 'mode', // 'mode' | 'songs'
  selectedMode: null,
  songs: [],

  modes: [
    { id: 'hot_hand', name: '热手' },
    { id: 'progress', name: '进步' },
    { id: 'ascension', name: '飞升' }
  ],

  onShow: function(data) {
    this.playStyle = data && data.playStyle !== undefined ? data.playStyle : 0;
    this.step = 'mode';
    this.selectedMode = null;
    this.songs = [];
    this.renderModeList();
  },

  renderModeList: function() {
    var header = document.getElementById('rec-header');
    if (header) header.textContent = (this.playStyle === 0 ? 'SP' : 'DP') + ' 练习推荐';

    var list = document.getElementById('rec-list');
    list.innerHTML = '';

    for (var i = 0; i < this.modes.length; i++) {
      var li = document.createElement('li');
      li.className = 'list-item';
      li.textContent = this.modes[i].name;
      li.setAttribute('data-mode-idx', i);
      list.appendChild(li);
    }

    App.updateFocusableItems();
    App.currentFocusIndex = 0;
    App.renderFocus();
  },

  loadRecommendations: function() {
    var self = this;

    // Try cache first
    var cache = Storage.getRecCache(this.playStyle, this.selectedMode.id);
    if (cache && App.isCacheValid(cache)) {
      self.songs = cache.data;
      self.step = 'songs';
      self.renderSongsPage();
      return;
    }

    App.showLoading('加载中...');

    Api.getRecommendations(this.playStyle, this.selectedMode.id, function(error, result) {
      App.hideLoading();

      if (error) {
        alert('加载失败: ' + (error.message || '未知错误'));
        return;
      }

      // Handle multiple possible response formats:
      // 1. Direct array
      // 2. Object with 'items' array (like music list API)
      // 3. Object with any array property
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

      self.songs = Utils.sortBy(songs, 'recommendation_score', true);
      self.step = 'songs';
      self.renderSongsPage();

      // Save to cache
      if (App.syncStatusTimestamp > 0) {
        Storage.setRecCache(self.playStyle, self.selectedMode.id, {
          syncTimestamp: App.syncStatusTimestamp,
          data: self.songs
        });
      }
    });
  },

  renderSongsPage: function() {
    var page = document.getElementById('page-rec-songs');
    var prev = document.getElementById('page-recommend');
    if (prev) prev.classList.remove('active');
    if (page) page.classList.add('active');

    App.currentPage = 'rec-songs';
    App.navStack.push('rec-songs');

    var header = document.getElementById('rec-songs-header');
    if (header) {
      var modeName = '';
      for (var i = 0; i < this.modes.length; i++) {
        if (this.modes[i].id === this.selectedMode.id) {
          modeName = this.modes[i].name;
          break;
        }
      }
      header.textContent = (this.playStyle === 0 ? 'SP' : 'DP') + ' ' + modeName;
    }

    var bar = document.getElementById('rec-songs-bar');
    if (bar) bar.innerHTML = '<span class="list-counter"></span>';

    var list = document.getElementById('rec-songs-list');
    list.innerHTML = '';

    if (this.songs.length === 0) {
      list.innerHTML = '<li class="list-item">暂无推荐歌曲</li>';
    } else {
      for (var i = 0; i < this.songs.length; i++) {
        var song = this.songs[i];
        var li = document.createElement('li');
        li.className = 'list-item';

        var title = Utils.escapeHtml(song.music_title || 'Unknown');
        var diffText = Utils.chartDiffText(song.chart_difficulty);
        var sub = 'Lv.' + song.level + diffText;
        sub += ' | 推荐度: ' + (song.recommendation_score || 0);
        if (song.probability !== undefined) {
          sub += ' | 概率: ' + Math.round(song.probability * 100) + '%';
        }

        var flagColor = Utils.clearFlagColor(song.clear_flag);
        li.innerHTML = '<span class="clear-flag-bar" style="background:' + flagColor + ';"></span><span class="item-title">' + title + '</span><span class="sub">' + sub + '</span>';
        li.setAttribute('data-song-idx', i);
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

    if (this.step === 'mode') {
      var modeIdx = parseInt(item.getAttribute('data-mode-idx'), 10);
      this.selectedMode = this.modes[modeIdx];
      this.loadRecommendations();
    }
  },

  onBack: function() {
    if (this.step === 'songs') {
      var songsPage = document.getElementById('page-rec-songs');
      var recPage = document.getElementById('page-recommend');
      if (songsPage) songsPage.classList.remove('active');
      if (recPage) recPage.classList.add('active');

      var idx = App.navStack.indexOf('rec-songs');
      if (idx !== -1) {
        App.navStack.splice(idx, 1);
      }

      App.currentPage = 'recommend';
      this.step = 'mode';
      this.selectedMode = null;
      this.renderModeList();
      return true;
    }
    return false;
  },

  onSoftLeft: function() {
    App.goBack();
  }
};

App.pageHandlers['recommend'] = RecommendPage;

var RecSongsPage = {
  onEnter: function() {
    var item = App.getFocusedItem();
    if (!item) return;

    var songIdx = parseInt(item.getAttribute('data-song-idx'), 10);
    var song = RecommendPage.songs[songIdx];
    if (!song) return;

    App.showPage('song', {
      musicId: song.music_id,
      playStyle: RecommendPage.playStyle,
      chartDifficulty: song.chart_difficulty
    });
  },

  onSoftLeft: function() {
    RecommendPage.onBack();
  },

  onBack: function() {
    return RecommendPage.onBack();
  }
};

App.pageHandlers['rec-songs'] = RecSongsPage;
