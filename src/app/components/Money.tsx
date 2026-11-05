import { useI18n } from '../bridge';

export function Money({ value }: { value: number }) {
  const { fmt, unit } = useI18n();
  return <><span className="mono">{fmt(value)}</span> {unit}</>;
}
