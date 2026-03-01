/**
 * Ritual — App compartida (menú móvil).
 * El acceso a juegos lo decide solo el servidor (Edge Function check-game-access).
 */

(function() {
  window.Ritual = {};

  // Menú móvil: abrir/cerrar
  function initNavMobile() {
    var btnMenu = document.getElementById('btn-menu');
    var btnCerrar = document.getElementById('btn-cerrar');
    var navMobile = document.getElementById('nav-mobile');
    if (!navMobile) return;

    function openNav() {
      navMobile.classList.remove('hidden');
      document.body.classList.add('nav-open');
      if (btnMenu) btnMenu.setAttribute('aria-label', 'Cerrar menú');
    }
    function closeNav() {
      navMobile.classList.add('hidden');
      document.body.classList.remove('nav-open');
      if (btnMenu) btnMenu.setAttribute('aria-label', 'Abrir menú');
    }
    function toggleNav() {
      if (navMobile.classList.contains('hidden')) openNav(); else closeNav();
    }

    if (btnMenu) btnMenu.addEventListener('click', toggleNav);
    if (btnCerrar) btnCerrar.addEventListener('click', closeNav);
    navMobile.querySelectorAll('.nav-link').forEach(function(link) {
      link.addEventListener('click', closeNav);
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
