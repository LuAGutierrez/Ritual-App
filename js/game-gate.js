/**
 * Ritual — Gate de acceso a juegos.
 * Solo el servidor (Edge Function check-game-access) decide si puede jugar.
 * En localhost/127.0.0.1 se bypasea para desarrollo (sin login ni servidor).
 */
(function() {
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
      return window.RitualAuth.getSession();
    }).then(function(session) {
      if (!session) {
        var page = window.location.pathname.split('/').pop();
        if (!page || page === '') page = window.location.href;
        window.location.href = 'auth.html?redirect=' + encodeURIComponent(page);
        return;
      }
      return window.RitualAuth.checkGameAccess();
    }).then(function(result) {
      if (!result) return;
      if (result.allowed) {
        window.RitualGameAccess = true;
        showGame();
        document.dispatchEvent(new CustomEvent('ritual-game-access-granted'));
      } else {
        window.RitualGameAccess = false;
        showPaywall();
      }
    }).catch(function() {
      window.RitualGameAccess = false;
      showPaywall();
    });
  }

  function showPaywall() {
    var block = document.getElementById('paywall-block');
    var content = document.getElementById('game-content');
    if (block) block.classList.remove('hidden');
    if (content) content.classList.add('hidden');
  }

  function showGame() {
    var block = document.getElementById('paywall-block');
    var content = document.getElementById('game-content');
    if (block) block.classList.add('hidden');
    if (content) content.classList.remove('hidden');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runGate);
  } else {
    runGate();
  }
})();
