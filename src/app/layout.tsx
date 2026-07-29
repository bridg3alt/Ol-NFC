import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Olvia - Smart Medication Assistant',
  description: 'Connect with your Ol smart assistive bottle to manage medications, track adherence, and receive personalized reminders.',
  keywords: ['medication', 'smart bottle', 'healthcare', 'caregiver', 'reminders', 'adherence'],
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
  themeColor: '#0ea5e9',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
