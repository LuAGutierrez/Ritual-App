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
      if (window.RitualAuth) {
        window.RitualAuth.init().then(function() {
          return window.RitualAuth.getSession();
        }).then(function(session) {
          if (!session) return { session: false };
          return window.RitualAuth.getTrialUsed().then(function(trialUsed) {
            return { session: true, trialUsed: trialUsed };
          });
        }).then(function(state) {
          if (!state.session) return;
          if (state.trialUsed && btnPrueba) {
            btnPrueba.removeAttribute('href');
            btnPrueba.textContent = 'Ya usaste tu prueba';
            btnPrueba.classList.add('opacity-60', 'cursor-not-allowed');
            btnPrueba.classList.remove('hover:border-nude');
            btnPrueba.style.pointerEvents = 'none';
          } else {
            if (btnPrueba) btnPrueba.href = 'elegir-juego.html';
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
          if (typeof console !== 'undefined' && console.log) console.log('[Ritual] Llamando a create-mp-subscription...');
          return window.RitualAuth.createMpSubscription();
        }).then(function(result) {
          if (typeof console !== 'undefined' && console.log) console.log('[Ritual] Respuesta pago:', result);
          if (!result) return;
          btnSuscripcion.disabled = false;
          btnSuscripcion.textContent = 'Suscribirme';
          if (result.init_point) {
            window.open(result.init_point, '_blank');
          } else {
            var msg = result.error === 'mp_not_configured'
              ? 'Mercado Pago no está configurado aún.'
              : result.error === 'no_init_point'
                ? 'Mercado Pago no devolvió el enlace de pago. Revisá que la cuenta y el plan estén correctos para suscripciones.'
                : result.error === 'invalid_session' || result.error === 'missing_auth'
                  ? 'La sesión expiró. Volvé a entrar y probá de nuevo.'
                  : (result.error && result.error.indexOf('Failed to send') >= 0)
                    ? 'No se pudo conectar con el servidor de pago. Revisá: 1) Que la función create-mp-subscription esté desplegada en Supabase. 2) Que abras la web desde un servidor (no desde archivo local). 3) Que el proyecto Supabase no esté pausado.'
                    : result.details
                      ? 'No se pudo abrir el pago: ' + (typeof result.details === 'string' ? result.details : (result.details.message || result.details.error || result.error))
                      : 'No se pudo abrir el pago. Intentá de nuevo. (' + (result.error || 'error') + ')';
            alert(msg);
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
    if (btnRegalo) {
      var modalRegalo = document.getElementById('modal-regalo');
      var formRegalo = document.getElementById('form-regalo');
      var regaloEmail = document.getElementById('regalo-email');
      var regaloError = document.getElementById('regalo-error');
      var btnRegaloCerrar = document.getElementById('btn-regalo-cerrar');
      var btnRegaloPagar = document.getElementById('btn-regalo-pagar');
      btnRegalo.addEventListener('click', function() {
        if (modalRegalo) {
          modalRegalo.classList.remove('hidden');
          if (regaloEmail) regaloEmail.value = '';
          if (regaloError) { regaloError.classList.add('hidden'); regaloError.textContent = ''; }
        }
      });
      if (btnRegaloCerrar && modalRegalo) btnRegaloCerrar.addEventListener('click', function() { modalRegalo.classList.add('hidden'); });
      if (formRegalo && window.RitualAuth) {
        formRegalo.addEventListener('submit', function(e) {
          e.preventDefault();
          var email = regaloEmail ? regaloEmail.value.trim() : '';
          if (!email) return;
          if (regaloError) { regaloError.classList.add('hidden'); regaloError.textContent = ''; }
          if (btnRegaloPagar) { btnRegaloPagar.disabled = true; btnRegaloPagar.textContent = 'Un momento…'; }
          window.RitualAuth.createMpGift(email).then(function(result) {
            if (btnRegaloPagar) { btnRegaloPagar.disabled = false; btnRegaloPagar.textContent = 'Pagar y generar enlace'; }
            if (result.init_point) {
              window.open(result.init_point, '_blank');
              return;
            }
            if (regaloError) {
              regaloError.textContent = result.error === 'invalid_recipient_email' ? 'Email no válido.' : result.error === 'mp_not_configured' ? 'Mercado Pago no está configurado.' : 'No se pudo crear el pago. Intentá de nuevo.';
              regaloError.classList.remove('hidden');
            }
          });
        });
      }
    }

    // Vuelta de MP tras pagar un regalo: ?mp=gift&token=XXX
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mp') === 'gift' && urlParams.get('token')) {
      var giftToken = urlParams.get('token');
      var giftResult = document.getElementById('gift-result');
      var giftResultMsg = document.getElementById('gift-result-msg');
      var giftResultLinkWrap = document.getElementById('gift-result-link-wrap');
      var giftResultLink = document.getElementById('gift-result-link');
      var giftResultCopy = document.getElementById('gift-result-copy');
      if (giftResult && giftResultMsg) {
        giftResult.classList.remove('hidden');
        giftResult.scrollIntoView({ behavior: 'smooth' });
        if (urlParams.get('failed') === '1') {
          giftResultMsg.textContent = 'El pago no se completó. Podés intentar de nuevo desde "Regalar Ritual".';
        } else {
          function pollGift() {
            if (!window.RitualAuth) return;
            window.RitualAuth.getGiftStatus(giftToken).then(function(data) {
              if (data.status === 'paid' && data.activar_link) {
                giftResultMsg.textContent = 'Listo. Enviá este enlace a quien recibe el regalo:';
                if (giftResultLinkWrap) giftResultLinkWrap.classList.remove('hidden');
                if (giftResultLink) { giftResultLink.href = data.activar_link; giftResultLink.textContent = data.activar_link; }
                if (giftResultCopy) {
                  giftResultCopy.onclick = function() {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(data.activar_link);
                      giftResultCopy.textContent = 'Copiado';
                    }
                  };
                }
                return;
              }
              if (data.status === 'claimed') {
                giftResultMsg.textContent = 'Este regalo ya fue activado.';
                return;
              }
              setTimeout(pollGift, 2500);
            });
          }
          pollGift();
        }
      }
    }

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
