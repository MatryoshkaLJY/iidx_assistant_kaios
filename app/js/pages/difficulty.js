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
      self.groupKeys.sort();
      self.currentGroupIndex = 0;

      self.renderSongsPage();
    });
  },

  renderSongsPage: function() {
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

  renderCurrentGroup: function() {
    var groupBar = document.getElementById('diff-group-bar');
    var list = document.getElementById('diff-songs-list');

    if (this.groupKeys.length === 0) {
      if (groupBar) groupBar.textContent = '无数据';
      list.innerHTML = '<li class="list-item">暂无歌曲数据</li>';
      App.updateFocusableItems();
      App.currentFocusIndex = 0;
      App.renderFocus();
      return;
    }

    var groupKey = this.groupKeys[this.currentGroupIndex];
    var songs = this.tableData.rank_groups[groupKey] || [];
    this.currentSongs = songs;

    if (groupBar) {
      groupBar.innerHTML = '<span>◀ ' + groupKey + ' (' + songs.length + '首) ' + (this.currentGroupIndex + 1) + '/' + this.groupKeys.length + ' ▶</span><span class="list-counter"></span>';
    }

    list.innerHTML = '';
    for (var i = 0; i < songs.length; i++) {
      var song = songs[i];
      var li = document.createElement('li');
      li.className = 'list-item';

      var title = Utils.escapeHtml(song.music_title || 'Unknown');
      var diffText = Utils.chartDiffText(song.chart_difficulty);
      var sub = 'Lv.' + song.level + diffText;
      if (song.rank) sub += ' | ' + song.rank;
      if (song.best_score && song.best_score.clear_flag !== undefined) {
        sub += ' | ' + Utils.clearFlagText(song.best_score.clear_flag);
      }

      var clearFlag = song.best_score ? song.best_score.clear_flag : undefined;
      var flagColor = Utils.clearFlagColor(clearFlag);
      li.innerHTML = '<span class="clear-flag-bar" style="background:' + flagColor + ';"></span><span class="item-title">' + title + '</span><span class="sub">' + sub + '</span>';
      li.setAttribute('data-song-idx', i);
      list.appendChild(li);
    }

    App.updateFocusableItems();
    App.currentFocusIndex = 0;
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

  onArrowLeft: function() {
    if (this.step === 'songs' && this.groupKeys.length > 1) {
      this.currentGroupIndex--;
      if (this.currentGroupIndex < 0) {
        this.currentGroupIndex = this.groupKeys.length - 1;
      }
      this.renderCurrentGroup();
    }
  },

  onArrowRight: function() {
    if (this.step === 'songs' && this.groupKeys.length > 1) {
      this.currentGroupIndex++;
      if (this.currentGroupIndex >= this.groupKeys.length) {
        this.currentGroupIndex = 0;
      }
      this.renderCurrentGroup();
    }
  },

  onBack: function() {
    if (this.step === 'songs') {
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

  onArrowLeft: function() {
    DifficultyPage.onArrowLeft();
  },

  onArrowRight: function() {
    DifficultyPage.onArrowRight();
  },

  onSoftLeft: function() {
    DifficultyPage.onBack();
  },

  onBack: function() {
    return DifficultyPage.onBack();
  }
};

App.pageHandlers['diff-songs'] = DiffSongsPage;
