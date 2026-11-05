import { cleanBuild, createSaved, normalizeSaved, removeSaved } from '../core';
import type { BuildIds, SavedBuild } from '../core';
import type { BuildRepo, KeyValueStorage } from './types';

export const LOCAL_BUILDS_KEY = 'riglab.builds.v1'; // same key the legacy UI uses, so both read one list

/** Anonymous / offline storage. Behaviour is identical to the Phase 1 UI actions (core/saved-builds does the logic). */
export class LocalBuildRepo implements BuildRepo {
  readonly kind = 'local' as const;
  constructor(private store: KeyValueStorage, private now: () => Date = () => new Date()) {}

  private read(): SavedBuild[] {
    try { return normalizeSaved(JSON.parse(this.store.getItem(LOCAL_BUILDS_KEY) || '[]')); } catch { return []; }
  }
  private write(list: SavedBuild[]): void { this.store.setItem(LOCAL_BUILDS_KEY, JSON.stringify(list)); }

  async list(): Promise<SavedBuild[]> { return this.read(); }
  async save(name: string, parts: BuildIds): Promise<SavedBuild> {
    const list = this.read();
    const b = createSaved(cleanBuild(parts), name, list.length, this.now());
    this.write(list.concat(b));
    return b;
  }
  async remove(id: string | number): Promise<void> { this.write(removeSaved(this.read(), id)); }
}
