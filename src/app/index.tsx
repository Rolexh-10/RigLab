/* React entry (Phase 2). Registers window.RigLabReact; the legacy render() calls has()/mount()/unmount(). */
import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { REACT_ROUTES } from './routes';

let root: Root | null = null;
let host: HTMLElement | null = null;
let current = '';

function unmount(): void {
  if (root) { root.unmount(); root = null; }
  if (host && host.parentNode) host.parentNode.removeChild(host);
  host = null; current = '';
}
function mount(appEl: HTMLElement, route: string): void {
  const View = REACT_ROUTES[route];
  if (!View) return;
  if (!root || !host || host.parentNode !== appEl) {
    unmount();
    appEl.innerHTML = '';
    host = document.createElement('div');
    appEl.appendChild(host);
    root = createRoot(host);
  }
  if (current !== route) { current = route; root.render(createElement(StrictMode, null, createElement(View))); }
}

(window as unknown as { RigLabReact: unknown }).RigLabReact = { has: (r: string) => Object.prototype.hasOwnProperty.call(REACT_ROUTES, r), mount, unmount };
