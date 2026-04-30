var RadarPage = {
  playStyle: 0,
  radarData: null,
  dimensions: [],
  dimensionData: {},
  preloadComplete: false,

  dimensionLabels: {
    notes: 'Notes',
    scratch: 'Scratch',
    peak: 'Peak',
    chord: 'Chord',
    charge: 'Charge',
    soflan: 'Soflan'
  },

  onShow: function(data) {
    if (data) {
      this.playStyle = data.playStyle !== undefined ? data.playStyle : 0;
      this.radarData = null;
      this.dimensions = [];
      this.dimensionData = {};
      this.preloadComplete = false;
      this.loadRadarSummary();
    } else if (this.dimensions.length > 0) {
      this.renderRadarList();
    } else {
      this.loadRadarSummary();
    }
  },

  isCacheValid: function(cache) {
    if (!cache || !cache.summary || !cache.dimensions) return false;
    if (App.syncStatusTimestamp === 0) return false;
    return cache.syncTimestamp === App.syncStatusTimestamp;
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

    // Try cache first
    var cache = Storage.getRadarCache(this.playStyle);
    if (cache && self.isCacheValid(cache)) {
      self.radarData = cache.summary;
      self.dimensions = cache.dimensions;
      self.dimensionData = cache.dimensionData;
      self.preloadComplete = true;
      self.renderRadarList();
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
      self.renderRadarList();

      // Pre-fetch all dimension details and recommendations in background
      self.preloadAllDimensionData();
    });
  },

  preloadAllDimensionData: function() {
    var self = this;
    var total = this.dimensions.length * 2; // detail + rec per dimension
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

      // Fetch dimension detail
      Api.getRadarDimension(this.playStyle, dim, function(dimension) {
        return function(error, result) {
          if (!error && result) {
            self.dimensionData[dimension].detail = result;
          }
          checkDone();
        };
      }(dim));

      // Fetch dimension recommendations
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

  renderRadarList: function() {
    var header = document.getElementById('radar-header');
    if (header) header.textContent = (this.playStyle === 0 ? 'SP' : 'DP') + ' 雷达';

    var list = document.getElementById('radar-list');
    list.innerHTML = '';

    if (this.dimensions.length === 0) {
      list.innerHTML = '<li class="list-item">暂无雷达数据</li>';
    } else {
      for (var i = 0; i < this.dimensions.length; i++) {
        var dim = this.dimensions[i];
        var li = document.createElement('li');
        li.className = 'list-item';

        var label = this.dimensionLabels[dim.dimension] || dim.dimension;
        var value = dim.average_radar_value !== undefined ? dim.average_radar_value.toFixed(2) : '-';

        li.innerHTML = '<span class="item-title">' + label + '</span><span class="sub">平均值: ' + value + '</span>';
        li.setAttribute('data-dim-idx', i);
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

    // Use pre-fetched data if available
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
    if (header) header.textContent = (this.playStyle === 0 ? 'SP' : 'DP') + ' ' + this.dimensionLabel;

    var bar = document.getElementById('radar-detail-bar');
    if (bar) bar.innerHTML = '<span>平均: ' + this.averageValue.toFixed(2) + '</span><span class="list-counter"></span>';

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
        sub += ' | 雷达值: ' + (chart.radar_value !== undefined ? chart.radar_value.toFixed(2) : '-');
        sub += ' | 最大: ' + (chart.max_radar_value !== undefined ? chart.max_radar_value.toFixed(2) : '-');
        if (best.detailed_dj_level) {
          sub += ' | ' + best.detailed_dj_level;
        }

        var flagColor = Utils.clearFlagColor(best.clear_flag);
        li.innerHTML = '<span class="clear-flag-bar" style="background:' + flagColor + ';"></span><span class="item-title">' + title + '</span><span class="sub">' + sub + '</span>';
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

  onSoftRight: function() {
    App.showPage('radar-rec', {
      playStyle: this.playStyle,
      dimension: this.dimension,
      dimensionLabel: this.dimensionLabel
    });
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

    // Use pre-fetched data if available
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
    if (bar) bar.innerHTML = '<span class="list-counter"></span>';

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

        li.innerHTML = '<span class="item-title">' + title + '</span><span class="sub">' + sub + '</span>';
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

  onSoftLeft: function() {
    App.goBack();
  },

  onBack: function() {
    return false;
  }
};

App.pageHandlers['radar-rec'] = RadarRecPage;
