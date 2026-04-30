if (document.readyState === 'complete') {
  App.init();
} else {
  window.onload = function() {
    App.init();
  };
}
