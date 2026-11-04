  // ---------- analytics (local counters; GA4 only if a gtag exists) ----------
  function track(name) {
    var ev = sget('riglab.events', {}); ev[name] = (ev[name] || 0) + 1; sset('riglab.events', ev);
    try { if (window.gtag) window.gtag('event', name); } catch (e) {}
  }

  // ---------- routing ----------
  var TOOL_ROUTES = { 'psu-calc': 'psu', 'ups-calc': 'ups', 'upgrade-advisor': 'upgrade', 'monitor-selector': 'monitor', 'storage-calc': 'storage', 'power-calc': 'power' };
  var TOOL_HASH = { psu: 'psu-calc', ups: 'ups-calc', upgrade: 'upgrade-advisor', monitor: 'monitor-selector', storage: 'storage-calc', power: 'power-calc' };
  var NAV = [
    { r: 'home', ar: 'الرئيسية', en: 'Home' }, { r: 'parts', ar: 'القطع والأسعار', en: 'Parts & prices' }, { r: 'ready', ar: 'تجميعات جاهزة', en: 'Ready builds' },
    { r: 'builder', ar: 'PC Builder', en: 'PC Builder' }, { r: 'budget', ar: 'الميزانية الذكية', en: 'Smart Budget' },
    { r: 'compat', ar: 'فحص التوافق', en: 'Compatibility' }, { r: 'compare', ar: 'مقارنة', en: 'Compare' },
    { r: 'tools', ar: 'الأدوات', en: 'Tools' }, { r: 'builds', ar: 'تجميعاتي', en: 'My Builds' },
    { r: 'trust', ar: 'عن RigLab', en: 'About' }
  ];
  var ROUTES = ['home', 'parts', 'ready', 'builder', 'budget', 'compat', 'compare', 'tools', 'cart', 'builds', 'trust', 'admin'].concat(Object.keys(TOOL_ROUTES));
  function route() { var h = (location.hash || '#home').slice(1); return ROUTES.indexOf(h) >= 0 ? h : 'home'; }
  function go(r) { location.hash = '#' + r; }

