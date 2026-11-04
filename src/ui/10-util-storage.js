  // ---------- storage (try/catch + in-memory fallback) ----------
  var mem = {};
  function sget(k, d) { try { var v = localStorage.getItem(k); if (v != null) return JSON.parse(v); } catch (e) {} return (k in mem) ? mem[k] : d; }
  function sset(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var lang = sget('riglab.lang', 'ar') === 'en' ? 'en' : 'ar';
  function L(ar, en) { return (lang === 'en' && en != null) ? en : ar; }
  function T(o) { return o ? (lang === 'en' ? o.en : o.ar) : ''; }
  function pname(p) { return lang === 'ar' ? (p.nameAr || p.name) : p.name; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function unit() { return L('د.ع', 'IQD'); }
  function money(n) { return '<span class="mono">' + fmt(n) + '</span> ' + unit(); }
  function moneyT(n) { return fmt(n) + ' ' + unit(); }
  function $(id) { return document.getElementById(id); }
  function val(id) { var e = $(id); return e ? e.value : ''; }
  function num(id, d) { var v = parseFloat(val(id)); return isFinite(v) ? v : d; }
  function smp() { return '<span class="tag sample">' + L('تجريبي', 'Sample') + '</span>'; }

