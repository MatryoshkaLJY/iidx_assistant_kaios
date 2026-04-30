var DifficultyPage = {
  playStyle: 0,
  step: 'type', // 'type' | 'level' | 'lamp' | 'songs'
  selectedType: null,
  selectedLevel: null,
  selectedLamp: null,
  tableData: null,
  groupKeys: [],
  currentGroupIndex: 0,
  currentSongs: [],
  viewMode: 'list',

  // Table type definitions
  getTableTypes: function() {
    if (this.playStyle === 0) {
      return [
        { name: '温火全等级难易度表', id: 'wenhuo', needsLevel: true, needsLamp: true },
        { name: 'PPI AAA表 / Best 40', id: 'ppi', needsLevel: true, needsLamp: false },
        { name: 'BPI推定表 / AAA表', id: 'aaa', needsLevel: true, needsLamp: false },
        { name: 'SP★12参考表', id: 'sp12', needsLevel: false, needsLamp: true },
        { name: 'CPI适正表', id: 'cpi', needsLevel: false, needsLamp: true },
        { name: '人气表', id: 'popular', needsLevel: false, needsLamp: false }
      ];
    } else {
      return [
        { name: '温火全等级难易度表', id: 'wenhuo', needsLevel: true, needsLamp: true },
        { name: 'ELO全等级难易度表', id: 'elo', needsLevel: true, needsLamp: true },
        { name: 'PPI AAA表 / Best 40', id: 'ppi', needsLevel: true, needsLamp: false },
        { name: 'BPI推定表 / AAA表', id: 'aaa', needsLevel: true, needsLamp: false },
        { name: 'SNJ难易度表', id: 'snj', needsLevel: false, needsLamp: false },
        { name: 'ZRIS难易度表', id: 'zris', needsLevel: true, needsLamp: false },
        { name: 'ERETER★12推定表', id: 'ereter', needsLevel: false, needsLamp: true },
        { name: 'CPI适正表', id: 'cpi', needsLevel: false, needsLamp: true },
        { name: '人气表', id: 'popular', needsLevel: false, needsLamp: false }
      ];
    }
  },

  getLevels: function(typeId) {
    if (this.playStyle === 0) {
      // SP: 1, 3-12
      if (typeId === 'wenhuo' || typeId === 'ppi') {
        return ['1', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
      }
      if (typeId === 'aaa') {
        return ['11', '12'];
      }
    } else {
      // DP: 3, 5-12
      if (typeId === 'wenhuo' || typeId === 'elo' || typeId === 'ppi') {
        return ['3', '5', '6', '7', '8', '9', '10', '11', '12'];
      }
      if (typeId === 'aaa') {
        return ['11', '12'];
      }
      if (typeId === 'zris') {
        return ['dp10', 'dp11h', 'dp11e'];
      }
    }
    return [];
  },

  getLamps: function(typeId, level) {
    var numLevel = parseInt(level, 10);

    if (typeId === 'wenhuo') {
      if (this.playStyle === 0) {
        // SP: low levels (1,3-9) only CLEAR/H_CLEAR
        if (numLevel <= 9) {
          return ['CLEAR', 'H_CLEAR'];
        }
        return ['E_CLEAR', 'CLEAR', 'H_CLEAR', 'EXH_CLEAR'];
      } else {
        // DP: low levels (3,5-9) only CLEAR/H_CLEAR
        if (numLevel <= 9) {
          return ['CLEAR', 'H_CLEAR'];
        }
        return ['E_CLEAR', 'CLEAR', 'H_CLEAR', 'EXH_CLEAR'];
      }
    }

    if (typeId === 'elo') {
      // DP ELO: level 5 only CLEAR
      if (numLevel === 5) {
        return ['CLEAR'];
      }
      if (numLevel <= 9) {
        return ['CLEAR', 'H_CLEAR'];
      }
      return ['E_CLEAR', 'CLEAR', 'H_CLEAR', 'EXH_CLEAR'];
    }

    if (typeId === 'sp12') {
      return ['clear', 'h_clear', 'exh_clear'];
    }

    if (typeId === 'cpi') {
      return ['e_clear', 'clear', 'h_clear', 'exh_clear', 'fc'];
    }

    if (typeId === 'zris') {
      if (this.selectedType && this.selectedType.zrisVariant) {
        return [this.selectedType.zrisVariant];
      }
      return ['h_clear', 'exh_clear'];
    }

    if (typeId === 'ereter') {
      return ['e_clear', 'h_clear', 'exh_clear'];
    }

    return [];
  },

  buildTableName: function() {
    var typeId = this.selectedType.id;
    var level = this.selectedLevel;
    var lamp = this.selectedLamp;
    var style = this.playStyle === 0 ? 'SP' : 'DP';

    if (typeId === 'wenhuo') {
      return 'wenhuo_' + style + '_' + level + '_' + lamp;
    }

    if (typeId === 'elo') {
      return 'elo_' + style + '_' + level + '_' + lamp;
    }

    if (typeId === 'ppi') {
      return 'PPI_AAA_' + (this.playStyle === 0 ? 'SINGLE' : 'DOUBLE') + '_' + level;
    }

    if (typeId === 'aaa') {
      var levels = this.playStyle === 0 ? ['11', '12'] : ['11', '12'];
      // For AAA, we show level selection as separate types, handle differently
      return 'AAA_' + (this.playStyle === 0 ? 'SINGLE' : 'DOUBLE') + '_' + level;
    }

    if (typeId === 'sp12') {
      return 'sp12_epolis_' + lamp;
    }

    if (typeId === 'cpi') {
      return 'cpi_epolis_' + lamp;
    }

    if (typeId === 'snj') {
      return 'snj_epolis';
    }

    if (typeId === 'zris') {
      // zris has fixed variants
      if (level === 'dp10') return 'zris_epolis_dp10_h_clear';
      if (level === 'dp11h') return 'zris_epolis_dp11_h_clear';
      if (level === 'dp11e') return 'zris_epolis_dp11_exh_clear';
      return 'zris_epolis_' + lamp;
    }

    if (typeId === 'ereter') {
      return 'ereter_epolis_dp12_' + lamp;
    }

    if (typeId === 'popular') {
      return (this.playStyle === 0 ? 'sp' : 'dp') + '_popular_clear';
    }

    return '';
  },

  onShow: function(data) {
    this.playStyle = data && data.playStyle !== undefined ? data.playStyle : 0;
    this.step = 'type';
    this.selectedType = null;
    this.selectedLevel = null;
    this.selectedLamp = null;
    this.tableData = null;
    this.groupKeys = [];
    this.currentGroupIndex = 0;
    this.currentSongs = [];

    this.renderTypeList();
  },

  renderTypeList: function() {
    var header = document.getElementById('diff-header');
    if (header) header.textContent = (this.playStyle === 0 ? 'SP' : 'DP') + ' 难度表';

    var list = document.getElementById('diff-list');
    list.innerHTML = '';

    var types = this.getTableTypes();
    for (var i = 0; i < types.length; i++) {
      var li = document.createElement('li');
      li.className = 'list-item';
      li.textContent = types[i].name;
      li.setAttribute('data-type-idx', i);
      list.appendChild(li);
    }

    App.updateFocusableItems();
    App.currentFocusIndex = 0;
    App.renderFocus();
  },

  renderLevelList: function() {
    var header = document.getElementById('diff-header');
    if (header) header.textContent = this.selectedType.name + ' - 选择等级';

    var list = document.getElementById('diff-list');
    list.innerHTML = '';

    var levels = this.getLevels(this.selectedType.id);
    var levelLabels = {
      'dp10': 'DP10 白灯',
      'dp11h': 'DP11 白灯',
      'dp11e': 'DP11 闪灯'
    };

    for (var i = 0; i < levels.length; i++) {
      var li = document.createElement('li');
      li.className = 'list-item';
      var label = levelLabels[levels[i]] || ('★' + levels[i]);
      li.textContent = label;
      li.setAttribute('data-level', levels[i]);
      list.appendChild(li);
    }

    App.updateFocusableItems();
    App.currentFocusIndex = 0;
    App.renderFocus();
  },

  renderLampList: function() {
    var header = document.getElementById('diff-header');
    if (header) header.textContent = this.selectedType.name + ' ★' + this.selectedLevel + ' - 选择灯种';

    var list = document.getElementById('diff-list');
    list.innerHTML = '';

    var lamps = this.getLamps(this.selectedType.id, this.selectedLevel);
    var lampLabels = {
      'E_CLEAR': '绿灯 (E-CLEAR)',
      'CLEAR': '蓝灯 (CLEAR)',
      'H_CLEAR': '白灯 (H-CLEAR)',
      'EXH_CLEAR': '闪灯 (EXH-CLEAR)',
      'FC': 'FC',
      'e_clear': '绿灯 (E-CLEAR)',
      'clear': '蓝灯 (CLEAR)',
      'h_clear': '白灯 (H-CLEAR)',
      'exh_clear': '闪灯 (EXH-CLEAR)',
      'fc': 'FC'
    };

    for (var i = 0; i < lamps.length; i++) {
      var li = document.createElement('li');
      li.className = 'list-item';
      li.textContent = lampLabels[lamps[i]] || lamps[i];
      li.setAttribute('data-lamp', lamps[i]);
      list.appendChild(li);
    }

    App.updateFocusableItems();
    App.currentFocusIndex = 0;
    App.renderFocus();
  },

  loadTable: function() {
    var tableName = this.buildTableName();
    var self = this;

    // Try cache first
    var cache = Storage.getDiffCache(tableName);
    if (cache && App.isCacheValid(cache)) {
      self.tableData = cache.data;
      self.step = 'songs';

      // Extract group keys
      self.groupKeys = [];
      if (self.tableData && self.tableData.rank_groups) {
        for (var key in self.tableData.rank_groups) {
          if (self.tableData.rank_groups.hasOwnProperty(key)) {
            self.groupKeys.push(key);
          }
        }
      }
      self.currentGroupIndex = 0;

      self.renderSongsPage();
      return;
    }

    App.showLoading('加载中...');

    Api.getDifficultyTable(tableName, function(error, result) {
      App.hideLoading();

      if (error) {
        alert('加载失败: ' + (error.message || '未知错误'));
        return;
      }

      self.tableData = result;
      self.step = 'songs';

      // Extract group keys
      self.groupKeys = [];
      if (result && result.rank_groups) {
        for (var key in result.rank_groups) {
          if (result.rank_groups.hasOwnProperty(key)) {
            self.groupKeys.push(key);
          }
        }
      }
      self.currentGroupIndex = 0;

      self.renderSongsPage();

      // Save to cache
      if (App.syncStatusTimestamp > 0) {
        Storage.setDiffCache(tableName, {
          syncTimestamp: App.syncStatusTimestamp,
          data: result
        });
      }
    });
  },

  renderSongsPage: function() {
    var savedRaw = localStorage.getItem('pocketiidx_diff_state_' + this.playStyle);
    if (savedRaw) {
      try {
        var saved = JSON.parse(savedRaw);
        if (saved.tableName === this.buildTableName()) {
          this.viewMode = saved.viewMode || 'list';
          this.currentGroupIndex = saved.groupIndex || 0;
          if (this.currentGroupIndex >= this.groupKeys.length) {
            this.currentGroupIndex = 0;
          }
        } else {
          this.viewMode = 'list';
        }
      } catch (e) {
        this.viewMode = 'list';
      }
    } else {
      this.viewMode = 'list';
    }

    var page = document.getElementById('page-diff-songs');
    var prev = document.getElementById('page-difficulty');
    if (prev) prev.classList.remove('active');
    if (page) page.classList.add('active');

    App.currentPage = 'diff-songs';
    App.navStack.push('diff-songs');

    var header = document.getElementById('diff-songs-header');
    if (header && this.tableData) {
      header.textContent = this.tableData.display_name || '歌曲列表';
    }

    this.renderCurrentGroup();
  },

  renderProgressBar: function(songs) {
    var bar = document.getElementById('diff-progress-bar');
    if (!bar) return;
    if (!songs || songs.length === 0) {
      bar.innerHTML = '';
      return;
    }
    var counts = {};
    var total = songs.length;
    for (var i = 0; i < songs.length; i++) {
      var flag = songs[i].best_score ? songs[i].best_score.clear_flag : 0;
      counts[flag] = (counts[flag] || 0) + 1;
    }
    var flags = [];
    for (var key in counts) {
      if (counts.hasOwnProperty(key)) {
        flags.push(parseInt(key, 10));
      }
    }
    flags.sort(function(a, b) { return b - a; });
    var html = '';
    for (var i = 0; i < flags.length; i++) {
      var flag = flags[i];
      var pct = (counts[flag] / total * 100).toFixed(1);
      var color = Utils.clearFlagColor(flag);
      html += '<div class="diff-progress-segment" style="width:' + pct + '%;background:' + color + ';"></div>';
    }
    bar.innerHTML = html;
  },

  renderCurrentGroup: function() {
    var groupBar = document.getElementById('diff-group-bar');
    var list = document.getElementById('diff-songs-list');

    if (this.groupKeys.length === 0) {
      if (groupBar) groupBar.textContent = '无数据';
      list.innerHTML = '<li class="list-item">暂无歌曲数据</li>';
      this.renderProgressBar([]);
      App.updateFocusableItems();
      App.currentFocusIndex = 0;
      App.renderFocus();
      return;
    }

    var groupKey = this.groupKeys[this.currentGroupIndex];
    var songs = this.tableData.rank_groups[groupKey] || [];
    this.currentSongs = songs;

    if (groupBar) {
      groupBar.innerHTML = '<span>1◀' + groupKey + ' (' + songs.length + '首) ' + (this.currentGroupIndex + 1) + '/' + this.groupKeys.length + '▶3</span><span class="list-counter"></span>';
    }

    this.renderProgressBar(songs);

    list.innerHTML = '';
    if (this.viewMode === 'grid') {
      list.className = 'list diff-grid';
      for (var i = 0; i < songs.length; i++) {
        var song = songs[i];
        var li = document.createElement('li');
        li.className = 'list-item';

        var title = Utils.escapeHtml(song.music_title || 'Unknown');
        var diffText = Utils.chartDiffText(song.chart_difficulty);
        var sub = diffText;
        if (song.best_score && song.best_score.miss_count !== undefined) {
          sub += '  ' + song.best_score.miss_count;
        }

        var clearFlag = song.best_score ? song.best_score.clear_flag : undefined;
        var flagColor = Utils.clearFlagColor(clearFlag);
        var r = parseInt(flagColor.substr(1, 2), 16);
        var g = parseInt(flagColor.substr(3, 2), 16);
        var b = parseInt(flagColor.substr(5, 2), 16);
        var isFav = Storage.isFavorite(song.music_id, this.playStyle, song.chart_difficulty);
        var favBar = isFav ? '<span class="favorite-bar"></span>' : '';
        li.style.backgroundColor = 'rgba(' + r + ',' + g + ',' + b + ',0.25)';
        li.innerHTML = '<span class="item-title">' + title + '</span><span class="sub">' + sub + '</span>' + favBar;
        li.setAttribute('data-song-idx', i);
        list.appendChild(li);
      }
    } else {
      list.className = 'list';
      for (var i = 0; i < songs.length; i++) {
        var song = songs[i];
        var li = document.createElement('li');
        li.className = 'list-item';

        var title = Utils.escapeHtml(song.music_title || 'Unknown');
        var diffText = Utils.chartDiffText(song.chart_difficulty);
        var sub = 'Lv.' + song.level + diffText;
        if (song.best_score && song.best_score.miss_count !== undefined) {
          sub += ' BP:' + song.best_score.miss_count;
        }
        if (song.rank) sub += ' | ' + song.rank;
        if (song.best_score && song.best_score.clear_flag !== undefined) {
          sub += ' | ' + Utils.clearFlagText(song.best_score.clear_flag);
        }

        var clearFlag = song.best_score ? song.best_score.clear_flag : undefined;
        var flagColor = Utils.clearFlagColor(clearFlag);
        var isFav = Storage.isFavorite(song.music_id, this.playStyle, song.chart_difficulty);
        var favBar = isFav ? '<span class="favorite-bar"></span>' : '';
        li.innerHTML = '<span class="clear-flag-bar" style="background:' + flagColor + ';"></span>' + favBar + '<span class="item-title">' + title + '</span><span class="sub">' + sub + '</span>';
        li.setAttribute('data-song-idx', i);
        list.appendChild(li);
      }
    }

    App.updateFocusableItems();
    App.currentFocusIndex = 0;
    App.renderFocus();
  },

  toggleViewMode: function() {
    var savedIdx = App.currentFocusIndex;
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
    this.renderCurrentGroup();
    var total = App.focusableItems.length;
    if (savedIdx >= 0 && savedIdx < total) {
      App.currentFocusIndex = savedIdx;
    } else if (total > 0) {
      App.currentFocusIndex = total - 1;
    } else {
      App.currentFocusIndex = 0;
    }
    App.renderFocus();
  },

  onEnter: function() {
    var item = App.getFocusedItem();
    if (!item) return;

    if (this.step === 'type') {
      var typeIdx = parseInt(item.getAttribute('data-type-idx'), 10);
      var types = this.getTableTypes();
      this.selectedType = types[typeIdx];

      if (this.selectedType.needsLevel) {
        this.step = 'level';
        this.renderLevelList();
      } else if (this.selectedType.needsLamp) {
        this.step = 'lamp';
        this.selectedLevel = '';
        this.renderLampList();
      } else {
        this.loadTable();
      }
      return;
    }

    if (this.step === 'level') {
      this.selectedLevel = item.getAttribute('data-level');

      if (this.selectedType.needsLamp) {
        this.step = 'lamp';
        this.renderLampList();
      } else {
        this.loadTable();
      }
      return;
    }

    if (this.step === 'lamp') {
      this.selectedLamp = item.getAttribute('data-lamp');
      this.loadTable();
      return;
    }
  },

  onDigit: function(digit) {
    if (this.step === 'songs') {
      if (digit === 2) {
        this.toggleViewMode();
      } else if (this.groupKeys.length > 1) {
        if (digit === 1) {
          this.currentGroupIndex--;
          if (this.currentGroupIndex < 0) {
            this.currentGroupIndex = this.groupKeys.length - 1;
          }
          this.renderCurrentGroup();
        } else if (digit === 3) {
          this.currentGroupIndex++;
          if (this.currentGroupIndex >= this.groupKeys.length) {
            this.currentGroupIndex = 0;
          }
          this.renderCurrentGroup();
        }
      }
    }
  },

  onBack: function() {
    if (this.step === 'songs') {
      // Save browsing state before exiting
      localStorage.setItem('pocketiidx_diff_state_' + this.playStyle, JSON.stringify({
        tableName: this.buildTableName(),
        groupIndex: this.currentGroupIndex,
        viewMode: this.viewMode
      }));

      // Return to difficulty selection
      var songsPage = document.getElementById('page-diff-songs');
      var diffPage = document.getElementById('page-difficulty');
      if (songsPage) songsPage.classList.remove('active');
      if (diffPage) diffPage.classList.add('active');

      // Remove diff-songs from nav stack
      var idx = App.navStack.indexOf('diff-songs');
      if (idx !== -1) {
        App.navStack.splice(idx, 1);
      }

      App.currentPage = 'difficulty';
      this.step = 'type';
      this.selectedType = null;
      this.selectedLevel = null;
      this.selectedLamp = null;
      this.tableData = null;
      this.renderTypeList();
      return true;
    }
    return false;
  },

  onSoftLeft: function() {
    App.goBack();
  }
};

// Register handlers for both pages
App.pageHandlers['difficulty'] = DifficultyPage;

var DiffSongsPage = {
  onShow: function() {
    // Handled by DifficultyPage
  },

  onArrowUp: function() {
    if (DifficultyPage.viewMode === 'grid') {
      var idx = App.currentFocusIndex;
      if (idx >= 6) {
        App.currentFocusIndex = idx - 6;
        App.renderFocus();
      }
    } else {
      App.moveFocus(-1);
    }
  },

  onArrowDown: function() {
    if (DifficultyPage.viewMode === 'grid') {
      var idx = App.currentFocusIndex;
      var total = App.focusableItems.length;
      if (idx + 6 < total) {
        App.currentFocusIndex = idx + 6;
        App.renderFocus();
      }
    } else {
      App.moveFocus(1);
    }
  },

  onArrowLeft: function() {
    if (DifficultyPage.viewMode === 'grid') {
      var idx = App.currentFocusIndex;
      if (idx % 6 !== 0) {
        App.currentFocusIndex = idx - 1;
        App.renderFocus();
      }
    } else {
      App.moveFocus(-5);
    }
  },

  onArrowRight: function() {
    if (DifficultyPage.viewMode === 'grid') {
      var idx = App.currentFocusIndex;
      var total = App.focusableItems.length;
      if (idx % 6 !== 5 && idx + 1 < total) {
        App.currentFocusIndex = idx + 1;
        App.renderFocus();
      }
    } else {
      App.moveFocus(5);
    }
  },

  onEnter: function() {
    var item = App.getFocusedItem();
    if (!item) return;

    var songIdx = parseInt(item.getAttribute('data-song-idx'), 10);
    var song = DifficultyPage.currentSongs[songIdx];
    if (!song) return;

    App.showPage('song', {
      musicId: song.music_id,
      playStyle: DifficultyPage.playStyle,
      chartDifficulty: song.chart_difficulty
    });
  },

  onDigit: function(digit) {
    DifficultyPage.onDigit(digit);
  },

  updateSoftkeyLabel: function() {
    var item = App.getFocusedItem();
    var label = '';
    if (item) {
      var songIdx = parseInt(item.getAttribute('data-song-idx'), 10);
      var song = DifficultyPage.currentSongs[songIdx];
      if (song) {
        var isFav = Storage.isFavorite(song.music_id, DifficultyPage.playStyle, song.chart_difficulty);
        label = isFav ? '取消收藏' : '收藏';
      }
    }
    var el = document.getElementById('diff-songs-soft-right');
    if (el) el.textContent = label;
  },

  onFocusChanged: function() {
    this.updateSoftkeyLabel();
  },

  onSoftRight: function() {
    var item = App.getFocusedItem();
    if (!item) return;
    var songIdx = parseInt(item.getAttribute('data-song-idx'), 10);
    var song = DifficultyPage.currentSongs[songIdx];
    if (!song) return;
    var isFav = Storage.toggleFavorite(song.music_id, DifficultyPage.playStyle, song.chart_difficulty, song.music_title);
    var existing = item.querySelector('.favorite-bar');
    if (isFav) {
      if (!existing) {
        var bar = document.createElement('span');
        bar.className = 'favorite-bar';
        item.appendChild(bar);
      }
    } else {
      if (existing) existing.parentNode.removeChild(existing);
    }
    this.updateSoftkeyLabel();
  },

  onSoftLeft: function() {
    DifficultyPage.onBack();
  },

  onBack: function() {
    return DifficultyPage.onBack();
  }
};

App.pageHandlers['diff-songs'] = DiffSongsPage;
