/**
 * Ritual — Gate de acceso a juegos.
 * Solo el servidor (Edge Function check-game-access) decide si puede jugar.
 * En localhost/127.0.0.1 se bypasea para desarrollo (sin login ni servidor).
 */
(function() {
  window.Ritual = window.Ritual || {};
  var SUB_CACHE_KEY = 'ritual_subscription_cache_v1';
  var SUB_CACHE_TTL_MS = 2 * 60 * 1000;

  function readSubscriptionCache(userId) {
    try {
      var raw = sessionStorage.getItem(SUB_CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.userId !== userId) return null;
      if (typeof parsed.fetchedAt !== 'number') return null;
      if (Date.now() - parsed.fetchedAt > SUB_CACHE_TTL_MS) return null;
      if (typeof parsed.active !== 'boolean') return null;
      return parsed.active;
    } catch (e) {
      return null;
    }
  }

  function writeSubscriptionCache(userId, active) {
    try {
      sessionStorage.setItem(SUB_CACHE_KEY, JSON.stringify({
        userId: userId,
        active: !!active,
        fetchedAt: Date.now()
      }));
    } catch (e) {}
  }

  /** Estado “desbloqueado”: oculta candados visuales para usuarios con suscripción activa. */
  function applyPremiumSelectorUnlock() {
    document.querySelectorAll('[data-premium="1"]').forEach(function(btn) {
      btn.classList.remove('text-nude-muted', 'border-wine/30', 'hover:border-wine/60', 'flex', 'items-center', 'gap-2');
      btn.classList.add('text-nude', 'border-nude-muted/40', 'hover:border-nude');
      btn.querySelectorAll('.ritual-lock-icon').forEach(function(span) {
        span.classList.add('hidden');
      });
    });
    document.querySelectorAll('.ritual-premium-hint').forEach(function(el) {
      el.classList.add('hidden');
    });
  }

  /** Estado “bloqueado”: vuelve a mostrar candados visuales para usuarios sin suscripción activa. */
  function applyPremiumSelectorLock() {
    document.querySelectorAll('[data-premium="1"]').forEach(function(btn) {
      btn.classList.add('text-nude-muted', 'border-wine/30', 'hover:border-wine/60', 'flex', 'items-center', 'gap-2');
      btn.classList.remove('text-nude', 'border-nude-muted/40', 'hover:border-nude');
      btn.querySelectorAll('.ritual-lock-icon').forEach(function(span) {
        span.classList.remove('hidden');
      });
    });
    document.querySelectorAll('.ritual-premium-hint').forEach(function(el) {
      el.classList.remove('hidden');
    });
  }

  function applyPremiumSelectorsFromCache(userId) {
    var cached = readSubscriptionCache(userId);
    if (cached === null) return false;
    if (cached) applyPremiumSelectorUnlock();
    else applyPremiumSelectorLock();
    return true;
  }

  function refreshPremiumSelectors(userId) {
    if (!window.RitualAuth || typeof window.RitualAuth.getSubscriptionStatus !== 'function') return;
    window.RitualAuth.getSubscriptionStatus().then(function(active) {
      writeSubscriptionCache(userId, active);
      if (active) applyPremiumSelectorUnlock();
      else applyPremiumSelectorLock();
    }).catch(function() {});
  }

  function isLocalhost() {
    var h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1';
  }

  function runGate() {
    setBusy(true);
    window.RitualGameAccess = false;
    if (isLocalhost()) {
      window.RitualGameAccess = true;
      showGame();
      document.dispatchEvent(new CustomEvent('ritual-game-access-granted'));
      if (window.RitualAuth) {
        window.RitualAuth.init().then(function() {
          window.RitualAuth.getSessionValidated().then(function(session) {
            if (session && session.user && session.user.id) {
              if (!applyPremiumSelectorsFromCache(session.user.id)) {
                refreshPremiumSelectors(session.user.id);
              }
            }
          }).catch(function() {});
        });
      }
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
      applyPremiumSelectorsFromCache(session.user.id);
      showGame();
      document.dispatchEvent(new CustomEvent('ritual-game-access-granted'));
      window.RitualAuth.checkGameAccess().then(function(result) {
        if (!result) return;
        if (!result.allowed) {
          window.RitualGameAccess = false;
          showPaywall(result);
        } else {
          refreshPremiumSelectors(session.user.id);
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
    setBusy(false);
  }

  function showGame() {
    var block = document.getElementById('paywall-block');
    var content = document.getElementById('game-content');
    if (block) block.classList.add('hidden');
    if (content) content.classList.remove('hidden');
    setBusy(false);
  }

  function setBusy(isBusy) {
    if (document.body) document.body.setAttribute('aria-busy', isBusy ? 'true' : 'false');
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
        window.RitualAuth.getSessionValidated().then(function(session) {
          if (session && session.user && session.user.id) {
            refreshPremiumSelectors(session.user.id);
          }
        }).catch(function() {});
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
