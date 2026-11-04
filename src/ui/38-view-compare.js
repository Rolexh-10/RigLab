  function cmpOptions(cat, sel) { return C.partsOf(cat).map(function (p) { return '<option value="' + p.id + '"' + (sel === p.id ? ' selected' : '') + '>' + esc(pname(p)) + '</option>'; }).join(''); }
  function buildOptions(sel) {
    var o = '<option value="current"' + (sel === 'current' ? ' selected' : '') + '>' + L('تجميعة Builder الحالية', 'Current Builder build') + '</option>';
    S.saved.forEach(function (b) { o += '<option value="' + b.id + '"' + (sel === String(b.id) ? ' selected' : '') + '>' + esc(b.name) + '</option>'; });
    return o;
  }
  function buildById(id) { return C.savedParts(S.saved, S.build, id); }
  VIEWS.compare = {
    html: function () {
      var c = S.cmp, body = '';
      if (c.mode === 'parts') {
        var A = C.getPart(c.a), B = C.getPart(c.b);
        if (A && B && A.cat !== c.cat) A = null;
        var ra = A ? C.specRows(A) : [], rb = B ? C.specRows(B) : [], rows = '';
        ra.forEach(function (r, i) {
          var o = rb[i], diff = o && o.v !== r.v;
          rows += '<tr><th>' + L(r.ar, r.en) + '</th><td class="' + (diff ? 'diff' : '') + ' mono">' + esc(r.v) + '</td><td class="' + (diff ? 'diff' : '') + ' mono">' + (o ? esc(o.v) : '—') + '</td></tr>';
        });
        if (A && B) {
          var pa = C.priceOf(A), pb = C.priceOf(B);
          rows += '<tr><th>' + L('السعر (تجريبي)', 'Price (sample)') + '</th><td class="mono ' + (pa < pb ? 'diff' : '') + '">' + fmt(pa) + '</td><td class="mono ' + (pb < pa ? 'diff' : '') + '">' + fmt(pb) + '</td></tr>';
        }
        body = '<div class="grid c3"><label class="f" for="c-cat">' + L('الفئة', 'Category') + '<select id="c-cat">' + C.CATS.map(function (x) { return '<option value="' + x.key + '"' + (c.cat === x.key ? ' selected' : '') + '>' + T(x) + '</option>'; }).join('') + '</select></label>' +
          '<label class="f" for="c-a">A<select id="c-a">' + cmpOptions(c.cat, c.a) + '</select></label><label class="f" for="c-b">B<select id="c-b">' + cmpOptions(c.cat, c.b) + '</select></label></div>' +
          '<div class="tw"><table><thead><tr><th></th><th>' + (A ? esc(pname(A)) : '—') + '</th><th>' + (B ? esc(pname(B)) : '—') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div><p class="small muted">' + L('التظليل يعني اختلافاً في القيمة (وليس أفضلية). لا نعرض FPS أو Benchmarks لأنها غير متوفرة بعد.', 'Shading marks a differing value, not a winner. No FPS or benchmarks are shown because none are available yet.') + '</p>';
      } else {
        var ba = buildById(c.ba), bb = buildById(c.bb || (S.saved[0] ? S.saved[0].id : 'current'));
        var pA = C.resolve(ba), pB = C.resolve(bb), rA = C.checkCompat(pA), rB = C.checkCompat(pB), eA = C.estimatePower(pA), eB = C.estimatePower(pB), rows2 = '';
        C.CATS.forEach(function (x) {
          var a = pA[x.key], b = pB[x.key], diff = (a && a.id) !== (b && b.id);
          rows2 += '<tr><th>' + T(x) + '</th><td class="' + (diff ? 'diff' : '') + '">' + (a ? esc(pname(a)) : '—') + '</td><td class="' + (diff ? 'diff' : '') + '">' + (b ? esc(pname(b)) : '—') + '</td></tr>';
        });
        var tA = C.buildTotal(pA), tB = C.buildTotal(pB);
        rows2 += '<tr><th>' + L('المجموع (تجريبي)', 'Total (sample)') + '</th><td class="mono ' + (tA < tB ? 'diff' : '') + '">' + fmt(tA) + '</td><td class="mono ' + (tB < tA ? 'diff' : '') + '">' + fmt(tB) + '</td></tr>' +
          '<tr><th>' + L('استهلاك تقديري', 'Est. draw') + '</th><td class="mono">' + eA.total + ' W</td><td class="mono">' + eB.total + ' W</td></tr>' +
          '<tr><th>' + L('الحالة', 'Status') + '</th><td>' + vb(rA.verdict) + '</td><td>' + vb(rB.verdict) + '</td></tr>';
        body = '<div class="grid c2"><label class="f" for="cb-a">A<select id="cb-a">' + buildOptions(c.ba) + '</select></label><label class="f" for="cb-b">B<select id="cb-b">' + buildOptions(c.bb || (S.saved[0] ? String(S.saved[0].id) : 'current')) + '</select></label></div><div class="tw"><table><thead><tr><th></th><th>A</th><th>B</th></tr></thead><tbody>' + rows2 + '</tbody></table></div>' +
          (S.saved.length ? '' : '<div class="note">' + L('احفظ تجميعة من Builder لتقارنها هنا.', 'Save a build from Builder to compare it here.') + '</div>');
      }
      return '<div class="stack"><h1>' + L('مقارنة', 'Compare') + '</h1><div class="chips"><button class="chip" data-act="cmp-mode" data-v="parts" aria-pressed="' + (c.mode === 'parts') + '">' + L('قطعتان', 'Two parts') + '</button><button class="chip" data-act="cmp-mode" data-v="builds" aria-pressed="' + (c.mode === 'builds') + '">' + L('تجميعتان', 'Two builds') + '</button></div>' + body + adSlot('compare') + '</div>';
    },
    input: function (e) {
      var c = S.cmp, id = e.target.id;
      if (id === 'c-cat') { c.cat = e.target.value; var l = C.partsOf(c.cat); c.a = l[0].id; c.b = (l[1] || l[0]).id; }
      else if (id === 'c-a') c.a = e.target.value;
      else if (id === 'c-b') c.b = e.target.value;
      else if (id === 'cb-a') c.ba = e.target.value;
      else if (id === 'cb-b') c.bb = e.target.value;
      else return;
      render();
    }
  };

  // Tools
