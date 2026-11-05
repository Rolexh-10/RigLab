/* Typed access to the legacy runtime (window.RigLabBridge, see src/ui/58-react-bridge.js). */
import { useSyncExternalStore } from 'react';
import type { BuildIds, Lang, SavedBuild } from '../core/types';

export interface LegacyState { saved: SavedBuild[]; build: BuildIds; trustTab: string; [k: string]: unknown }
export interface Bridge {
  state: LegacyState;
  getLang(): Lang;
  getVersion(): number;
  subscribe(fn: () => void): () => void;
  act(name: string, attrs?: Record<string, string | number>): void;
  refresh(): void;
  events(): Record<string, number>;
  trustBody(tab: string): string;
  trustTabs: [string, string, string][];
  adHtml(slot: string): string;
  rt: { vb(v: string): string; partsList(ids: BuildIds): string };
}

export const bridge = (): Bridge => (window as unknown as { RigLabBridge: Bridge }).RigLabBridge;

/** Re-renders the component whenever the legacy runtime has re-rendered (state or language changed). */
export function useBridgeVersion(): number {
  const b = bridge();
  return useSyncExternalStore(b.subscribe, b.getVersion);
}

/** Language helpers bound to the current language; re-render on language change. */
export function useI18n() {
  useBridgeVersion();
  const lang = bridge().getLang();
  return {
    lang,
    dir: lang === 'en' ? 'ltr' : 'rtl',
    L: (ar: string, en?: string): string => (lang === 'en' && en != null ? en : ar),
    T: (o?: { ar: string; en: string } | null): string => (o ? (lang === 'en' ? o.en : o.ar) : ''),
    fmt: (n: number): string => Math.round(n).toLocaleString('en-US'),
    unit: lang === 'en' ? 'IQD' : 'د.ع'
  };
}
