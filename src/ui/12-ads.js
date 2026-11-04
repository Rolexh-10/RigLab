  // ---------- ad slots ----------
  // Fill a slot with a direct sponsor: ADS.home = { advertiser:'..', title:'..', text:'..', cta:'..', url:'https://..' }
  // Ads are always labelled, never appear inside compatibility results, and never change price order.
  var CONTACT = { email: 'rolexmud@gmail.com', wa: '+9647812388994', waLink: 'https://wa.me/9647812388994' };
  var ADS = { home: null, parts: null, builder: null, cart: null, budget: null, compat: null, compare: null, tools: null, builds: null };
  function adSlot(name) {
    var a = ADS[name], tag = '<span class="tag sp">' + L('إعلان', 'Ad') + '</span>';
    if (a && a.url) {
      return '<aside class="ad" data-slot="' + name + '" aria-label="' + L('إعلان', 'Advertisement') + '"><div class="row between">' + tag + '<span class="small muted">' + esc(a.advertiser || '') + '</span></div><h3>' + esc(a.title || '') + '</h3><p class="small">' + esc(a.text || '') + '</p><a class="btn sm pri" href="' + esc(a.url) + '" target="_blank" rel="sponsored noopener noreferrer" data-act="ad-click" data-slot="' + name + '">' + esc(a.cta || L('زيارة', 'Visit')) + ' ↗</a></aside>';
    }
    return '<aside class="ad empty" data-slot="' + name + '" aria-label="' + L('مساحة إعلانية', 'Ad space') + '"><div class="row between">' + tag + '</div><p class="small muted">' + L('مساحة إعلانية متاحة هنا · ', 'Ad space available here · ') + '<a href="' + CONTACT.waLink + '" target="_blank" rel="noopener noreferrer">' + L('للإعلان تواصل واتساب', 'Advertise via WhatsApp') + '</a></p></aside>';
  }

