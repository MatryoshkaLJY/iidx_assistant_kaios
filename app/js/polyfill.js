// KaiOS system API polyfill for desktop browser testing
if (typeof widget === 'undefined') {
  widget = new function() {
    this.setNavigationEnabled = function(b) {};
    this.preferenceForKey = function(b) {};
    return this;
  };
}
if (typeof menu === 'undefined') {
  menu = new function() {
    this.append = function(b) {};
    this.showSoftkeys = function(b) {};
    this.setRightSoftkeyLabel = function(b) {};
    this.setLeftSoftkeyLabel = function(b) {};
    this.remove = function(b) {};
    return this;
  };
}
