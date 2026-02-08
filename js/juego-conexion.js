/**
 * Ritual — Juego Conexión profunda
 * Una ronda = todas las preguntas del nivel, en orden barajado. Tras la última, pantalla de cierre.
 */
(function() {
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function init() {
    if (window.RitualGameAccess === false) return;
    if (!window.RitualDatos || !window.RitualDatos.conexion) return;

    var datos = window.RitualDatos.conexion;
    var labels = { suave: 'Suave', profundo: 'Profundo', vulnerable: 'Vulnerable' };
    var nivelActual = 'suave';
    var listaBarajada = [];
    var indiceActual = 0;

    var selectorNivel = document.getElementById('selector-nivel');
    var zonaPregunta = document.getElementById('zona-pregunta');
    var zonaRondaCompletada = document.getElementById('zona-ronda-completada');
    var etiquetaNivel = document.getElementById('etiqueta-nivel');
    var textoPregunta = document.getElementById('texto-pregunta');
    var textoRondaCompletada = document.getElementById('texto-ronda-completada');
    var btnAnterior = document.getElementById('btn-anterior');
    var btnSiguiente = document.getElementById('btn-siguiente');
    var btnOtraRonda = document.getElementById('btn-otra-ronda');
    var btnCambiarNivel = document.getElementById('btn-cambiar-nivel');

    if (!selectorNivel || !zonaPregunta) return;

    function mostrarPregunta() {
      if (!listaBarajada.length) return;
      if (etiquetaNivel) etiquetaNivel.textContent = labels[nivelActual];
      if (textoPregunta) textoPregunta.textContent = listaBarajada[indiceActual];
      selectorNivel.classList.add('hidden');
      zonaPregunta.classList.remove('hidden');
      if (zonaRondaCompletada) zonaRondaCompletada.classList.add('hidden');
    }

    function iniciarRonda() {
      var list = datos[nivelActual];
      if (!list || !list.length) return;
      listaBarajada = shuffle(list.slice());
      indiceActual = 0;
      mostrarPregunta();
    }

    function mostrarRondaCompletada() {
      var n = listaBarajada.length;
      var nombreNivel = labels[nivelActual];
      zonaPregunta.classList.add('hidden');
      if (zonaRondaCompletada) zonaRondaCompletada.classList.remove('hidden');
      if (textoRondaCompletada) textoRondaCompletada.textContent = 'Completaste las ' + n + ' preguntas de ' + nombreNivel + '. ¿Otra ronda?';
    }

    function siguiente() {
      if (indiceActual + 1 >= listaBarajada.length) {
        mostrarRondaCompletada();
      } else {
        indiceActual++;
        mostrarPregunta();
      }
    }

    function anterior() {
      if (indiceActual > 0) {
        indiceActual--;
        mostrarPregunta();
      }
    }

    selectorNivel.querySelectorAll('.nivel-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        nivelActual = this.getAttribute('data-nivel');
        iniciarRonda();
      });
    });

    if (btnSiguiente) btnSiguiente.addEventListener('click', siguiente);
    if (btnAnterior) btnAnterior.addEventListener('click', anterior);

    if (btnOtraRonda) btnOtraRonda.addEventListener('click', iniciarRonda);

    if (btnCambiarNivel) btnCambiarNivel.addEventListener('click', function() {
      if (zonaRondaCompletada) zonaRondaCompletada.classList.add('hidden');
      selectorNivel.classList.remove('hidden');
      zonaPregunta.classList.add('hidden');
      listaBarajada = [];
    });

    document.addEventListener('keydown', function(e) {
      if (!zonaPregunta.classList.contains('hidden')) {
        if (e.key === 'ArrowRight') siguiente();
        if (e.key === 'ArrowLeft') anterior();
      }
    });
  }
  document.addEventListener('ritual-game-access-granted', init);
})();
