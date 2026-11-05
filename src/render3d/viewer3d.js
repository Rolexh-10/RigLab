/* RigLab 3D viewer: dependency-free (canvas 2D, perspective projection, painter's algorithm).
 * Dimensions come from catalog spec fields (GPU length, cooler height, case form factor) so the picture
 * reflects real size relationships; looks (colours, fans) are generic, not a specific product model. */
(function () {
  'use strict';
  var COL = { case: '#8a8f9c', mobo: '#2a6b4f', cpu: '#d9dde6', cooler: '#6b7280', ram: '#35e0a1', gpu: '#ff2d4b', storage: '#8fb3ff', psu: '#ffb224' };
  var BAD = '#ffb224';

  function caseDims(c) {
    if (c && c.dims) return c.dims;
    var f = c ? c.formFactors || [] : ['ATX'];
    if (f.indexOf('ATX') >= 0) return { W: 210, H: 450, D: 440 };
    if (f.indexOf('mATX') >= 0) return { W: 200, H: 390, D: 390 };
    return { W: 180, H: 300, D: 350 };
  }
  function boardDims(m) {
    var f = m ? m.form : 'ATX';
    if (f === 'E-ATX') return { z: 272, y: 330 };
    if (f === 'ATX') return { z: 244, y: 305 }; // 12in edge is vertical, 9.6in runs front-to-back
    if (f === 'mATX') return { z: 244, y: 244 };
    return { z: 170, y: 170 };
  }

  // x: case width (side panel at -x, motherboard tray at +x), y: up, z: rear (+) to front (-)
  function layout(parts) {
    var cs = parts.case || null, cd = caseDims(cs);
    var mb = boardDims(parts.mobo || { form: cs && cs.formFactors && cs.formFactors.indexOf('ATX') < 0 ? 'mATX' : 'ATX' });
    var W = cd.W, H = cd.H, D = cd.D, trayX = W / 2 - 12;
    var rear = D / 2 - 18, top = H / 2 - 28;
    var bz = rear - mb.z / 2, by = top - mb.y / 2;
    var cpuZ = rear - mb.z * 0.55, cpuY = top - mb.y * 0.31; // socket position taken from the real board model
    var out = [];
    function P(key, ghost, boxes, bad) { out.push({ key: key, id: parts[key] ? parts[key].id : '', ghost: ghost, boxes: boxes, bad: !!bad }); }
    function B(cx, cy, cz, sx, sy, sz, col, o) { var b = { c: [cx, cy, cz], s: [sx, sy, sz], col: col }; if (o) for (var k in o) b[k] = o[k]; return b; }

    out.push({ key: 'case', part: cs, id: cs ? cs.id : 'ghost', ghost: !cs, frame: true, boxes: [B(0, 0, 0, W, H, D, COL.case, { frame: true })] });
    P('mobo', !parts.mobo, [B(trayX, by, bz, 4, mb.y, mb.z, COL.mobo)]);
    P('cpu', !parts.cpu, [B(trayX - 11, cpuY, cpuZ, 5, 38, 38, COL.cpu)]);

    var cl = parts.cooler, cpu = parts.cpu;
    if (cl) {
      var tooTall = cs && cs.maxCoolerMm && cl.heightMm && cl.heightMm > cs.maxCoolerMm;
      if (cl.radiatorMm) {
        P('cooler', false, [B(trayX - 30, cpuY, cpuZ, 50, 70, 70, COL.cooler), B(-W / 2 + 70, H / 2 - 22, Math.min(-D / 2 + 14 + cl.radiatorMm / 2, rear - 20 - cl.radiatorMm / 2), 120, 27, cl.radiatorMm, COL.cooler)], false);
      } else {
        var h = cl.heightMm || 140;
        P('cooler', false, [B(trayX - 5 - h / 2, cpuY, cpuZ, h, 125, 90, COL.cooler)], tooTall);
      }
    } else if (cpu && cpu.stockCooler) {
      P('cooler', false, [B(trayX - 5 - 25, cpuY, cpuZ, 50, 90, 90, COL.cooler)], false);
    }

    P('ram', !parts.ram, [B(trayX - 20, cpuY, rear - mb.z * 0.72, 31, 133, 7, COL.ram), B(trayX - 20, cpuY, rear - mb.z * 0.84, 31, 133, 7, COL.ram)]);
    if (parts.ram) { out[out.length - 1].boxes = [B(trayX - 20, cpuY, rear - mb.z * 0.72, 31, 133, 7, COL.ram), B(trayX - 20, cpuY, rear - mb.z * 0.84, 31, 133, 7, COL.ram)]; }

    var gl = parts.gpu ? (parts.gpu.lengthMm || 280) : 280;
    var gTooLong = parts.gpu && cs && cs.maxGpuMm && gl > cs.maxGpuMm;
    var gy = top - mb.y * 0.60 - 24; // PCB plugs in at the first x16 slot, cooler hangs below it
    P('gpu', !parts.gpu, [B(trayX - 4 - 55, gy, rear - 4 - gl / 2, 110, 42, gl, COL.gpu)], gTooLong);

    P('storage', !parts.storage, [parts.storage && parts.storage.type !== 'NVMe' ? B(trayX - 40, -H / 2 + 120, -D / 2 + 90, 7, 70, 100, COL.storage) : B(trayX - 4, cpuY - 62, cpuZ + 4, 3, 80, 22, COL.storage)]);
    P('psu', !parts.psu, [B(W / 2 - 90, -H / 2 + 45, rear - 80, 150, 86, 160, COL.psu)]);
    // real cases have the rear on the LEFT when viewed through the glass side: mirror depth so the world is not a mirror image
    out.forEach(function (it) { it.boxes.forEach(function (b) { b.c[2] = -b.c[2]; }); });
    return out;
  }

  function boxFaces(b) {
    var x = b.c[0], y = b.c[1], z = b.c[2], hx = b.s[0] / 2, hy = b.s[1] / 2, hz = b.s[2] / 2;
    var v = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(function (a) { return [x + a[0] * hx, y + a[1] * hy, z + a[2] * hz]; });
    var f = [[0, 1, 2, 3, [0, 0, -1]], [4, 5, 6, 7, [0, 0, 1]], [0, 4, 7, 3, [-1, 0, 0]], [1, 5, 6, 2, [1, 0, 0]], [3, 2, 6, 7, [0, 1, 0]], [0, 1, 5, 4, [0, -1, 0]]];
    return f.map(function (q) { return { p: [v[q[0]], v[q[1]], v[q[2]], v[q[3]]], n: q[4] }; });
  }
  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return 'rgb(' + Math.round(r * k) + ',' + Math.round(g * k) + ',' + Math.round(b * k) + ')';
  }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  var SHARED = { yaw: -1.1, pitch: 0.18, zoom: 1, born: {}, auto: true };
  function create(canvas) {
    var ctx = canvas.getContext('2d'), st = SHARED; st.items = []; st.drag = null; st.raf = 0;
    var reduce = false; try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    function size() {
      var r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      var w = Math.max(10, Math.round(r.width * dpr)), h = Math.max(10, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      return { w: w, h: h, dpr: dpr };
    }
    function setParts(parts) {
      var now = performance.now(), items = layout(parts);
      items.forEach(function (it) {
        var k = it.key + ':' + it.id + (it.ghost ? ':g' : '');
        if (!st.born[k]) st.born[k] = now;
        it.k = k;
      });
      st.items = items; draw(now);
    }
    function draw(now) {
      var s = size(), w = s.w, h = s.h, dpr = s.dpr;
      ctx.clearRect(0, 0, w, h);
      var cy = Math.cos(st.yaw), sy = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
      var cam = 1500, scale = Math.min(h / 560, w / 470) * st.zoom;
      function proj(p) {
        var x = p[0] * cy + p[2] * sy, z = -p[0] * sy + p[2] * cy, y = p[1];
        var y2 = y * cp - z * sp, z2 = y * sp + z * cp, d = cam / (cam + z2 + 400);
        return [w / 2 + x * d * scale, h / 2 - y2 * d * scale, z2];
      }
      function facing(n) { var x = n[0] * cy + n[2] * sy, z = -n[0] * sy + n[2] * cy; return (n[1] * sp + z * cp) < 0; }
      function path(pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
      var caseItem = null, moving = false, spin = reduce ? 0 : now / 260;
      st.items.forEach(function (it) { if (it.frame) caseItem = it; });
      var cb = caseItem ? caseItem.boxes[0] : null, W = cb ? cb.s[0] : 210, H = cb ? cb.s[1] : 450, D = cb ? cb.s[2] : 440;

      // floor grid + soft shadow
      var fy = -H / 2 - 6, sh = proj([0, fy, 0]), rr = Math.max(W, D) * 0.9 * scale;
      var g = ctx.createRadialGradient(sh[0], sh[1], 0, sh[0], sh[1], rr);
      g.addColorStop(0, 'rgba(255,45,75,.22)'); g.addColorStop(1, 'rgba(255,45,75,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.lineWidth = 1 * dpr;
      for (var k = -480; k <= 480; k += 60) {
        var a1 = proj([k, fy, -480]), a2 = proj([k, fy, 480]), b1 = proj([-480, fy, k]), b2 = proj([480, fy, k]), al = 0.2 * (1 - Math.abs(k) / 560);
        ctx.strokeStyle = 'rgba(255,45,75,' + al.toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.moveTo(b1[0], b1[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke();
      }

      var back = [], mid = [], front = [];
      // case panels: solid dark except the left glass; back-facing ones are the interior walls
      if (cb && !caseItem.ghost) {
        var cf = boxFaces(cb);
        cf.forEach(function (f) {
          var pts = f.p.map(proj), glass = f.n[0] === -1, fc = facing(f.n);
          var rec = { pts: pts, glass: glass, front: fc };
          (fc ? front : back).push(rec);
        });
      }
      st.items.forEach(function (it) {
        var age = reduce ? 1 : Math.min(1, (now - st.born[it.k]) / 700), e = ease(age);
        if (age < 1) moving = true;
        if (it.frame) return;
        it.boxes.forEach(function (b) {
          var off = it.ghost ? 0 : (1 - e) * -170;
          var bb = { c: [b.c[0] + off, b.c[1], b.c[2]], s: b.s, col: b.col };
          boxFaces(bb).forEach(function (f) {
            var pts = f.p.map(proj);
            mid.push({ kind: 'box', pts: pts, z: (pts[0][2] + pts[1][2] + pts[2][2] + pts[3][2]) / 4, n: f.n, col: b.col, it: it, e: e, bad: it.bad });
          });
        });
      });
      // fans (decals): axis is the plane normal; drawn double-sided and depth-sorted with the parts
      function fan(c, axis, r, col, e) {
        var pts = [], i;
        for (i = 0; i < 20; i++) {
          var a = i / 20 * Math.PI * 2, u = Math.cos(a) * r, v = Math.sin(a) * r;
          pts.push(axis === 'z' ? [c[0] + u, c[1] + v, c[2]] : axis === 'y' ? [c[0] + u, c[1], c[2] + v] : [c[0], c[1] + u, c[2] + v]);
        }
        var P = pts.map(proj), ctr = proj(c);
        mid.push({ kind: 'fan', P: P, ctr: ctr, c: c, axis: axis, r: r, col: col, z: ctr[2] - 1, e: e });
      }
      var cs = caseItem && !caseItem.ghost;
      if (cs) {
        var fz = D / 2 - 20, yy = H / 2 - 85, step = (H - 150) / 3;
        [0, 1, 2].forEach(function (n) { fan([0, yy - step * n, fz], 'z', 60, '#ff2d4b', 1); });
        fan([0, H / 2 - 120, -D / 2 + 18], 'z', 60, '#ff2d4b', 1);
      }
      st.items.forEach(function (it) {
        if (it.ghost || it.frame) return;
        var e = reduce ? 1 : Math.min(1, (now - st.born[it.k]) / 700), eased = ease(e), off = (1 - eased) * -170;
        if (it.key === 'gpu') {
          var b = it.boxes[0], n = b.s[2] > 285 ? 3 : 2, gap = b.s[2] / n;
          for (var q = 0; q < n; q++) fan([b.c[0] + off, b.c[1] - b.s[1] / 2 - 1, b.c[2] - b.s[2] / 2 + gap * (q + 0.5)], 'y', Math.min(46, gap / 2 - 2), '#ff2d4b', eased);
        }
        if (it.key === 'cooler' && it.boxes.length === 2) {
          var rb = it.boxes[1], m = rb.s[2] > 300 ? 3 : 2, gp = rb.s[2] / m;
          for (var q2 = 0; q2 < m; q2++) fan([rb.c[0] + off, rb.c[1] - rb.s[1] / 2 - 3, rb.c[2] - rb.s[2] / 2 + gp * (q2 + 0.5)], 'y', 56, '#ff2d4b', eased);
          var pb = it.boxes[0]; fan([pb.c[0] - pb.s[0] / 2 + off - 1, pb.c[1], pb.c[2]], 'x', 30, '#ff2d4b', eased);
        }
      });

      mid.sort(function (a, b) { return b.z - a.z; });

      // 1) interior walls
      back.forEach(function (r) { path(r.pts); ctx.fillStyle = r.glass ? '#0a0a0f' : '#0d0d13'; ctx.fill(); ctx.strokeStyle = 'rgba(255,45,75,.28)'; ctx.lineWidth = 1 * dpr; ctx.stroke(); });
      // 2) parts and fans
      mid.forEach(function (f) {
        if (f.kind === 'fan') {
          ctx.globalAlpha = Math.max(0.05, f.e);
          ctx.save(); ctx.shadowColor = f.col; ctx.shadowBlur = 10 * dpr;
          path(f.P); ctx.fillStyle = 'rgba(40,0,10,.85)'; ctx.fill(); ctx.strokeStyle = f.col; ctx.lineWidth = 1.6 * dpr; ctx.stroke();
          ctx.restore();
          ctx.strokeStyle = 'rgba(255,90,110,.9)'; ctx.lineWidth = 1.4 * dpr;
          for (var bl = 0; bl < 7; bl++) {
            var a = spin + bl / 7 * Math.PI * 2, u = Math.cos(a) * f.r * 0.92, v = Math.sin(a) * f.r * 0.92, u2 = Math.cos(a + 0.5) * f.r * 0.9, v2 = Math.sin(a + 0.5) * f.r * 0.9, c = f.c;
            function pt(x, y) { return f.axis === 'z' ? [c[0] + x, c[1] + y, c[2]] : f.axis === 'y' ? [c[0] + x, c[1], c[2] + y] : [c[0], c[1] + x, c[2] + y]; }
            var p1 = proj(pt(u * 0.25, v * 0.25)), p2 = proj(pt(u2, v2));
            ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
          }
          ctx.globalAlpha = 1;
          return;
        }
        var it = f.it; path(f.pts);
        if (it.ghost) { ctx.strokeStyle = 'rgba(255,45,75,.4)'; ctx.lineWidth = 1 * dpr; ctx.setLineDash([4 * dpr, 4 * dpr]); ctx.stroke(); ctx.setLineDash([]); return; }
        var light = 0.3 + 0.2 * (f.n[1] > 0 ? 1 : 0) + 0.12 * (f.n[0] < 0 ? 1 : 0) + 0.08 * (f.n[2] < 0 ? 1 : 0);
        ctx.globalAlpha = Math.max(0.05, f.e);
        ctx.fillStyle = shade(f.col, light); ctx.fill();
        ctx.strokeStyle = f.bad ? BAD : (it.key === 'mobo' ? 'rgba(53,224,161,.5)' : f.col); ctx.lineWidth = (f.bad ? 2.4 : 1.1) * dpr; ctx.stroke(); ctx.globalAlpha = 1;
      });
      // 3) camera-facing case panels: opaque, except the left side which is tinted glass
      front.forEach(function (r) {
        path(r.pts);
        ctx.fillStyle = r.glass ? 'rgba(120,130,160,.07)' : '#0c0c11'; ctx.fill();
        ctx.strokeStyle = r.glass ? 'rgba(255,255,255,.35)' : 'rgba(255,45,75,.6)'; ctx.lineWidth = 1.2 * dpr; ctx.stroke();
      });
      if (caseItem && caseItem.ghost) {
        boxFaces(cb).forEach(function (f) { path(f.p.map(proj)); ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.setLineDash([6 * dpr, 5 * dpr]); ctx.lineWidth = 1 * dpr; ctx.stroke(); ctx.setLineDash([]); });
      }
      return moving;
    }
    function loop(now) {
      if (!canvas.isConnected) return;
      if (st.auto && !st.drag && !reduce) st.yaw += 0.004;
      var moving = draw(now);
      if (reduce && !moving) { st.raf = 0; return; }
      st.raf = requestAnimationFrame(loop);
    }
    function start() { if (!st.raf) st.raf = requestAnimationFrame(loop); }
    canvas.addEventListener('pointerdown', function (e) { st.drag = { x: e.clientX, y: e.clientY }; st.auto = false; try { canvas.setPointerCapture(e.pointerId); } catch (er) {} });
    canvas.addEventListener('pointermove', function (e) {
      if (!st.drag) return;
      st.yaw += (e.clientX - st.drag.x) * 0.008; st.pitch = Math.max(-0.2, Math.min(0.8, st.pitch + (e.clientY - st.drag.y) * 0.006));
      st.drag = { x: e.clientX, y: e.clientY }; if (reduce) draw(performance.now());
    });
    function up() { st.drag = null; }
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', function (e) { e.preventDefault(); st.zoom = Math.max(0.6, Math.min(1.8, st.zoom * (e.deltaY < 0 ? 1.08 : 0.92))); if (reduce) draw(performance.now()); }, { passive: false });
    return { setParts: function (p) { setParts(p); start(); }, state: st, layout: layout, rotate: function (d) { st.yaw += d; st.auto = false; draw(performance.now()); } };
  }
  window.RigLab3D = { create: create, layout: layout, view: SHARED };
})();
