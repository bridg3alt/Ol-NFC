import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Olvia - Tap-to-guide companion',
  description:
    'Olvia links everyday objects to simple guidance. Tap an NFC tag on a medicine compartment and your phone shows exactly what to do.',
  keywords: ['medication', 'NFC', 'assistive technology', 'caregiver', 'accessibility'],
  authors: [{ name: 'Olvia Team' }],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Olvia',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1f5e54',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
