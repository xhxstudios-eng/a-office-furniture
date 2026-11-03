(function () {
  var KEY = 'aof-theme';
  var STYLE_ID = 'aof-dark-sheet';
  var observer = null;
  var raf = null;

  var CSS = [
    '[data-dk~="t"]{color:#ffffff !important}',
    '[data-dk~="b1"]{background-color:#141312 !important}',
    '[data-dk~="b2"]{background-color:#1e1c1a !important}',
    '[data-dk~="b3"]{background-color:#26231f !important}',
    '[data-dk~="br"]{border-color:rgba(255,255,255,0.14) !important}',
    'body[data-theme="dark"]{background:#141312 !important}',
    'html[data-theme-boot="dark"]{background:#141312 !important}',

    /* Footer — explicit black / gold treatment */
    'body[data-theme="dark"] [data-site-footer]{background:#0C0B0A !important;border-top:1px solid rgba(200,169,106,0.28) !important}',
    'body[data-theme="dark"] [data-site-footer] *{color:#E8E2D6 !important}',
    'body[data-theme="dark"] [data-site-footer] [data-footer-heading]{color:#C8A96A !important;opacity:1 !important}',
    'body[data-theme="dark"] [data-site-footer] a{color:#B4ADA1 !important;transition:color 0.25s ease}',
    'body[data-theme="dark"] [data-site-footer] a:hover{color:#C8A96A !important}',
    'body[data-theme="dark"] [data-site-footer] [style*="border-top"]{border-top-color:rgba(200,169,106,0.18) !important}',

    /* Header bar — surface and text decided together */
    'body[data-theme="dark"] header{background:rgba(18,17,16,0.88) !important;border-bottom-color:rgba(200,169,106,0.2) !important}',
    'body[data-theme="dark"] header a[data-nav-link]{color:#EDE7DC !important}',
    'body[data-theme="dark"] header a[data-nav-link]:hover{color:#C8A96A !important}',

    /* Mobile menu button: bars are painted with background, not color */
    'body[data-theme="dark"] [aria-label="Toggle menu"] span{background:#EDE7DC !important}',

    /* Dropdown panels */
    'body[data-theme="dark"] header nav div[style*="position: absolute"]{background:#1A1817 !important;border-color:rgba(200,169,106,0.22) !important}',
  ].join('\n');

  function gam(x) {
    x = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(x * 255)));
  }

  function fromOklch(L, C, H, a) {
    var h = H * Math.PI / 180;
    var A = C * Math.cos(h), B = C * Math.sin(h);
    var l_ = L + 0.3963377774 * A + 0.2158037573 * B;
    var m_ = L - 0.1055613458 * A - 0.0638541728 * B;
    var s_ = L - 0.0894841775 * A - 1.2914855480 * B;
    var l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
    return {
      r: gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      g: gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      b: gam(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
      a: a,
    };
  }

  function num(v, scale) {
    if (v == null) return 0;
    v = String(v).trim();
    if (v.slice(-1) === '%') return parseFloat(v) / 100 * (scale || 1);
    return parseFloat(v);
  }

  function parse(c) {
    if (!c) return null;
    c = String(c).trim();
    if (c === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    var m = c.match(/^rgba?\(([^)]+)\)/);
    if (m) {
      var p = m[1].split(/[,\/\s]+/).filter(Boolean).map(function (v) { return parseFloat(v); });
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    m = c.match(/^oklch\(([^)]+)\)/i);
    if (m) {
      var parts = m[1].split('/');
      var v = parts[0].trim().split(/\s+/);
      var a = parts[1] ? num(parts[1], 1) : 1;
      return fromOklch(num(v[0], 1), num(v[1], 0.4), num(v[2], 360) || 0, a);
    }
    m = c.match(/^#([0-9a-f]{3,8})$/i);
    if (m) {
      var h = m[1];
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length > 6 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
    }
    return null;
  }

  function lum(c) { return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255; }
  function sat(c) { return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b); }

  function skip(el) {
    var t = el.tagName;
    if (t === 'IMG' || t === 'SVG' || t === 'PATH' || t === 'IMAGE-SLOT' || t === 'SCRIPT' || t === 'STYLE' || t === 'LINK' || t === 'BR') return true;
    if (el.closest && (el.closest('[data-no-dark]') || el.closest('image-slot'))) return true;
    return false;
  }

  /* Marks branded (saturated) surfaces once so their subtrees keep their own colours. */
  function markBrandSurfaces() {
    var els = document.querySelectorAll('body *');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.hasAttribute('data-brand-bg')) continue;
      var b = parse(getComputedStyle(el).backgroundColor);
      if (b && b.a > 0.4 && sat(b) >= 45) el.setAttribute('data-brand-bg', '');
    }
  }

  function ensureSheet() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function tag() {
    markBrandSurfaces();
    var els = document.querySelectorAll('body, body *');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (skip(el)) continue;
      /* Sticky: an element is judged once, from its light-mode colours. */
      if (el.hasAttribute('data-dk')) continue;
      var cs = getComputedStyle(el);
      var marks = [];

      var bg = parse(cs.backgroundColor);
      var lightSurface = bg && bg.a > 0.02 && sat(bg) < 40 && lum(bg) > 0.55;
      if (lightSurface) marks.push(lum(bg) > 0.965 ? 'b1' : (lum(bg) > 0.9 ? 'b2' : 'b3'));

      /* Text: white unless it is a brand colour, or it sits on a brand-coloured surface. */
      var col = parse(cs.color);
      var brandText = col && sat(col) >= 45;
      if (col && !brandText && !el.closest('[data-brand-bg]')) marks.push('t');

      var b = parse(cs.borderTopColor) || parse(cs.borderBottomColor);
      var w = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
      if (b && w > 0 && b.a > 0.05 && sat(b) < 40 && lum(b) > 0.6) marks.push('br');

      if (marks.length) el.setAttribute('data-dk', marks.join(' '));
    }
  }

  function untag() {
    var sheet = document.getElementById(STYLE_ID);
    if (sheet) sheet.parentNode.removeChild(sheet);
    var els = document.querySelectorAll('[data-dk],[data-brand-bg]');
    for (var i = 0; i < els.length; i++) { els[i].removeAttribute('data-dk'); els[i].removeAttribute('data-brand-bg'); }
  }

  function mode() { return document.body && document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }

  function schedule() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () { raf = null; if (mode() === 'dark') tag(); });
  }

  function watch() {
    if (observer) return;
    observer = new MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) {
        if (recs[i].type === 'attributes' && recs[i].attributeName === 'data-dk') continue;
        schedule();
        return;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
  }
  function unwatch() { if (observer) { observer.disconnect(); observer = null; } if (raf) { cancelAnimationFrame(raf); raf = null; } }

  function apply(next) {
    if (next === 'dark') {
      document.documentElement.setAttribute('data-theme-boot', 'dark');
      document.body.setAttribute('data-theme', 'dark');
      document.body.style.colorScheme = 'dark';
      ensureSheet();
      tag();
      watch();
    } else {
      document.documentElement.removeAttribute('data-theme-boot');
      unwatch();
      document.body.removeAttribute('data-theme');
      document.body.style.colorScheme = '';
      untag();
    }
    try { localStorage.setItem(KEY, next); } catch (e) {}
    document.dispatchEvent(new CustomEvent('aof-theme-change', { detail: next }));
    if (next === 'dark') {
      [60, 260, 700].forEach(function (t) { setTimeout(function () { if (mode() === 'dark') tag(); }, t); });
    }
  }

  window.AOFTheme = {
    get: mode,
    set: apply,
    toggle: function () { apply(mode() === 'dark' ? 'light' : 'dark'); },
  };

  var saved = 'light';
  try { saved = localStorage.getItem(KEY) || 'light'; } catch (e) {}

  /* Runs immediately at parse time (script is in <head>) — paints the dark backdrop
     before the body exists, so navigating between pages never flashes light. */
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme-boot', 'dark');
    ensureSheet();
  }

  function init() {
    if (saved === 'dark') apply('dark');
  }

  if (document.body) init();
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
