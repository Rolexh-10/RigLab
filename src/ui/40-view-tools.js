  var TOOL_TABS = [['psu', 'PSU', 'PSU'], ['ups', 'UPS', 'UPS'], ['upgrade', 'Upgrade Advisor', 'Upgrade Advisor'], ['monitor', 'Monitor Selector', 'Monitor Selector'], ['storage', 'Storage', 'Storage'], ['power', 'المولدة والكهرباء', 'Power cost']];
  function selOpts(cat, blank) { return (blank ? '<option value="">— ' + blank + ' —</option>' : '') + C.partsOf(cat).map(function (p) { return '<option value="' + p.id + '">' + esc(pname(p)) + '</option>'; }).join(''); }
  var TOOLS = {
    psu: {
      html: function () {
        return '<div class="grid c2"><label class="f" for="psu-cpu">' + L('اختر معالجاً (يملأ القدرة)', 'Pick a CPU (fills wattage)') + '<select id="psu-cpu">' + selOpts('cpu', L('يدوي', 'manual')) + '</select></label>' +
          '<label class="f" for="psu-gpu">' + L('اختر كرت شاشة', 'Pick a GPU') + '<select id="psu-gpu">' + selOpts('gpu', L('يدوي', 'manual')) + '</select></label>' +
          '<label class="f" for="psu-cw">' + L('قدرة المعالج عند الذروة (W)', 'CPU peak power (W)') + '<input type="number" id="psu-cw" value="140" min="0"></label>' +
          '<label class="f" for="psu-gw">' + L('قدرة كرت الشاشة (W)', 'GPU board power (W)') + '<input type="number" id="psu-gw" value="200" min="0"></label>' +
          '<label class="f" for="psu-ow">' + L('بقية الجهاز (W): لوحة، رام، مراوح، أقراص', 'Rest of system (W): board, RAM, fans, drives') + '<input type="number" id="psu-ow" value="85" min="0"></label>' +
          '<label class="f" for="psu-h">' + L('هامش الأمان', 'Safety headroom') + ': <span id="psu-hv" class="mono">30%</span><input type="range" id="psu-h" min="10" max="50" step="5" value="30"></label></div>' +
          '<div class="row"><button class="btn" data-act="psu-use-build">' + L('استخدم تجميعتي', 'Use my build') + '</button></div><div id="tool-out"></div>';
      },
      calc: function () {
        var h = num('psu-h', 30); $('psu-hv').textContent = h + '%';
        var cw = num('psu-cw', 0), gw = num('psu-gw', 0), ow = num('psu-ow', 0);
        var r = C.psuFromLoad(cw + gw + ow, h / 100);
        $('tool-out').innerHTML = '<div class="card stack-s"><div class="muted small">' + L('مزود الطاقة الموصى به (تقريبي)', 'Recommended PSU (approximate)') + '</div><div class="big">' + r.recommended + ' W</div>' +
          '<dl class="kv"><dt>' + L('الحمل التقديري', 'Estimated load') + '</dt><dd>' + r.total + ' W</dd><dt>' + L('المعادلة', 'Formula') + '</dt><dd>(' + cw + ' + ' + gw + ' + ' + ow + ') × ' + (1 + h / 100).toFixed(2) + ' → ' + L('أقرب 50W', 'next 50W') + '</dd></dl>' +
          '<div class="note">' + L('هذا تقدير وليس ضماناً. جودة المزود (الشهادة والمصنّع) أهم من الواط وحده، والاستهلاك الفعلي يتغير حسب الألعاب والإعدادات.', 'This is an estimate, not a guarantee. PSU quality (certification and make) matters as much as watts, and real draw varies by game and settings.') + '</div></div>';
      },
      input: function (e) {
        if (e.target.id === 'psu-cpu' && e.target.value) $('psu-cw').value = C.getPart(e.target.value).peakW;
        if (e.target.id === 'psu-gpu' && e.target.value) $('psu-gw').value = C.getPart(e.target.value).tdp;
        this.calc();
      }
    },
    ups: {
      html: function () {
        return '<div class="grid c2"><label class="f" for="u-load">' + L('حمل الجهاز (W)', 'System load (W)') + '<input type="number" id="u-load" value="300" min="1"></label>' +
          '<label class="f" for="u-va">' + L('قدرة UPS المعلنة (VA) (اختياري)', 'UPS rated VA (optional)') + '<input type="number" id="u-va" value="1000" min="0"></label>' +
          '<label class="f" for="u-pf">' + L('معامل القدرة (W/VA)', 'Power factor (W/VA)') + '<input type="number" id="u-pf" value="0.6" min="0.3" max="1" step="0.05"></label>' +
          '<label class="f" for="u-v">' + L('جهد البطارية (V)', 'Battery voltage (V)') + '<input type="number" id="u-v" value="12" min="1"></label>' +
          '<label class="f" for="u-ah">' + L('سعة البطارية (Ah)', 'Battery capacity (Ah)') + '<input type="number" id="u-ah" value="9" min="1"></label>' +
          '<label class="f" for="u-n">' + L('عدد البطاريات', 'Battery count') + '<input type="number" id="u-n" value="2" min="1"></label>' +
          '<label class="f" for="u-eff">' + L('كفاءة المحوّل %', 'Inverter efficiency %') + '<input type="number" id="u-eff" value="85" min="50" max="100"></label>' +
          '<label class="f" for="u-use">' + L('نسبة الطاقة القابلة للاستخدام فعلياً %', 'Usable energy share %') + '<input type="number" id="u-use" value="50" min="10" max="100"></label></div>' +
          '<div class="row"><button class="btn" data-act="ups-use-build">' + L('خذ الحمل من تقدير تجميعتي', 'Take load from my build estimate') + '</button></div><div id="tool-out"></div>';
      },
      calc: function () {
        var r = C.upsEstimate({ loadW: num('u-load', 300), ratedVA: num('u-va', 0), powerFactor: num('u-pf', 0.6), batteryV: num('u-v', 12), batteryAh: num('u-ah', 9), batteryCount: num('u-n', 2), inverterEff: num('u-eff', 85) / 100, usablePct: num('u-use', 50) / 100 });
        var fit = r.ratedW != null ? (r.fitsLoad ? sb('ok') + ' ' + L('الحمل ضمن قدرة UPS (' + Math.round(r.ratedW) + ' W)', 'Load is within UPS capacity (' + Math.round(r.ratedW) + ' W)') : sb('error') + ' ' + L('الحمل يتجاوز قدرة UPS (' + Math.round(r.ratedW) + ' W)', 'Load exceeds UPS capacity (' + Math.round(r.ratedW) + ' W)')) : '';
        $('tool-out').innerHTML = '<div class="grid c2"><div class="card stack-s"><div class="muted small">' + L('زمن التشغيل التقريبي (سقف تقديري)', 'Approx. runtime (upper estimate)') + '</div><div class="big">' + r.runtimeMin.toFixed(0) + ' ' + L('دقيقة', 'min') + '</div><div class="small muted">' + L('الطاقة القابلة للاستخدام: ', 'Usable energy: ') + '<span class="mono">' + r.usableWh.toFixed(0) + ' Wh</span></div></div>' +
          '<div class="card stack-s"><div class="muted small">' + L('أقل قدرة UPS موصى بها', 'Minimum recommended UPS rating') + '</div><div class="big">' + r.minRatedVA + ' VA</div><div class="small">' + fit + '</div></div></div>' +
          '<div class="note">' + L('الافتراضات ظاهرة أعلاه وقابلة للتعديل. الزمن الفعلي يقل مع تقادم البطاريات والأحمال العالية. UPS مناسب لإطفاء الجهاز بأمان وليس لتشغيل طويل. مزودات الطاقة ذات PFC النشط تعمل غالباً بشكل أفضل مع UPS موجة جيبية نقية، فراجع دليل المصنّع.', 'Assumptions are shown above and editable. Real runtime drops with battery age and heavy loads. A UPS is for shutting down safely, not long runtime. PSUs with active PFC usually behave better on pure sine wave UPS units; check the manufacturer guide.') + '</div>';
      },
      input: function () { this.calc(); }
    },
    upgrade: {
      html: function () {
        return '<div class="note">' + L('نسخة مبسطة: تقترح قطعاً من الكتالوج التجريبي وتفحص القدرة والطول. ما تدّعي معرفة «عنق الزجاجة».', 'Simplified version: suggests parts from the sample catalog and checks power and length. It does not claim to know your "bottleneck".') + '</div>' +
          '<div class="grid c2"><label class="f" for="ua-mobo">' + L('لوحتك الأم (أقرب فئة)', 'Your motherboard (closest class)') + '<select id="ua-mobo">' + selOpts('mobo') + '</select></label>' +
          '<label class="f" for="ua-cpu">' + L('معالجك الحالي', 'Current CPU') + '<select id="ua-cpu">' + selOpts('cpu') + '</select></label>' +
          '<label class="f" for="ua-gpu">' + L('كرتك الحالي', 'Current GPU') + '<select id="ua-gpu">' + selOpts('gpu') + '</select></label>' +
          '<label class="f" for="ua-psu">' + L('قدرة PSU الحالي (W)', 'Current PSU (W)') + '<input type="number" id="ua-psu" value="550" min="200"></label>' +
          '<label class="f" for="ua-case">' + L('أقصى طول لكرت الشاشة بكيسك (mm)', 'Max GPU length in your case (mm)') + '<input type="number" id="ua-case" value="300" min="150"></label></div><div id="tool-out"></div>';
      },
      init: function () { $('ua-mobo').value = 'b550m'; $('ua-cpu').value = 'r5-5600'; $('ua-gpu').value = 'rx7600'; },
      calc: function () {
        var mobo = C.getPart(val('ua-mobo')), cpu = C.getPart(val('ua-cpu')), gpu = C.getPart(val('ua-gpu')), psuW = num('ua-psu', 550), caseMm = num('ua-case', 300);
        var gp = C.partsOf('gpu').filter(function (g) { return g.tier > gpu.tier; }).sort(function (a, b) { return a.tier - b.tier; }).slice(0, 5).map(function (g) {
          var f = [];
          if (g.vendorPsuW > psuW) f.push(sb('warn') + ' ' + L('الشركة توصي بـ PSU ≥ ' + g.vendorPsuW + 'W', 'Vendor recommends PSU ≥ ' + g.vendorPsuW + 'W'));
          if (g.lengthMm > caseMm) f.push(sb('error') + ' ' + L('الطول النموذجي ' + g.lengthMm + 'mm أكبر من كيسك', 'Typical length ' + g.lengthMm + 'mm exceeds your case'));
          if (!f.length) f.push(sb('ok') + ' ' + L('ضمن حدود القدرة والطول المدخلة', 'Within the power and length limits you entered'));
          return '<li class="card"><div class="row between"><b>' + esc(pname(g)) + '</b><span class="mono">' + fmt(C.priceOf(g)) + ' ' + unit() + '</span></div><div class="small row" style="margin-top:6px">' + f.join(' ') + '</div></li>';
        }).join('') || '<li class="note">' + L('كرتك الحالي هو الأقوى في الكتالوج.', 'Your GPU is already the strongest in the catalog.') + '</li>';
        var cp = C.partsOf('cpu').filter(function (c) { return c.socket === mobo.socket && c.tier > cpu.tier && c.memTypes.indexOf(mobo.ramType) >= 0; }).sort(function (a, b) { return a.tier - b.tier; }).slice(0, 4).map(function (c) {
          var f = [];
          if (mobo.needsBios.indexOf(c.gen) >= 0) f.push(sb('warn') + ' ' + L('قد يحتاج تحديث BIOS', 'May need a BIOS update'));
          if (!f.length) f.push(sb('ok') + ' ' + L('نفس السوكيت ونوع الرام', 'Same socket and RAM type'));
          return '<li class="card"><div class="row between"><b>' + esc(pname(c)) + '</b><span class="mono">' + fmt(C.priceOf(c)) + ' ' + unit() + '</span></div><div class="small row" style="margin-top:6px">' + f.join(' ') + '</div></li>';
        }).join('') || '<li class="note">' + L('لا معالجات أقوى بنفس السوكيت في الكتالوج.', 'No stronger CPU on the same socket in the catalog.') + '</li>';
        $('tool-out').innerHTML = '<div class="grid c2"><div class="stack-s"><h3>' + L('ترقية كرت الشاشة', 'GPU upgrade options') + ' ' + smp() + '</h3><ul class="chk" style="list-style:none;padding:0;margin:0">' + gp + '</ul></div><div class="stack-s"><h3>' + L('ترقية المعالج (نفس اللوحة)', 'CPU upgrade options (same board)') + ' ' + smp() + '</h3><ul class="chk" style="list-style:none;padding:0;margin:0">' + cp + '</ul></div></div>';
      },
      input: function () { this.calc(); }
    },
    monitor: {
      html: function () {
        return '<div class="grid c2"><label class="f" for="mo-gpu">' + L('كرت الشاشة', 'GPU') + '<select id="mo-gpu">' + selOpts('gpu') + '</select></label><label class="f" for="mo-use">' + L('نوع الألعاب', 'Game type') + '<select id="mo-use"><option value="comp">' + L('تنافسية (FPS عالي)', 'Competitive (high FPS)') + '</option><option value="aaa">' + L('ألعاب AAA بجودة عالية', 'High-quality AAA') + '</option><option value="mix">' + L('خليط', 'Mixed') + '</option></select></label></div><div id="tool-out"></div>';
      },
      init: function () { $('mo-gpu').value = 'rtx4060ti'; },
      calc: function () {
        var g = C.getPart(val('mo-gpu')), use = val('mo-use'), t = g.tier, rec;
        if (t < 6) rec = use === 'comp' ? ['1080p', '144 Hz'] : ['1080p', '60–100 Hz'];
        else if (t < 7.5) rec = use === 'comp' ? ['1080p', '165–240 Hz'] : (use === 'aaa' ? ['1080p', '100–144 Hz'] : ['1080p أو 1440p خفيف', '120–165 Hz']);
        else rec = use === 'comp' ? ['1440p', '165–240 Hz'] : ['1440p', '120–165 Hz'];
        $('tool-out').innerHTML = '<div class="card stack-s"><div class="muted small">' + L('الدقة ومعدل التحديث المناسبان (إرشاد عام)', 'Suitable resolution and refresh rate (general guidance)') + '</div><div class="big">' + rec[0] + ' · ' + rec[1] + '</div></div><div class="note">' + L('إرشاد عام مبني على فئة الكرت فقط، ولا يضمن FPS معيناً. الأداء الفعلي يختلف حسب اللعبة والإعدادات والمعالج.', 'General guidance from the GPU class only; it does not guarantee any FPS. Real performance depends on the game, settings and CPU.') + '</div>';
      },
      input: function () { this.calc(); }
    },
    power: {
      html: function () {
        return '<div class="note">' + L('الأرقام الافتراضية افتراضات قابلة للتعديل وليست تسعيرة رسمية. ضع سعر مولدتك أو كهرباء الدولة.', 'Defaults are editable assumptions, not an official tariff. Enter your generator or grid price.') + '</div>' +
          '<div class="grid c2"><label class="f" for="pw-w">' + L('استهلاك الجهاز وقت اللعب (W)', 'PC draw while gaming (W)') + '<input type="number" id="pw-w" value="300" min="1"></label>' +
          '<label class="f" for="pw-h">' + L('ساعات الاستخدام باليوم', 'Hours per day') + '<input type="number" id="pw-h" value="4" min="0" max="24" step="0.5"></label>' +
          '<label class="f" for="pw-v">' + L('فولتية المولدة/الشبكة (V)', 'Supply voltage (V)') + '<input type="number" id="pw-v" value="220" min="100"></label>' +
          '<label class="f" for="pw-pa">' + L('سعر الأمبير بالشهر (د.ع)', 'Price per amp per month (IQD)') + '<input type="number" id="pw-pa" value="10000" min="0" step="500"></label></div><div id="tool-out"></div>';
      },
      calc: function () {
        var w = num('pw-w', 300), h = num('pw-h', 4), v = Math.max(100, num('pw-v', 220)), pa = num('pw-pa', 0);
        var amps = w / v, kwh = w / 1000 * h * 30;
        $('tool-out').innerHTML = '<div class="grid c2"><div class="card stack-s"><div class="muted small">' + L('الأمبيرات التي يحتاجها الجهاز (تقريبي)', 'Amps the PC needs (approx.)') + '</div><div class="big">' + amps.toFixed(1) + ' A</div><div class="small muted">' + L('الأمبير = الواط ÷ الفولتية (معامل قدرة 1، تقدير)', 'Amps = watts ÷ volts (power factor 1, estimate)') + '</div></div>' +
          '<div class="card stack-s"><div class="muted small">' + L('الطاقة الشهرية', 'Monthly energy') + '</div><div class="big">' + kwh.toFixed(0) + ' kWh</div><div class="small muted">' + L('كلفة اشتراك المولدة المقابلة: ', 'Matching generator cost: ') + '<b class="mono">' + fmt(amps * pa) + '</b> ' + unit() + '</div></div></div>' +
          '<div class="note">' + L('الاشتراك بالأمبير يُدفع ثابتاً سواء لعبت أو لا، فالرقم أعلاه كلفة الأمبيرات التي يستهلكها جهازك فقط من اشتراكك.', 'A generator amp subscription is a fixed fee; the figure above is just the share your PC accounts for.') + '</div>';
      },
      input: function () { this.calc(); }
    },
    storage: {
      html: function () {
        function row(i, ar, en, n, s) { return '<div class="grid c2"><label class="f" for="st-n' + i + '">' + L(ar, en) + ' ' + L('(العدد)', '(count)') + '<input type="number" id="st-n' + i + '" value="' + n + '" min="0"></label><label class="f" for="st-s' + i + '">' + L('متوسط الحجم (GB)', 'Average size (GB)') + '<input type="number" id="st-s' + i + '" value="' + s + '" min="1"></label></div>'; }
        return '<div class="note">' + L('أحجام الألعاب أدناه افتراضات قابلة للتعديل وليست قياسات.', 'Game sizes below are editable assumptions, not measurements.') + '</div>' +
          '<label class="f" for="st-os">' + L('ويندوز وبرامج (GB)', 'Windows and apps (GB)') + '<input type="number" id="st-os" value="150" min="0"></label>' +
          row(1, 'ألعاب خفيفة', 'Light games', 5, 20) + row(2, 'ألعاب متوسطة', 'Medium games', 4, 60) + row(3, 'ألعاب ثقيلة', 'Heavy games', 2, 120) +
          '<div class="grid c2"><label class="f" for="st-m">' + L('ملفات ومشاريع (GB)', 'Files and projects (GB)') + '<input type="number" id="st-m" value="100" min="0"></label><label class="f" for="st-f">' + L('مساحة فارغة يُنصح بتركها %', 'Free space to keep %') + '<input type="number" id="st-f" value="20" min="0" max="60"></label></div><div id="tool-out"></div>';
      },
      calc: function () {
        var used = num('st-os', 0) + num('st-m', 0);
        [1, 2, 3].forEach(function (i) { used += num('st-n' + i, 0) * num('st-s' + i, 0); });
        var free = Math.min(60, Math.max(0, num('st-f', 20))) / 100, need = used / (1 - free);
        var sizes = [256, 500, 1000, 2000, 4000], cap = sizes.filter(function (s) { return s >= need; })[0] || 4000;
        var opt = C.partsOf('storage').filter(function (p) { return p.gb >= need; }).sort(function (a, b) { return C.priceOf(a) - C.priceOf(b); })[0];
        $('tool-out').innerHTML = '<div class="grid c2"><div class="card stack-s"><div class="muted small">' + L('المساحة المطلوبة', 'Space needed') + '</div><div class="big">' + Math.round(need) + ' GB</div><div class="small muted">' + L('المستخدم: ', 'Used: ') + Math.round(used) + ' GB</div></div><div class="card stack-s"><div class="muted small">' + L('السعة الموصى بها', 'Suggested capacity') + '</div><div class="big">' + (cap >= 1000 ? cap / 1000 + ' TB' : cap + ' GB') + '</div>' + (opt ? '<div class="small">' + esc(pname(opt)) + ' · ' + moneyT(C.priceOf(opt)) + ' ' + smp() + '</div>' : '<div class="small">' + L('لا خيار بهذه السعة في الكتالوج.', 'No option this large in the catalog.') + '</div>') + '</div></div>';
      },
      input: function () { this.calc(); }
    }
  };
  VIEWS.tools = {
    html: function () {
      var tabs = TOOL_TABS.map(function (t) { return '<a class="chip' + (S.toolTab === t[0] ? ' on' : '') + '"' + (S.toolTab === t[0] ? ' aria-current="page"' : '') + ' href="#' + TOOL_HASH[t[0]] + '" style="text-decoration:none;display:inline-flex;align-items:center">' + t[1] + '</a>'; }).join('');
      return '<div class="stack"><h1>' + L('الأدوات المجانية', 'Free tools') + '</h1><div class="chips">' + tabs + '</div><div class="stack-s" id="tool-body">' + TOOLS[S.toolTab].html() + '</div>' + adSlot('tools') + '</div>';
    },
    bind: function () { var t = TOOLS[S.toolTab]; if (t.init) t.init(); t.calc(); },
    input: function (e) { TOOLS[S.toolTab].input(e); }
  };

  // Ready builds: rule-based suggestions per budget tier, shareable to WhatsApp
