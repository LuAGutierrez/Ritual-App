/**
 * Ritual — App compartida (menú móvil).
 * El acceso a juegos lo decide solo el servidor (Edge Function check-game-access).
 */

(function() {
  window.Ritual = {};
  var PROGRESO_KEY = 'ritual_last_progress_v1';

  function saveProgress(data) {
    try {
      localStorage.setItem(PROGRESO_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function readProgress() {
    try {
      var raw = localStorage.getItem(PROGRESO_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.gameSlug || !parsed.page) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  window.RitualProgress = {
    setLast: function(data) {
      if (!data || !data.gameSlug || !data.page) return;
      saveProgress({
        gameSlug: data.gameSlug,
        page: data.page,
        modeSlug: data.modeSlug || '',
        index: typeof data.index === 'number' ? data.index : 0,
        updatedAt: Date.now(),
      });
    },
    getLast: function() {
      return readProgress();
    },
    clear: function() {
      try { localStorage.removeItem(PROGRESO_KEY); } catch (e) {}
    },
  };

  // Menú móvil: abrir/cerrar
  function initNavMobile() {
    var btnMenu = document.getElementById('btn-menu');
    var btnCerrar = document.getElementById('btn-cerrar');
    var navMobile = document.getElementById('nav-mobile');
    if (!navMobile) return;
    var lastFocused = null;

    function getFocusable() {
      return Array.prototype.slice.call(
        navMobile.querySelectorAll('a[href], button:not([disabled])')
      );
    }

    function openNav() {
      lastFocused = document.activeElement;
      navMobile.classList.remove('hidden');
      document.body.classList.add('nav-open');
      if (btnMenu) btnMenu.setAttribute('aria-label', 'Cerrar menú');
      var focusables = getFocusable();
      if (focusables.length) focusables[0].focus();
    }
    function closeNav() {
      navMobile.classList.add('hidden');
      document.body.classList.remove('nav-open');
      if (btnMenu) btnMenu.setAttribute('aria-label', 'Abrir menú');
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }
    function toggleNav() {
      if (navMobile.classList.contains('hidden')) openNav(); else closeNav();
    }

    if (btnMenu) btnMenu.addEventListener('click', toggleNav);
    if (btnCerrar) btnCerrar.addEventListener('click', closeNav);
    navMobile.querySelectorAll('.nav-link').forEach(function(link) {
      link.addEventListener('click', closeNav);
    });
    document.addEventListener('keydown', function(e) {
      if (navMobile.classList.contains('hidden')) return;
      if (e.key === 'Escape') {
        closeNav();
        return;
      }
      if (e.key !== 'Tab') return;
      var focusables = getFocusable();
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
    window.addEventListener('resize', function() {
      if (window.innerWidth >= 768) closeNav();
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavMobile);
  } else {
    initNavMobile();
  }
})();
