import Link from 'next/link';
import { NOTICE } from '@riglab/data';

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>RigLab</h1>
      <p>{NOTICE.ar}</p>
      <p><Link href="/compat">فحص التوافق (مثال يعمل على الخادم)</Link></p>
    </main>
  );
}
