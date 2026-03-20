(function() {
  var PIXEL_ID = '591189853655195';
  if (!PIXEL_ID) return;

  function ensurePixelLoaded() {
    if (window.fbq) return;
    !function(f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  }

  function track(eventName, params) {
    if (!window.fbq || !eventName) return;
    if (params && typeof params === 'object') {
      window.fbq('track', eventName, params);
      return;
    }
    window.fbq('track', eventName);
  }

  ensurePixelLoaded();
  if (window.fbq) {
    window.fbq('init', PIXEL_ID);
    if (!window.__ritualPixelPageViewSent) {
      window.fbq('track', 'PageView');
      window.__ritualPixelPageViewSent = true;
    }
  }

  window.RitualPixel = {
    id: PIXEL_ID,
    track: track
  };
})();
