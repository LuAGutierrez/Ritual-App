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
      if (!client) return Promise.resolve({ allowed: false });
      return client.functions.invoke('check-game-access', { body: {} }).then(function(res) {
        if (res.error) return { allowed: false };
        var data = res.data;
        return { allowed: !!(data && data.allowed === true) };
      }).catch(function() {
        return { allowed: false };
      });
    },
    /**
     * Crea una suscripción pendiente en Mercado Pago y devuelve { init_point } para redirigir al pago.
     * Requiere sesión. Devuelve Promise<{ init_point: string } | { error: string }>.
     */
    createMpSubscription: function() {
      var client = getClient();
      if (!client) return Promise.resolve({ error: 'no_client' });
      return client.functions.invoke('create-mp-subscription', { method: 'POST', body: {} }).then(function(res) {
        if (res.error) return { error: res.error.message || 'mp_error' };
        var data = res.data;
        if (data && data.init_point) return { init_point: data.init_point };
        return { error: data?.error || 'no_init_point' };
      }).catch(function(e) {
        return { error: e?.message || 'mp_error' };
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
      var btnLogout = document.getElementById('nav-btn-logout');
      var btnLogoutMobile = document.getElementById('nav-btn-logout-mobile');
      if (!linkEntrar && !linkEntrarMobile) return;

      this.getSession().then(function(session) {
        var isLoggedIn = !!session;
        if (linkEntrar) {
          if (isLoggedIn) linkEntrar.classList.add('hidden');
          else linkEntrar.classList.remove('hidden');
        }
        if (linkEntrarMobile) {
          if (isLoggedIn) linkEntrarMobile.classList.add('hidden');
          else linkEntrarMobile.classList.remove('hidden');
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

  function tryInit() {
    if (!window.RitualSupabase || !window.RitualSupabase.enabled || typeof window.supabase === 'undefined') return;
    RitualAuth.init().then(function() {
      // Vuelve a actualizar la nav tras un momento (por si la sesión se restaura de localStorage después)
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
