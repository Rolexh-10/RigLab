  // ---------- views ----------
  var VIEWS = {};

  // Home
  function homeSamples() {
    if (!S.homeSamples) {
      S.homeSamples = [1000000, 1500000, 2500000].map(function (b) { var r = C.suggestBuilds({ budget: b, usage: '1080p' }); return { budget: b, r: r.results[0] || null }; });
    }
    return S.homeSamples;
  }
  // neon line-art for the home menu cards: each drawing hints at what the section does
  var ART = {
    parts: '<rect x="62" y="30" width="38" height="38" rx="5"/><path d="M72 30v-8M81 30v-8M90 30v-8M72 68v8M81 68v8M90 68v8M62 42h-8M62 52h-8M62 62h-8M100 42h8M100 52h8M100 62h8"/><circle cx="108" cy="62" r="17"/><path d="M120 74l16 16"/><path d="M100 62h16M108 54v16" opacity=".6"/>',
    builder: '<rect x="50" y="10" width="62" height="84" rx="6"/><rect x="58" y="20" width="46" height="36" rx="3" opacity=".7"/><circle cx="68" cy="72" r="8"/><circle cx="92" cy="72" r="8"/><path d="M68 64v16M60 72h16M92 64v16M84 72h16" opacity=".6"/><rect x="58" y="84" width="46" height="4" rx="2"/><path d="M118 20h22M118 36h30M118 52h16"/>',
    cart: '<path d="M30 20h18l10 46h54l10-34H52"/><circle cx="66" cy="82" r="7"/><circle cx="110" cy="82" r="7"/><path d="M70 44h40M72 54h36" opacity=".6"/><path d="M128 14l4 8M140 20l-6 6M146 36l-8 0" />',
    compat: '<path d="M80 10l34 12v26c0 22-14 38-34 46-20-8-34-24-34-46V22z"/><path d="M62 52l14 14 26-30"/><path d="M12 38h20M12 54h20M128 38h20M128 54h20" opacity=".6"/>',
    budget: '<ellipse cx="62" cy="76" rx="30" ry="9"/><path d="M32 76v-14c0 5 13 9 30 9s30-4 30-9v14M32 62V48c0 5 13 9 30 9s30-4 30-9v14M32 48V34c0 5 13 9 30 9s30-4 30-9"/><ellipse cx="62" cy="34" rx="30" ry="9"/><circle cx="116" cy="40" r="20"/><path d="M116 30v20M110 36h10a4 4 0 010 8h-8" />',
    compare: '<path d="M80 12v76M52 88h56M30 30h100"/><path d="M30 30l-16 34h32zM130 30l-16 34h32z"/><path d="M14 64a16 6 0 0032 0M114 64a16 6 0 0032 0"/><circle cx="80" cy="12" r="4"/>',
    'psu-calc': '<rect x="34" y="26" width="92" height="54" rx="6"/><circle cx="62" cy="53" r="17"/><path d="M62 36l-8 22h10l-4 14 14-22H62z" /><path d="M92 40h24M92 52h24M92 64h24" opacity=".6"/><path d="M34 40h-14M34 66h-14"/>',
    'ups-calc': '<rect x="24" y="30" width="100" height="48" rx="7"/><rect x="124" y="46" width="12" height="16" rx="3"/><rect x="32" y="38" width="20" height="32" rx="2" /><rect x="58" y="38" width="20" height="32" rx="2"/><rect x="84" y="38" width="20" height="32" rx="2" opacity=".5"/><path d="M96 12l-10 12h12l-8 12" />',
    'upgrade-advisor': '<rect x="38" y="44" width="44" height="44" rx="5"/><path d="M48 44v-8M60 44v-8M72 44v-8M48 88v8M60 88v8M72 88v8"/><path d="M104 84V30M88 46l16-18 16 18"/><path d="M122 62h18M122 76h26" opacity=".6"/>',
    'power-calc': '<path d="M84 8l-30 44h24l-10 40 40-54H88z"/><path d="M24 72a42 42 0 0112-44M136 72a42 42 0 00-12-44" opacity=".6"/><path d="M20 90h32M108 90h32" opacity=".6"/>'
  };
  ART.ready = '<rect x="46" y="14" width="56" height="74" rx="6"/><rect x="54" y="24" width="40" height="26" rx="3" opacity=".7"/><circle cx="74" cy="68" r="9"/><path d="M69 68l4 4 7-8"/><path d="M114 26h26M114 46h20M114 66h28" opacity=".6"/>';
  ART.tools = '<circle cx="62" cy="52" r="16"/><path d="M62 28v8M62 68v8M38 52h8M78 52h8M45 35l6 6M73 63l6 6M45 69l6-6M73 41l6-6"/><path d="M104 80l26-26a14 14 0 10-10-10L94 70z"/>';
  ART.builds = '<path d="M40 22h38l8 10h34v52H40z"/><path d="M40 44h80" opacity=".6"/><path d="M104 14v22l-8-6-8 6V14z"/>';
  ART.trust = '<path d="M80 10l34 12v26c0 22-14 38-34 46-20-8-34-24-34-46V22z"/><circle cx="80" cy="44" r="4"/><path d="M80 52v16"/><path d="M12 38h20M128 38h20M12 54h14M134 54h14" opacity=".6"/>';
  ART.budget = ART.budget;
  var ART_COL = { ready: '#ff2d4b', tools: '#ffb224', builds: '#ff5d73', trust: '#7dff8a', parts: '#ff2d4b', builder: '#ff2d4b', cart: '#ff5d73', compat: '#7dff8a', budget: '#ffb224', compare: '#8fb3ff', 'psu-calc': '#ffb224', 'ups-calc': '#7dff8a', 'upgrade-advisor': '#7dff8a', 'power-calc': '#ffb224' };
  function toolArt(id) { return ART[id] ? '<svg class="tart" viewBox="0 0 160 100" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ART[id] + '</svg>' : ''; }

  VIEWS.home = {
    html: function () {
      var cards = [
        ['parts', L('القطع والأسعار', 'Parts & prices'), 'ابحث عن أي قطعة وقارن سعرها بين المتاجر.', 'Search any part and compare its price across stores.'],
        ['cart', L('سلة المشتريات', 'Cart'), 'اجمع القطع من أكثر من متجر وانتقل لموقع كل متجر للشراء.', 'Collect parts from several stores and go to each store to buy.'],
        ['compat', L('فحص التوافق', 'Compatibility Checker'), 'سوكيت، رام، أبعاد، وطاقة، مع سبب كل نتيجة ودرجة الثقة.', 'Socket, RAM, size and power with the reason and confidence for each result.']
      ];
      var catChips = C.CATS.map(function (c) { return '<button class="chip" data-act="qcat" data-cat="' + c.key + '">' + T(c) + '</button>'; }).join('');
      var samples = homeSamples().map(function (s) {
        if (!s.r) return '';
        var p = C.resolve(s.r.ids);
        return '<div class="card stack-s"><div class="row between"><h3>' + L('ميزانية ', 'Budget ') + fmt(s.budget) + '</h3>' + smp() + '</div><p class="small muted">' + L('ألعاب 1080p', '1080p gaming') + '</p><ul class="parts-list"><li><span>' + esc(pname(p.cpu)) + '</span></li><li><span>' + esc(pname(p.gpu)) + '</span></li><li><span>' + p.ram.gb + 'GB ' + p.ram.type + '</span></li></ul><div class="row between"><b>' + money(s.r.total) + '</b><button class="btn sm" data-act="open-build" data-b="' + C.encodeBuild(s.r.ids) + '">' + L('افتح في Builder', 'Open in Builder') + '</button></div></div>';
      }).join('');
      return '<div class="stack">' +
        '<section class="hero stack-s"><div class="kicker">BUILD SMARTER · SPEND LESS · GAME BETTER</div><h1>' + L('شنو تريد تشتري؟ ومنين الأرخص؟', 'What do you want to buy, and where is it cheapest?') + '</h1>' +
        '<p class="lead">' + L('ابحث عن معالج أو كرت شاشة أو أي قطعة، وشوف أي متجر عنده وبأي سعر، ثم أضفها للسلة.', 'Search a CPU, GPU or any part, see which stores have it and at what price, then add it to your cart.') + '</p>' +
        '<div class="searchbox"><input type="text" id="h-q" enterkeyhint="search" autocomplete="off" placeholder="' + L('مثال: Ryzen 5 أو RTX 4060…', 'e.g. Ryzen 5 or RTX 4060…') + '" aria-label="' + L('بحث عن قطعة', 'Search a part') + '"><button class="btn pri" data-act="q-search">' + L('ابحث', 'Search') + '</button></div>' +
        '<div class="chips">' + catChips + '</div></section>' +
        adSlot('home') + '<section class="card stack-s"><h2>' + L('ابدأ بميزانيتك', 'Start with your budget') + '</h2>' +
        '<div class="grid c2"><label class="f" for="h-amount">' + L('الميزانية (دينار عراقي)', 'Budget (IQD)') + '<input type="number" id="h-amount" inputmode="numeric" min="300000" step="50000" value="' + S.budget.amount + '"></label>' +
        '<label class="f" for="h-usage">' + L('الاستخدام', 'Use') + '<select id="h-usage">' + Object.keys(C.USAGE).map(function (k) { return '<option value="' + k + '"' + (S.budget.usage === k ? ' selected' : '') + '>' + T(C.USAGE[k]) + '</option>'; }).join('') + '</select></label></div>' +
        '<div class="row"><button class="btn pri" data-act="home-go">' + L('اقترح تجميعات', 'Suggest builds') + '</button><a class="btn" href="#builder">' + L('ابدأ تجميعتك بنفسك', 'Build it yourself') + '</a></div></section>' +
        '<section class="stack-s"><div class="hdr-sec"><h2>' + L('كل الأقسام', 'Everything') + '</h2></div><div class="grid c3">' + cards.map(function (c) {
          return '<a class="card toolcard art" href="#' + c[0] + '" style="--tc:' + (ART_COL[c[0]] || '#ff2d4b') + '">' + toolArt(c[0]) + '<h3>' + c[1] + '</h3><p>' + L(c[2], c[3]) + '</p></a>';
        }).join('') + '</div></section>' +
        '<section class="stack-s"><div class="hdr-sec"><h2>' + L('تجميعات مقترحة من القواعد', 'Rule-based suggested builds') + '</h2></div><div class="grid c3">' + samples + '</div><p class="small muted">' + L('مولّدة من قواعد الميزانية على بيانات تجريبية، وليست عروض محلات.', 'Generated by the budget rules on sample data, not store offers.') + '</p></section>' +
        '</div>';
    }
  };

  // 3D view + build dashboard
  var CATCOL = { cpu: '#d9dde6', mobo: '#2a6b4f', ram: '#35e0a1', gpu: '#ff2d4b', storage: '#8fb3ff', psu: '#ffb224', case: '#8a8f9c', cooler: '#6b7280' };
