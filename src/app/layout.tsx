import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Insert Coin - Retro Games Arcade',
  description: 'Play classic retro games online',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
} 