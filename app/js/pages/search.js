var SearchPage = {
  musicList: [],
  filteredList: [],
  isLoading: false,
  searchInputFocused: true,

  onShow: function() {
    // Load from cache if available
    var cached = Storage.getCachedMusicList();
    if (cached) {
      this.musicList = cached;
      this.updateStatus('曲库已缓存: ' + cached.length + '首');
    } else {
      this.updateStatus('未缓存，按确定键加载');
    }

    // Re-render existing results if any
    if (this.filteredList.length > 0) {
      this.renderResults();
      this.searchInputFocused = false;
    } else {
      this.searchInputFocused = true;
    }
    this.renderSearchInputFocus();
  },

  renderSearchInputFocus: function() {
    var inputRow = document.querySelector('#page-search .input-row');
    if (!inputRow) return;

    if (this.searchInputFocused) {
      inputRow.classList.add('focused');
      var input = inputRow.querySelector('input');
      if (input) input.focus();
    } else {
      inputRow.classList.remove('focused');
    }
  },

  updateStatus: function(text) {
    var bar = document.getElementById('search-status');
    if (bar) {
      bar.textContent = text;
      bar.style.display = text ? 'block' : 'none';
    }
  },

  loadMusicList: function(callback) {
    var self = this;
    if (this.isLoading) return;
    this.isLoading = true;

    App.showLoading('加载曲库...');

    Api.getMusicList(function(error, result) {
      App.hideLoading();
      self.isLoading = false;

      if (error) {
        self.updateStatus('加载失败: ' + (error.message || '网络错误'));
        if (callback) callback(error);
        return;
      }

      if (!result || !result.items || !Array.isArray(result.items)) {
        self.updateStatus('数据格式错误');
        if (callback) callback({ message: '数据格式错误' });
        return;
      }

      // Trim fields
      var trimmed = [];
      for (var i = 0; i < result.items.length; i++) {
        var item = result.items[i];
        trimmed.push({
          musicId: item.musicId,
          title: item.title,
          plainTitle: item.plainTitle,
          artist: item.artist,
          genre: item.genre,
          lvSPB: item.lvSPB,
          lvSPN: item.lvSPN,
          lvSPH: item.lvSPH,
          lvSPA: item.lvSPA,
          lvSPL: item.lvSPL,
          lvDPB: item.lvDPB,
          lvDPN: item.lvDPN,
          lvDPH: item.lvDPH,
          lvDPA: item.lvDPA,
          lvDPL: item.lvDPL
        });
      }

      self.musicList = trimmed;
      Storage.setCachedMusicList(trimmed);
      self.updateStatus('曲库已缓存: ' + trimmed.length + '首');

      if (callback) callback(null, trimmed);
    });
  },

  performSearch: function() {
    var input = document.getElementById('search-input');
    var keyword = input ? input.value.trim() : '';

    if (!keyword) {
      this.filteredList = [];
      this.renderResults();
      return;
    }

    // Ensure music list is loaded
    if (this.musicList.length === 0) {
      var self = this;
      this.loadMusicList(function(error) {
        if (!error) {
          self.doFilter(keyword);
        }
      });
      return;
    }

    this.doFilter(keyword);
  },

  doFilter: function(keyword) {
    var results = [];
    for (var i = 0; i < this.musicList.length; i++) {
      var item = this.musicList[i];
      if (Utils.fuzzyMatch(item.title, keyword) ||
          Utils.fuzzyMatch(item.plainTitle, keyword) ||
          Utils.fuzzyMatch(item.artist, keyword) ||
          Utils.fuzzyMatch(item.genre, keyword)) {
        results.push(item);
      }
    }

    // Limit results for performance
    if (results.length > 100) {
      results = results.slice(0, 100);
    }

    this.filteredList = results;
    this.renderResults();
  },

  renderResults: function() {
    var list = document.getElementById('search-results');
    list.innerHTML = '';

    if (this.filteredList.length === 0) {
      var keyword = document.getElementById('search-input').value.trim();
      if (keyword) {
        list.innerHTML = '<li class="list-item">无搜索结果</li>';
      }
    } else {
      for (var i = 0; i < this.filteredList.length; i++) {
        var item = this.filteredList[i];
        var li = document.createElement('li');
        li.className = 'list-item';

        var title = Utils.escapeHtml(item.title || 'Unknown');
        var levels = Utils.getLevels(item, 0); // Show SP levels by default
        var sub = (item.artist ? Utils.escapeHtml(item.artist) : '');
        if (levels) sub += ' | ' + levels;

        li.innerHTML = '<span class="item-title">' + title + '</span><span class="sub">' + sub + '</span>';
        li.setAttribute('data-result-idx', i);
        list.appendChild(li);
      }
    }

    App.updateFocusableItems();
    // Keep focus on input if no results, otherwise focus first result
    if (this.filteredList.length > 0 && !this.searchInputFocused) {
      App.currentFocusIndex = 1; // Skip input row
    } else {
      App.currentFocusIndex = 0;
    }
    App.renderFocus();
  },

  onArrowUp: function() {
    if (App.currentFocusIndex === 0) {
      this.searchInputFocused = true;
      this.renderSearchInputFocus();
    }
    App.moveFocus(-1);
    if (App.currentFocusIndex === 0) {
      this.searchInputFocused = true;
      this.renderSearchInputFocus();
    } else {
      this.searchInputFocused = false;
      this.renderSearchInputFocus();
    }
  },

  onArrowDown: function() {
    App.moveFocus(1);
    if (App.currentFocusIndex === 0) {
      this.searchInputFocused = true;
      this.renderSearchInputFocus();
    } else {
      this.searchInputFocused = false;
      this.renderSearchInputFocus();
    }
  },

  onEnter: function() {
    if (this.searchInputFocused) {
      // Focus on input, do search
      this.performSearch();
      // Move focus to results
      if (this.filteredList.length > 0) {
        this.searchInputFocused = false;
        this.renderSearchInputFocus();
        App.currentFocusIndex = 1;
        App.renderFocus();
      }
      return;
    }

    var item = App.getFocusedItem();
    if (!item) return;

    var resultIdx = parseInt(item.getAttribute('data-result-idx'), 10);
    var musicItem = this.filteredList[resultIdx];
    if (!musicItem) return;

    // Default to highest available SP difficulty
    var chartDiff = this.findDefaultChart(musicItem);

    App.showPage('song', {
      musicId: musicItem.musicId,
      playStyle: 0,
      chartDifficulty: chartDiff
    });
  },

  findDefaultChart: function(item) {
    // Prefer SPA (3) > SPH (2) > SPN (1) > SPB (0)
    if (item.lvSPA && item.lvSPA !== '0') return 3;
    if (item.lvSPH && item.lvSPH !== '0') return 2;
    if (item.lvSPN && item.lvSPN !== '0') return 1;
    if (item.lvSPB && item.lvSPB !== '0') return 0;
    return 3;
  },

  onSoftLeft: function() {
    App.goBack();
  },

  onSoftRight: function() {
    var self = this;
    this.loadMusicList(function(error) {
      if (!error) {
        // Re-run search if there's a keyword
        var keyword = document.getElementById('search-input').value.trim();
        if (keyword) {
          self.doFilter(keyword);
        }
      }
    });
  }
};

App.pageHandlers['search'] = SearchPage;
