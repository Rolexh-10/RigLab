  // ---------- small components ----------
  var ST_LABEL = {
    ok: ['متوافق', 'OK'], warn: ['تحذير', 'Warning'], error: ['غير متوافق', 'Incompatible'],
    unknown: ['غير مؤكد', 'Unconfirmed'], pending: ['بانتظار', 'Pending'], info: ['ملاحظة', 'Note']
  };
  function sb(s) { return '<span class="badge b-' + s + '">' + L(ST_LABEL[s][0], ST_LABEL[s][1]) + '</span>'; }
  function vb(v) { return '<span class="badge b-' + v + '">' + T(C.VERDICT[v]) + '</span>'; }
  var CONF = { high: ['ثقة عالية', 'High confidence'], medium: ['ثقة متوسطة', 'Medium confidence'], low: ['ثقة منخفضة', 'Low confidence'] };
  var SRC = { spec: ['من المواصفات', 'From specs'], estimate: ['تقدير', 'Estimate'], 'vendor-sample': ['توصية الشركة (عيّنة)', 'Vendor rec. (sample)'] };

  function compatPanel(parts) {
    var res = C.checkCompat(parts);
    var ord = { error: 0, warn: 1, unknown: 2, ok: 3, info: 4, pending: 5 };
    var items = res.items.slice().sort(function (a, b) { return ord[a.status] - ord[b.status]; });
    function li(i) {
      var meta = '';
      if (i.confidence) meta = L(CONF[i.confidence][0], CONF[i.confidence][1]) + (i.source ? ' · ' + L(SRC[i.source][0], SRC[i.source][1]) : '');
      return '<li class="s-' + i.status + '"><div><div class="t">' + sb(i.status) + '<b>' + T(i.title) + '</b></div><p>' + T(i.detail) + '</p>' + (meta ? '<div class="meta">' + meta + '</div>' : '') + '</div></li>';
    }
    var main = items.filter(function (i) { return i.status !== 'pending'; }).map(li).join('');
    var pend = items.filter(function (i) { return i.status === 'pending'; });
    var missing = res.missingRequired.map(function (k) { return T(C.catInfo(k)); }).join(L('، ', ', '));
    return '<div class="stack-s">' +
      '<div class="row between"><div class="row">' + vb(res.verdict) +
      '<span class="small muted">' + res.counts.error + ' ' + L('أخطاء', 'errors') + ' · ' + res.counts.warn + ' ' + L('تحذيرات', 'warnings') + '</span></div></div>' +
      (res.missingRequired.length && res.verdict !== 'empty' ? '<div class="note">' + L('قطع ناقصة: ', 'Missing parts: ') + missing + '. ' + L('الفحص غير مكتمل.', 'The check is incomplete.') + '</div>' : '') +
      (res.verdict === 'empty' ? '<div class="note">' + L('اختر قطعتين على الأقل ليبدأ الفحص.', 'Pick at least two parts to start checking.') + '</div>' : '') +
      '<ul class="chk">' + main + '</ul>' +
      (pend.length ? '<details><summary>' + L('فحوصات بانتظار قطع (' + pend.length + ')', 'Checks waiting for parts (' + pend.length + ')') + '</summary><ul class="chk">' + pend.map(li).join('') + '</ul></details>' : '') +
      '</div>';
  }
  function powerLine(parts) {
    if (!parts.cpu && !parts.gpu) return '';
    var e = C.estimatePower(parts);
    return '<div class="note">' + L('تقدير الاستهلاك: ', 'Estimated draw: ') + '<b class="mono">' + e.total + ' W</b> · ' + L('PSU موصى به: ', 'Recommended PSU: ') + '<b class="mono">' + e.recommended + ' W</b>' +
      (e.complete ? '' : ' · ' + L('(ناقص: أضف المعالج وكرت الشاشة)', '(incomplete: add CPU and GPU)')) + '</div>';
  }
  function partsList(ids) {
    var parts = C.resolve(ids);
    return '<ul class="parts-list">' + C.CATS.filter(function (c) { return parts[c.key]; }).map(function (c) {
      var p = parts[c.key];
      return '<li><span><span class="muted small">' + T(c) + ' · </span>' + esc(pname(p)) + '</span><span class="pr">' + fmt(C.priceOf(p)) + '</span></li>';
    }).join('') + '</ul>';
  }
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 2200);
  }
  function copyText(id) {
    var el = $(id); if (!el) return;
    function fb() { try { el.focus(); el.select(); } catch (e) {} toast(L('حدّد النص وانسخه يدوياً', 'Select the text and copy it manually')); }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(el.value).then(function () { toast(L('تم النسخ', 'Copied')); }, fb);
      else fb();
    } catch (e) { fb(); }
  }

