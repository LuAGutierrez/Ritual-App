/**
 * Ritual — Juego Memoria nuestra
 */
(function() {
  function init() {
    if (window.RitualGameAccess === false) return;
    var datos = window.RitualDatos;
    if (!datos || !datos.memoria || !datos.memoria.modo1 || !datos.memoria.modo2 || !datos.memoria.modo3) {
      var fallback = document.getElementById('sin-datos');
      if (fallback) fallback.classList.remove('hidden');
      ['paso-1', 'paso-2', 'paso-3', 'paso-4'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });
      return;
    }

    var selectorModo = document.getElementById('selector-modo');
    var modoActual = null;
    var preguntas = [];
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
    var respuesta1 = '';

    function hideAllSteps() {
      if (paso1) paso1.classList.add('hidden');
      if (paso2) paso2.classList.add('hidden');
      if (paso3) paso3.classList.add('hidden');
      if (paso4) paso4.classList.add('hidden');
    }

    function mostrarPregunta() {
      if (index >= preguntas.length) {
        hideAllSteps();
        if (paso4) paso4.classList.remove('hidden');
        return;
      }
      var pregunta = preguntas[index];
      if (preguntaTexto) preguntaTexto.textContent = pregunta;
      if (preguntaTexto2) preguntaTexto2.textContent = pregunta;
      if (textarea1) textarea1.value = '';
      if (textarea2) textarea2.value = '';
      respuesta1 = '';
      if (paso1) paso1.classList.remove('hidden');
      if (paso2) paso2.classList.add('hidden');
      if (paso3) paso3.classList.add('hidden');
      if (paso4) paso4.classList.add('hidden');
      if (window.RitualProgress) {
        window.RitualProgress.setLast({
          gameSlug: 'memoria',
          page: window.location.pathname.split('/').pop() || '',
          modeSlug: modoActual || '',
          index: index,
        });
      }
    }

    function empezarModo(modeSlug) {
      var lista = datos.memoria[modeSlug];
      if (!Array.isArray(lista) || !lista.length) return;
      modoActual = modeSlug;
      index = 0;
      preguntas = window.RitualShuffle ? window.RitualShuffle(lista.slice()) : lista.slice();
      if (selectorModo) selectorModo.classList.add('hidden');
      mostrarPregunta();
      if (textarea1) setTimeout(function() { textarea1.focus(); }, 60);
    }

    function tryStartMode(modeSlug) {
      if (!window.Ritual || typeof window.Ritual.canAccessMode !== 'function') {
        empezarModo(modeSlug);
        return;
      }
      window.Ritual.canAccessMode('memoria', modeSlug, function(ok) {
        if (!ok) return;
        empezarModo(modeSlug);
      });
    }

    if (selectorModo) {
      selectorModo.querySelectorAll('.mode-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          tryStartMode(this.getAttribute('data-mode'));
        });
      });
    }

    var last = window.RitualProgress ? window.RitualProgress.getLast() : null;
    var currentPage = window.location.pathname.split('/').pop() || '';
    if (last && last.page === currentPage && last.gameSlug === 'memoria' && last.modeSlug && datos.memoria[last.modeSlug]) {
      tryStartMode(last.modeSlug);
    }

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
        if (!modoActual) return;
        index++;
        mostrarPregunta();
      });
    }
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
