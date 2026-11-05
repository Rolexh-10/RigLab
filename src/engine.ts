/* Browser entry for the framework-free engine: exposes the same globals the legacy UI used in Phase 1. */
import * as RigLabData from './data';
import * as RigLabCore from './core';

declare const window: Record<string, unknown>;
window.RigLabData = RigLabData;
window.RigLabCore = RigLabCore;
