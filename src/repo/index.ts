export type { BuildRepo, KeyValueStorage } from './types';
export { LocalBuildRepo, LOCAL_BUILDS_KEY } from './local';
export { SupabaseBuildRepo } from './supabase';
export type { SbClient } from './supabase';

import { LocalBuildRepo } from './local';
import { SupabaseBuildRepo } from './supabase';
import type { SbClient } from './supabase';
import type { BuildRepo, KeyValueStorage } from './types';

/** Signed in -> cloud repo; otherwise local. Anonymous use must keep working (rule: no regressions). */
export function chooseBuildRepo(opts: { client?: SbClient | null; signedIn: boolean; storage: KeyValueStorage }): BuildRepo {
  return opts.client && opts.signedIn ? new SupabaseBuildRepo(opts.client) : new LocalBuildRepo(opts.storage);
}
