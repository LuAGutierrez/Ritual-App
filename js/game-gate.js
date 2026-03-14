/**
 * Ritual — Gate de acceso a juegos.
 * Solo el servidor (Edge Function check-game-access) decide si puede jugar.
 * En localhost/127.0.0.1 se bypasea para desarrollo (sin login ni servidor).
 */
(function() {
  window.Ritual = window.Ritual || {};

  function isLocalhost() {
    var h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1';
  }

  function runGate() {
    window.RitualGameAccess = false;
    if (isLocalhost()) {
      window.RitualGameAccess = true;
      showGame();
      document.dispatchEvent(new CustomEvent('ritual-game-access-granted'));
      if (window.RitualAuth) window.RitualAuth.init();
      return;
    }
    if (!window.RitualAuth) {
      showPaywall();
      return;
    }
    window.RitualAuth.init().then(function() {
      return window.RitualAuth.getSessionValidated();
    }).then(function(session) {
      if (!session) {
        var page = window.location.pathname.split('/').pop();
        if (!page || page === '') page = window.location.href;
        window.location.href = 'auth.html?redirect=' + encodeURIComponent(page);
        return;
      }
      // Mostrar juego en cuanto hay sesión; el servidor valida email/sesión en paralelo.
      window.RitualGameAccess = true;
      window.RitualShowPaywall = showPaywall;
      showGame();
      document.dispatchEvent(new CustomEvent('ritual-game-access-granted'));
      window.RitualAuth.checkGameAccess().then(function(result) {
        if (!result) return;
        if (!result.allowed) {
          window.RitualGameAccess = false;
          showPaywall(result);
        }
      }).catch(function() {
        window.RitualGameAccess = false;
        showPaywall();
      });
    }).catch(function() {
      window.RitualGameAccess = false;
      showPaywall();
    });
  }

  function showPaywall(result) {
    var block = document.getElementById('paywall-block');
    var content = document.getElementById('game-content');
    var desc = document.getElementById('paywall-block-desc');
    if (block) block.classList.remove('hidden');
    if (content) content.classList.add('hidden');
    if (desc) {
      desc.textContent = result && result.needsEmailConfirmation
        ? 'Confirmá tu correo para acceder. Revisá el email que te enviamos al registrarte.'
        : 'Para desbloquear modos avanzados necesitás una suscripción activa. Suscribite y accedé a todas las experiencias.';
    }
  }

  function showGame() {
    var block = document.getElementById('paywall-block');
    var content = document.getElementById('game-content');
    if (block) block.classList.add('hidden');
    if (content) content.classList.remove('hidden');
  }

  function canAccessMode(gameSlug, modeSlug, cb) {
    if (isLocalhost()) {
      cb(true);
      return;
    }
    if (!window.RitualAuth) {
      cb(false);
      return;
    }
    window.RitualAuth.checkGameAccess({ gameSlug: gameSlug, modeSlug: modeSlug }).then(function(r) {
      if (r && r.allowed) {
        window.RitualGameAccess = true;
        showGame();
      } else {
        window.RitualGameAccess = false;
        showPaywall(r);
      }
      cb(!!r && !!r.allowed);
    }).catch(function() {
      window.RitualGameAccess = false;
      showPaywall();
      cb(false);
    });
  }
  window.Ritual.canAccessMode = canAccessMode;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runGate);
  } else {
    runGate();
  }
})();
