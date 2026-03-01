/**
 * Ritual — Juego Memoria nuestra
 */
(function() {
  function init() {
    if (window.RitualGameAccess === false) return;
    var datos = window.RitualDatos;
    if (!datos || !datos.memoria || !datos.memoria.length) {
      var fallback = document.getElementById('sin-datos');
      if (fallback) fallback.classList.remove('hidden');
      ['paso-1', 'paso-2', 'paso-3', 'paso-4'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });
      return;
    }

    var preguntas = window.RitualShuffle ? window.RitualShuffle(datos.memoria.slice()) : datos.memoria.slice();
    var index = 0;

    var paso1 = document.getElementById('paso-1');
    var paso2 = document.getElementById('paso-2');
    var paso3 = document.getElementById('paso-3');
    var paso4 = document.getElementById('paso-4');
    var preguntaTexto = document.getElementById('pregunta-texto');
    var preguntaTexto2 = document.getElementById('pregunta-texto-2');
    var preguntaRevelar = document.getElementById('pregunta-revelar');
    var textarea1 = document.getElementById('textarea-1');
    var textarea2 = document.getElementById('textarea-2');
    var respuesta1El = document.getElementById('respuesta-1');
    var respuesta2El = document.getElementById('respuesta-2');
    var btnListo1 = document.getElementById('btn-listo-1');
    var btnRevelar = document.getElementById('btn-revelar');
    var btnSiguiente = document.getElementById('btn-siguiente');

    function mostrarPregunta() {
      if (index >= preguntas.length) {
        if (paso1) paso1.classList.add('hidden');
        if (paso2) paso2.classList.add('hidden');
        if (paso3) paso3.classList.add('hidden');
        if (paso4) paso4.classList.remove('hidden');
        return;
      }
      var pregunta = preguntas[index];
      if (preguntaTexto) preguntaTexto.textContent = pregunta;
      if (preguntaTexto2) preguntaTexto2.textContent = pregunta;
      if (textarea1) textarea1.value = '';
      if (textarea2) textarea2.value = '';
      if (paso1) paso1.classList.remove('hidden');
      if (paso2) paso2.classList.add('hidden');
      if (paso3) paso3.classList.add('hidden');
      if (paso4) paso4.classList.add('hidden');
    }

    var respuesta1 = '';

    if (btnListo1) {
      btnListo1.addEventListener('click', function() {
        respuesta1 = textarea1 ? textarea1.value.trim() : '';
        if (preguntaTexto2) preguntaTexto2.textContent = preguntas[index];
        if (paso1) paso1.classList.add('hidden');
        if (paso2) paso2.classList.remove('hidden');
        if (textarea2) textarea2.value = '';
        setTimeout(function() { if (textarea2) textarea2.focus(); }, 100);
      });
    }

    if (btnRevelar) {
      btnRevelar.addEventListener('click', function() {
        var r2 = textarea2 ? textarea2.value.trim() : '';
        if (preguntaRevelar) preguntaRevelar.textContent = preguntas[index];
        if (respuesta1El) respuesta1El.textContent = respuesta1 || '—';
        if (respuesta2El) respuesta2El.textContent = r2 || '—';
        if (paso1) paso1.classList.add('hidden');
        if (paso2) paso2.classList.add('hidden');
        if (paso3) paso3.classList.remove('hidden');
      });
    }

    if (btnSiguiente) {
      btnSiguiente.addEventListener('click', function() {
        index++;
        mostrarPregunta();
      });
    }

    mostrarPregunta();
  }

  function run() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        document.addEventListener('ritual-game-access-granted', init, { once: true });
        if (window.RitualGameAccess === true) init();
      });
    } else {
      document.addEventListener('ritual-game-access-granted', init, { once: true });
      if (window.RitualGameAccess === true) init();
    }
  }
  run();
})();
