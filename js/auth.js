/**
 * Ritual — Auth con Supabase (email + contraseña)
 * Crea el cliente, signIn, signUp, signOut y actualiza la nav según sesión.
 */
(function() {
  var supabase = null;

  function getClient() {
    return supabase || null;
  }

  function initClient() {
    if (supabase) return Promise.resolve(supabase);
    if (!window.RitualSupabase || !window.RitualSupabase.enabled) return Promise.resolve(null);
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) return Promise.resolve(null);
    var lib = window.supabase;
    supabase = lib.createClient(window.RitualSupabase.url, window.RitualSupabase.anonKey);
    return Promise.resolve(supabase);
  }

  window.RitualAuth = {
    init: function() {
      var self = this;
      return initClient().then(function(client) {
        if (client) {
          client.auth.onAuthStateChange(function() {
            self.updateNavAuth();
          });
          self.updateNavAuth();
        }
        return client;
      });
    },
    getSession: function() {
      var client = getClient();
      if (!client) return Promise.resolve(null);
      return client.auth.getSession().then(function(_ref) {
        return _ref.data.session;
      });
    },
    /** Devuelve Promise<boolean>: true si el usuario tiene suscripción active o trialing en la BD. */
    getSubscriptionStatus: function() {
      var self = this;
      return initClient().then(function(client) {
        if (!client) return Promise.resolve(false);
        return self.getSession();
      }).then(function(session) {
        if (!session) return false;
        var client = getClient();
        if (!client) return false;
        return client.from('subscriptions').select('id').eq('user_id', session.user.id).in('status', ['active', 'trialing']).maybeSingle();
      }).then(function(res) {
        if (typeof res === 'boolean') return res;
        return !!(res && res.data && res.data.id);
      });
    },
    /** Devuelve Promise<boolean>: true si el usuario ya usó su prueba gratuita (según profiles.trial_used). */
    getTrialUsed: function() {
      var self = this;
      return self.getSession().then(function(session) {
        if (!session) return true;
        var client = getClient();
        if (!client) return true;
        return client.from('profiles').select('trial_used').eq('id', session.user.id).maybeSingle();
      }).then(function(res) {
        if (res && res.data && res.data.trial_used === true) return true;
        return false;
      });
    },
    /** Marca en BD que el usuario usó la prueba gratuita. */
    useTrial: function() {
      var self = this;
      return self.getSession().then(function(session) {
        if (!session) return Promise.reject(new Error('No hay sesión'));
        var client = getClient();
        if (!client) return Promise.reject(new Error('Sin cliente'));
        return client.from('profiles').update({ trial_used: true, updated_at: new Date().toISOString() }).eq('id', session.user.id);
      });
    },
    /**
     * Decide en el servidor si el usuario puede jugar (suscripción o prueba).
     * Devuelve Promise<{ allowed: boolean }>. No se puede bypassear desde el cliente.
     */
    checkGameAccess: function() {
      var client = getClient();
      if (!client) return Promise.resolve({ allowed: false, usedTrial: false });
      return client.functions.invoke('check-game-access', { body: {} }).then(function(res) {
        if (res.error) return { allowed: false, usedTrial: false };
        var data = res.data;
        return {
          allowed: !!(data && data.allowed === true),
          usedTrial: !!(data && data.usedTrial === true)
        };
      }).catch(function() {
        return { allowed: false, usedTrial: false };
      });
    },
    /**
     * Crea una suscripción pendiente en Mercado Pago y devuelve { init_point } para redirigir al pago.
     * Requiere sesión. Devuelve Promise<{ init_point: string } | { error: string }>.
     */
    createMpSubscription: function() {
      var self = this;
      var client = getClient();
      var config = window.RitualSupabase;
      if (!client || !config || !config.url || !config.anonKey) return Promise.resolve({ error: 'no_client' });
      return client.auth.refreshSession().then(function(refreshRes) {
        // #region agent log
        var session = refreshRes.data && refreshRes.data.session;
        var token = session && session.access_token;
        fetch('http://127.0.0.1:7243/ingest/ed4bcd9f-c2f7-4e1f-9105-58f428ae696a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.js:createMpSubscription',message:'after refreshSession',data:{refreshError:refreshRes.error?String(refreshRes.error.message||refreshRes.error):null,hasSession:!!session,hasAccessToken:!!token,tokenLength:token?token.length:0,usedKey:'access_token',url:config.url+'/functions/v1/create-mp-subscription'},timestamp:Date.now(),hypothesisId:'H1-H5'})}).catch(function(){});
        // #endregion
        if (refreshRes.error || !session || !session.access_token) {
          return Promise.resolve({ error: 'invalid_session' });
        }
        var url = config.url + '/functions/v1/create-mp-subscription';
        var headers = {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.access_token,
          'apikey': config.anonKey
        };
        return fetch(url, { method: 'POST', headers: headers, body: '{}' });
      }).then(function(response) {
        if (response && response.error) return response;
        // #region agent log
        var isResp = response && typeof response.ok === 'boolean';
        fetch('http://127.0.0.1:7243/ingest/ed4bcd9f-c2f7-4e1f-9105-58f428ae696a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.js:createMpSubscription',message:'fetch response',data:{responseOk:isResp?response.ok:null,responseStatus:isResp?response.status:null},timestamp:Date.now(),hypothesisId:'H-response'})}).catch(function(){});
        // #endregion
        return response.json().then(function(data) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/ed4bcd9f-c2f7-4e1f-9105-58f428ae696a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.js:createMpSubscription',message:'response body',data:{dataError:data&&data.error,dataDetails:data&&data.details},timestamp:Date.now(),hypothesisId:'H-response'})}).catch(function(){});
          // #endregion
          if (!response.ok) {
            return { error: data && data.message ? data.message : 'request_failed', details: data };
          }
          if (data && data.init_point) return { init_point: data.init_point };
          return { error: (data && data.error) || 'no_init_point', details: data && data.details };
        }).catch(function() {
          return { error: 'invalid_response', details: response.status };
        });
      }).catch(function(e) {
        if (typeof console !== 'undefined' && console.log) console.log('[Ritual] createMpSubscription catch:', e);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/ed4bcd9f-c2f7-4e1f-9105-58f428ae696a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.js:createMpSubscription',message:'catch',data:{errMessage:e&&e.message?String(e.message):null},timestamp:Date.now(),hypothesisId:'H-catch'})}).catch(function(){});
        // #endregion
        var msg = e && e.message ? e.message : 'mp_error';
        if (msg.indexOf('401') >= 0 || msg.indexOf('Unauthorized') >= 0) return { error: 'invalid_session' };
        return { error: msg };
      });
    },
    signIn: function(email, password) {
      var client = getClient();
      if (!client) return Promise.reject(new Error('Supabase no está configurado.'));
      return client.auth.signInWithPassword({ email: email, password: password }).then(function(res) {
        if (res.error) return Promise.reject(new Error(res.error.message || 'Error al iniciar sesión.'));
        return res.data;
      });
    },
    signUp: function(email, password) {
      var client = getClient();
      if (!client) return Promise.reject(new Error('Supabase no está configurado.'));
      return client.auth.signUp({ email: email, password: password }).then(function(res) {
        if (res.error) return Promise.reject(new Error(res.error.message || 'Error al crear la cuenta.'));
        return res.data;
      });
    },
    signOut: function() {
      var client = getClient();
      if (!client) return Promise.resolve();
      return client.auth.signOut().then(function() {
        window.location.href = 'index.html';
      });
    },
    updateNavAuth: function() {
      var linkEntrar = document.getElementById('nav-auth-link');
      var linkEntrarMobile = document.getElementById('nav-auth-link-mobile');
      var userMenu = document.getElementById('nav-user-menu');
      var userEmail = document.getElementById('nav-user-email');
      var userEmailMobile = document.getElementById('nav-user-email-mobile');
      var btnLogout = document.getElementById('nav-btn-logout');
      var btnLogoutMobile = document.getElementById('nav-btn-logout-mobile');
      var dropdown = document.getElementById('nav-user-dropdown');
      var btnUser = document.getElementById('nav-btn-user');
      if (!linkEntrar && !linkEntrarMobile) return;

      this.getSession().then(function(session) {
        var isLoggedIn = !!session;
        var email = session && session.user ? session.user.email : '';
        if (linkEntrar) {
          if (isLoggedIn) linkEntrar.classList.add('hidden');
          else linkEntrar.classList.remove('hidden');
        }
        if (linkEntrarMobile) {
          if (isLoggedIn) linkEntrarMobile.classList.add('hidden');
          else linkEntrarMobile.classList.remove('hidden');
        }
        if (userMenu) {
          if (isLoggedIn) userMenu.classList.remove('hidden');
          else {
            userMenu.classList.add('hidden');
            if (dropdown) dropdown.classList.add('hidden');
            if (btnUser) btnUser.setAttribute('aria-expanded', 'false');
          }
        }
        if (userEmail) {
          userEmail.textContent = email;
          userEmail.title = email;
        }
        if (userEmailMobile) {
          userEmailMobile.textContent = email;
          if (isLoggedIn) userEmailMobile.classList.remove('hidden');
          else userEmailMobile.classList.add('hidden');
        }
        if (btnLogout) {
          if (isLoggedIn) btnLogout.classList.remove('hidden');
          else btnLogout.classList.add('hidden');
        }
        if (btnLogoutMobile) {
          if (isLoggedIn) btnLogoutMobile.classList.remove('hidden');
          else btnLogoutMobile.classList.add('hidden');
        }
      });
    }
  };

  function setupUserDropdown() {
    var btnUser = document.getElementById('nav-btn-user');
    var dropdown = document.getElementById('nav-user-dropdown');
    var menu = document.getElementById('nav-user-menu');
    if (!btnUser || !dropdown || !menu) return;
    if (btnUser._dropdownSetup) return;
    btnUser._dropdownSetup = true;
    btnUser.addEventListener('click', function(e) {
      e.stopPropagation();
      var wasOpen = !dropdown.classList.contains('hidden');
      dropdown.classList.toggle('hidden', wasOpen);
      btnUser.setAttribute('aria-expanded', wasOpen ? 'false' : 'true');
    });
    document.addEventListener('click', function(e) {
      if (!menu.contains(e.target)) {
        dropdown.classList.add('hidden');
        btnUser.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function tryInit() {
    if (!window.RitualSupabase || !window.RitualSupabase.enabled || typeof window.supabase === 'undefined') return;
    setupUserDropdown();
    RitualAuth.init().then(function() {
      setTimeout(function() {
        if (window.RitualAuth) window.RitualAuth.updateNavAuth();
      }, 150);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();
