/**
 * Ritual — Página activar.html: activar un regalo con el token de la URL.
 */
(function() {
  function init() {
    var params = new URLSearchParams(window.location.search);
    var token = params.get("token");
    var sinToken = document.getElementById("activar-sin-token");
    var pideLogin = document.getElementById("activar-pide-login");
    var linkAuth = document.getElementById("activar-link-auth");
    var conSesion = document.getElementById("activar-con-sesion");
    var activarError = document.getElementById("activar-error");
    var btnActivar = document.getElementById("btn-activar");
    var activarOk = document.getElementById("activar-ok");

    if (!token || !token.trim()) {
      if (sinToken) sinToken.classList.remove("hidden");
      return;
    }
    token = token.trim();

    if (linkAuth) linkAuth.href = "auth.html?redirect=" + encodeURIComponent("activar.html?token=" + encodeURIComponent(token));

    function show(el) {
      [sinToken, pideLogin, conSesion, activarOk].forEach(function(node) {
        if (node) node.classList.add("hidden");
      });
      if (el) el.classList.remove("hidden");
    }

    if (!window.RitualAuth) {
      show(pideLogin);
      return;
    }

    window.RitualAuth.init().then(function() {
      return window.RitualAuth.getSession();
    }).then(function(session) {
      if (!session) {
        show(pideLogin);
        return;
      }
      show(conSesion);
      if (!btnActivar) return;
      btnActivar.addEventListener("click", function() {
        if (activarError) { activarError.classList.add("hidden"); activarError.textContent = ""; }
        btnActivar.disabled = true;
        btnActivar.textContent = "Un momento…";
        window.RitualAuth.claimGift(token).then(function(result) {
          btnActivar.disabled = false;
          btnActivar.textContent = "Activar mi mes";
          if (result.success) {
            show(activarOk);
            return;
          }
          if (activarError) {
            activarError.textContent = result.error === "gift_not_found" || result.error === "gift_not_paid"
              ? "Este enlace no es válido o el regalo aún no fue pagado."
              : result.error === "gift_already_claimed"
                ? "Este regalo ya fue activado."
                : result.error === "invalid_session"
                  ? "La sesión expiró. Volvé a entrar."
                  : "No se pudo activar. Intentá de nuevo.";
            activarError.classList.remove("hidden");
          }
        });
      });
    }).catch(function() {
      show(pideLogin);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
