/* A Office Furniture — shared data layer.
   Fill in the two values below to switch every page from local demo data to Supabase.
   The anon key is public by design; security is enforced by RLS (see supabase/schema.sql). */
window.AOF_CONFIG = window.AOF_CONFIG || {
  supabaseUrl: 'https://ydeebcxhonxafjiptfly.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkZWViY3hob254YWZqaXB0Zmx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NjA3NzksImV4cCI6MjEwODIzNjc3OX0.91h2JDKsKAp0gV8FW8EvKUlHmxOcVnIbgyaMgLKStw8',
};

(function () {
  if (window.AOF) return;
  (function () {
    var st = document.createElement('style');
    st.textContent = 'img[src$="coming-soon.png"]{object-fit:contain!important;background:#030407;}';
    (document.head || document.documentElement).appendChild(st);
    /* Wide collection cards: a square/portrait upload is shown whole on black instead of being cropped */
    var fit = function (img) {
      if (!img.naturalWidth) return;
      if (img.naturalWidth / img.naturalHeight < 1.25) { img.style.objectFit = 'contain'; img.style.background = '#030407'; }
    };
    var scan = function () {
      document.querySelectorAll('img[data-collection-image]').forEach(function (img) {
        if (img.__aofFit === img.src) return;
        img.__aofFit = img.src;
        if (img.complete) fit(img); else img.addEventListener('load', function () { fit(img); }, { once: true });
      });
    };
    var start = function () { scan(); new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] }); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  })();
  /* Product photos that are taller than the 16:9 frame (e.g. 3:4) are shown whole, centred,
     with a soft blurred copy of the same photo filling the sides — the frame itself never shrinks. */
  (function () {
    var st = document.createElement('style');
    st.textContent =
      '[data-aof-fill]::before{content:"";position:absolute;inset:-30px;background-image:var(--aof-fill);background-size:cover;background-position:center;filter:blur(28px) brightness(0.9) saturate(1.05);transform:scale(1.1);z-index:0;pointer-events:none;}' +
      '[data-aof-fill]>img{position:relative;z-index:1;object-fit:contain!important;background:transparent!important;}' +
      '[data-aof-fill]>span{z-index:2;}';
    (document.head || document.documentElement).appendChild(st);
    var apply = function (img) {
      var box = img.parentElement;
      if (!box || !img.naturalWidth) return;
      var src = img.currentSrc || img.src || '';
      var tall = img.naturalWidth / img.naturalHeight < 1.25 && !/coming-soon\.png$/.test(src);
      if (tall) {
        box.style.setProperty('--aof-fill', 'url("' + src.replace(/["\\\n]/g, encodeURIComponent) + '")');
        box.setAttribute('data-aof-fill', '');
      } else if (box.hasAttribute('data-aof-fill')) {
        box.removeAttribute('data-aof-fill');
        box.style.removeProperty('--aof-fill');
      }
    };
    var scan = function () {
      document.querySelectorAll('img[data-product-image], img[data-product-main]').forEach(function (img) {
        if (img.__aofFill === img.src) return;
        img.__aofFill = img.src;
        if (img.complete && img.naturalWidth) apply(img); else img.addEventListener('load', function () { apply(img); }, { once: true });
      });
    };
    var start = function () { scan(); new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] }); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  })();
  var ADMIN_KEY = 'aof-admin-data';
  var QUOTE_KEY = 'aof-quote-list';
  var cfg = window.AOF_CONFIG;
  var useSupabase = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  var clientPromise = null;

  function withTree(site) {
    var all = site.collections || [];
    var ids = {}; all.forEach(function (c) { ids[c.id] = c; });
    all.forEach(function (c) { if (c.parentId && !ids[c.parentId]) c.parentId = ''; });
    site.allCollections = all;
    site.collections = all.filter(function (c) { return !c.parentId; });
    site.subCollections = function (id) { return all.filter(function (c) { return c.parentId === id; }); };
    return site;
  }

  function client() {
    if (!clientPromise) {
      clientPromise = import('https://esm.sh/@supabase/supabase-js@2').then(function (m) {
        return m.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      });
    }
    return clientPromise;
  }

  var COMING_SOON = 'coming-soon.png';
  var CAT_IMG = {};
  var COL_IMG = {};

  function slugify(s) {
    return (s || '').toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function seedAdmin() {
    var cats = [['desks', 'Desks'], ['office-chairs', 'Office Chairs'], ['meeting-tables', 'Meeting Tables'], ['sofas', 'Sofa & Armchairs'], ['coffee-tables', 'Coffee Tables'], ['storage', 'Storage']]
      .map(function (c, i) { return { id: 'cat-' + c[0], name: c[1], slug: c[0], order: i + 1 }; });
    var cols = [['unique', 'Unique Collection'], ['chairman', 'Chairman Collection'], ['title', 'Title Collection'], ['classic', 'Classic Collection']]
      .map(function (c, i) { return { id: 'col-' + c[0], name: c[1], slug: c[0], shortDescription: '', description: '', status: 'published', featured: true, order: i + 1 }; });
    var codes = { desks: 'DK', 'office-chairs': 'CH', 'meeting-tables': 'MT', sofas: 'SF', 'coffee-tables': 'CT', storage: 'ST' };
    var labels = { desks: 'Desk', 'office-chairs': 'Office Chair', 'meeting-tables': 'Meeting Table', sofas: 'Sofa', 'coffee-tables': 'Coffee Table', storage: 'Storage Unit' };
    var products = [], n = 0;
    cats.forEach(function (c) {
      for (var i = 1; i <= 2; i++) {
        n++;
        var name = labels[c.slug] + ' 0' + i;
        products.push({ id: 'p' + n, name: name, slug: slugify(name), sku: 'AOF-' + codes[c.slug] + '-0' + i, categoryId: c.id, collectionIds: [cols[(n - 1) % 4].id], shortDescription: '', description: 'Sample product — replace with real details.', dimensions: '', materials: '', status: 'published', featured: i === 1, order: n });
      }
    });
    return { categories: cats, collections: cols, products: products, enquiries: [], catalogue: {}, settings: { companyName: 'A Office Furniture', email: 'info@aofficefurniture.com', phone: '+974 7078 5000', whatsapp: '', address: 'Old Al Rayyan, Building 395, St. No: 990, Doha - Qatar' } };
  }

  function readAdmin() {
    try { var d = JSON.parse(localStorage.getItem(ADMIN_KEY)); if (d && d.products) return d; } catch (e) {}
    return seedAdmin();
  }

  function fromLocal() {
    var d = readAdmin();
    var catById = {}, colById = {};
    d.categories.forEach(function (c) { catById[c.id] = c; });
    d.collections.forEach(function (c) { colById[c.id] = c; });
    var categories = d.categories.slice().sort(function (a, b) { return a.order - b.order; })
      .map(function (c) { return { id: c.id, name: c.name, slug: c.slug, image: c.image || CAT_IMG[c.slug] || COMING_SOON }; });
    var collections = d.collections.filter(function (c) { return c.status === 'published'; }).sort(function (a, b) { return a.order - b.order; })
      .map(function (c) { return { id: c.id, name: c.name, slug: c.slug, shortDescription: c.shortDescription || '', description: c.description || '', cover: c.cover || COL_IMG[c.slug] || COMING_SOON, featured: !!c.featured, parentId: c.parentId || '' }; });
    var products = d.products.filter(function (p) { return p.status === 'published'; }).sort(function (a, b) { return a.order - b.order; })
      .map(function (p) {
        var cat = catById[p.categoryId] || {};
        return {
          id: p.id, name: p.name, slug: p.slug, sku: p.sku || '', categorySlug: cat.slug || '', categoryName: cat.name || '',
          collectionSlugs: (p.collectionIds || []).map(function (id) { return colById[id] && colById[id].status === 'published' ? colById[id].slug : null; }).filter(Boolean),
          shortDescription: p.shortDescription || '', description: p.description || '', dimensions: p.dimensions || '', materials: p.materials || '',
          image: p.image || COMING_SOON, gallery: p.gallery || [], documentUrl: p.documentUrl || '', featured: !!p.featured,
        };
      });
    return withTree({ categories: categories, collections: collections, products: products, settings: d.settings || {}, catalogueUrl: '', source: 'local' });
  }

  function fromSupabase() {
    return client().then(function (sb) {
      return Promise.all([
        sb.from('categories').select('*').eq('status', 'published').order('sort_order'),
        sb.from('collections').select('*').eq('status', 'published').order('sort_order'),
        sb.from('products').select('*, categories(name, slug), product_collections(collections(slug, status))').eq('status', 'published').order('sort_order'),
        sb.from('site_settings').select('*').eq('id', 1).maybeSingle(),
      ]).then(function (r) {
        r.forEach(function (x) { if (x.error) throw x.error; });
        var s = r[3].data || {};
        return withTree({
          source: 'supabase',
          categories: r[0].data.map(function (c) { return { id: c.id, name: c.name, slug: c.slug, image: c.image_url || CAT_IMG[c.slug] || COMING_SOON }; }),
          collections: r[1].data.map(function (c) { return { id: c.id, name: c.name, slug: c.slug, shortDescription: c.short_description || '', description: c.description || '', cover: c.cover_url || COL_IMG[c.slug] || COMING_SOON, featured: !!c.featured, parentId: c.parent_id || '' }; }),
          products: r[2].data.map(function (p) {
            var cat = p.categories || {};
            return {
              id: p.id, name: p.name, slug: p.slug, sku: p.sku || '', categorySlug: cat.slug || '', categoryName: cat.name || '',
              collectionSlugs: (p.product_collections || []).map(function (pc) { return pc.collections && pc.collections.status === 'published' ? pc.collections.slug : null; }).filter(Boolean),
              shortDescription: p.short_description || '', description: p.description || '', dimensions: p.dimensions || '', materials: p.materials || '',
              image: p.main_image_url || COMING_SOON, gallery: p.gallery || [], documentUrl: p.document_url || '', featured: !!p.featured,
            };
          }),
          settings: { companyName: s.company_name, email: s.email, phone: s.phone, whatsapp: s.whatsapp, address: s.address, instagram: s.instagram, linkedin: s.linkedin },
          catalogueUrl: s.catalogue_url || '', catalogueName: s.catalogue_name || '',
        });
      });
    });
  }

  var cache = null;
  function load() {
    if (!cache) {
      cache = (useSupabase ? fromSupabase().catch(function (e) { console.warn('[AOF] Supabase failed, using local data', e && e.message); return fromLocal(); }) : Promise.resolve(fromLocal()));
    }
    return cache;
  }

  function submitEnquiry(payload) {
    if (useSupabase) {
      return client().then(function (sb) { return sb.rpc('submit_enquiry', { payload: payload }); })
        .then(function (r) { if (r.error) throw new Error(r.error.message); return r.data; });
    }
    var d = readAdmin();
    var prefix = payload.type === 'contact' ? 'AOF-C-' : 'AOF-Q-';
    var ref = prefix + (1001 + (d.enquiries || []).length);
    d.enquiries = (d.enquiries || []).concat([{
      id: 'q' + Date.now(), type: payload.type || 'quote', ref: ref, date: new Date().toISOString(),
      name: payload.full_name, company: payload.company || '', email: payload.email, phone: payload.phone || '', country: payload.country || '',
      items: (payload.items || []).map(function (i) { return { name: i.product_name, qty: i.quantity }; }),
      message: [payload.message, payload.location ? 'Location: ' + payload.location : ''].filter(Boolean).join('\n'), status: 'New', notes: '',
    }]);
    try { localStorage.setItem(ADMIN_KEY, JSON.stringify(d)); } catch (e) {}
    return Promise.resolve(ref);
  }

  /* Quote list — persists in the browser, no account needed */
  function readQuote() { try { return JSON.parse(localStorage.getItem(QUOTE_KEY)) || []; } catch (e) { return []; } }
  function writeQuote(list) {
    try { localStorage.setItem(QUOTE_KEY, JSON.stringify(list)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('aof-quote-change', { detail: list }));
  }
  var quote = {
    get: readQuote,
    count: function () { return readQuote().reduce(function (n, i) { return n + i.qty; }, 0); },
    has: function (id) { return readQuote().some(function (i) { return i.id === id; }); },
    add: function (p, qty) {
      var list = readQuote(), q = Math.max(1, Math.min(10000, parseInt(qty, 10) || 1));
      var ex = list.find(function (i) { return i.id === p.id; });
      if (ex) ex.qty = Math.min(10000, ex.qty + q);
      else list.push({ id: p.id, slug: p.slug, name: p.name, sku: p.sku || '', image: p.image || '', qty: q });
      writeQuote(list);
    },
    setQty: function (id, qty) {
      var q = Math.max(1, Math.min(10000, parseInt(qty, 10) || 1));
      writeQuote(readQuote().map(function (i) { return i.id === id ? Object.assign({}, i, { qty: q }) : i; }));
    },
    remove: function (id) { writeQuote(readQuote().filter(function (i) { return i.id !== id; })); },
    clear: function () { writeQuote([]); },
  };

  function param(name) { try { return new URLSearchParams(location.search).get(name) || ''; } catch (e) { return ''; } }
  function whatsappUrl(number, text) {
    var digits = (number || '').replace(/\D/g, '');
    if (digits.length < 8) return '';
    return 'https://wa.me/' + digits + (text ? '?text=' + encodeURIComponent(text) : '');
  }

  /* Contact details from Website settings → every element tagged data-aof="email|phone|address" */
  load().then(function (site) {
    var st = site.settings || {};
    var esc = function (t) { return String(t).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); };
    var addrHtml = '';
    if (st.address) { var i = st.address.lastIndexOf(', '); addrHtml = i > 0 ? esc(st.address.slice(0, i)) + '<br>' + esc(st.address.slice(i + 2)) : esc(st.address); }
    var bind = function () {
      document.querySelectorAll('[data-aof]').forEach(function (el) {
        var k = el.getAttribute('data-aof');
        if (k === 'email' && st.email) { if (el.textContent !== st.email) el.textContent = st.email; el.setAttribute('href', 'mailto:' + st.email); }
        else if (k === 'phone' && st.phone) { if (el.textContent !== st.phone) el.textContent = st.phone; el.setAttribute('href', 'tel:' + st.phone.replace(/[^\d+]/g, '')); }
        else if (k === 'address' && addrHtml && el.innerHTML !== addrHtml) el.innerHTML = addrHtml;
      });
    };
    bind();
    new MutationObserver(bind).observe(document.documentElement, { childList: true, subtree: true });
  });

  load().then(function (site) {
    if (!site.catalogueUrl) return;
    var apply = function () {
      document.querySelectorAll('a[href="Catalogue.dc.html"]').forEach(function (a) {
        if (/download catalogue/i.test(a.textContent)) { a.href = site.catalogueUrl; a.target = '_blank'; a.rel = 'noopener'; }
      });
    };
    apply();
    new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true });
  });

  window.AOF = { client: client, load: load, submitEnquiry: submitEnquiry, quote: quote, param: param, slugify: slugify, whatsappUrl: whatsappUrl, usingSupabase: useSupabase };

  /* <aof-quote-link> — header badge that stays in sync with the quote list */
  if (!customElements.get('aof-quote-link')) {
    customElements.define('aof-quote-link', class extends HTMLElement {
      connectedCallback() {
        if (!this._root) this._root = this.attachShadow({ mode: 'open' });
        this._render = this._render.bind(this);
        document.addEventListener('aof-quote-change', this._render);
        window.addEventListener('storage', this._render);
        this._render();
      }
      disconnectedCallback() {
        document.removeEventListener('aof-quote-change', this._render);
        window.removeEventListener('storage', this._render);
      }
      _render() {
        var n = quote.count();
        this._root.innerHTML = '<style>a{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:40px;padding:0 20px;border-radius:12px;background:#C8A96A;border:1px solid #C8A96A;color:#111;text-decoration:none;font-family:"Cormorant Garamond",serif;font-size:17px;font-weight:600;white-space:nowrap;transition:background .28s ease,color .28s ease,transform .28s ease,box-shadow .28s ease}a:hover{background:#161616;border-color:#161616;color:#fff;transform:translateY(-2px);box-shadow:0 16px 32px -12px rgba(0,0,0,.45)}a:hover .b{background:#C8A96A;color:#111}a:focus-visible{outline:2px solid #C8A96A;outline-offset:3px}</style><a href="Quote.dc.html" aria-label="Quote list, ' + n + ' items">' +
          '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6l1 3h4v15H4V6h4z"></path><path d="M9 12h6M9 16h4"></path></svg>' +
          '<span>Quote</span>' +
          (n ? '<span class="b" style="min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:#111;color:#C8A96A;font-size:12.5px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;">' + n + '</span>' : '') +
          '</a>';
      }
    });
  }
})();
