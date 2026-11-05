  // ---------- Phase 2 strangler bridge ----------
  // The legacy UI stays the source of truth for state (S), language and actions (ACT). React views (src/app) read it through
  // window.RigLabBridge and are mounted by render() for routes that React owns (window.RigLabReact.has(route)).
  var rbVersion = 0, rbListeners = [];
  function rbNotify() { rbVersion++; rbListeners.slice().forEach(function (fn) { try { fn(); } catch (e) {} }); }
  window.RigLabBridge = {
    state: S,
    getLang: function () { return lang; },
    getVersion: function () { return rbVersion; },
    subscribe: function (fn) { rbListeners.push(fn); return function () { rbListeners = rbListeners.filter(function (x) { return x !== fn; }); }; },
    // Runs a legacy action with data-* attributes given as an object (what the delegated click handler would pass).
    act: function (name, attrs) {
      var a = ACT[name]; if (!a) return;
      a({ getAttribute: function (k) { return attrs && attrs[k.replace(/^data-/, '')] != null ? String(attrs[k.replace(/^data-/, '')]) : null; } }, null);
    },
    refresh: function () { render(); },
    events: function () { return sget('riglab.events', {}); }
  };
  window.RigLabBridge.trustBody = trustBody;
  window.RigLabBridge.trustTabs = TRUST_TABS;
  window.RigLabBridge.adHtml = adSlot;
  window.RigLabBridge.rt = { vb: vb, partsList: partsList };
