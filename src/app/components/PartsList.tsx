import { CATS, getPart, priceOf, resolve } from '../../core';
import type { BuildIds } from '../../core';
import { useI18n } from '../bridge';

export function PartsList({ ids }: { ids: BuildIds }) {
  const { lang, T, fmt } = useI18n();
  const parts = resolve(ids);
  return (
    <ul className="parts-list">
      {CATS.filter((c) => parts[c.key]).map((c) => {
        const p = parts[c.key]!;
        return (
          <li key={c.key}>
            <span><span className="muted small">{T(c)} · </span>{lang === 'ar' ? (p.nameAr || p.name) : p.name}</span>
            <span className="pr">{fmt(priceOf(getPart(p.id)))}</span>
          </li>
        );
      })}
    </ul>
  );
}
