/* RigLab WebGL2 viewer: renders real GLB models (CC BY, see credits) and generic parts together,
 * with a depth buffer, textures and simple lighting. No external libraries.
 * RigLab3D.createGL(canvas) returns null when WebGL2 is unavailable (the app then uses the canvas-2D viewer). */
(function () {
  'use strict';
  var V3 = window.RigLab3D;
  if (!V3) return;

  // ---------- math (column-major, like GL) ----------
  var M = {
    id: function () { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); },
    mul: function (a, b) { var o = new Float32Array(16); for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
    T: function (x, y, z) { var m = M.id(); m[12] = x; m[13] = y; m[14] = z; return m; },
    S: function (x, y, z) { var m = M.id(); m[0] = x; m[5] = y; m[10] = z; return m; },
    RX: function (a) { var c = Math.cos(a), s = Math.sin(a), m = M.id(); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; },
    RY: function (a) { var c = Math.cos(a), s = Math.sin(a), m = M.id(); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; },
    RZ: function (a) { var c = Math.cos(a), s = Math.sin(a), m = M.id(); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; },
    det3: function (m) { return m[0] * (m[5] * m[10] - m[6] * m[9]) - m[1] * (m[4] * m[10] - m[6] * m[8]) + m[2] * (m[4] * m[9] - m[5] * m[8]); },
    basis: function (b) { var m = M.id(); for (var i = 0; i < 3; i++) { m[i * 4] = b[i][0]; m[i * 4 + 1] = b[i][1]; m[i * 4 + 2] = b[i][2]; } return m; },
    persp: function (fy, asp, n, f) { var t = 1 / Math.tan(fy / 2), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f); return m; },
    look: function (e, c, u) {
      var fx = c[0] - e[0], fy = c[1] - e[1], fz = c[2] - e[2], fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
      var sx = fy * u[2] - fz * u[1], sy = fz * u[0] - fx * u[2], sz = fx * u[1] - fy * u[0], sl = Math.hypot(sx, sy, sz); sx /= sl; sy /= sl; sz /= sl;
      var ux = sy * fz - sz * fy, uy = sz * fx - sx * fz, uz = sx * fy - sy * fx;
      return new Float32Array([sx, ux, -fx, 0, sy, uy, -fy, 0, sz, uz, -fz, 0, -(sx * e[0] + sy * e[1] + sz * e[2]), -(ux * e[0] + uy * e[1] + uz * e[2]), fx * e[0] + fy * e[1] + fz * e[2], 1]);
    },
    nrm: function (m) { // inverse-transpose of the upper 3x3, as a column-major mat3
      var a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
      var A = e * i - f * h, B = f * g - d * i, C = d * h - e * g, det = a * A + b * B + c * C || 1, s = det < 0 ? -1 : 1;
      return new Float32Array([s * A, s * (c * h - b * i), s * (b * f - c * e), s * B, s * (a * i - c * g), s * (c * d - a * f), s * C, s * (b * g - a * h), s * (a * e - b * d)]);
    },
    pt: function (m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; }
  };

  // ---------- shaders ----------
  var VS = '#version 300 es\nin vec3 aPos;in vec3 aNor;in vec2 aUv;uniform mat4 uVP,uM;uniform mat3 uN;out vec3 vN,vW;out vec2 vUv;void main(){vec4 w=uM*vec4(aPos,1.);vW=w.xyz;vN=normalize(uN*aNor);vUv=aUv;gl_Position=uVP*w;}';
  var FS = '#version 300 es\nprecision highp float;in vec3 vN,vW;in vec2 vUv;out vec4 o;' +
    'uniform vec4 uBase;uniform sampler2D uTex,uEmTex;uniform float uHasTex,uHasEm,uAlpha,uUnlit,uRadial,uCut,uGlow;uniform vec3 uEm,uEye;' +
    'void main(){vec4 c=uBase;if(uHasTex>.5)c*=texture(uTex,vUv);if(uCut>0.&&c.a<uCut)discard;' +
    'if(uRadial>.5){float r=length(vUv*2.-1.);c.a*=1.-smoothstep(0.,1.,r);}' +
    'vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 V=normalize(uEye-vW);' +
    'vec3 L1=normalize(vec3(-.55,.8,-.55)),L2=normalize(vec3(.6,.25,.6));' +
    'float d=max(dot(n,L1),0.)*.85+max(dot(n,L2),0.)*.4;vec3 H=normalize(L1+V);float s=pow(max(dot(n,H),0.),40.)*.55;float fr=pow(1.-max(dot(n,V),0.),3.);' +
    'vec3 col=c.rgb*(.42+d)+vec3(s)+vec3(.7,.75,.85)*fr*.08;vec3 em=uEm;if(uHasEm>.5)em*=texture(uEmTex,vUv).rgb;col+=em;' +
    'if(uUnlit>.5)col=c.rgb+em;col+=c.rgb*uGlow;o=vec4(col,c.a*uAlpha);}';
  var LVS = '#version 300 es\nin vec3 aPos;uniform mat4 uVP,uM;void main(){gl_Position=uVP*uM*vec4(aPos,1.);}';
  var LFS = '#version 300 es\nprecision mediump float;uniform vec4 uCol;out vec4 o;void main(){o=uCol;}';

  function prog(gl, vs, fs) {
    function sh(t, s) { var x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; }
    var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos'); gl.bindAttribLocation(p, 1, 'aNor'); gl.bindAttribLocation(p, 2, 'aUv');
    gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); }
    return { p: p, u: u };
  }

  // ---------- GLB loading ----------
  var CT = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };
  var NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  function parseGLB(buf) {
    var dv = new DataView(buf); if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('not a GLB');
    var off = 12, json = null, bin = null;
    while (off < buf.byteLength) {
      var len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true), data = buf.slice(off + 8, off + 8 + len);
      if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(data)); else if (type === 0x004E4942) bin = data;
      off += 8 + len;
    }
    return { j: json, bin: bin };
  }
  function readAcc(g, i) {
    var a = g.j.accessors[i], bv = g.j.bufferViews[a.bufferView], ct = CT[a.componentType], n = NC[a.type], T = ct[0], bs = ct[1];
    var base = (bv.byteOffset || 0) + (a.byteOffset || 0), stride = bv.byteStride || (n * bs);
    // tightly packed, aligned, non-normalized data is a zero-copy typed-array view (no per-element loop on the main thread)
    if (!a.normalized && !a.sparse && stride === n * bs && base % bs === 0 && (a.componentType === 5126 || a.componentType === 5123 || a.componentType === 5125)) return new T(g.bin, base, a.count * n);
    var out = new T(a.count * n), dv = new DataView(g.bin);
    var norm = a.normalized, mx = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }[a.componentType];
    for (var k = 0; k < a.count; k++) for (var c = 0; c < n; c++) {
      var p = base + k * stride + c * bs, v;
      switch (a.componentType) { case 5126: v = dv.getFloat32(p, true); break; case 5125: v = dv.getUint32(p, true); break; case 5123: v = dv.getUint16(p, true); break; case 5122: v = dv.getInt16(p, true); break; case 5121: v = dv.getUint8(p); break; default: v = dv.getInt8(p); }
      out[k * n + c] = v;
    }
    if (norm && a.componentType !== 5126) { var f = new Float32Array(out.length); for (var q = 0; q < out.length; q++) f[q] = Math.max(out[q] / mx, -1); return f; }
    return out;
  }
  function nodeMatrix(n) {
    if (n.matrix) return new Float32Array(n.matrix);
    var t = n.translation || [0, 0, 0], r = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1], x = r[0], y = r[1], z = r[2], w = r[3];
    var m = new Float32Array([
      (1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0,
      2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0,
      2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0, t[0], t[1], t[2], 1]);
    return m;
  }

  // Every GL object a model owns is registered in model.res so disposeModel() can release all of it.
  function disposeModel(gl, model, counters) {
    if (!model || model.disposed) return; model.disposed = true;
    try {
      model.res.vaos.forEach(function (v) { gl.deleteVertexArray(v); });
      model.res.buffers.forEach(function (b) { gl.deleteBuffer(b); });
      model.res.textures.forEach(function (t) { gl.deleteTexture(t); });
    } catch (e) {}
    if (counters) { counters.vaos -= model.res.vaos.length; counters.buffers -= model.res.buffers.length; counters.textures -= model.res.textures.length; }
    model.res = { vaos: [], buffers: [], textures: [] }; model.prims = [];
  }
  var SLICE_MS = 6;
  function nextSlice(fn) { setTimeout(fn, 0); }
  // Parses a GLB and uploads it to the GPU in time slices (<= ~6 ms of main-thread work per slice).
  // alive() lets the caller cancel mid-way (teardown, context loss, model no longer wanted); partial GL objects are then released.
  function buildModelAsync(gl, buf, alive, counters) {
    return new Promise(function (resolve, reject) {
      var g, j, model = { prims: [], min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9], pending: 0, onready: null, disposed: false, res: { vaos: [], buffers: [], textures: [] } }, texCache = {}, jobs = [], at = 0;
      function mkBuf() { var b = gl.createBuffer(); model.res.buffers.push(b); counters.buffers++; return b; }
      function mkVao() { var v = gl.createVertexArray(); model.res.vaos.push(v); counters.vaos++; return v; }
      function mkTex() { var t = gl.createTexture(); model.res.textures.push(t); counters.textures++; return t; }
      function texFor(ti) {
        if (ti == null) return null; if (texCache[ti]) return texCache[ti];
        var t = j.textures[ti], img = j.images[t.source], samp = (t.sampler != null && j.samplers) ? j.samplers[t.sampler] : {};
        var tex = mkTex(); gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([200, 200, 200, 255]));
        texCache[ti] = tex; model.pending++;
        var bv = j.bufferViews[img.bufferView], bytes = new Uint8Array(g.bin, bv.byteOffset || 0, bv.byteLength);
        createImageBitmap(new Blob([bytes], { type: img.mimeType || 'image/png' }), { premultiplyAlpha: 'none' }).then(function (bm) {
          if (model.disposed || !alive()) { if (bm.close) bm.close(); return; } // late decode after eviction/teardown: never touch deleted objects
          gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bm); gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, samp.wrapS || gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, samp.wrapT || gl.REPEAT);
          var ext = gl.getExtension('EXT_texture_filter_anisotropic'); if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 4);
          if (bm.close) bm.close(); model.pending--; if (!model.pending && model.onready) model.onready();
        }, function () { model.pending--; });
        return tex;
      }
      function collect(ni, parent) { // node walk only; accessor reads happen later, one primitive per step
        var n = j.nodes[ni], w = M.mul(parent, nodeMatrix(n));
        if (n.mesh != null) j.meshes[n.mesh].primitives.forEach(function (pr) { if ((pr.mode != null && pr.mode !== 4) || pr.attributes.POSITION == null) return; jobs.push({ pr: pr, w: w }); });
        (n.children || []).forEach(function (c) { collect(c, w); });
      }
      function prim(job) {
        var pr = job.pr, w = job.w;
        var pos = readAcc(g, pr.attributes.POSITION), idx = pr.indices != null ? readAcc(g, pr.indices) : null, nor, uv;
        if (pr.attributes.NORMAL != null) nor = readAcc(g, pr.attributes.NORMAL);
        else { nor = new Float32Array(pos.length); var cnt = idx ? idx.length : pos.length / 3; for (var t = 0; t < cnt; t += 3) { var i0 = idx ? idx[t] : t, i1 = idx ? idx[t + 1] : t + 1, i2 = idx ? idx[t + 2] : t + 2, ax = pos[i1 * 3] - pos[i0 * 3], ay = pos[i1 * 3 + 1] - pos[i0 * 3 + 1], az = pos[i1 * 3 + 2] - pos[i0 * 3 + 2], bx = pos[i2 * 3] - pos[i0 * 3], by = pos[i2 * 3 + 1] - pos[i0 * 3 + 1], bz = pos[i2 * 3 + 2] - pos[i0 * 3 + 2], nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; [i0, i1, i2].forEach(function (ii) { nor[ii * 3] += nx; nor[ii * 3 + 1] += ny; nor[ii * 3 + 2] += nz; }); } }
        uv = pr.attributes.TEXCOORD_0 != null ? readAcc(g, pr.attributes.TEXCOORD_0) : new Float32Array(pos.length / 3 * 2);
        var vao = mkVao(); gl.bindVertexArray(vao);
        [[pos, 0, 3], [nor, 1, 3], [uv, 2, 2]].forEach(function (a) { var b = mkBuf(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, a[0], gl.STATIC_DRAW); gl.enableVertexAttribArray(a[1]); gl.vertexAttribPointer(a[1], a[2], gl.FLOAT, false, 0, 0); });
        var type = 0, count = pos.length / 3;
        if (idx) { var ib = mkBuf(), arr = idx instanceof Uint8Array ? new Uint16Array(idx) : idx; type = arr instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT; gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, arr, gl.STATIC_DRAW); count = arr.length; }
        gl.bindVertexArray(null);
        var mt = pr.material != null ? j.materials[pr.material] : {}, pbr = mt.pbrMetallicRoughness || {}, es = (mt.extensions && mt.extensions.KHR_materials_emissive_strength) ? mt.extensions.KHR_materials_emissive_strength.emissiveStrength : 1;
        var em = (mt.emissiveFactor || [0, 0, 0]).map(function (v) { return v * es; });
        var mat = { base: pbr.baseColorFactor || [1, 1, 1, 1], tex: pbr.baseColorTexture ? texFor(pbr.baseColorTexture.index) : null, emTex: mt.emissiveTexture ? texFor(mt.emissiveTexture.index) : null, em: em, mode: mt.alphaMode || 'OPAQUE', cut: mt.alphaCutoff != null ? mt.alphaCutoff : 0.5, dbl: !!mt.doubleSided };
        model.prims.push({ vao: vao, count: count, type: type, node: w, mat: mat });
        for (var vi = 0; vi < pos.length; vi += 3) { var p = M.pt(w, [pos[vi], pos[vi + 1], pos[vi + 2]]); for (var kk = 0; kk < 3; kk++) { if (p[kk] < model.min[kk]) model.min[kk] = p[kk]; if (p[kk] > model.max[kk]) model.max[kk] = p[kk]; } } // real vertex bounds (accessor min/max can be wrong)
      }
      function step() {
        try {
          if (!alive()) { disposeModel(gl, model, counters); return reject(fail('cancelled', 'AbortError')); }
          var t0 = performance.now();
          while (at < jobs.length) { prim(jobs[at++]); if (performance.now() - t0 > SLICE_MS && at < jobs.length) return nextSlice(step); }
          g = j = null; resolve(model); // CPU copies of the file are not retained past this point
        } catch (er) { disposeModel(gl, model, counters); reject(er); }
      }
      try {
        g = parseGLB(buf); j = g.j;
        (j.scenes[j.scene || 0].nodes).forEach(function (ni) { collect(ni, M.id()); });
      } catch (er) { return reject(er); }
      nextSlice(step);
    });
  }
  function fail(msg, name) { var e = new Error(msg); if (name) e.name = name; return e; }

  // ---------- unit geometry ----------
  function cubeData() {
    var F = [[[0, 0, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1], [1, -1, -1]], [[0, 0, 1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
      [[-1, 0, 0], [-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]], [[1, 0, 0], [1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]],
      [[0, 1, 0], [-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]], [[0, -1, 0], [-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]];
    var p = [], n = [], u = [], uvs = [[0, 0], [0, 1], [1, 1], [1, 0]];
    F.forEach(function (f) { [0, 1, 2, 0, 2, 3].forEach(function (i) { var v = f[1 + i]; p.push(v[0] / 2, v[1] / 2, v[2] / 2); n.push(f[0][0], f[0][1], f[0][2]); u.push(uvs[i][0], uvs[i][1]); }); });
    return { p: new Float32Array(p), n: new Float32Array(n), u: new Float32Array(u), faces: F };
  }
  function fanData() { // disc + 7 blades + outer ring in the XY plane, radius 1, facing +z
    var P = [], N = [], U = [], i;
    function tri(a, b, c) { [a, b, c].forEach(function (v) { P.push(v[0], v[1], 0); N.push(0, 0, 1); U.push(0, 0); }); }
    var seg = 28;
    for (i = 0; i < seg; i++) { var a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832; tri([0, 0], [Math.cos(a0) * .98, Math.sin(a0) * .98], [Math.cos(a1) * .98, Math.sin(a1) * .98]); }
    var disc = P.length / 3;
    for (i = 0; i < 7; i++) { var b = i / 7 * 6.2832, c = Math.cos(b), s = Math.sin(b), c2 = Math.cos(b + .75), s2 = Math.sin(b + .75), c3 = Math.cos(b + .42), s3 = Math.sin(b + .42); tri([c * .16, s * .16], [c2 * .9, s2 * .9], [c3 * .96, s3 * .96]); tri([c * .16, s * .16], [c3 * .96, s3 * .96], [Math.cos(b + .2) * .5, Math.sin(b + .2) * .5]); }
    var blades = P.length / 3 - disc, ring0 = P.length / 3;
    for (i = 0; i < seg; i++) { var q0 = i / seg * 6.2832, q1 = (i + 1) / seg * 6.2832, ci0 = Math.cos(q0), si0 = Math.sin(q0), ci1 = Math.cos(q1), si1 = Math.sin(q1); tri([ci0 * .98, si0 * .98], [ci0 * 1.08, si0 * 1.08], [ci1 * 1.08, si1 * 1.08]); tri([ci0 * .98, si0 * .98], [ci1 * 1.08, si1 * 1.08], [ci1 * .98, si1 * .98]); }
    return { p: new Float32Array(P), n: new Float32Array(N), u: new Float32Array(U), disc: disc, blades: blades, ring0: ring0, ring: P.length / 3 - ring0 };
  }

  function create(canvas) {
    var gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true });
    if (!gl) return null;
    var P, LP, U, cube, fan, edges, quad, grid, white, cd = cubeData(), fd = fanData();
    function initGL() { // everything that lives on the GL context; re-run after webglcontextrestored
      P = prog(gl, VS, FS); LP = prog(gl, LVS, LFS); U = P.u;
      cube = vao(cd); fan = vao(fd);
      edges = (function () { // 12 cube edges as lines
        var c = [[-.5, -.5, -.5], [.5, -.5, -.5], [.5, .5, -.5], [-.5, .5, -.5], [-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5]], e = [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7], a = [];
        e.forEach(function (i) { a.push(c[i][0], c[i][1], c[i][2]); });
        var v = gl.createVertexArray(); gl.bindVertexArray(v); var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null); return v;
      })();
      quad = vao({ p: new Float32Array([-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, -1, 1, 0, 1, -1, 0, 1]), n: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), u: new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]) });
      grid = (function () {
        var a = []; for (var k = -480; k <= 480; k += 60) { a.push(k, 0, -480, k, 0, 480, -480, 0, k, 480, 0, k); }
        var v = gl.createVertexArray(); gl.bindVertexArray(v); var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null); return { v: v, n: a.length / 3 };
      })();
      white = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, white); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    }
    var reduce = false; try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    var st = V3.view; st.items = []; st.drag = null; st.raf = 0;
    function vao(d) {
      var v = gl.createVertexArray(); gl.bindVertexArray(v);
      [[d.p, 0, 3], [d.n, 1, 3], [d.u, 2, 2]].forEach(function (a) { var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, a[0], gl.STATIC_DRAW); gl.enableVertexAttribArray(a[1]); gl.vertexAttribPointer(a[1], a[2], gl.FLOAT, false, 0, 0); });
      gl.bindVertexArray(null); return v;
    }
    try { initGL(); } catch (e) { return null; }

    // ---- model cache: GLBs are fetched on demand (window.RIGLAB_MODELS carries metadata + url only) ----
    var CFG = V3.glConfig = V3.glConfig || { maxUnused: 2, parkTtlMs: 45000, errorRetryMs: 30000 };
    var owner = 'v' + (++V3.viewerSeq || (V3.viewerSeq = 1));
    var models = {};              // id -> { state: 'loading' | 'ready' | 'error', cfg, cat, m, used, err, retryAt }
    var wanted = {};              // ids the current scene needs (+ forced diagnostics ids); everything else is evictable
    var counters = { buffers: 0, vaos: 0, textures: 0 }, cpuBytes = 0, tick = 0;
    var dead = false, lost = false, epoch = 0, parked = false, parkTimer = 0, lastParts = null, notifyQueued = false;
    var api = null;
    function reg() { return window.RIGLAB_MODELS || {}; }
    function notify() { // identity/loading state changed; coalesced so the UI updates once per burst
      if (notifyQueued) return; notifyQueued = true;
      Promise.resolve().then(function () { notifyQueued = false; if (!dead && api && api.onchange) { try { api.onchange(); } catch (e) {} } });
    }
    function drop(id, release) { // forget a model entry; frees GL objects if it was uploaded
      var e = models[id]; if (!e) return;
      delete models[id];
      if (e.m) disposeModel(gl, e.m, counters);
      if (release) RigLabAssets.release(id, owner);
    }
    function trim() { // evict ready models nobody wants, keeping at most CFG.maxUnused of the most recently used
      var idle = Object.keys(models).filter(function (id) { return !wanted[id] && models[id].state === 'ready'; }).sort(function (a, b) { return models[b].used - models[a].used; });
      idle.slice(CFG.maxUnused).forEach(function (id) { drop(id, false); });
    }
    function setWanted(ids) {
      wanted = {}; ids.forEach(function (id) { wanted[id] = 1; });
      Object.keys(models).forEach(function (id) { if (!wanted[id] && models[id].state === 'loading') drop(id, true); }); // abort fetches nobody needs any more
      trim();
    }
    function ensure(id) { // starts loading a variant once; returns its entry (state 'loading' | 'ready' | 'error')
      var r = reg(), e = models[id];
      if (e) { e.used = ++tick; if (e.state === 'error' && Date.now() > e.retryAt && wanted[id]) { drop(id, false); e = null; } else return e; }
      if (!r[id] || dead || lost) return null;
      e = models[id] = { state: 'loading', cfg: r[id], cat: r[id].cat, used: ++tick };
      var myEpoch = epoch;
      function stale() { return dead || lost || epoch !== myEpoch || models[id] !== e; }
      RigLabAssets.request(id, r[id], owner).then(function (buf) {
        if (stale()) return;
        if (!wanted[id]) { drop(id, false); return; } // the scene moved on while the bytes were in flight: do not upload
        cpuBytes += buf.byteLength;
        return buildModelAsync(gl, buf, function () { return !stale() && !!wanted[id]; }, counters).then(function (m) {
          cpuBytes -= buf.byteLength;
          if (stale()) { disposeModel(gl, m, counters); return; }
          m.onready = function () { invalidate(); };
          e.m = m; e.state = 'ready'; notify(); invalidate(); trim();
        }, function (er) { cpuBytes -= buf.byteLength; throw er; });
      }).catch(function (er) {
        if (stale()) return;
        if (er && er.name === 'AbortError') { drop(id, false); notify(); return; }
        e.state = 'error'; e.err = String(er && er.message); e.retryAt = Date.now() + CFG.errorRetryMs; notify(); invalidate();
      });
      notify();
      return e;
    }
    var forced = {};
    // the model ids the draw loop will ask for, per scene item (mirrors the picks in draw())
    function keysFor(it) {
      if (it.ghost || !it.part) return [];
      if (it.frame) return it.key === 'case' ? [['case', it.part]] : [];
      var k = it.key === 'storage' ? 'ssd' : it.key, out = [[k, it.part]];
      if (it.key === 'cooler' && it.boxes.length === 2) out.push(['coolerpump', it.part]);
      return out;
    }
    function demand(items) {
      var ids = [], I = window.RigLabIdentity;
      items.forEach(function (it) { keysFor(it).forEach(function (kp) { var r = I && I.resolve(reg(), kp[0], kp[1]); if (r) ids.push(r.id); }); });
      Object.keys(forced).forEach(function (c) { if (forced[c]) ids.push(forced[c]); });
      setWanted(ids); ids.forEach(function (id) { ensure(id); });
    }
    function pickEntry(key, part) {
      var id = forced[key] || null; // forced = diagnostics/tests only
      if (!id) { var r = window.RigLabIdentity && window.RigLabIdentity.resolve(reg(), key, part); id = r ? r.id : null; }
      var e = id && wanted[id] ? ensure(id) : null; // ids outside the demanded set are never fetched from the draw loop
      return e && e.state === 'ready' ? e : null;
    }
    // what the viewer is really showing for every part. level = what the mapping promises (exact | representative | generic);
    // status says whether that model is on screen yet: ready | loading (placeholder shown for now) | error (placeholder kept) | none
    var IDENT_KEYS = ['gpu', 'cpu', 'mobo', 'ram', 'case', 'cooler'];
    function identity() {
      var out = [];
      (st.items || []).forEach(function (it) {
        if (it.ghost || it.frame && it.key !== 'case' || !it.part || IDENT_KEYS.indexOf(it.key) < 0) return;
        var r = window.RigLabIdentity && window.RigLabIdentity.resolve(reg(), it.key, it.part), e = r && models[r.id];
        var status = !r ? 'none' : e ? e.state : 'loading', ok = status === 'ready';
        out.push({ key: it.key, id: it.part.id, level: !r ? 'generic' : status === 'error' ? 'generic' : r.level, status: status, model: ok ? r.id : null, actual: ok ? (r.identity.manufacturer + ' ' + r.identity.product) : '', note: ok ? r.note : '', error: status === 'error' ? e.err : '' });
      });
      return out;
    }

    function setMat(m, o) {
      o = o || {};
      gl.uniform4fv(U.uBase, m.base); gl.uniform1f(U.uHasTex, m.tex ? 1 : 0); gl.uniform1f(U.uHasEm, m.emTex ? 1 : 0); gl.uniform3fv(U.uEm, o.em || m.em);
      gl.uniform1f(U.uAlpha, o.alpha != null ? o.alpha : 1); gl.uniform1f(U.uUnlit, o.unlit ? 1 : 0); gl.uniform1f(U.uRadial, o.radial ? 1 : 0); gl.uniform1f(U.uCut, m.mode === 'MASK' ? m.cut : 0); gl.uniform1f(U.uGlow, o.glow || 0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, m.tex || white); gl.uniform1i(U.uTex, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, m.emTex || white); gl.uniform1i(U.uEmTex, 1);
    }
    function setModel(m) { gl.uniformMatrix4fv(U.uM, false, m); gl.uniformMatrix3fv(U.uN, false, M.nrm(m)); }
    function solid(col, o) { return { base: [col[0], col[1], col[2], col[3] != null ? col[3] : 1], tex: null, emTex: null, em: (o && o.em) || [0, 0, 0], mode: 'OPAQUE', cut: 0 }; }
    function drawCube(model, col, o) { setMat(solid(col, o), o); setModel(model); gl.bindVertexArray(cube); gl.drawArrays(gl.TRIANGLES, 0, 36); }
    function hex(h, k) { var n = parseInt(h.slice(1), 16); k = k || 1; return [(n >> 16) / 255 * k, ((n >> 8) & 255) / 255 * k, (n & 255) / 255 * k]; }
    function drawEdges(model, col, a) { gl.useProgram(LP.p); gl.uniformMatrix4fv(LP.u.uVP, false, VP); gl.uniformMatrix4fv(LP.u.uM, false, model); gl.uniform4f(LP.u.uCol, col[0], col[1], col[2], a); gl.bindVertexArray(edges); gl.drawArrays(gl.LINES, 0, 24); gl.useProgram(P.p); }

    // permute model axes so extents rank-match the target box (longest->longest ...); flips come from cfg.flip
    function autoBasis(m, box) {
      var e = [0, 1, 2].map(function (k) { return m.max[k] - m.min[k]; }), t = box.s, ei = [0, 1, 2].sort(function (a, b) { return e[b] - e[a]; }), ti = [0, 1, 2].sort(function (a, b) { return t[b] - t[a]; }), rows = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (var r = 0; r < 3; r++) rows[ti[r]][ei[r]] = 1;
      // rows[target axis][model axis]; M.basis expects b[i] = image of model axis i
      var b = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (var a = 0; a < 3; a++) for (var c = 0; c < 3; c++) b[c][a] = rows[a][c];
      return M.basis(b);
    }
    // placement of a GLB so that its (rotated) bounding box fills the target box
    function place(entry, box, extra) {
      var m = entry.m, cfg = entry.cfg, R = cfg.basis ? M.basis(cfg.basis) : autoBasis(m, box);
      var c0 = [(m.min[0] + m.max[0]) / 2, (m.min[1] + m.max[1]) / 2, (m.min[2] + m.max[2]) / 2], M0 = M.mul(cfg.flip ? M.mul(M.S(cfg.flip[0], cfg.flip[1], cfg.flip[2]), R) : R, M.T(-c0[0], -c0[1], -c0[2]));
      var lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
      for (var i = 0; i < 8; i++) { var p = M.pt(M0, [i & 1 ? m.max[0] : m.min[0], i & 2 ? m.max[1] : m.min[1], i & 4 ? m.max[2] : m.min[2]]); for (var k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); } }
      var cc = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2], e = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
      // one uniform scale (no stretching): fit the longest axis, or the board plane for flat boards
      var ord = [0, 1, 2].sort(function (a, b) { return box.s[b] - box.s[a]; }), u;
      u = cfg.plane ? Math.min(box.s[ord[0]] / e[ord[0]], box.s[ord[1]] / e[ord[1]]) : box.s[ord[0]] / e[ord[0]];
      u *= cfg.scale || 1;
      var ux = u, uy = u, uz = u; if (cfg.fit) { ux = box.s[0] / e[0]; uy = box.s[1] / e[1]; uz = box.s[2] / e[2]; }
      var c = box.c, ex = (extra || [0, 0, 0]).slice();
      if (cfg.anchor) ex[0] += box.s[0] / 2 - e[0] * ux / 2; // flush with the +x face (motherboard tray)
      return M.mul(M.T(c[0] + ex[0] - (cfg.anchor ? 0 : 0), c[1] + ex[1], c[2] + ex[2]), M.mul(M.S(ux, uy, uz), M.mul(M.T(-cc[0], -cc[1], -cc[2]), M0)));
    }
    function drawEntry(entry, pl, alpha) { drawModel(entry, pl, alpha, 'opaque'); gl.depthMask(false); drawModel(entry, pl, alpha, 'blend'); gl.depthMask(true); }
    function drawModel(entry, placement, alpha, pass) {
      entry.m.prims.forEach(function (pr) {
        var blend = pr.mat.mode === 'BLEND'; if ((pass === 'blend') !== blend) return;
        setMat(pr.mat, { alpha: alpha, em: entry.cfg.em }); var wm = M.mul(placement, pr.node);
        gl.frontFace(M.det3(wm) < 0 ? gl.CW : gl.CCW); // glTF: a mirrored world matrix reverses triangle winding; without this culling hides the outside and shows the inside
        setModel(wm);
        if (pr.mat.dbl) gl.disable(gl.CULL_FACE); else gl.enable(gl.CULL_FACE);
        gl.bindVertexArray(pr.vao); if (pr.type) gl.drawElements(gl.TRIANGLES, pr.count, pr.type, 0); else gl.drawArrays(gl.TRIANGLES, 0, pr.count);
      });
      gl.frontFace(gl.CCW); gl.disable(gl.CULL_FACE);
    }
    function drawFan(c, axis, r, spin, alpha) {
      var base = axis === 'z' ? M.id() : axis === 'y' ? M.RX(-Math.PI / 2) : M.RY(Math.PI / 2);
      var model = M.mul(M.T(c[0], c[1], c[2]), M.mul(base, M.mul(M.RZ(spin), M.S(r, r, r))));
      gl.bindVertexArray(fan); gl.disable(gl.CULL_FACE);
      setMat(solid([.09, .01, .03]), { alpha: alpha }); setModel(model); gl.drawArrays(gl.TRIANGLES, 0, fd.disc);
      setMat(solid([1, .18, .3]), { alpha: alpha, unlit: true, glow: .25 }); setModel(M.mul(model, M.T(0, 0, .02))); gl.drawArrays(gl.TRIANGLES, fd.disc, fd.blades);
      setMat(solid([1, .12, .25]), { alpha: alpha, unlit: true, glow: .4 }); setModel(M.mul(model, M.T(0, 0, .03))); gl.drawArrays(gl.TRIANGLES, fd.ring0, fd.ring);
    }

    var VP = M.id();
    function setParts(parts) {
      var now = performance.now(), items = V3.layout(parts);
      items.forEach(function (it) { it.k = it.key + ':' + it.id + (it.ghost ? ':g' : ''); if (!st.born[it.k]) st.born[it.k] = now; it.part = parts[it.key] || null; });
      st.items = items; lastParts = parts; demand(items); notify(); if (!lost) draw(now);
    }
    function size() {
      var r = canvas.getBoundingClientRect(), dpr = Math.min(1.5, window.devicePixelRatio || 1), w = Math.max(10, Math.round(r.width * dpr)), h = Math.max(10, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; } return { w: w, h: h };
    }
    function draw(now) {
      if (lost || dead) return false;
      var s = size(); gl.viewport(0, 0, s.w, s.h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      var yaw = st.yaw, pit = st.pitch, dist = 1250 / st.zoom, asp = s.w / s.h;
      var eye = [dist * Math.sin(yaw) * Math.cos(pit), 20 + dist * Math.sin(pit), -dist * Math.cos(yaw) * Math.cos(pit)];
      VP = M.mul(M.persp(0.5, asp, 50, 5000), M.look(eye, [0, 0, 0], [0, 1, 0]));
      gl.useProgram(P.p); gl.uniformMatrix4fv(U.uVP, false, VP); gl.uniform3fv(U.uEye, eye);
      var caseItem = null, moving = false, spin = reduce ? 0 : now / 260;
      st.items.forEach(function (it) { if (it.frame) caseItem = it; });
      var cb = caseItem ? caseItem.boxes[0] : null, W = cb ? cb.s[0] : 210, H = cb ? cb.s[1] : 450, D = cb ? cb.s[2] : 440, fy = -H / 2 - 6;
      // floor: glow + grid
      gl.enable(gl.BLEND); gl.depthMask(false);
      setMat(solid([.7, .75, .85, .22]), { unlit: true, radial: true }); setModel(M.mul(M.T(0, fy, 0), M.S(Math.max(W, D) * 1.1, 1, Math.max(W, D) * 1.1))); gl.bindVertexArray(quad); gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.useProgram(LP.p); gl.uniformMatrix4fv(LP.u.uVP, false, VP); gl.uniformMatrix4fv(LP.u.uM, false, M.T(0, fy, 0)); gl.uniform4f(LP.u.uCol, .6, .65, .75, .14); gl.bindVertexArray(grid.v); gl.drawArrays(gl.LINES, 0, grid.n); gl.useProgram(P.p);
      gl.depthMask(true);
      var showCase = cb && !caseItem.ghost, cEntry = showCase && caseItem.part ? pickEntry('case', caseItem.part) : null;
      // interior walls of the case (dark), seen through the glass
      if (showCase && !cEntry) { gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT); drawCube(M.mul(M.T(cb.c[0], cb.c[1], cb.c[2]), M.S(W, H, D)), [.045, .045, .06]); gl.cullFace(gl.BACK); gl.disable(gl.CULL_FACE); }
      // parts
      var blendQueue = [];
      st.items.forEach(function (it) {
        if (it.frame) return;
        var age = reduce ? 1 : Math.min(1, (now - st.born[it.k]) / 700), e = 1 - Math.pow(1 - age, 3); if (age < 1) moving = true;
        var off = it.ghost ? 0 : (1 - e) * -170, alpha = it.ghost ? 1 : Math.max(.05, e);
        if (it.ghost) { it.boxes.forEach(function (b) { drawEdges(M.mul(M.T(b.c[0], b.c[1], b.c[2]), M.S(b.s[0], b.s[1], b.s[2])), [1, .18, .3], .4); }); return; }
        var entry = it.part ? pickEntry(it.key === 'storage' ? 'ssd' : it.key, it.part) : null, useModel = !!entry;
        if (useModel && it.key === 'ram') {
          it.boxes.forEach(function (b, bi) { gl.enable(gl.BLEND); drawEntry(entry, place(entry, b, [off, 0, 0]), alpha); });
        } else if (useModel && it.key === 'cooler' && it.boxes.length === 2) {
          var pb2 = it.boxes[0], rb2 = it.boxes[1], pe = pickEntry('coolerpump', it.part);
          gl.enable(gl.BLEND);
          drawEntry(entry, place(entry, { c: [rb2.c[0], rb2.c[1] - 6, rb2.c[2]], s: [rb2.s[0], 48, rb2.s[2]], col: rb2.col }, [off, 0, 0]), alpha);
          if (pe) drawEntry(pe, place(pe, pb2, [off, 0, 0]), alpha);
          var sg = pb2.c[2] > rb2.c[2] ? 1 : -1, hs = [-9, 9];
          hs.forEach(function (dz) {
            var p0 = [pb2.c[0] - pb2.s[0] / 2 + off, pb2.c[1] + pb2.s[1] / 2 - 6, pb2.c[2] + dz], p3 = [rb2.c[0] + dz * .6 + off, rb2.c[1] - 18, rb2.c[2] + sg * (rb2.s[2] / 2 - 25)];
            var p1 = [p0[0], p0[1] + 70, p0[2]], p2 = [p3[0], p3[1] - 60, p3[2] - sg * 30];
            for (var t = 0; t < 1; t += 1 / 16) { var u2 = 1 - t, c0 = u2 * u2 * u2, c1 = 3 * u2 * u2 * t, c2 = 3 * u2 * t * t, c3 = t * t * t, q = [0, 1, 2].map(function (k) { return c0 * p0[k] + c1 * p1[k] + c2 * p2[k] + c3 * p3[k]; }); drawCube(M.mul(M.T(q[0], q[1], q[2]), M.S(9, 9, 9)), [.16, .16, .19], { alpha: alpha }); }
          });
        } else if (useModel) {
          var b0 = it.boxes[0]; gl.enable(gl.BLEND); drawEntry(entry, place(entry, b0, [off, 0, 0]), alpha);
        } else {
          it.boxes.forEach(function (b) { var k = it.key === 'mobo' ? .55 : .4; drawCube(M.mul(M.T(b.c[0] + off, b.c[1], b.c[2]), M.S(b.s[0], b.s[1], b.s[2])), hex(b.col, k), { alpha: it.key === 'cooler' && it.boxes.length === 1 ? alpha * .5 : alpha }); });
        }
        if (it.bad) it.boxes.forEach(function (b) { drawEdges(M.mul(M.T(b.c[0] + off, b.c[1], b.c[2]), M.S(b.s[0] * 1.02, b.s[1] * 1.02, b.s[2] * 1.02)), [1, .7, .14], 1); });
        // fans on GPU / AIO
        if (it.key === 'gpu' && it.part) { var gb = it.boxes[0], n = gb.s[2] > 285 ? 3 : 2, gap = gb.s[2] / n; for (var q = 0; q < n; q++) if (!useModel) drawFan([gb.c[0] + off, gb.c[1] - gb.s[1] / 2 - 1, gb.c[2] - gb.s[2] / 2 + gap * (q + .5)], 'y', Math.min(46, gap / 2 - 2), spin, alpha); }
        if (it.key === 'cooler' && it.boxes.length === 2 && !useModel) {
          var rb = it.boxes[1], m = rb.s[2] > 300 ? 3 : 2, gp = rb.s[2] / m;
          for (var q2 = 0; q2 < m; q2++) drawFan([rb.c[0] + off, rb.c[1] - rb.s[1] / 2 - 3, rb.c[2] - rb.s[2] / 2 + gp * (q2 + .5)], 'y', 56, spin, alpha);
          var pb = it.boxes[0]; drawFan([pb.c[0] - pb.s[0] / 2 + off - 1, pb.c[1], pb.c[2]], 'x', 30, spin, alpha);
        }
      });
      if (cEntry) {
        gl.enable(gl.BLEND); drawEntry(cEntry, place(cEntry, cb, [0, 0, 0]), 1);
      } else if (showCase) {
        var fz = D / 2 - 20, yy = H / 2 - 85, step = (H - 150) / 3;
        [0, 1, 2].forEach(function (n) { drawFan([0, yy - step * n, fz], 'z', 60, spin, 1); });
        drawFan([0, H / 2 - 120, -D / 2 + 18], 'z', 60, spin, 1);
        // outer panels: opaque dark except the glass (-x side)
        gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
        var C = cd.faces, M0 = M.T(cb.c[0], cb.c[1], cb.c[2]);
        C.forEach(function (f, fi) {
          var nrm = f[0], mm = M.mul(M0, M.mul(M.T(nrm[0] * W / 2, nrm[1] * H / 2, nrm[2] * D / 2), M.S(nrm[0] ? .0001 : W, nrm[1] ? .0001 : H, nrm[2] ? .0001 : D)));
          var glass = nrm[0] === -1;
          // a flat unit cube squashed along its normal behaves as a one-sided panel
          if (glass) return;
          drawCube(mm, [.05, .05, .065]);
        });
        gl.disable(gl.CULL_FACE);
        // case edges (neon) + glass
        drawEdges(M.mul(M0, M.S(W, H, D)), [1, .18, .3], .65);
        gl.depthMask(false);
        var gm = M.mul(M0, M.mul(M.T(-W / 2, 0, 0), M.S(.0001, H, D))); setMat(solid([.5, .55, .68, .08]), { alpha: 1 }); setModel(gm); gl.bindVertexArray(cube); gl.drawArrays(gl.TRIANGLES, 0, 36);
        gl.depthMask(true);
      } else if (caseItem) {
        drawEdges(M.mul(M.T(cb.c[0], cb.c[1], cb.c[2]), M.S(W, H, D)), [1, 1, 1], .25);
      }
      gl.bindVertexArray(null);
      return moving;
    }
    // on-demand rendering: draw only when something changed (or while an animation runs)
    var pend = false, last = 0;
    function invalidate() { if (dead || lost || parked || pend || !canvas.isConnected) return; pend = true; st.raf = requestAnimationFrame(frame); }
    function frame(now) {
      pend = false; st.raf = 0; if (!canvas.isConnected || lost || dead) return;
      if (document.hidden) return;
      if (now - last < 30) { invalidate(); return; } last = now;
      if (st.auto && !st.drag) st.yaw += 0.01;
      var mv = draw(now);
      if (mv || (st.auto && !st.drag)) invalidate();
    }
    st.auto = false; // static by default: no continuous redraw = no lag
    var ptrs = {}, pinch0 = 0, zoom0 = 1;
    function zset(z) { st.zoom = Math.max(0.5, Math.min(3, z)); invalidate(); }
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', function (e) { ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; var ks = Object.keys(ptrs); if (ks.length === 2) { pinch0 = Math.hypot(ptrs[ks[0]].x - ptrs[ks[1]].x, ptrs[ks[0]].y - ptrs[ks[1]].y); zoom0 = st.zoom; st.drag = null; } else st.drag = { x: e.clientX, y: e.clientY }; st.auto = false; try { canvas.setPointerCapture(e.pointerId); } catch (er) {} });
    canvas.addEventListener('pointermove', function (e) {
      if (!ptrs[e.pointerId]) return; ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ks = Object.keys(ptrs);
      if (ks.length >= 2) { var d = Math.hypot(ptrs[ks[0]].x - ptrs[ks[1]].x, ptrs[ks[0]].y - ptrs[ks[1]].y); if (pinch0 > 0) zset(zoom0 * d / pinch0); return; }
      if (!st.drag) return;
      st.yaw += (e.clientX - st.drag.x) * 0.008; st.pitch = Math.max(-0.2, Math.min(0.9, st.pitch + (e.clientY - st.drag.y) * 0.006));
      st.drag = { x: e.clientX, y: e.clientY }; invalidate();
    });
    function up(e) { delete ptrs[e.pointerId]; var ks = Object.keys(ptrs); st.drag = ks.length === 1 ? { x: ptrs[ks[0]].x, y: ptrs[ks[0]].y } : null; pinch0 = 0; }
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('dblclick', function () { st.zoom = 1; st.yaw = -1.1; st.pitch = 0.18; invalidate(); });
    canvas.addEventListener('wheel', function (e) { e.preventDefault(); zset(st.zoom * (e.deltaY < 0 ? 1.1 : 0.9)); }, { passive: false });
    function start() { invalidate(); }
    // ---- context loss / restoration ----
    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault(); // lets the browser restore the context later
      lost = true; epoch++; if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0; pend = false;
      RigLabAssets.releaseAll(owner);
      Object.keys(models).forEach(function (id) { delete models[id]; }); // GL objects are already gone with the context; nothing to delete
      counters.buffers = counters.vaos = counters.textures = 0; cpuBytes = 0; notify();
    });
    canvas.addEventListener('webglcontextrestored', function () {
      if (dead) return;
      try { initGL(); } catch (er) { dead = true; notify(); return; }
      lost = false; if (lastParts && !parked) { setParts(lastParts); invalidate(); } notify();
    });
    // ---- park / resume: leaving the Builder keeps the context but stops rendering, then frees models after a grace period ----
    function releaseAll() { RigLabAssets.releaseAll(owner); Object.keys(models).forEach(function (id) { drop(id, false); }); wanted = {}; cpuBytes = 0; }
    function park() {
      if (dead || parked) return; parked = true; if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0; pend = false;
      setWanted([]); clearTimeout(parkTimer); parkTimer = setTimeout(function () { if (parked && !dead) releaseAll(); }, CFG.parkTtlMs);
    }
    function resume(parts) {
      if (dead) return; clearTimeout(parkTimer); parked = false; ptrs = {}; pinch0 = 0; st.drag = null; // a gesture cut short by a re-render must not leave stale pointers
      if (parts) setParts(parts); else if (lastParts) setParts(lastParts); invalidate();
    }
    api = {
      gl: true, canvas: canvas, setParts: function (p) { if (parked) resume(); setParts(p); start(); }, state: st, models: models, draw: function () { draw(performance.now()); },
      park: park, resume: resume, onchange: null,
      lost: function () { return lost; }, dead: function () { return dead; }, parked: function () { return parked; },
      // GPU/CPU bookkeeping for tests and diagnostics: live model GL objects, models by state, CPU bytes still held for parsing
      resources: function () {
        var by = { ready: 0, loading: 0, error: 0 }; Object.keys(models).forEach(function (id) { by[models[id].state]++; });
        return { models: by, buffers: counters.buffers, vaos: counters.vaos, textures: counters.textures, cpuBytes: cpuBytes, wanted: Object.keys(wanted).length, fetches: RigLabAssets.pending() };
      },
      rotate: function (d) { st.yaw += d; st.auto = false; invalidate(); }, zoomBy: function (f) { zset(st.zoom * f); },
      toggleAuto: function () { st.auto = !st.auto; invalidate(); return st.auto; },
      force: function (cat, id) { forced[cat] = id; if (lastParts) demand(st.items); else { wanted[id] = 1; ensure(id); } invalidate(); }, identity: identity,
      // full teardown: abort fetches, free every model, release the GL context; late completions are ignored (dead / epoch checks)
      destroy: function () {
        if (dead) return; clearTimeout(parkTimer); RigLabAssets.releaseAll(owner); Object.keys(models).forEach(function (id) { drop(id, false); });
        dead = true; epoch++; wanted = {}; cpuBytes = 0; if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0;
        try { var x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (e) {}
      },
      // diagnostics: the linear part (3 columns = images of model axes) and its determinant (< 0 means the model is drawn mirrored)
      orient: function (id, box) {
        var e = models[id]; if (!e || e.state !== 'ready') return null;
        var R = e.cfg.basis ? M.basis(e.cfg.basis) : autoBasis(e.m, box), F = e.cfg.flip ? M.mul(M.S(e.cfg.flip[0], e.cfg.flip[1], e.cfg.flip[2]), R) : R;
        var c = [0, 1, 2].map(function (i) { return [F[i * 4], F[i * 4 + 1], F[i * 4 + 2]]; });
        var det = c[0][0] * (c[1][1] * c[2][2] - c[1][2] * c[2][1]) - c[0][1] * (c[1][0] * c[2][2] - c[1][2] * c[2][0]) + c[0][2] * (c[1][0] * c[2][1] - c[1][1] * c[2][0]);
        return { det: Math.round(det), cols: c.map(function (v) { return v.map(Math.round); }) };
      }
    };
    return api;
  }
  V3.createGL = create;
  // The builder re-renders its DOM often. The canvas (and its single WebGL context) is created once and moved into each new
  // placeholder instead of being rebuilt, so contexts, shaders and loaded models survive part changes.
  var shared = null;
  V3.acquireGL = function (placeholder) {
    if (shared && !shared.viewer.dead()) {
      var cv = shared.canvas;
      if (placeholder && placeholder !== cv && placeholder.parentNode) {
        var lab = placeholder.getAttribute('aria-label'); if (lab) cv.setAttribute('aria-label', lab);
        placeholder.parentNode.replaceChild(cv, placeholder);
      }
      return shared.viewer;
    }
    shared = null;
    var v = create(placeholder); if (v) shared = { canvas: placeholder, viewer: v };
    return v;
  };
  V3.M = M;
})();
