import type { ComponentType } from 'react';
import { Builds } from './views/Builds';
import { Trust } from './views/Trust';

/** Routes owned by React. Every other hash route is still rendered by the legacy VIEWS table (strangler pattern).
 *  Rollback for any view = delete its line here; render() then falls back to the legacy implementation. */
export const REACT_ROUTES: Record<string, ComponentType> = {
  builds: Builds,
  trust: Trust
};
