/**
 * Ritual — Página de login/registro (auth.html)
 */
(function() {
  function init() {
    if (!window.RitualAuth) return;

    var tabLogin = document.getElementById('tab-login');
    var tabSignup = document.getElementById('tab-signup');
    var formLogin = document.getElementById('form-login');
    var formSignup = document.getElementById('form-signup');
    var authError = document.getElementById('auth-error');

    if (!formLogin || !formSignup) return;

    function showError(msg) {
      if (authError) {
        authError.textContent = msg;
        authError.classList.remove('hidden');
      }
    }
    function hideError() {
      if (authError) authError.classList.add('hidden');
    }

    function showLogin() {
      formLogin.classList.remove('hidden');
      formSignup.classList.add('hidden');
      if (tabLogin) {
        tabLogin.classList.add('border-wine', 'font-medium', 'text-nude');
        tabLogin.classList.remove('border-transparent');
      }
      if (tabSignup) {
        tabSignup.classList.remove('border-wine', 'text-nude');
        tabSignup.classList.add('border-transparent', 'text-nude-muted');
      }
    }
    function showSignup() {
      formSignup.classList.remove('hidden');
      formLogin.classList.add('hidden');
      if (tabSignup) {
        tabSignup.classList.add('border-wine', 'font-medium', 'text-nude');
        tabSignup.classList.remove('border-transparent', 'text-nude-muted');
      }
      if (tabLogin) {
        tabLogin.classList.remove('border-wine', 'text-nude');
        tabLogin.classList.add('border-transparent', 'text-nude-muted');
      }
    }

    if (tabLogin) tabLogin.addEventListener('click', function() { hideError(); showLogin(); });
    if (tabSignup) tabSignup.addEventListener('click', function() { hideError(); showSignup(); });

    formLogin.addEventListener('submit', function(e) {
      e.preventDefault();
      hideError();
      var email = document.getElementById('login-email').value.trim();
      var password = document.getElementById('login-password').value;
      if (!email || !password) { showError('Completá email y contraseña.'); return; }
      window.RitualAuth.signIn(email, password).then(function() {
        var params = new URLSearchParams(window.location.search);
        var base = params.get('redirect') || 'index.html';
        var url = base;
        if (base.indexOf('exito.html') >= 0) {
          var sep = base.indexOf('?') >= 0 ? '&' : '?';
          url = base + sep + 'tipo=login';
        }
        window.location.href = url;
      }).catch(function(err) {
        showError(err.message || 'Error al iniciar sesión.');
      });
    });

    formSignup.addEventListener('submit', function(e) {
      e.preventDefault();
      hideError();
      var email = document.getElementById('signup-email').value.trim();
      var password = document.getElementById('signup-password').value;
      if (!email || !password) { showError('Completá email y contraseña.'); return; }
      if (password.length < 6) { showError('La contraseña debe tener al menos 6 caracteres.'); return; }
      window.RitualAuth.signUp(email, password).then(function() {
        var params = new URLSearchParams(window.location.search);
        var base = params.get('redirect') || 'index.html';
        var redirect;
        if (base === 'index.html' && !params.get('redirect')) {
          redirect = 'index.html?registrado=1';
        } else if (base.indexOf('exito.html') >= 0) {
          var sep = base.indexOf('?') >= 0 ? '&' : '?';
          redirect = base + sep + 'tipo=registro';
        } else {
          redirect = base;
        }
        window.location.href = redirect;
      }).catch(function(err) {
        showError(err.message || 'Error al crear la cuenta.');
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
