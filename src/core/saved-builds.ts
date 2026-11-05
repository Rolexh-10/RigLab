/* RigLab core/saved-builds: pure logic for the "My builds" list (storage itself lives in the UI/server layer).
 * A saved build: { id, name, parts: {cat: partId}, savedAt: ISO string }. */
import type { BuildIds, SavedBuild } from './types';
import { cleanBuild } from './build';

function normalizeSaved(list: unknown): SavedBuild[] {
  if (!Array.isArray(list)) return [];
  return (list as any[]).filter(function (b) { return b && typeof b === 'object' && b.id != null && b.parts && typeof b.parts === 'object'; })
    
    .map(function (b): SavedBuild { return { id: b.id, name: String(b.name == null ? '' : b.name).slice(0, 60), parts: cleanBuild(b.parts), savedAt: b.savedAt || null }; });
}
function createSaved(build: BuildIds, name?: unknown, existingCount?: number, now?: Date, id?: string | number | null): SavedBuild {
  var d = now instanceof Date ? now : new Date();
  var nm = String(name == null ? '' : name).trim() || ('Build ' + ((existingCount || 0) + 1));
  return { id: id != null ? id : d.getTime(), name: nm.slice(0, 60), parts: cleanBuild(build), savedAt: d.toISOString() };
}
function findSaved(list: SavedBuild[] | null | undefined, id: string | number): SavedBuild | null {
  for (var i = 0; i < (list || []).length; i++) if (String(list![i].id) === String(id)) return list![i];
  return null;
}
function removeSaved(list: SavedBuild[] | null | undefined, id: string | number): SavedBuild[] { return (list || []).filter(function (b) { return String(b.id) !== String(id); }); }
// 'current' resolves to the working build; unknown ids resolve to an empty build.
function savedParts(list: SavedBuild[] | null | undefined, current: BuildIds | null | undefined, id: string | number): BuildIds {
  if (id === 'current') return current || {};
  var b = findSaved(list, id);
  return b ? b.parts : {};
}
export { normalizeSaved, createSaved, findSaved, removeSaved, savedParts };
