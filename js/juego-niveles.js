/**
 * Ritual — Juego por niveles (preguntas o retos barajados por ronda).
 * Usado por Conexión profunda y Picante progresivo.
 * Opciones: dataKey, labels, nivelDefault, zonaContenidoId, textoContenidoId, itemLabel ('preguntas'|'retos'), maxPorRonda (opcional; si se pasa, se baraja la lista y se usan solo N por ronda).
 */
(function() {
  function init(opts) {
    if (window.RitualGameAccess === false) return;
    var dataKey = opts.dataKey;
    var progressGameSlug = opts.progressGameSlug || dataKey;
    var maxPorRonda = opts.maxPorRonda;
    if (!window.RitualDatos || !window.RitualDatos[dataKey]) {
      var fallback = document.getElementById('sin-datos');
      if (fallback) fallback.classList.remove('hidden');
      var sel = document.getElementById('selector-nivel');
      if (sel) sel.classList.add('hidden');
      return;
    }

    var datos = window.RitualDatos[dataKey];
    var labels = opts.labels;
    var nivelActual = opts.nivelDefault;
    var listaBarajada = [];
    var indiceActual = 0;
    var zonaContenidoId = opts.zonaContenidoId;
    var textoContenidoId = opts.textoContenidoId;
    var itemLabel = opts.itemLabel || 'preguntas';

    var selectorNivel = document.getElementById('selector-nivel');
    var zonaContenido = document.getElementById(zonaContenidoId);
    var zonaRondaCompletada = document.getElementById('zona-ronda-completada');
    var etiquetaNivel = document.getElementById('etiqueta-nivel');
    var textoContenido = document.getElementById(textoContenidoId);
    var textoRondaCompletada = document.getElementById('texto-ronda-completada');
    var btnAnterior = document.getElementById('btn-anterior');
    var btnSiguiente = document.getElementById('btn-siguiente');
    var btnOtraRonda = document.getElementById('btn-otra-ronda');
    var btnCambiarNivel = document.getElementById('btn-cambiar-nivel');

    if (!selectorNivel || !zonaContenido) return;

    function actualizarBotonAnterior() {
      if (btnAnterior) {
        if (indiceActual === 0) {
          btnAnterior.classList.add('hidden');
        } else {
          btnAnterior.classList.remove('hidden');
        }
      }
    }

    function mostrarItem() {
      if (!listaBarajada.length) return;
      if (etiquetaNivel) etiquetaNivel.textContent = labels[nivelActual];
      if (textoContenido) textoContenido.textContent = listaBarajada[indiceActual];
      selectorNivel.classList.add('hidden');
      zonaContenido.classList.remove('hidden');
      if (zonaRondaCompletada) zonaRondaCompletada.classList.add('hidden');
      actualizarBotonAnterior();
      if (window.RitualProgress) {
        window.RitualProgress.setLast({
          gameSlug: progressGameSlug,
          page: window.location.pathname.split('/').pop() || '',
          modeSlug: nivelActual,
          index: indiceActual,
        });
      }
    }

    function iniciarRonda(startIndex) {
      var list = datos[nivelActual];
      if (!list || !list.length) return;
      var barajada = window.RitualShuffle(list.slice());
      var tope = (maxPorRonda != null && maxPorRonda > 0) ? Math.min(maxPorRonda, barajada.length) : barajada.length;
      listaBarajada = barajada.slice(0, tope);
      indiceActual = (typeof startIndex === 'number' && startIndex >= 0)
        ? Math.min(startIndex, Math.max(listaBarajada.length - 1, 0))
        : 0;
      mostrarItem();
    }

    function mostrarRondaCompletada() {
      var n = listaBarajada.length;
      var nombreNivel = labels[nivelActual];
      zonaContenido.classList.add('hidden');
      if (zonaRondaCompletada) zonaRondaCompletada.classList.remove('hidden');
      if (textoRondaCompletada) {
        var texto = itemLabel === 'retos'
          ? 'Completaste los ' + n + ' retos de ' + nombreNivel + '. ¿Otra ronda?'
          : 'Completaste las ' + n + ' preguntas de ' + nombreNivel + '. ¿Otra ronda?';
        textoRondaCompletada.textContent = texto;
      }
    }

    function siguiente() {
      if (indiceActual + 1 >= listaBarajada.length) {
        mostrarRondaCompletada();
      } else {
        indiceActual++;
        mostrarItem();
      }
    }

    function anterior() {
      if (indiceActual > 0) {
        indiceActual--;
        mostrarItem();
      }
    }

    function iniciarNivelConAcceso(nivel, startIndex) {
      if (!window.Ritual || typeof window.Ritual.canAccessMode !== 'function') {
        nivelActual = nivel;
        iniciarRonda(startIndex);
        return;
      }
      window.Ritual.canAccessMode(dataKey, nivel, function(ok) {
        if (!ok) return;
        nivelActual = nivel;
        iniciarRonda(startIndex);
      });
    }

    selectorNivel.querySelectorAll('.nivel-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var nivel = this.getAttribute('data-nivel');
        iniciarNivelConAcceso(nivel);
      });
    });

    var last = window.RitualProgress ? window.RitualProgress.getLast() : null;
    var currentPage = window.location.pathname.split('/').pop() || '';
    if (last && last.page === currentPage && last.gameSlug === progressGameSlug && last.modeSlug && datos[last.modeSlug]) {
      iniciarNivelConAcceso(last.modeSlug, last.index || 0);
    }

    if (btnSiguiente) btnSiguiente.addEventListener('click', siguiente);
    if (btnAnterior) btnAnterior.addEventListener('click', anterior);

    if (btnOtraRonda) btnOtraRonda.addEventListener('click', function() {
      iniciarRonda();
    });

    if (btnCambiarNivel) btnCambiarNivel.addEventListener('click', function() {
      if (zonaRondaCompletada) zonaRondaCompletada.classList.add('hidden');
      selectorNivel.classList.remove('hidden');
      zonaContenido.classList.add('hidden');
      listaBarajada = [];
    });

    document.addEventListener('keydown', function(e) {
      if (!zonaContenido.classList.contains('hidden')) {
        if (e.key === 'ArrowRight') siguiente();
        if (e.key === 'ArrowLeft') anterior();
      }
    });
  }

  window.Ritual = window.Ritual || {};
  window.Ritual.initJuegoNiveles = init;
})();
