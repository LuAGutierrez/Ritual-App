/**
 * Ritual — Dashboard del usuario
 */
(function() {
  function nombreJuego(gameSlug) {
    if (gameSlug === 'conexion') return 'Conexión profunda';
    if (gameSlug === 'picante') return 'Picante progresivo';
    if (gameSlug === 'eleccion') return 'Elección mutua';
    if (gameSlug === 'memoria') return 'Memoria nuestra';
    return 'Experiencia';
  }

  function nombreModo(modeSlug) {
    if (!modeSlug) return '';
    var map = {
      suave: 'Suave',
      profundo: 'Profundo',
      vulnerable: 'Vulnerable',
      nivel1: 'Nivel 1',
      nivel2: 'Nivel 2',
      nivel3: 'Nivel 3',
      modo1: 'Modo 1',
      modo2: 'Modo 2',
      modo3: 'Modo 3',
    };
    return map[modeSlug] || modeSlug;
  }

  function init() {
    if (!window.RitualAuth) {
      window.location.href = 'auth.html?redirect=' + encodeURIComponent('mis-experiencias.html');
      return;
    }

    var btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', function() {
        window.RitualAuth.signOut();
      });
    }

    window.RitualAuth.init().then(function() {
      return window.RitualAuth.getSessionValidated();
    }).then(function(session) {
      if (!session) {
        window.location.href = 'auth.html?redirect=' + encodeURIComponent('mis-experiencias.html');
        return;
      }

      var emailEl = document.getElementById('user-email');
      if (emailEl) {
        emailEl.textContent = session.user && session.user.email
          ? 'Sesión iniciada con ' + session.user.email
          : '';
      }

      var progress = window.RitualProgress ? window.RitualProgress.getLast() : null;
      var avisoVacio = document.getElementById('continuar-vacio');
      if (!progress || !progress.page) {
        if (avisoVacio) avisoVacio.classList.remove('hidden');
        return;
      }

      var wrap = document.getElementById('continuar-wrap');
      var texto = document.getElementById('continuar-texto');
      var link = document.getElementById('continuar-link');
      if (!wrap || !texto || !link) return;

      var juego = nombreJuego(progress.gameSlug);
      var modo = nombreModo(progress.modeSlug);
      texto.textContent = modo ? (juego + ' · ' + modo) : juego;
      link.href = progress.page;
      wrap.classList.remove('hidden');
      if (avisoVacio) avisoVacio.classList.add('hidden');
    }).catch(function() {
      window.location.href = 'auth.html?redirect=' + encodeURIComponent('mis-experiencias.html');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
