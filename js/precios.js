/**
 * Ritual — Página de precios
 */
(function() {
  function init() {
    var btnLogout = document.getElementById('nav-btn-logout');
    var btnLogoutMobile = document.getElementById('nav-btn-logout-mobile');
    var btnPrueba = document.getElementById('btn-prueba');
    var btnSuscripcion = document.getElementById('btn-suscripcion');
    var btnRegalo = document.getElementById('btn-regalo');
    var paywallMsg = document.getElementById('paywall-msg');

    if (btnLogout) btnLogout.addEventListener('click', function() {
      if (window.RitualAuth) window.RitualAuth.signOut();
    });
    if (btnLogoutMobile) btnLogoutMobile.addEventListener('click', function() {
      if (window.RitualAuth) window.RitualAuth.signOut();
    });

    function showPaywallMsg() {
      if (paywallMsg) {
        paywallMsg.classList.remove('hidden');
        paywallMsg.scrollIntoView({ behavior: 'smooth' });
      }
    }

    if (btnPrueba) {
      btnPrueba.addEventListener('click', function() {
        if (this.disabled) return;
        if (confirm('¿Ir a probar una experiencia gratis? Te llevamos a elegir.')) {
          window.location.href = 'index.html#que-incluye';
        }
      });
      // Si está logueado y ya usó la prueba, mostrar botón apagado
      if (window.RitualAuth) {
        window.RitualAuth.init().then(function() {
          return window.RitualAuth.getSession();
        }).then(function(session) {
          if (!session) return false;
          return window.RitualAuth.getTrialUsed();
        }).then(function(trialUsed) {
          if (trialUsed && btnPrueba) {
            btnPrueba.disabled = true;
            btnPrueba.textContent = 'Ya usaste tu prueba';
            btnPrueba.classList.add('opacity-60', 'cursor-not-allowed');
            btnPrueba.classList.remove('hover:border-nude');
          }
        }).catch(function() {});
      }
    }
    if (btnSuscripcion) {
      btnSuscripcion.addEventListener('click', function() {
        if (!window.RitualAuth) {
          showPaywallMsg();
          return;
        }
        window.RitualAuth.init().then(function() {
          return window.RitualAuth.getSession();
        }).then(function(session) {
          if (!session) {
            window.location.href = 'auth.html?redirect=' + encodeURIComponent('precios.html#empezar');
            return;
          }
          btnSuscripcion.disabled = true;
          btnSuscripcion.textContent = 'Un momento…';
          return window.RitualAuth.createMpSubscription();
        }).then(function(result) {
          if (!result) return;
          btnSuscripcion.disabled = false;
          btnSuscripcion.textContent = 'Suscribirme';
          if (result.init_point) {
            window.location.href = result.init_point;
          } else {
            alert(result.error === 'mp_not_configured' ? 'Mercado Pago no está configurado aún.' : 'No se pudo abrir el pago. Intentá de nuevo.');
          }
        }).catch(function() {
          if (btnSuscripcion) {
            btnSuscripcion.disabled = false;
            btnSuscripcion.textContent = 'Suscribirme';
          }
          showPaywallMsg();
        });
      });
    }
    if (btnRegalo) btnRegalo.addEventListener('click', showPaywallMsg);

    // Mensaje de vuelta de Mercado Pago
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mp') === 'success' && paywallMsg) {
      paywallMsg.classList.remove('hidden');
      paywallMsg.innerHTML = '<p class="text-nude mb-4">Gracias. Cuando el pago se acredite tendrás acceso a las tres experiencias.</p><p class="text-nude-muted text-sm mb-4">Si ya pagaste, entrá a:</p><p class="flex flex-wrap gap-3 justify-center"><a href="juego-conexion.html" class="text-wine-light underline text-sm">Conexión profunda</a><a href="juego-picante.html" class="text-wine-light underline text-sm">Picante progresivo</a><a href="juego-eleccion.html" class="text-wine-light underline text-sm">Elección mutua</a></p>';
      paywallMsg.scrollIntoView({ behavior: 'smooth' });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
