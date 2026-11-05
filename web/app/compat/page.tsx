import { checkCompat, resolve, VERDICT } from '@riglab/core';

// Server component: proves the framework-free engine runs unchanged under Next (same code the single-file build uses).
export default function CompatDemo() {
  const res = checkCompat(resolve({ cpu: 'r5-7600', mobo: 'a520m', ram: 'ddr5-16-5600' }));
  return (
    <main style={{ padding: 24 }}>
      <h1>{VERDICT[res.verdict].ar}</h1>
      <ul>{res.items.map((i) => <li key={i.id}>[{i.status}] {i.title.ar} — {i.detail.ar}</li>)}</ul>
    </main>
  );
}
