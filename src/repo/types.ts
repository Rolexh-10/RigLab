import type { BuildIds, SavedBuild } from '../core/types';

/** Where saved builds live. The UI/core depend on this interface only, never on localStorage or Supabase directly. */
export interface BuildRepo {
  readonly kind: 'local' | 'supabase';
  list(): Promise<SavedBuild[]>;
  save(name: string, parts: BuildIds): Promise<SavedBuild>;
  remove(id: string | number): Promise<void>;
}

/** Minimal storage surface (subset of the DOM Storage interface) so the local repo is testable without a browser. */
export interface KeyValueStorage { getItem(k: string): string | null; setItem(k: string, v: string): void }
