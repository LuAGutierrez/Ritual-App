/**
 * Ritual — Juego Elección mutua
 */
(function() {
  function init() {
    if (window.RitualGameAccess === false) return;
    if (!window.RitualDatos || !window.RitualDatos.eleccion) return;

    var opciones = window.RitualDatos.eleccion.opcionesA;
    var premios = window.RitualDatos.eleccion.premios;
    var eleccion1 = null, eleccion2 = null;
    var primeraRondaCompletada = false;

    var paso1 = document.getElementById('paso-1');
    var paso2 = document.getElementById('paso-2');
    var paso3 = document.getElementById('paso-3');
    var opciones1 = document.getElementById('opciones-1');
    var opciones2 = document.getElementById('opciones-2');
    var btnListo1 = document.getElementById('btn-listo-1');
    var btnRevelar = document.getElementById('btn-revelar');
    var eleccion1Span = document.getElementById('eleccion-1');
    var eleccion2Span = document.getElementById('eleccion-2');
    var resultadoCoinciden = document.getElementById('resultado-coinciden');
    var resultadoNoCoinciden = document.getElementById('resultado-no-coinciden');
    var textoPremio = document.getElementById('texto-premio');
    var btnOtra = document.getElementById('btn-otra');

    if (!opciones1 || !opciones2) return;

    function renderOpciones(container) {
      container.innerHTML = '';
      opciones.forEach(function(texto, i) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'touch-target rounded-xl border border-nude-muted/40 px-4 py-4 min-h-[48px] text-left text-sm text-nude hover:border-nude transition active:bg-white/5';
        btn.textContent = texto;
        btn.dataset.index = i;
        container.appendChild(btn);
      });
    }

    renderOpciones(opciones1);
    renderOpciones(opciones2);

    opciones1.querySelectorAll('button').forEach(function(btn) {
      btn.addEventListener('click', function() {
        opciones1.querySelectorAll('button').forEach(function(b) { b.classList.remove('border-wine', 'bg-wine-dark/30'); });
        this.classList.add('border-wine', 'bg-wine-dark/30');
        eleccion1 = parseInt(this.dataset.index, 10);
        if (btnListo1) btnListo1.classList.remove('hidden');
      });
    });

    opciones2.querySelectorAll('button').forEach(function(btn) {
      btn.addEventListener('click', function() {
        opciones2.querySelectorAll('button').forEach(function(b) { b.classList.remove('border-wine', 'bg-wine-dark/30'); });
        this.classList.add('border-wine', 'bg-wine-dark/30');
        eleccion2 = parseInt(this.dataset.index, 10);
      });
    });

    if (btnListo1) btnListo1.addEventListener('click', function() {
      if (paso1) paso1.classList.add('hidden');
      if (paso2) paso2.classList.remove('hidden');
    });

    if (btnRevelar) btnRevelar.addEventListener('click', function() {
      if (eleccion1 == null || eleccion2 == null) {
        alert('Las dos personas tienen que elegir una opción.');
        return;
      }
      primeraRondaCompletada = true;
      if (paso2) paso2.classList.add('hidden');
      if (paso3) paso3.classList.remove('hidden');
      if (eleccion1Span) eleccion1Span.textContent = opciones[eleccion1];
      if (eleccion2Span) eleccion2Span.textContent = opciones[eleccion2];
      if (resultadoCoinciden) resultadoCoinciden.classList.add('hidden');
      if (resultadoNoCoinciden) resultadoNoCoinciden.classList.add('hidden');
      if (eleccion1 === eleccion2) {
        if (resultadoCoinciden) resultadoCoinciden.classList.remove('hidden');
        var variantes = premios[eleccion1];
        var premio = Array.isArray(variantes) ? variantes[Math.floor(Math.random() * variantes.length)] : variantes;
        if (textoPremio) textoPremio.textContent = premio;
      } else {
        if (resultadoNoCoinciden) resultadoNoCoinciden.classList.remove('hidden');
      }
    });

    function puedeNuevaRonda(cb) {
      if (!primeraRondaCompletada) { cb(true); return; }
      if (!window.RitualAuth) { cb(false); return; }
      window.RitualAuth.checkGameAccess().then(function(r) {
        cb(!!r && !!r.allowed);
      }).catch(function() { cb(false); });
    }

    if (btnOtra) btnOtra.addEventListener('click', function() {
      puedeNuevaRonda(function(ok) {
        if (!ok && window.RitualShowPaywall) {
          window.RitualShowPaywall();
          return;
        }
        if (paso3) paso3.classList.add('hidden');
        if (paso1) paso1.classList.remove('hidden');
        if (paso2) paso2.classList.add('hidden');
        eleccion1 = null;
        eleccion2 = null;
        if (btnListo1) btnListo1.classList.add('hidden');
        opciones1.querySelectorAll('button').forEach(function(b) { b.classList.remove('border-wine', 'bg-wine-dark/30'); });
        opciones2.querySelectorAll('button').forEach(function(b) { b.classList.remove('border-wine', 'bg-wine-dark/30'); });
      });
    });
  }
  document.addEventListener('ritual-game-access-granted', init);
})();
