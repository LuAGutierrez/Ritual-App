/**
 * Ritual — Juego Picante progresivo
 * Una ronda = todos los retos del nivel, en orden barajado. Tras el último, pantalla de cierre.
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
    if (!window.RitualDatos || !window.RitualDatos.picante) return;

    var datos = window.RitualDatos.picante;
    var labels = { nivel1: 'Nivel 1', nivel2: 'Nivel 2', nivel3: 'Nivel 3' };
    var nivelActual = 'nivel1';
    var listaBarajada = [];
    var indiceActual = 0;
    var primeraRondaCompletada = false;

    var selectorNivel = document.getElementById('selector-nivel');
    var zonaReto = document.getElementById('zona-reto');
    var zonaRondaCompletada = document.getElementById('zona-ronda-completada');
    var etiquetaNivel = document.getElementById('etiqueta-nivel');
    var textoReto = document.getElementById('texto-reto');
    var textoRondaCompletada = document.getElementById('texto-ronda-completada');
    var btnAnterior = document.getElementById('btn-anterior');
    var btnSiguiente = document.getElementById('btn-siguiente');
    var btnOtraRonda = document.getElementById('btn-otra-ronda');
    var btnCambiarNivel = document.getElementById('btn-cambiar-nivel');

    if (!selectorNivel || !zonaReto) return;

    function mostrarReto() {
      if (!listaBarajada.length) return;
      if (etiquetaNivel) etiquetaNivel.textContent = labels[nivelActual];
      if (textoReto) textoReto.textContent = listaBarajada[indiceActual];
      selectorNivel.classList.add('hidden');
      zonaReto.classList.remove('hidden');
      if (zonaRondaCompletada) zonaRondaCompletada.classList.add('hidden');
    }

    function iniciarRonda() {
      var list = datos[nivelActual];
      if (!list || !list.length) return;
      listaBarajada = shuffle(list.slice());
      indiceActual = 0;
      mostrarReto();
    }

    function mostrarRondaCompletada() {
      primeraRondaCompletada = true;
      var n = listaBarajada.length;
      var nombreNivel = labels[nivelActual];
      zonaReto.classList.add('hidden');
      if (zonaRondaCompletada) zonaRondaCompletada.classList.remove('hidden');
      if (textoRondaCompletada) textoRondaCompletada.textContent = 'Completaste los ' + n + ' retos de ' + nombreNivel + '. ¿Otra ronda?';
    }

    function puedeNuevaRonda(cb) {
      if (!primeraRondaCompletada) { cb(true); return; }
      if (!window.RitualAuth) { cb(false); return; }
      window.RitualAuth.checkGameAccess().then(function(r) {
        cb(!!r && !!r.allowed);
      }).catch(function() { cb(false); });
    }

    function siguiente() {
      if (indiceActual + 1 >= listaBarajada.length) {
        mostrarRondaCompletada();
      } else {
        indiceActual++;
        mostrarReto();
      }
    }

    function anterior() {
      if (indiceActual > 0) {
        indiceActual--;
        mostrarReto();
      }
    }

    selectorNivel.querySelectorAll('.nivel-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        nivelActual = this.getAttribute('data-nivel');
        puedeNuevaRonda(function(ok) {
          if (!ok && window.RitualShowPaywall) window.RitualShowPaywall();
          else iniciarRonda();
        });
      });
    });

    if (btnSiguiente) btnSiguiente.addEventListener('click', siguiente);
    if (btnAnterior) btnAnterior.addEventListener('click', anterior);

    if (btnOtraRonda) btnOtraRonda.addEventListener('click', function() {
      puedeNuevaRonda(function(ok) {
        if (!ok && window.RitualShowPaywall) window.RitualShowPaywall();
        else iniciarRonda();
      });
    });

    if (btnCambiarNivel) btnCambiarNivel.addEventListener('click', function() {
      if (zonaRondaCompletada) zonaRondaCompletada.classList.add('hidden');
      selectorNivel.classList.remove('hidden');
      zonaReto.classList.add('hidden');
      listaBarajada = [];
    });

    document.addEventListener('keydown', function(e) {
      if (!zonaReto.classList.contains('hidden')) {
        if (e.key === 'ArrowRight') siguiente();
        if (e.key === 'ArrowLeft') anterior();
      }
    });
  }
  document.addEventListener('ritual-game-access-granted', init);
})();
