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

    // Mensaje "Cuenta creada" tras registrarse
    var params = new URLSearchParams(window.location.search);
    var msgRegistrado = document.getElementById('msg-registrado');
    var btnCerrarMsg = document.getElementById('msg-registrado-cerrar');
    if (params.get('registrado') === '1' && msgRegistrado) {
      msgRegistrado.classList.remove('hidden');
      if (history.replaceState) {
        history.replaceState({}, '', window.location.pathname || 'index.html');
      }
      function cerrarMsg() {
        msgRegistrado.classList.add('hidden');
      }
      if (btnCerrarMsg) btnCerrarMsg.addEventListener('click', cerrarMsg);
      setTimeout(cerrarMsg, 5000);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
