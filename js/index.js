/**
 * Ritual — Página principal (index)
 */
(function() {
  function init() {
    var btnLogout = document.getElementById('nav-btn-logout');
    var btnLogoutMobile = document.getElementById('nav-btn-logout-mobile');
    if (btnLogout) btnLogout.addEventListener('click', function() {
      if (window.RitualAuth) window.RitualAuth.signOut();
    });
    if (btnLogoutMobile) btnLogoutMobile.addEventListener('click', function() {
      if (window.RitualAuth) window.RitualAuth.signOut();
    });

    // Bienvenida marketinera tras registrarse (si hay sesión; sin confirmar = sin sesión en Supabase)
    var params = new URLSearchParams(window.location.search);
    var welcomeRegistrado = document.getElementById('welcome-registrado');
    var btnCerrarWelcome = document.getElementById('welcome-registrado-cerrar');
    if (params.get('registrado') === '1' && welcomeRegistrado) {
      function mostrarBienvenida() {
        welcomeRegistrado.classList.remove('hidden');
        if (history.replaceState) history.replaceState({}, '', window.location.pathname || 'index.html');
        function cerrarWelcome() { welcomeRegistrado.classList.add('hidden'); }
        if (btnCerrarWelcome) btnCerrarWelcome.addEventListener('click', cerrarWelcome);
        welcomeRegistrado.addEventListener('click', function(e) {
          if (e.target === welcomeRegistrado) cerrarWelcome();
        });
      }
      if (window.RitualAuth) {
        window.RitualAuth.getSession().then(function(session) {
          if (!session) {
            window.location.href = 'auth.html?pendingConfirm=1';
            return;
          }
          mostrarBienvenida();
        }).catch(function() { mostrarBienvenida(); });
      } else {
        mostrarBienvenida();
      }
    }

    // Toast breve solo para "sesión iniciada" (login)
    var msgLogin = document.getElementById('msg-login');
    var btnCerrarLogin = document.getElementById('msg-login-cerrar');
    if (params.get('login') === '1' && msgLogin) {
      msgLogin.classList.remove('hidden');
      if (history.replaceState) history.replaceState({}, '', window.location.pathname || 'index.html');
      function cerrarLogin() { msgLogin.classList.add('hidden'); }
      if (btnCerrarLogin) btnCerrarLogin.addEventListener('click', cerrarLogin);
      setTimeout(cerrarLogin, 4000);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
