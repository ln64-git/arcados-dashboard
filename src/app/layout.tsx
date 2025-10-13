import './globals.css';

import { Analytics } from '@vercel/analytics/react';
import Script from 'next/script';
import { useId } from 'react';

export const metadata = {
  title: 'Arcados Dashboard',
  description:
    'hey its me wink'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const themeScriptId = useId();
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id={themeScriptId} strategy="beforeInteractive">{`
          (function() {
            const savedTheme = localStorage.getItem('theme');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (savedTheme === 'light' || (!savedTheme && !prefersDark)) {
              document.documentElement.classList.remove('dark');
            } else {
              document.documentElement.classList.add('dark');
            }
          })();
        `}</Script>
      </head>
      <body className="flex min-h-screen w-full flex-col">{children}</body>
      <Analytics />
    </html>
  );
}
