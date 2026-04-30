var SongPage = {
  musicId: null,
  playStyle: 0,
  chartDifficulty: 3,
  data: null,
  menuVisible: false,
  menuFocusIndex: 0,
  savedFocusIndex: 0,

  onShow: function(params) {
    this.musicId = params.musicId;
    this.playStyle = params.playStyle !== undefined ? params.playStyle : 0;
    this.chartDifficulty = params.chartDifficulty !== undefined ? params.chartDifficulty : 3;
    this.data = null;
    this.menuVisible = false;
    this.menuFocusIndex = 0;

    this.loadSong();
  },

  loadSong: function() {
    var self = this;
    App.showLoading('加载中...');

    Api.getMusicDetail(this.musicId, this.playStyle, this.chartDifficulty, function(error, result) {
      App.hideLoading();

      if (error) {
        alert('加载失败: ' + (error.message || '未知错误'));
        return;
      }

      self.data = result;
      self.render();
    });
  },

  render: function() {
    var header = document.getElementById('song-header');
    var content = document.getElementById('song-content');

    if (!this.data || !this.data.music_info) {
      content.innerHTML = '<div class="empty-state">暂无数据</div>';
      App.updateFocusableItems();
      App.renderFocus();
      return;
    }

    var info = this.data.music_info;
    var diffText = Utils.chartDiffText(this.chartDifficulty);
    var styleText = Utils.playStyleText(this.playStyle);
    var level = this.data.chart_info ? this.data.chart_info.level : '';
    var levelStr = level ? ' Lv.' + level : '';
    var isFav = Storage.isFavorite(this.musicId, this.playStyle, this.chartDifficulty);
    var favPrefix = isFav ? '★ ' : '';
    header.textContent = favPrefix + Utils.truncate(info.title || '歌曲详情', 10) + ' (' + styleText + diffText + levelStr + ')';
    content.innerHTML = '';

    // Music Info Section (artist + genre only)
    var section = Utils.createEl('div', 'detail-section');
    if (info.artist) {
      section.appendChild(Utils.createEl('div', 'detail-row', '艺术家: ' + info.artist));
    }
    if (info.genre) {
      section.appendChild(Utils.createEl('div', 'detail-row', '流派: ' + info.genre));
    }
    if (section.childNodes.length > 0) {
      content.appendChild(section);
    }

    // Chart Info Section
    if (this.data.chart_info) {
      var chart = this.data.chart_info;
      var chartSection = Utils.createEl('div', 'detail-section');
      chartSection.appendChild(Utils.createEl('div', 'detail-title',
        '谱面信息 (' + Utils.playStyleText(chart.play_style) +
        ' ' + Utils.chartDiffText(chart.chart_difficulty) + ' Lv.' + chart.level + ')'
      ));

      if (chart.note_count) {
        chartSection.appendChild(Utils.createEl('div', 'detail-row', 'Note数: ' + chart.note_count));
      }

      if (chart.radar) {
        var radar = chart.radar;
        var radarText = [];
        if (radar.notes) radarText.push('Notes: ' + radar.notes);
        if (radar.scratch) radarText.push('Scratch: ' + radar.scratch);
        if (radar.peak) radarText.push('Peak: ' + radar.peak);
        if (radar.chord) radarText.push('Chord: ' + radar.chord);
        if (radar.charge) radarText.push('Charge: ' + radar.charge);
        if (radar.soflan) radarText.push('Soflan: ' + radar.soflan);
        if (radarText.length > 0) {
          chartSection.appendChild(Utils.createEl('div', 'detail-row', radarText.join(' | ')));
        }
      }

      content.appendChild(chartSection);
    }

    // Best Score Section
    if (this.data.best_score) {
      var best = this.data.best_score;
      var bestSection = Utils.createEl('div', 'detail-section');
      bestSection.appendChild(Utils.createEl('div', 'detail-title', '最佳成绩'));

      var bestBox = Utils.createEl('div', 'score-box');
      bestBox.appendChild(Utils.createEl('div', 'score-title',
        'EX: ' + (best.ex_score || 0) +
        ' | ' + Utils.djLevelText(best.dj_level) +
        ' | ' + Utils.clearFlagText(best.clear_flag)
      ));

      var bestDetails = [];
      if (best.detailed_dj_level) bestDetails.push(best.detailed_dj_level);
      if (best.score_ratio !== undefined) bestDetails.push('比率: ' + (best.score_ratio * 100).toFixed(2) + '%');
      if (best.miss_count !== undefined) bestDetails.push('Miss: ' + best.miss_count);
      if (best.play_count) bestDetails.push('次数: ' + best.play_count);
      if (best.play_time) bestDetails.push(best.play_time.substring(0, 10));
      if (best.ppi !== undefined) bestDetails.push('PPI: ' + best.ppi);

      if (bestDetails.length > 0) {
        bestBox.appendChild(Utils.createEl('div', 'detail-row', bestDetails.join(' | ')));
      }

      bestSection.appendChild(bestBox);
      content.appendChild(bestSection);
    }

    // Recent Scores Section
    if (this.data.recent_scores && this.data.recent_scores.length > 0) {
      var recentSection = Utils.createEl('div', 'detail-section');
      recentSection.appendChild(Utils.createEl('div', 'detail-title', '最近成绩'));

      for (var i = 0; i < this.data.recent_scores.length && i < 3; i++) {
        var rs = this.data.recent_scores[i];
        var rsBox = Utils.createEl('div', 'score-box');
        rsBox.appendChild(Utils.createEl('div', 'score-title',
          'EX: ' + (rs.ex_score || 0) +
          ' | ' + Utils.djLevelText(rs.dj_level) +
          ' | ' + Utils.clearFlagText(rs.clear_flag)
        ));

        var rsDetails = [];
        if (rs.detailed_dj_level) rsDetails.push(rs.detailed_dj_level);
        if (rs.score_ratio !== undefined) rsDetails.push('比率: ' + (rs.score_ratio * 100).toFixed(2) + '%');
        if (rs.miss_count !== undefined) rsDetails.push('Miss: ' + rs.miss_count);
        if (rs.play_time) rsDetails.push(rs.play_time.substring(0, 10));
        if (rs.source) rsDetails.push('来源: ' + rs.source);

        if (rsDetails.length > 0) {
          rsBox.appendChild(Utils.createEl('div', 'detail-row', rsDetails.join(' | ')));
        }

        recentSection.appendChild(rsBox);
      }

      content.appendChild(recentSection);
    }

    // Difficulty Tables Section
    if (this.data.difficulty_tables) {
      var tables = this.data.difficulty_tables;
      var tableKeys = [];
      for (var key in tables) {
        if (tables.hasOwnProperty(key)) {
          tableKeys.push(key);
        }
      }
      tableKeys.sort();

      if (tableKeys.length > 0) {
        var tableSection = Utils.createEl('div', 'detail-section');
        tableSection.appendChild(Utils.createEl('div', 'detail-title', '难度表排名 (' + tableKeys.length + '个)'));

        for (var i = 0; i < tableKeys.length; i++) {
          var t = tables[tableKeys[i]];
          var entry = Utils.createEl('div', 'table-entry');

          var nameSpan = Utils.createEl('span', 'table-name', tableKeys[i]);
          entry.appendChild(nameSpan);

          if (t.rank) {
            var rankSpan = Utils.createEl('span', 'table-rank', t.rank);
            entry.appendChild(rankSpan);
          }
          if (t.rank_type) {
            entry.appendChild(document.createTextNode(' (' + t.rank_type + ')'));
          }

          tableSection.appendChild(entry);
        }

        content.appendChild(tableSection);
      }
    }

    // Update focus after rendering
    App.updateFocusableItems();
    App.renderFocus();
  },

  // Build list of available charts for this song
  getAvailableCharts: function() {
    if (!this.data || !this.data.music_info) return [];
    var info = this.data.music_info;
    var charts = [];
    var diffNames = ['B', 'N', 'H', 'A', 'L'];
    for (var i = 0; i < diffNames.length; i++) {
      var spKey = 'lvSP' + diffNames[i];
      var dpKey = 'lvDP' + diffNames[i];
      if (info[spKey] && info[spKey] !== '0') {
        charts.push({ playStyle: 0, chartDifficulty: i, label: 'SP' + diffNames[i] + ' Lv.' + info[spKey] });
      }
      if (info[dpKey] && info[dpKey] !== '0') {
        charts.push({ playStyle: 1, chartDifficulty: i, label: 'DP' + diffNames[i] + ' Lv.' + info[dpKey] });
      }
    }
    return charts;
  },

  // Menu handling
  showMenu: function() {
    this.menuVisible = true;
    this.menuFocusIndex = 0;
    this.savedFocusIndex = App.currentFocusIndex;

    var list = document.getElementById('song-menu-list');
    list.innerHTML = '';

    var charts = this.getAvailableCharts();
    for (var i = 0; i < charts.length; i++) {
      var li = document.createElement('li');
      li.className = 'app-menu-item';
      var text = charts[i].label;
      if (charts[i].playStyle === this.playStyle && charts[i].chartDifficulty === this.chartDifficulty) {
        text += ' [当前]';
      }
      li.textContent = text;
      li.setAttribute('data-play-style', charts[i].playStyle);
      li.setAttribute('data-chart-diff', charts[i].chartDifficulty);
      list.appendChild(li);
    }

    var menuEl = document.getElementById('song-menu');
    if (menuEl) menuEl.style.display = 'block';

    this.updateMenuFocus();
    this.updateSoftkeyLabel('关闭');
  },

  hideMenu: function() {
    this.menuVisible = false;

    var menuEl = document.getElementById('song-menu');
    if (menuEl) menuEl.style.display = 'none';

    var items = document.querySelectorAll('#song-menu-list .app-menu-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove('focused');
    }

    App.currentFocusIndex = this.savedFocusIndex;
    App.renderFocus();
    this.updateSoftkeyLabel('切换谱面');
  },

  updateMenuFocus: function() {
    var items = document.querySelectorAll('#song-menu-list .app-menu-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove('focused');
    }
    if (items.length > 0 && this.menuFocusIndex >= 0 && this.menuFocusIndex < items.length) {
      items[this.menuFocusIndex].classList.add('focused');
    }
  },

  updateSoftkeyLabel: function(text) {
    var el = document.getElementById('song-soft-right');
    if (el) el.textContent = text || '';
  },

  // Key handlers
  onArrowUp: function() {
    if (this.menuVisible) {
      this.menuFocusIndex--;
      if (this.menuFocusIndex < 0) this.menuFocusIndex = 0;
      this.updateMenuFocus();
    } else {
      var content = document.getElementById('song-content');
      if (content) content.scrollTop -= 40;
    }
  },

  onArrowDown: function() {
    if (this.menuVisible) {
      this.menuFocusIndex++;
      var items = document.querySelectorAll('#song-menu-list .app-menu-item');
      if (this.menuFocusIndex >= items.length) {
        this.menuFocusIndex = items.length - 1;
      }
      this.updateMenuFocus();
    } else {
      var content = document.getElementById('song-content');
      if (content) content.scrollTop += 40;
    }
  },

  onEnter: function() {
    if (this.menuVisible) {
      var items = document.querySelectorAll('#song-menu-list .app-menu-item');
      if (this.menuFocusIndex >= 0 && this.menuFocusIndex < items.length) {
        var item = items[this.menuFocusIndex];
        var ps = parseInt(item.getAttribute('data-play-style'), 10);
        var cd = parseInt(item.getAttribute('data-chart-diff'), 10);
        this.hideMenu();
        if (ps !== this.playStyle || cd !== this.chartDifficulty) {
          this.playStyle = ps;
          this.chartDifficulty = cd;
          this.data = null;
          this.loadSong();
        }
      }
      return;
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
  }
};

App.pageHandlers['song'] = SongPage;
