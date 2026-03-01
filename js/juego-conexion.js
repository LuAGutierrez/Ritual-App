/**
 * Ritual — Juego Conexión profunda (usa juego-niveles.js).
 */
(function() {
  function init() {
    window.Ritual.initJuegoNiveles({
      dataKey: 'conexion',
      labels: { suave: 'Suave', profundo: 'Profundo', vulnerable: 'Vulnerable' },
      nivelDefault: 'suave',
      zonaContenidoId: 'zona-pregunta',
      textoContenidoId: 'texto-pregunta',
      itemLabel: 'preguntas',
      maxPorRonda: 10,
    });
  }
  document.addEventListener('ritual-game-access-granted', init);
})();
