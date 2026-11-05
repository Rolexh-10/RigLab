import type { ReactNode } from 'react';

// Arabic RTL is the default; an English LTR route segment ([locale]) is Phase 3 work.
export const metadata = { title: 'RigLab', description: 'Iraqi-first PC builder and compatibility checker (sample data)' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
