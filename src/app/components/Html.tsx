import { createElement } from 'react';
import type { CSSProperties } from 'react';

/** Renders trusted, repo-authored HTML (legacy content strings). Never pass user input here. */
export function Html({ html, tag = 'div', className, style }: { html: string; tag?: 'div' | 'span' | 'aside'; className?: string; style?: CSSProperties }) {
  return createElement(tag, { className, style, dangerouslySetInnerHTML: { __html: html } });
}
