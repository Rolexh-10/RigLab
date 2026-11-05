import { bridge, useBridgeVersion, useI18n } from '../bridge';
import { Html } from '../components/Html';

/** "About RigLab" with tabs. Tab bodies are repo-authored HTML content provided by the legacy layer (moves to TSX content in Phase 3). */
export function Trust() {
  useBridgeVersion();
  const { lang, L } = useI18n();
  const b = bridge();
  const tab = b.state.trustTab;
  return (
    <div className="stack">
      <h1>{L('عن RigLab', 'About RigLab')}</h1>
      {lang === 'en' && <div className="note">English text for these pages is not translated yet; Arabic is shown.</div>}
      <div className="chips">
        {b.trustTabs.map((t) => (
          <button key={t[0]} className="chip" aria-pressed={tab === t[0]} data-act="trust-tab" data-v={t[0]}>{L(t[1], t[2])}</button>
        ))}
      </div>
      <Html className="card stack-s" style={{ lineHeight: 1.8 }} html={b.trustBody(tab)} />
      <p className="small muted"><a href="#admin">{L('تصميم لوحة الإدارة (غير مفعّل)', 'Admin dashboard design (inactive)')}</a></p>
    </div>
  );
}
