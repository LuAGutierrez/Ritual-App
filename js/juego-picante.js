/**
 * Ritual — Juego Picante progresivo (usa juego-niveles.js).
 */
(function() {
  function init() {
    window.Ritual.initJuegoNiveles({
      dataKey: 'picante',
      labels: { nivel1: 'Nivel 1', nivel2: 'Nivel 2', nivel3: 'Nivel 3' },
      nivelDefault: 'nivel1',
      zonaContenidoId: 'zona-reto',
      textoContenidoId: 'texto-reto',
      itemLabel: 'retos',
      maxPorRonda: 10,
    });
  }
  document.addEventListener('ritual-game-access-granted', init);
})();
