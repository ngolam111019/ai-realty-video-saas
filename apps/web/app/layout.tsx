import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'AI Realty Video SaaS',
  description: 'Dựng kịch bản và render video bất động sản tự động với AI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${outfit.variable} font-sans`}>{children}</body>
    </html>
  );
}
