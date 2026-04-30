var RadarPage = {
  playStyle: 0,
  radarData: null,
  dimensions: [],
  dimensionData: {},
  preloadComplete: false,
  totalValue: 0,
  mainColor: '#FF80F2',

  dimensionLabels: {
    notes: 'Notes',
    scratch: 'Scratch',
    peak: 'Peak',
    chord: 'Chord',
    charge: 'Charge',
    soflan: 'Sof-Lan'
  },

  dimColors: {
    notes: '#FF80F2',
    peak: '#FFB580',
    scratch: '#DE6F6F',
    soflan: '#73B6E6',
    charge: '#986FDE',
    chord: '#B2E070'
  },

  dimOrder: ['notes', 'chord', 'charge', 'soflan', 'scratch', 'peak'],

  onShow: function(data) {
    if (data) {
      this.playStyle = data.playStyle !== undefined ? data.playStyle : 0;
      this.radarData = null;
      this.dimensions = [];
      this.dimensionData = {};
      this.preloadComplete = false;
      this.loadRadarSummary();
    } else if (this.dimensions.length > 0) {
      this.renderRadarPage();
    } else {
      this.loadRadarSummary();
    }
  },

  saveRadarCache: function() {
    if (App.syncStatusTimestamp === 0) return;
    if (!this.radarData || this.dimensions.length === 0) return;

    Storage.setRadarCache(this.playStyle, {
      syncTimestamp: App.syncStatusTimestamp,
      summary: this.radarData,
      dimensions: this.dimensions,
      dimensionData: this.dimensionData
    });
  },

  loadRadarSummary: function() {
    var self = this;

    var cache = Storage.getRadarCache(this.playStyle);
    if (cache && App.isCacheValid(cache)) {
      self.radarData = cache.summary;
      self.dimensions = cache.dimensions;
      self.dimensionData = cache.dimensionData;
      self.preloadComplete = true;
      self.renderRadarPage();
      return;
    }

    App.showLoading('加载中...');

    Api.getRadarSummary(this.playStyle, function(error, result) {
      App.hideLoading();

      if (error) {
        alert('加载失败: ' + (error.message || '未知错误'));
        return;
      }

      self.radarData = result;
      self.dimensions = result && result.radar_summary ? result.radar_summary : [];
      self.renderRadarPage();

      self.preloadAllDimensionData();
    });
  },

  preloadAllDimensionData: function() {
    var self = this;
    var total = this.dimensions.length * 2;
    if (total === 0) {
      this.preloadComplete = true;
      this.saveRadarCache();
      return;
    }

    var completed = 0;
    function checkDone() {
      completed++;
      if (completed >= total) {
        self.preloadComplete = true;
        self.saveRadarCache();
      }
    }

    for (var i = 0; i < this.dimensions.length; i++) {
      var dim = this.dimensions[i].dimension;
      if (!this.dimensionData[dim]) {
        this.dimensionData[dim] = {};
      }

      Api.getRadarDimension(this.playStyle, dim, function(dimension) {
        return function(error, result) {
          if (!error && result) {
            self.dimensionData[dimension].detail = result;
          }
          checkDone();
        };
      }(dim));

      Api.getRadarRecommendations(this.playStyle, dim, function(dimension) {
        return function(error, result) {
          if (!error && result) {
            self.dimensionData[dimension].rec = result;
          }
          checkDone();
        };
      }(dim));
    }
  },

  renderRadarPage: function() {
    var header = document.getElementById('radar-header');
    if (header) header.textContent = (this.playStyle === 0 ? 'SP' : 'DP') + ' 雷达';

    this.drawRadarChart();
    this.renderDimGrid();

    App.updateFocusableItems();
    App.currentFocusIndex = 0;
    App.renderFocus();
    this.updateRadarHighlight();
  },

  drawRadarChart: function() {
    var svg = document.getElementById('radar-svg');
    if (!svg) return;

    var centerX = 120;
    var centerY = 54;
    var radius = 40;

    var dimOrder = this.dimOrder;
    var dimColors = this.dimColors;

    var values = [];
    var labels = [];
    var maxValue = 0;
    var total = 0;

    for (var i = 0; i < dimOrder.length; i++) {
      var dim = dimOrder[i];
      var found = null;
      for (var j = 0; j < this.dimensions.length; j++) {
        if (this.dimensions[j].dimension === dim) {
          found = this.dimensions[j];
          break;
        }
      }
      var val = found ? (found.average_radar_value || 0) : 0;
      values.push(val);
      labels.push(this.dimensionLabels[dim] || dim);
      if (val > maxValue) maxValue = val;
      total += val;
    }

    this.totalValue = total;

    var mainColor = dimColors[dimOrder[0]];
    var maxIdx = 0;
    for (var i = 0; i < values.length; i++) {
      if (values[i] > values[maxIdx]) {
        maxIdx = i;
      }
    }
    mainColor = dimColors[dimOrder[maxIdx]];
    this.mainColor = mainColor;

    var normMax = maxValue > 0 ? maxValue : 1;
    var normValues = [];
    for (var i = 0; i < values.length; i++) {
      normValues.push(values[i] / normMax);
    }

    var html = '';

    for (var level = 1; level <= 3; level++) {
      var levelRadius = radius * level / 3;
      var polyPoints = [];
      for (var i = 0; i < 6; i++) {
        var angle = (Math.PI / 2) - (Math.PI * 2 * i / 6);
        var x = centerX + levelRadius * Math.cos(angle);
        var y = centerY - levelRadius * Math.sin(angle);
        polyPoints.push(x + ',' + y);
      }
      html += '<polygon points="' + polyPoints.join(' ') + '" fill="none" stroke="#e0e0e0" stroke-width="0.5"/>';
    }

    for (var i = 0; i < 6; i++) {
      var angle = (Math.PI / 2) + (Math.PI * 2 * i / 6);
      var x = centerX + radius * Math.cos(angle);
      var y = centerY - radius * Math.sin(angle);
      html += '<line x1="' + centerX + '" y1="' + centerY + '" x2="' + x + '" y2="' + y + '" stroke="#e8e8e8" stroke-width="0.5"/>';
    }

    var dataPoints = [];
    for (var i = 0; i < 6; i++) {
      var angle = (Math.PI / 2) + (Math.PI * 2 * i / 6);
      var x = centerX + radius * Math.cos(angle) * normValues[i];
      var y = centerY - radius * Math.sin(angle) * normValues[i];
      dataPoints.push(x + ',' + y);
    }
    html += '<polygon points="' + dataPoints.join(' ') + '" fill="' + mainColor + '" fill-opacity="0.15" stroke="' + mainColor + '" stroke-width="1.2"/>';

    for (var i = 0; i < 6; i++) {
      var angle = (Math.PI / 2) + (Math.PI * 2 * i / 6);
      var x = centerX + radius * Math.cos(angle) * normValues[i];
      var y = centerY - radius * Math.sin(angle) * normValues[i];
      var color = dimColors[dimOrder[i]];
      html += '<circle id="radar-dot-' + dimOrder[i] + '" cx="' + x + '" cy="' + y + '" r="3" fill="' + color + '" stroke="#fff" stroke-width="0.5"/>';
    }

    for (var i = 0; i < 6; i++) {
      var angle = (Math.PI / 2) + (Math.PI * 2 * i / 6);
      var labelRadius = radius + 10;
      var x = centerX + labelRadius * Math.cos(angle);
      var y = centerY - labelRadius * Math.sin(angle);
      var color = dimColors[dimOrder[i]];
      html += '<text x="' + x + '" y="' + (y + 3) + '" font-size="9" fill="' + color + '" text-anchor="middle" font-family="sans-serif">' + labels[i] + '</text>';
    }

    svg.innerHTML = html;
  },

  renderDimGrid: function() {
    var grid = document.getElementById('radar-dim-grid');
    if (!grid) return;

    grid.innerHTML = '';

    var dimOrder = this.dimOrder;
    var dimColors = this.dimColors;

    for (var i = 0; i < dimOrder.length; i++) {
      var dim = dimOrder[i];
      var found = null;
      var foundIdx = -1;
      for (var j = 0; j < this.dimensions.length; j++) {
        if (this.dimensions[j].dimension === dim) {
          found = this.dimensions[j];
          foundIdx = j;
          break;
        }
      }
      var val = found ? (found.average_radar_value || 0) : 0;

      var cell = document.createElement('div');
      cell.className = 'radar-dim-cell list-item';
      cell.setAttribute('data-dim', dim);
      cell.setAttribute('data-dim-idx', foundIdx);

      var label = this.dimensionLabels[dim] || dim;
      var color = dimColors[dim];

      cell.innerHTML = '<span class="radar-dim-name" style="color:' + color + '">' + label + '</span><span class="radar-dim-value">' + val.toFixed(2) + '</span>';

      grid.appendChild(cell);
    }
  },

  updateRadarHighlight: function() {
    var item = App.getFocusedItem();
    if (!item) return;

    var dim = item.getAttribute('data-dim');
    var dimIdx = parseInt(item.getAttribute('data-dim-idx'), 10);

    var focusEl = document.getElementById('radar-focus-dim');
    var totalEl = document.getElementById('radar-total');
    if (focusEl && dimIdx >= 0 && this.dimensions[dimIdx]) {
      var label = this.dimensionLabels[dim] || dim;
      focusEl.textContent = label + ': ' + this.dimensions[dimIdx].average_radar_value.toFixed(2);
    }
    if (totalEl) {
      totalEl.textContent = 'Total: ' + this.totalValue.toFixed(2);
    }

    this.highlightRadarDot(dim);
  },

  highlightRadarDot: function(dim) {
    var dimOrder = this.dimOrder;
    for (var i = 0; i < dimOrder.length; i++) {
      var dot = document.getElementById('radar-dot-' + dimOrder[i]);
      if (dot) {
        dot.setAttribute('r', '3');
        dot.setAttribute('stroke-width', '0.5');
      }
    }

    var activeDot = document.getElementById('radar-dot-' + dim);
    if (activeDot) {
      activeDot.setAttribute('r', '5');
      activeDot.setAttribute('stroke-width', '1.5');
    }
  },

  onArrowUp: function() {
    var idx = App.currentFocusIndex;
    var total = App.focusableItems.length;
    if (idx >= 3 && idx - 3 >= 0) {
      App.moveFocus(-3);
      this.updateRadarHighlight();
    }
  },

  onArrowDown: function() {
    var idx = App.currentFocusIndex;
    var total = App.focusableItems.length;
    if (idx < 3 && idx + 3 < total) {
      App.moveFocus(3);
      this.updateRadarHighlight();
    }
  },

  onArrowLeft: function() {
    var idx = App.currentFocusIndex;
    if (idx % 3 !== 0) {
      App.moveFocus(-1);
      this.updateRadarHighlight();
    }
  },

  onArrowRight: function() {
    var idx = App.currentFocusIndex;
    if (idx % 3 !== 2) {
      App.moveFocus(1);
      this.updateRadarHighlight();
    }
  },

  onEnter: function() {
    var item = App.getFocusedItem();
    if (!item) return;

    var dimIdx = parseInt(item.getAttribute('data-dim-idx'), 10);
    var dim = this.dimensions[dimIdx];
    if (!dim) return;

    App.showPage('radar-detail', {
      playStyle: this.playStyle,
      dimension: dim.dimension,
      dimensionLabel: this.dimensionLabels[dim.dimension] || dim.dimension,
      averageValue: dim.average_radar_value
    });
  },

  onSoftLeft: function() {
    App.goBack();
  }
};

App.pageHandlers['radar'] = RadarPage;

var RadarDetailPage = {
  playStyle: 0,
  dimension: null,
  dimensionLabel: null,
  averageValue: 0,
  topCharts: [],

  onShow: function(data) {
    if (data) {
      this.playStyle = data.playStyle !== undefined ? data.playStyle : this.playStyle;
      this.dimension = data.dimension || this.dimension;
      this.dimensionLabel = data.dimensionLabel || this.dimensionLabel;
      this.averageValue = data.averageValue !== undefined ? data.averageValue : this.averageValue;
    }
    this.topCharts = [];

    var cached = RadarPage.dimensionData[this.dimension];
    if (cached && cached.detail) {
      this.topCharts = cached.detail.top_charts ? cached.detail.top_charts : [];
      this.renderDetailList();
    } else {
      this.loadDimensionDetail();
    }
  },

  loadDimensionDetail: function() {
    var self = this;
    App.showLoading('加载中...');

    Api.getRadarDimension(this.playStyle, this.dimension, function(error, result) {
      App.hideLoading();

      if (error) {
        alert('加载失败: ' + (error.message || '未知错误'));
        return;
      }

      self.topCharts = result && result.top_charts ? result.top_charts : [];
      self.renderDetailList();
    });
  },

  renderDetailList: function() {
    var header = document.getElementById('radar-detail-header');
    if (header) header.textContent = (this.playStyle === 0 ? 'SP' : 'DP') + ' ' + this.dimensionLabel + ' 平均: ' + this.averageValue.toFixed(2);

    var bar = document.getElementById('radar-detail-bar');
    if (bar) bar.innerHTML = '<span>3=推荐</span><span class="list-counter"></span>';

    var list = document.getElementById('radar-detail-list');
    list.innerHTML = '';

    if (this.topCharts.length === 0) {
      list.innerHTML = '<li class="list-item">暂无数据</li>';
    } else {
      for (var i = 0; i < this.topCharts.length; i++) {
        var chart = this.topCharts[i];
        var best = chart.best_score;
        var li = document.createElement('li');
        li.className = 'list-item';

        var title = Utils.escapeHtml(best.music_title || 'Unknown');
        var diffText = Utils.chartDiffText(best.chart_difficulty);
        var sub = 'Lv.' + best.difficulty_level + diffText;
        sub += ' | ' + (chart.radar_value !== undefined ? chart.radar_value.toFixed(2) : '-');
        sub += ' / ' + (chart.max_radar_value !== undefined ? chart.max_radar_value.toFixed(2) : '-');
        if (best.detailed_dj_level) {
          sub += ' | ' + best.detailed_dj_level;
        }

        var flagColor = Utils.clearFlagColor(best.clear_flag);
        var isFav = Storage.isFavorite(best.music_id, this.playStyle, best.chart_difficulty);
        var favBar = isFav ? '<span class="favorite-bar"></span>' : '';
        li.innerHTML = '<span class="clear-flag-bar" style="background:' + flagColor + ';"></span>' + favBar + '<span class="item-title">' + title + '</span><span class="sub">' + sub + '</span>';
        li.setAttribute('data-chart-idx', i);
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

    var chartIdx = parseInt(item.getAttribute('data-chart-idx'), 10);
    var chart = this.topCharts[chartIdx];
    if (!chart || !chart.best_score) return;

    App.showPage('song', {
      musicId: chart.best_score.music_id,
      playStyle: this.playStyle,
      chartDifficulty: chart.best_score.chart_difficulty
    });
  },

  onSoftLeft: function() {
    App.goBack();
  },

  updateSoftkeyLabel: function() {
    var item = App.getFocusedItem();
    var label = '';
    if (item) {
      var chartIdx = parseInt(item.getAttribute('data-chart-idx'), 10);
      var chart = this.topCharts[chartIdx];
      if (chart && chart.best_score) {
        var isFav = Storage.isFavorite(chart.best_score.music_id, this.playStyle, chart.best_score.chart_difficulty);
        label = isFav ? '取消收藏' : '收藏';
      }
    }
    var el = document.getElementById('radar-detail-soft-right');
    if (el) el.textContent = label;
  },

  onFocusChanged: function() {
    this.updateSoftkeyLabel();
  },

  onSoftRight: function() {
    var item = App.getFocusedItem();
    if (!item) return;
    var chartIdx = parseInt(item.getAttribute('data-chart-idx'), 10);
    var chart = this.topCharts[chartIdx];
    if (!chart || !chart.best_score) return;
    var isFav = Storage.toggleFavorite(chart.best_score.music_id, this.playStyle, chart.best_score.chart_difficulty, chart.best_score.music_title);
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

  onDigit: function(digit) {
    if (digit === 3) {
      var detailPage = document.getElementById('page-radar-detail');
      var recPage = document.getElementById('page-radar-rec');
      if (detailPage) detailPage.classList.remove('active');
      if (recPage) recPage.classList.add('active');
      App.currentPage = 'radar-rec';
      App.currentFocusIndex = 0;
      if (App.navStack.length > 0) {
        App.navStack[App.navStack.length - 1] = 'radar-rec';
      }
      RadarRecPage.onShow({
        playStyle: this.playStyle,
        dimension: this.dimension,
        dimensionLabel: this.dimensionLabel
      });
      App.updateFocusableItems();
      App.renderFocus();
    }
  },

  onBack: function() {
    return false;
  }
};

App.pageHandlers['radar-detail'] = RadarDetailPage;

var RadarRecPage = {
  playStyle: 0,
  dimension: null,
  dimensionLabel: null,
  recommendations: [],

  onShow: function(data) {
    if (data) {
      this.playStyle = data.playStyle !== undefined ? data.playStyle : this.playStyle;
      this.dimension = data.dimension || this.dimension;
      this.dimensionLabel = data.dimensionLabel || this.dimensionLabel;
    }
    this.recommendations = [];

    var cached = RadarPage.dimensionData[this.dimension];
    if (cached && cached.rec) {
      this.recommendations = cached.rec.recommendations ? cached.rec.recommendations : [];
      this.renderRecList();
    } else {
      this.loadRecommendations();
    }
  },

  loadRecommendations: function() {
    var self = this;
    App.showLoading('加载中...');

    Api.getRadarRecommendations(this.playStyle, this.dimension, function(error, result) {
      App.hideLoading();

      if (error) {
        alert('加载失败: ' + (error.message || '未知错误'));
        return;
      }

      self.recommendations = result && result.recommendations ? result.recommendations : [];
      self.renderRecList();
    });
  },

  renderRecList: function() {
    var header = document.getElementById('radar-rec-header');
    if (header) header.textContent = (this.playStyle === 0 ? 'SP' : 'DP') + ' ' + this.dimensionLabel + ' 推荐';

    var bar = document.getElementById('radar-rec-bar');
    if (bar) bar.innerHTML = '<span>1=详情</span><span class="list-counter"></span>';

    var list = document.getElementById('radar-rec-list');
    list.innerHTML = '';

    if (this.recommendations.length === 0) {
      list.innerHTML = '<li class="list-item">暂无推荐歌曲</li>';
    } else {
      for (var i = 0; i < this.recommendations.length; i++) {
        var rec = this.recommendations[i];
        var li = document.createElement('li');
        li.className = 'list-item';

        var title = Utils.escapeHtml(rec.music_title || 'Unknown');
        var diffText = Utils.chartDiffText(rec.chart_difficulty);
        var sub = 'Lv.' + rec.difficulty_level + diffText;
        if (rec.radar_improvement !== undefined) {
          sub += ' | 提升: +' + rec.radar_improvement.toFixed(2);
        }
        if (rec.target_detailed_dj_level) {
          sub += ' | 目标: ' + rec.target_detailed_dj_level;
        }

        var isFav = Storage.isFavorite(rec.music_id, this.playStyle, rec.chart_difficulty);
        var favBar = isFav ? '<span class="favorite-bar"></span>' : '';
        li.innerHTML = favBar + '<span class="item-title">' + title + '</span><span class="sub">' + sub + '</span>';
        li.setAttribute('data-rec-idx', i);
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

    var recIdx = parseInt(item.getAttribute('data-rec-idx'), 10);
    var rec = this.recommendations[recIdx];
    if (!rec) return;

    App.showPage('song', {
      musicId: rec.music_id,
      playStyle: this.playStyle,
      chartDifficulty: rec.chart_difficulty
    });
  },

  updateSoftkeyLabel: function() {
    var item = App.getFocusedItem();
    var label = '';
    if (item) {
      var recIdx = parseInt(item.getAttribute('data-rec-idx'), 10);
      var rec = this.recommendations[recIdx];
      if (rec) {
        var isFav = Storage.isFavorite(rec.music_id, this.playStyle, rec.chart_difficulty);
        label = isFav ? '取消收藏' : '收藏';
      }
    }
    var el = document.getElementById('radar-rec-soft-right');
    if (el) el.textContent = label;
  },

  onFocusChanged: function() {
    this.updateSoftkeyLabel();
  },

  onSoftRight: function() {
    var item = App.getFocusedItem();
    if (!item) return;
    var recIdx = parseInt(item.getAttribute('data-rec-idx'), 10);
    var rec = this.recommendations[recIdx];
    if (!rec) return;
    var isFav = Storage.toggleFavorite(rec.music_id, this.playStyle, rec.chart_difficulty, rec.music_title);
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

  onDigit: function(digit) {
    if (digit === 1) {
      var avgValue = 0;
      for (var i = 0; i < RadarPage.dimensions.length; i++) {
        if (RadarPage.dimensions[i].dimension === this.dimension) {
          avgValue = RadarPage.dimensions[i].average_radar_value;
          break;
        }
      }
      var recPage = document.getElementById('page-radar-rec');
      var detailPage = document.getElementById('page-radar-detail');
      if (recPage) recPage.classList.remove('active');
      if (detailPage) detailPage.classList.add('active');
      App.currentPage = 'radar-detail';
      App.currentFocusIndex = 0;
      if (App.navStack.length > 0) {
        App.navStack[App.navStack.length - 1] = 'radar-detail';
      }
      RadarDetailPage.onShow({
        playStyle: this.playStyle,
        dimension: this.dimension,
        dimensionLabel: this.dimensionLabel,
        averageValue: avgValue
      });
      App.updateFocusableItems();
      App.renderFocus();
    }
  },

  onSoftLeft: function() {
    App.goBack();
  },

  onBack: function() {
    return false;
  }
};

App.pageHandlers['radar-rec'] = RadarRecPage;
