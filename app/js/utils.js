var Utils = {
  // Simple fuzzy match for search
  fuzzyMatch: function(text, keyword) {
    if (!text || !keyword) return false;
    return text.toLowerCase().indexOf(keyword.toLowerCase()) !== -1;
  },

  // Format chart difficulty number to text
  chartDiffText: function(diff) {
    var map = {0: 'B', 1: 'N', 2: 'H', 3: 'A', 4: 'L'};
    return map[diff] || String(diff);
  },

  // Format clear flag number to text
  clearFlagText: function(flag) {
    var map = {
      0: 'NO PLAY',
      1: 'FAILED',
      2: 'A-CLEAR',
      3: 'E-CLEAR',
      4: 'CLEAR',
      5: 'H-CLEAR',
      6: 'EXH-CLEAR',
      7: 'FC',
      8: 'PERFECT'
    };
    return map[flag] || String(flag);
  },

  // Get clear flag color hex
  clearFlagColor: function(flag) {
    var map = {
      0: '#ffffff',
      1: '#cccccc',
      2: '#7f66ff',
      3: '#99ff33',
      4: '#0dccf2',
      5: '#ff3333',
      6: '#ffdd33',
      7: '#00ffff',
      8: '#00ffff'
    };
    return map[flag] || '#ffffff';
  },

  // Format DJ level number to text
  djLevelText: function(level) {
    var map = {
      0: 'F',
      1: 'E',
      2: 'D',
      3: 'C',
      4: 'B',
      5: 'A',
      6: 'AA',
      7: 'AAA',
      8: 'MAX'
    };
    return map[level] || String(level);
  },

  // Play style text
  playStyleText: function(style) {
    return style === 1 ? 'DP' : 'SP';
  },

  // Escape HTML to prevent XSS
  escapeHtml: function(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  // Truncate text with ellipsis
  truncate: function(str, maxLen) {
    if (!str || str.length <= maxLen) return str;
    return str.substring(0, maxLen - 1) + '…';
  },

  // Get level display string from music item
  getLevels: function(item, style) {
    var prefix = style === 1 ? 'lvDP' : 'lvSP';
    var diffs = ['B', 'N', 'H', 'A', 'L'];
    var result = [];
    for (var i = 0; i < diffs.length; i++) {
      var key = prefix + diffs[i];
      var val = item[key];
      if (val && val !== '0') {
        result.push(diffs[i] + val);
      }
    }
    return result.join(' ');
  },

  // Debounce function for search input
  debounce: function(func, wait) {
    var timeout;
    return function() {
      var args = arguments;
      var context = this;
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        func.apply(context, args);
      }, wait);
    };
  },

  // Sort array by property
  sortBy: function(arr, prop, desc) {
    var copy = arr.slice();
    copy.sort(function(a, b) {
      var av = a[prop] || 0;
      var bv = b[prop] || 0;
      if (av < bv) return desc ? 1 : -1;
      if (av > bv) return desc ? -1 : 1;
      return 0;
    });
    return copy;
  },

  // Create DOM element with class
  createEl: function(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }
};
