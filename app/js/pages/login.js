var LoginPage = {
  focusedInput: 0,
  inputs: null,

  onShow: function() {
    this.focusedInput = 0;
    this.inputs = document.querySelectorAll('#page-login .input-row');

    // Restore saved credentials
    var savedUsername = Storage.getUsername();
    var savedPassword = Storage.getPassword();
    var rememberUsername = Storage.getRememberUsername();
    var rememberPassword = Storage.getRememberPassword();
    var autoLogin = Storage.getAutoLogin();

    var usernameInput = document.getElementById('login-username');
    var passwordInput = document.getElementById('login-password');
    var rememberUsernameCb = document.getElementById('login-remember-username');
    var rememberPasswordCb = document.getElementById('login-remember-password');
    var autoLoginCb = document.getElementById('login-auto-login');

    if (usernameInput) {
      usernameInput.value = rememberUsername && savedUsername ? savedUsername : '';
    }
    if (passwordInput) {
      passwordInput.value = rememberPassword && savedPassword ? savedPassword : '';
    }
    if (rememberUsernameCb) {
      rememberUsernameCb.checked = rememberUsername;
    }
    if (rememberPasswordCb) {
      rememberPasswordCb.checked = rememberPassword;
    }
    if (autoLoginCb) {
      autoLoginCb.checked = autoLogin;
    }

    this.renderInputFocus();

    // Auto-login if enabled and credentials exist
    if (autoLogin && savedUsername && savedPassword) {
      this.doLogin(savedUsername, savedPassword);
    }
  },

  renderInputFocus: function() {
    if (!this.inputs) return;
    for (var i = 0; i < this.inputs.length; i++) {
      this.inputs[i].classList.remove('focused');
    }
    if (this.focusedInput >= 0 && this.focusedInput < this.inputs.length) {
      this.inputs[this.focusedInput].classList.add('focused');
      var input = this.inputs[this.focusedInput].querySelector('input');
      if (input && input.type !== 'checkbox') {
        input.focus();
      }
    }
  },

  onArrowUp: function() {
    this.focusedInput--;
    if (this.focusedInput < 0) this.focusedInput = 0;
    this.renderInputFocus();
  },

  onArrowDown: function() {
    this.focusedInput++;
    if (this.focusedInput >= this.inputs.length) {
      this.focusedInput = this.inputs.length - 1;
    }
    this.renderInputFocus();
  },

  onEnter: function() {
    var currentRow = this.inputs[this.focusedInput];
    if (!currentRow) return;

    var input = currentRow.querySelector('input');

    // Toggle checkbox on Enter
    if (input && input.type === 'checkbox') {
      input.checked = !input.checked;
      return;
    }

    // Perform login
    var username = document.getElementById('login-username').value.trim();
    var password = document.getElementById('login-password').value;

    if (!username || !password) {
      if (!username) {
        this.focusedInput = 0;
        this.renderInputFocus();
      } else {
        this.focusedInput = 1;
        this.renderInputFocus();
      }
      return;
    }

    this.doLogin(username, password);
  },

  doLogin: function(username, password) {
    var self = this;

    var rememberUsername = document.getElementById('login-remember-username');
    var rememberPassword = document.getElementById('login-remember-password');
    var autoLogin = document.getElementById('login-auto-login');

    App.showLoading('登录中...');

    Api.login(username, password, function(error, result) {
      App.hideLoading();

      if (error) {
        alert('登录失败: ' + (error.message || '未知错误'));
        return;
      }

      if (result && result.access_token) {
        // Save credentials based on checkbox state
        if (rememberUsername && rememberUsername.checked) {
          Storage.setUsername(username);
          Storage.setRememberUsername(true);
        } else {
          Storage.clearUsername();
          Storage.setRememberUsername(false);
        }

        if (rememberPassword && rememberPassword.checked) {
          Storage.setPassword(password);
          Storage.setRememberPassword(true);
        } else {
          Storage.clearPassword();
          Storage.setRememberPassword(false);
        }

        if (autoLogin && autoLogin.checked) {
          Storage.setAutoLogin(true);
        } else {
          Storage.setAutoLogin(false);
        }

        App.navStack = [];
        App.showPage('menu');
        App.fetchSyncStatus();
      } else {
        alert('登录失败: 未获取到 token');
      }
    });
  }
};

App.pageHandlers['login'] = LoginPage;
