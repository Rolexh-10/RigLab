'use strict';
/* RigLab core/saved-builds: pure logic for the "My builds" list (storage itself lives in the UI/server layer).
 * A saved build: { id, name, parts: {cat: partId}, savedAt: ISO string }. */
var cleanBuild = require('./build').cleanBuild;

function normalizeSaved(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(function (b) { return b && typeof b === 'object' && b.id != null && b.parts && typeof b.parts === 'object'; })
    .map(function (b) { return { id: b.id, name: String(b.name == null ? '' : b.name).slice(0, 60), parts: cleanBuild(b.parts), savedAt: b.savedAt || null }; });
}
function createSaved(build, name, existingCount, now, id) {
  var d = now instanceof Date ? now : new Date();
  var nm = String(name == null ? '' : name).trim() || ('Build ' + ((existingCount || 0) + 1));
  return { id: id != null ? id : d.getTime(), name: nm.slice(0, 60), parts: cleanBuild(build), savedAt: d.toISOString() };
}
function findSaved(list, id) {
  for (var i = 0; i < (list || []).length; i++) if (String(list[i].id) === String(id)) return list[i];
  return null;
}
function removeSaved(list, id) { return (list || []).filter(function (b) { return String(b.id) !== String(id); }); }
// 'current' resolves to the working build; unknown ids resolve to an empty build.
function savedParts(list, current, id) {
  if (id === 'current') return current || {};
  var b = findSaved(list, id);
  return b ? b.parts : {};
}
module.exports = { normalizeSaved: normalizeSaved, createSaved: createSaved, findSaved: findSaved, removeSaved: removeSaved, savedParts: savedParts };
