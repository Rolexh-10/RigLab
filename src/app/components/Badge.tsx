import { VERDICT } from '../../core';
import type { Verdict } from '../../core';
import { useI18n } from '../bridge';

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const { T } = useI18n();
  return <span className={'badge b-' + verdict}>{T(VERDICT[verdict])}</span>;
}
