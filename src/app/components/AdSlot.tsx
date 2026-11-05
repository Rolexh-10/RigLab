import { bridge } from '../bridge';
import { Html } from './Html';

/** Ad slots stay legacy-generated (labelled «إعلان», never inside compat results); wrapped so React owns placement only. */
export function AdSlot({ name }: { name: string }) {
  return <Html html={bridge().adHtml(name)} />;
}
