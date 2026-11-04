  // ---------- interactive banner background: particles.js (MIT, github.com/VincentGarreau/particles.js) ----------
  var FX_ICONS = {
    cpu: '<rect x="18" y="18" width="28" height="28" rx="4"/><rect x="26" y="26" width="12" height="12" rx="2"/><path d="M24 18V8M32 18V8M40 18V8M24 46v10M32 46v10M40 46v10M18 24H8M18 32H8M18 40H8M46 24h10M46 32h10M46 40h10"/>',
    gpu: '<rect x="6" y="20" width="52" height="24" rx="4"/><circle cx="22" cy="32" r="7"/><circle cx="42" cy="32" r="7"/><path d="M22 26v12M16 32h12M42 26v12M36 32h12M10 44v6M14 44v6"/>',
    ram: '<rect x="6" y="22" width="52" height="18" rx="2"/><path d="M12 28h6v6h-6zM24 28h6v6h-6zM36 28h6v6h-6zM48 28h4v6h-4zM10 40v6M16 40v6M22 40v6M28 40v6M34 40v6M40 40v6M46 40v6M52 40v6"/>',
    fan: '<circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="4"/><path d="M32 28c-2-10 4-14 10-12-2 6-4 10-10 12zM36 32c10-2 14 4 12 10-6-2-10-4-12-10zM32 36c2 10-4 14-10 12 2-6 4-10 10-12zM28 32c-10 2-14-4-12-10 6 2 10 4 12 10z"/>',
    gear: '<circle cx="32" cy="32" r="9"/><path d="M32 8v8M32 48v8M8 32h8M48 32h8M15 15l6 6M43 43l6 6M15 49l6-6M43 21l6-6"/><circle cx="32" cy="32" r="18"/>',
    tools: '<path d="M14 50L38 26"/><path d="M38 26l-4-10 10-4 4 8z"/><path d="M50 14L22 42l-6 6 2 2 6-6 28-28z" opacity="0"/><path d="M46 52l-14-14M40 58l-6-6 8-8 6 6z"/>',
    pad: '<path d="M14 24h36c6 0 10 6 12 16l2 8c1 4-4 6-7 3l-8-9H15l-8 9c-3 3-8 1-7-3l2-8c2-10 6-16 12-16z" transform="translate(0 2)"/><path d="M20 32v8M16 36h8"/><circle cx="42" cy="32" r="2.5"/><circle cx="48" cy="38" r="2.5"/>',
    bolt: '<path d="M36 6L16 36h14l-4 22 22-32H34z"/>',
    lab: '<path d="M26 8h12M28 8v16L12 52c-2 4 1 6 4 6h32c3 0 6-2 4-6L36 24V8"/><path d="M20 42h24" opacity=".7"/><circle cx="30" cy="48" r="2"/><circle cx="38" cy="45" r="2"/>',
    ssd: '<rect x="8" y="18" width="48" height="28" rx="3"/><path d="M14 26h10M14 32h10M14 38h10"/><rect x="34" y="24" width="16" height="16" rx="2"/>'
  };
  function fxIcon(name, col) { var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="' + col + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' + FX_ICONS[name] + '</svg>'; return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
  function initBannerFx() {
    var host = $('bg-fx'); if (!window.particlesJS || !host || host.__fx) return; host.__fx = 1;
    var reduce = false; try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    var common = { retina_detect: false };
    // layer 0: connecting network (circuit traces) that grabs towards the finger / pointer
    var base = document.createElement('div'); base.id = 'fx-net'; base.className = 'fxl'; host.appendChild(base);
    window.particlesJS('fx-net', {
      particles: { number: { value: 700, density: { enable: true, value_area: 800 } }, color: { value: ['#ff2d4b', '#7dff8a'] }, shape: { type: 'circle' }, opacity: { value: 0.6, random: true }, size: { value: 2.2, random: true },
        line_linked: { enable: true, distance: 105, color: '#ff2d4b', opacity: 0.4, width: 1 }, move: { enable: !reduce, speed: 1.1, direction: 'none', random: true, out_mode: 'out' } },
      interactivity: { detect_on: 'window', events: { onhover: { enable: true, mode: 'grab' }, onclick: { enable: true, mode: 'push' }, resize: true }, modes: { grab: { distance: 170, line_linked: { opacity: 1 } }, push: { particles_nb: 3 } } },
      retina_detect: false
    });
    // icon layers: each one drifts as a small neon part (CPU, GPU, RAM, fan, tools, gamepad ...) and is pushed away from the finger
    var names = Object.keys(FX_ICONS), cols = ['#ff5d73', '#7dff8a', '#ff2d4b'];
    names.forEach(function (n, i) {
      var d = document.createElement('div'); d.id = 'fx-i' + i; d.className = 'fxl'; host.appendChild(d);
      window.particlesJS('fx-i' + i, {
        particles: { number: { value: 3, density: { enable: false } }, color: { value: '#ffffff' }, shape: { type: 'image', image: { src: fxIcon(n, cols[i % 3]), width: 64, height: 64 } }, opacity: { value: 0.9, random: true, anim: { enable: false } },
          size: { value: 26, random: true, anim: { enable: false } }, line_linked: { enable: false }, move: { enable: !reduce, speed: 0.9, direction: i % 2 ? 'left' : 'right', random: true, straight: false, out_mode: 'out' } },
        interactivity: { detect_on: 'window', events: { onhover: { enable: true, mode: 'repulse' }, onclick: { enable: false }, resize: true }, modes: { repulse: { distance: 90, duration: 0.4 } } },
        retina_detect: false
      });
    });
  }

