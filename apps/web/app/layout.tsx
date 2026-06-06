import type { Metadata } from 'next';
import './globals.css';

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
      <body>{children}</body>
    </html>
  );
}
