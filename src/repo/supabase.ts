/* UNVERIFIED against a real Supabase project (none reachable from the build sandbox). The SQL side (tables, RLS, triggers) IS
 * tested on real Postgres in tests/db; this file is tested only against a fake client with the same call shape as supabase-js v2. */
import { cleanBuild } from '../core';
import type { BuildIds, SavedBuild } from '../core';
import type { BuildRepo } from './types';

/** The slice of supabase-js we use. Passing the real client (createClient(...)) satisfies this structurally. */
export interface SbResult<T> { data: T | null; error: { message: string } | null }
export interface SbQuery<T> extends PromiseLike<SbResult<T>> {
  select(cols?: string): SbQuery<T>;
  order(col: string, opts?: { ascending?: boolean }): SbQuery<T>;
  eq(col: string, v: string | number): SbQuery<T>;
  single(): SbQuery<T>;
}
export interface SbTable {
  select(cols: string): SbQuery<any[]>;
  insert(row: Record<string, unknown>): SbQuery<any>;
  delete(): SbQuery<any>;
}
export interface SbClient { from(table: string): SbTable }

interface Row { id: string; name: string; parts: BuildIds; saved_at: string }
const toSaved = (r: Row): SavedBuild => ({ id: r.id, name: r.name, parts: cleanBuild(r.parts), savedAt: r.saved_at });
function unwrap<T>(r: SbResult<T>): T { if (r.error) throw new Error(r.error.message); return r.data as T; }

/** Signed-in storage. user_id is filled by the column default auth.uid() and enforced by RLS, so the client never sends it. */
export class SupabaseBuildRepo implements BuildRepo {
  readonly kind = 'supabase' as const;
  constructor(private sb: SbClient) {}

  async list(): Promise<SavedBuild[]> {
    const rows = unwrap(await this.sb.from('saved_builds').select('id,name,parts,saved_at').order('saved_at', { ascending: false })) as Row[];
    return rows.map(toSaved);
  }
  async save(name: string, parts: BuildIds): Promise<SavedBuild> {
    const nm = String(name ?? '').trim().slice(0, 60) || 'Build';
    const row = unwrap(await this.sb.from('saved_builds').insert({ name: nm, parts: cleanBuild(parts) }).select('id,name,parts,saved_at').single()) as Row;
    return toSaved(row);
  }
  async remove(id: string | number): Promise<void> { unwrap(await this.sb.from('saved_builds').delete().eq('id', id)); }
}
