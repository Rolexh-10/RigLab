  function partsListHtml() {
    var f = S.pf, q = f.q.trim().toLowerCase(), ff = f.cat === 'all' ? null : FILTER_FIELD[f.cat];
    var base = f.cat === 'all' ? C.PARTS : C.partsOf(f.cat);
    var list = base.filter(function (p) {
      if (ff && f.f && p[ff] !== f.f) return false;
      if (f.fav && S.wish.indexOf(p.id) < 0) return false;
      return partMatches(p, q);
    });
    list.sort(function (a, b) {
      if (f.sort === 'price-desc') return startPrice(b) - startPrice(a);
      if (f.sort === 'name') return a.name.localeCompare(b.name);
      return startPrice(a) - startPrice(b);
    });
    if (!list.length) return '<div class="note">' + L('لا نتائج مطابقة. جرّب كلمة أقصر أو فئة «الكل».', 'No matching results. Try a shorter word or the "All" category.') + '</div>';
    var CAP = 40, more = list.length > CAP; list = list.slice(0, CAP);
    var out = list.map(function (p) {
      var open = S.expanded === p.id, offers = C.offersFor(p.id), inStock = offers.filter(function (o) { return o.available; }), best = inStock[0] || null, detail = '';
      var inCart = S.cart.filter(function (x) { return x.partId === p.id; })[0];
      if (open) {
        var rows = C.specRows(p).map(function (r) { return '<tr><th>' + L(r.ar, r.en) + '</th><td class="mono">' + esc(r.v) + '</td></tr>'; }).join('');
        var orows = offers.map(function (o) {
          var isBest = best && o.storeId === best.storeId, sel = inCart && inCart.storeId === o.storeId;
          return '<tr class="' + (isBest ? 'bestrow' : '') + '"><td>' + storeLabel(o) + (o.sponsored ? ' <span class="tag sp">' + L('برعاية', 'Sponsored') + '</span>' : '') + (isBest ? ' <span class="tag best">' + L('الأقل سعراً', 'Lowest') + '</span>' : '') + '</td><td class="num">' + fmt(o.price) + '</td><td>' + (o.available ? L('متوفر', 'In stock') : L('غير متوفر', 'Out of stock')) + '</td><td>' +
            (o.available ? '<button class="btn sm' + (sel ? '' : ' pri') + '" data-act="add-cart" data-id="' + p.id + '" data-store="' + o.storeId + '">' + (sel ? L('في السلة ✓', 'In cart ✓') : L('أضف للسلة', 'Add to cart')) + '</button>' : '—') + '</td></tr>';
        }).join('');
        detail = '<div class="stack-s" style="margin-top:12px"><div class="row"><b class="small">' + L('الأسعار حسب المتجر', 'Price by store') + '</b>' + smp() + '</div><div class="tw"><table style="min-width:440px"><thead><tr><th>' + L('المتجر', 'Store') + '</th><th class="num">' + L('السعر (د.ع)', 'Price (IQD)') + '</th><th>' + L('التوفر', 'Stock') + '</th><th></th></tr></thead><tbody>' + orows + '</tbody></table></div>' +
          '<p class="small muted">' + L('الترتيب حسب السعر فقط، والرعاية لا تغيّره. العروض تجريبية وليست أسعار محلات حقيقية.', 'Sorted by price only; sponsorship never changes it. Offers are samples, not real shop prices.') + '</p>' +
          '<details><summary>' + L('المواصفات', 'Specs') + '</summary><div class="tw"><table><tbody>' + rows + '</tbody></table></div></details></div>';
      }
      var priceBlock = best ? '<b class="mono" style="color:var(--accent)">' + fmt(best.price) + '</b> <span class="small muted">' + unit() + '</span><div class="small muted">' + storeLabel(best) + ' · ' + L(inStock.length + ' من ' + offers.length + ' متاجر', inStock.length + ' of ' + offers.length + ' stores') + '</div>' : '<span class="small muted">' + L('غير متوفر حالياً', 'Not in stock') + '</span>';
      return '<div class="card"><div class="row between" style="align-items:flex-start"><div style="min-width:0"><div class="small muted">' + T(C.catInfo(p.cat)) + '</div><h3 style="overflow-wrap:anywhere">' + esc(pname(p)) + '</h3><div class="small muted mono">' + C.shortSpec(p) + '</div></div><div style="text-align:end;flex:none">' + priceBlock + '<div>' + smp() + '</div></div></div>' +
        '<div class="row" style="margin-top:10px"><button class="btn sm" data-act="parts-toggle" data-id="' + p.id + '">' + (open ? L('إخفاء', 'Hide') : L('قارن الأسعار', 'Compare prices')) + '</button>' +
        '<button class="btn sm pri" data-act="add-cart" data-id="' + p.id + '" data-store="' + (best ? best.storeId : '') + '"' + (best ? '' : ' disabled') + '>' + (inCart ? L('في السلة ✓', 'In cart ✓') : L('أضف للسلة', 'Add to cart')) + '</button>' +
        '<button class="btn sm ghost" data-act="parts-add" data-id="' + p.id + '">' + L('للتجميعة', 'To build') + '</button><button class="btn sm ghost wishbtn' + (S.wish.indexOf(p.id) >= 0 ? ' on' : '') + '" data-act="wish" data-id="' + p.id + '" aria-pressed="' + (S.wish.indexOf(p.id) >= 0) + '" aria-label="' + L('المفضلة', 'Favourite') + '">' + (S.wish.indexOf(p.id) >= 0 ? '♥' : '♡') + '</button></div>' + detail + '</div>';
    }).join('');
    return out + (more ? '<div class="note" style="grid-column:1/-1">' + L('يعرض أول 40 نتيجة. ضيّق البحث لرؤية الباقي.', 'Showing the first 40 results. Narrow the search to see the rest.') + '</div>' : '');
  }
  VIEWS.parts = {
    html: function () {
      var f = S.pf, ff = f.cat === 'all' ? null : FILTER_FIELD[f.cat];
      var chips = '<button class="chip" data-act="parts-fav" aria-pressed="' + f.fav + '">♥ ' + L('المفضلة', 'Favourites') + ' (' + S.wish.length + ')</button><button class="chip" data-act="parts-cat" data-cat="all" aria-pressed="' + (f.cat === 'all') + '">' + L('الكل', 'All') + '</button>' + C.CATS.map(function (c) { return '<button class="chip" data-act="parts-cat" data-cat="' + c.key + '" aria-pressed="' + (f.cat === c.key) + '">' + T(c) + '</button>'; }).join('');
      var filt = '';
      if (ff) {
        var vals = []; C.partsOf(f.cat).forEach(function (p) { if (vals.indexOf(p[ff]) < 0) vals.push(p[ff]); });
        filt = '<select id="pfilt" aria-label="filter"><option value="">' + L('الكل', 'All') + '</option>' + vals.map(function (v) { return '<option value="' + esc(v) + '"' + (f.f === v ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('') + '</select>';
      }
      return '<div class="stack"><div class="stack-s"><h1>' + L('القطع والأسعار', 'Parts & prices') + '</h1><div class="note warn">' + L('الأسعار والمتاجر هنا نماذج تجريبية. أسعار المتاجر العراقية الحقيقية تُضاف بموافقة كل متجر مع تاريخ تحديثها.', 'Prices and stores here are samples. Real Iraqi store prices are added with each store\'s consent and a last-updated date.') + '</div></div>' +
        '<div class="chips">' + chips + '</div><div class="grid c3"><input type="text" id="pq" placeholder="' + L('بحث: معالج، RTX 4060، DDR5…', 'Search: CPU, RTX 4060, DDR5…') + '" value="' + esc(f.q) + '" aria-label="' + L('بحث', 'Search') + '">' + filt +
        '<select id="psort" aria-label="sort"><option value="price-asc"' + (f.sort === 'price-asc' ? ' selected' : '') + '>' + L('الأرخص أولاً', 'Cheapest first') + '</option><option value="price-desc"' + (f.sort === 'price-desc' ? ' selected' : '') + '>' + L('الأغلى أولاً', 'Priciest first') + '</option><option value="name"' + (f.sort === 'name' ? ' selected' : '') + '>' + L('الاسم', 'Name') + '</option></select></div>' +
        adSlot('parts') + '<div class="grid c2" id="plist"></div></div>';
    },
    bind: function () { $('plist').innerHTML = partsListHtml(); },
    input: function (e) {
      if (e.target.id === 'pq') S.pf.q = e.target.value;
      else if (e.target.id === 'psort') S.pf.sort = e.target.value;
      else if (e.target.id === 'pfilt') S.pf.f = e.target.value;
      else return;
      $('plist').innerHTML = partsListHtml();
    }
  };

  // Compare
