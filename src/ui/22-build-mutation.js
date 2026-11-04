  // ---------- build mutation ----------
  function setPart(target, cat, id) {
    var b = bget(target);
    var wasEmpty = Object.keys(b).length === 0;
    b[cat] = id;
    if (target !== 'compat') {
      persistBuild();
      if (wasEmpty) track('build_started');
      var parts = C.resolve(b);
      var done = C.CATS.every(function (c) { return !c.required || parts[c.key]; });
      if (done && !S.completedLogged) { S.completedLogged = true; track('build_completed'); }
      if (!done) S.completedLogged = false;
    }
  }
  function summaryText(build) {
    var parts = C.resolve(build), res = C.checkCompat(parts);
    var lines = ['RigLab — ' + L('تجميعة (أسعار تجريبية)', 'Build (sample prices)')];
    C.CATS.forEach(function (c) { var p = parts[c.key]; if (p) lines.push(T(c) + ': ' + pname(p) + ' — ' + moneyT(C.priceOf(p))); });
    lines.push(L('المجموع: ', 'Total: ') + moneyT(C.buildTotal(parts)));
    lines.push(L('الحالة: ', 'Status: ') + T(C.VERDICT[res.verdict]));
    lines.push(L('كود الاستيراد: ', 'Import code: ') + C.encodeBuild(build));
    return lines.join('\n');
  }


