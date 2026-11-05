import { buildTotal, checkCompat, resolve } from '../../core';
import { bridge, useBridgeVersion, useI18n } from '../bridge';
import { AdSlot } from '../components/AdSlot';
import { VerdictBadge } from '../components/Badge';
import { Money } from '../components/Money';
import { PartsList } from '../components/PartsList';

/** "My builds": saved builds list. Buttons carry the same data-act contract as before; clicks are handled by the delegated legacy ACT table (moves into a store in Phase 3). */
export function Builds() {
  useBridgeVersion();
  const { L } = useI18n();
  const b = bridge();
  const saved = b.state.saved;
  return (
    <div className="stack">
      <div className="stack-s">
        <h1>{L('تجميعاتي', 'My Builds')}</h1>
        <div className="note">{L('الحفظ محلي تجريبي: التجميعات تُحفظ في هذا المتصفح فقط. لا حسابات ولا مزامنة بعد، ومسح بيانات المتصفح يحذفها.', 'Trial local save: builds are stored in this browser only. There are no accounts or sync yet, and clearing browser data deletes them.')}</div>
      </div>
      <div className="row">
        <a className="btn pri" href="#builder">{L('تجميعة جديدة', 'New build')}</a>
        <button className="btn" data-act="sheet" data-type="import">{L('استيراد كود', 'Import code')}</button>
      </div>
      {saved.length ? (
        <div className="grid c2">
          {saved.map((s) => {
            const parts = resolve(s.parts);
            return (
              <div className="card stack-s" key={s.id}>
                <div className="row between"><h3>{s.name}</h3><VerdictBadge verdict={checkCompat(parts).verdict} /></div>
                <div className="small muted">{(s.savedAt || '').slice(0, 10)}</div>
                <PartsList ids={s.parts} />
                <div className="row between"><b>{L('المجموع', 'Total')}</b><b><Money value={buildTotal(parts)} /></b></div>
                <div className="row">
                  <button className="btn sm pri" data-act="builds-load" data-id={s.id}>{L('افتح في Builder', 'Open in Builder')}</button>
                  <button className="btn sm" data-act="builds-cmp" data-id={s.id}>{L('قارن', 'Compare')}</button>
                  <button className="btn sm" data-act="builds-code" data-id={s.id}>{L('كود / مشاركة', 'Code / share')}</button>
                  <button className="btn sm ghost" data-act="builds-del" data-id={s.id}>{L('حذف', 'Delete')}</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card"><p>{L('ما عندك تجميعات محفوظة بعد. ابنِ واحدة واضغط «حفظ».', 'No saved builds yet. Build one and press "Save".')}</p></div>
      )}
      <AdSlot name="builds" />
    </div>
  );
}
