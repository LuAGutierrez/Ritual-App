/**
 * Ritual — Elección mutua remoto (MVP)
 * Host con suscripción crea sala; invitado con cuenta se une por código.
 */
(function() {
  var room = null;
  var roomChannel = null;
  var client = null;
  var selectedMode = "modo1";
  var selectedChoice = null;
  var myUserId = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function showError(msg) {
    var el = byId("remote-error");
    if (!el) return;
    el.textContent = msg || "Ocurrió un error.";
    el.classList.remove("hidden");
  }

  function hideError() {
    var el = byId("remote-error");
    if (!el) return;
    el.classList.add("hidden");
  }

  function modeLabel(modeSlug) {
    if (modeSlug === "modo1") return "Modo 1";
    if (modeSlug === "modo2") return "Modo 2";
    if (modeSlug === "modo3") return "Modo 3";
    return modeSlug || "Modo";
  }

  function statusLabel(currentRoom) {
    if (!currentRoom) return "";
    if (currentRoom.status === "waiting") return "Esperando a la otra persona…";
    if (currentRoom.status === "playing") return "Sala lista. Elegí y enviá tu opción.";
    if (currentRoom.status === "revealed") return "Ambos enviaron su elección. Resultado disponible.";
    if (currentRoom.status === "closed") return "Sala cerrada.";
    return "Sala activa.";
  }

  function getModeData(modeSlug) {
    var root = window.RitualDatos && window.RitualDatos.eleccion;
    if (!root || !root[modeSlug]) return null;
    return root[modeSlug];
  }

  function getMyChoiceValue(currentRoom) {
    if (!currentRoom || !myUserId) return null;
    return currentRoom.owner_user_id === myUserId ? currentRoom.owner_choice : currentRoom.guest_choice;
  }

  function getOtherChoiceValue(currentRoom) {
    if (!currentRoom || !myUserId) return null;
    return currentRoom.owner_user_id === myUserId ? currentRoom.guest_choice : currentRoom.owner_choice;
  }

  function renderRoom() {
    var lobby = byId("remote-lobby");
    var roomBox = byId("remote-room");
    var play = byId("remote-play");
    var result = byId("remote-result");
    var roomCodeText = byId("room-code-text");
    var roomModeText = byId("room-mode-text");
    var roomStatusText = byId("room-status-text");
    var myChoiceStatus = byId("my-choice-status");
    var btnNuevaRonda = byId("btn-nueva-ronda");
    if (!room) {
      if (lobby) lobby.classList.remove("hidden");
      if (roomBox) roomBox.classList.add("hidden");
      if (play) play.classList.add("hidden");
      if (result) result.classList.add("hidden");
      return;
    }

    if (lobby) lobby.classList.add("hidden");
    if (roomBox) roomBox.classList.remove("hidden");
    if (roomCodeText) roomCodeText.textContent = room.room_code || "";
    if (roomModeText) roomModeText.textContent = modeLabel(room.mode_slug);
    if (roomStatusText) roomStatusText.textContent = statusLabel(room);

    var modeData = getModeData(room.mode_slug);
    var opciones = modeData && Array.isArray(modeData.opciones) ? modeData.opciones : [];

    var remoteOpciones = byId("remote-opciones");
    if (remoteOpciones) {
      remoteOpciones.innerHTML = "";
      opciones.forEach(function(text, idx) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "touch-target rounded-xl border border-nude-muted/40 px-4 py-4 min-h-[48px] text-left text-sm text-nude hover:border-nude transition active:bg-white/5";
        btn.textContent = text;
        btn.dataset.index = String(idx);
        btn.addEventListener("click", function() {
          selectedChoice = idx;
          remoteOpciones.querySelectorAll("button").forEach(function(b) {
            b.classList.remove("border-wine", "bg-wine-dark/30");
          });
          btn.classList.add("border-wine", "bg-wine-dark/30");
        });
        remoteOpciones.appendChild(btn);
      });
    }

    var isPlaying = room.status === "playing" || room.status === "waiting";
    if (play) {
      if (isPlaying) play.classList.remove("hidden");
      else play.classList.add("hidden");
    }

    var myChoice = getMyChoiceValue(room);
    if (myChoiceStatus) {
      if (myChoice == null) {
        myChoiceStatus.textContent = room.guest_user_id ? "Todavía no enviaste tu elección." : "Esperando que se una tu pareja.";
      } else if (getOtherChoiceValue(room) == null) {
        myChoiceStatus.textContent = "Tu elección fue enviada. Esperando a la otra persona…";
      } else {
        myChoiceStatus.textContent = "Ambos enviaron su elección.";
      }
    }

    var bothChoices = room.owner_choice != null && room.guest_choice != null;
    if (result) {
      if (bothChoices) result.classList.remove("hidden");
      else result.classList.add("hidden");
    }
    if (btnNuevaRonda) {
      if (room.owner_user_id === myUserId && bothChoices) btnNuevaRonda.classList.remove("hidden");
      else btnNuevaRonda.classList.add("hidden");
    }

    if (bothChoices) {
      var myChoiceText = byId("my-choice-text");
      var otherChoiceText = byId("other-choice-text");
      var coincide = byId("remote-coinciden");
      var noCoincide = byId("remote-no-coinciden");
      var premioEl = byId("remote-premio");
      var myIdx = Number(getMyChoiceValue(room));
      var otherIdx = Number(getOtherChoiceValue(room));

      if (myChoiceText) myChoiceText.textContent = opciones[myIdx] || "";
      if (otherChoiceText) otherChoiceText.textContent = opciones[otherIdx] || "";

      if (myIdx === otherIdx) {
        if (coincide) coincide.classList.remove("hidden");
        if (noCoincide) noCoincide.classList.add("hidden");
        var premios = modeData && Array.isArray(modeData.premios) ? modeData.premios : [];
        var variantes = premios[myIdx];
        var premio = Array.isArray(variantes) ? variantes[Math.floor(Math.random() * variantes.length)] : variantes;
        if (premioEl) premioEl.textContent = premio || "Coincidieron.";
      } else {
        if (coincide) coincide.classList.add("hidden");
        if (noCoincide) noCoincide.classList.remove("hidden");
      }
    }
  }

  function getEdgeUrl() {
    return window.RitualSupabase.url + "/functions/v1/eleccion-remoto";
  }

  function callRemoteAction(action, payload) {
    if (!window.RitualAuth) return Promise.reject(new Error("Autenticación no disponible."));
    return window.RitualAuth.getSessionValidated().then(function(session) {
      if (!session || !session.access_token) {
        window.location.href = "auth.html?redirect=" + encodeURIComponent("juego-eleccion-remoto.html");
        throw new Error("Sesión inválida.");
      }
      return fetch(getEdgeUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + session.access_token,
          "apikey": window.RitualSupabase.anonKey
        },
        body: JSON.stringify(Object.assign({ action: action }, payload || {}))
      }).then(function(res) { return res.json(); });
    });
  }

  function startRealtimeSubscription(roomCode) {
    if (!client || !roomCode) return;
    if (roomChannel) {
      client.removeChannel(roomChannel);
      roomChannel = null;
    }
    roomChannel = client
      .channel("remote-eleccion-" + roomCode)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "remote_eleccion_rooms",
        filter: "room_code=eq." + roomCode
      }, function(payload) {
        room = payload.new;
        renderRoom();
      })
      .subscribe();
  }

  function setCurrentRoom(nextRoom) {
    room = nextRoom || null;
    selectedChoice = null;
    if (room && room.room_code) startRealtimeSubscription(room.room_code);
    renderRoom();
  }

  function initAuthAndClient() {
    if (!window.RitualAuth || !window.RitualSupabase || !window.RitualSupabase.enabled || !window.supabase) {
      showError("Supabase no está configurado para esta versión.");
      return Promise.reject(new Error("supabase_not_configured"));
    }
    return window.RitualAuth.init().then(function() {
      return window.RitualAuth.getSessionValidated();
    }).then(function(session) {
      if (!session || !session.user) {
        window.location.href = "auth.html?redirect=" + encodeURIComponent("juego-eleccion-remoto.html");
        return Promise.reject(new Error("missing_session"));
      }
      myUserId = session.user.id;
      client = window.supabase.createClient(window.RitualSupabase.url, window.RitualSupabase.anonKey);
      return client.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });
    });
  }

  function bindModeButtons() {
    document.querySelectorAll(".remote-mode-btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        selectedMode = btn.getAttribute("data-mode") || "modo1";
        document.querySelectorAll(".remote-mode-btn").forEach(function(b) {
          b.classList.remove("border-wine", "bg-wine-dark/30");
        });
        btn.classList.add("border-wine", "bg-wine-dark/30");
      });
    });
    var initial = document.querySelector('.remote-mode-btn[data-mode="modo1"]');
    if (initial) initial.classList.add("border-wine", "bg-wine-dark/30");
  }

  function bindActions() {
    var btnCrear = byId("btn-crear-sala");
    if (btnCrear) {
      btnCrear.addEventListener("click", function() {
        hideError();
        btnCrear.disabled = true;
        btnCrear.textContent = "Creando…";
        callRemoteAction("create", { modeSlug: selectedMode }).then(function(res) {
          btnCrear.disabled = false;
          btnCrear.textContent = "Crear sala";
          if (res.error) {
            if (res.error === "subscription_required") {
              showError("Para crear una sala remota necesitás suscripción activa.");
              return;
            }
            showError("No se pudo crear la sala. Intentá de nuevo.");
            return;
          }
          setCurrentRoom(res.room || null);
        }).catch(function() {
          btnCrear.disabled = false;
          btnCrear.textContent = "Crear sala";
          showError("No se pudo crear la sala. Revisá tu conexión.");
        });
      });
    }

    var btnUnirme = byId("btn-unirme-sala");
    var inputCode = byId("input-room-code");
    if (btnUnirme && inputCode) {
      btnUnirme.addEventListener("click", function() {
        hideError();
        var roomCode = (inputCode.value || "").trim().toUpperCase();
        if (!roomCode) {
          showError("Ingresá el código de sala.");
          return;
        }
        btnUnirme.disabled = true;
        btnUnirme.textContent = "Uniendo…";
        callRemoteAction("join", { roomCode: roomCode }).then(function(res) {
          btnUnirme.disabled = false;
          btnUnirme.textContent = "Unirme";
          if (res.error) {
            if (res.error === "room_full") showError("La sala ya tiene dos personas.");
            else if (res.error === "room_not_found") showError("No encontramos esa sala.");
            else showError("No se pudo unir a la sala.");
            return;
          }
          setCurrentRoom(res.room || null);
        }).catch(function() {
          btnUnirme.disabled = false;
          btnUnirme.textContent = "Unirme";
          showError("No se pudo unir a la sala.");
        });
      });
    }

    var btnEnviar = byId("btn-enviar-eleccion");
    if (btnEnviar) {
      btnEnviar.addEventListener("click", function() {
        hideError();
        if (!room || !room.room_code) return;
        if (selectedChoice == null) {
          showError("Elegí una opción antes de enviar.");
          return;
        }
        btnEnviar.disabled = true;
        btnEnviar.textContent = "Enviando…";
        callRemoteAction("submit_choice", {
          roomCode: room.room_code,
          choiceIndex: selectedChoice
        }).then(function(res) {
          btnEnviar.disabled = false;
          btnEnviar.textContent = "Enviar elección";
          if (res.error) {
            if (res.error === "already_submitted") showError("Ya enviaste tu elección en esta ronda.");
            else showError("No se pudo enviar la elección.");
            return;
          }
          setCurrentRoom(res.room || room);
        }).catch(function() {
          btnEnviar.disabled = false;
          btnEnviar.textContent = "Enviar elección";
          showError("No se pudo enviar la elección.");
        });
      });
    }

    var btnNueva = byId("btn-nueva-ronda");
    if (btnNueva) {
      btnNueva.addEventListener("click", function() {
        hideError();
        if (!room || !room.room_code) return;
        btnNueva.disabled = true;
        btnNueva.textContent = "Reiniciando…";
        callRemoteAction("reset_round", { roomCode: room.room_code }).then(function(res) {
          btnNueva.disabled = false;
          btnNueva.textContent = "Nueva ronda";
          if (res.error) {
            showError("Solo quien creó la sala puede reiniciar la ronda.");
            return;
          }
          setCurrentRoom(res.room || room);
        }).catch(function() {
          btnNueva.disabled = false;
          btnNueva.textContent = "Nueva ronda";
          showError("No se pudo reiniciar la ronda.");
        });
      });
    }
  }

  function tryJoinByUrl() {
    var params = new URLSearchParams(window.location.search);
    var roomCode = (params.get("room") || "").trim().toUpperCase();
    if (!roomCode) return;
    callRemoteAction("join", { roomCode: roomCode }).then(function(res) {
      if (res.error) return;
      setCurrentRoom(res.room || null);
    }).catch(function() {});
  }

  function init() {
    bindModeButtons();
    bindActions();
    initAuthAndClient().then(function() {
      tryJoinByUrl();
    }).catch(function() {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
