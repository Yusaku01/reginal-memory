import '@/styles/globals.css';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/components/auth-provider';
import { Header } from '@/components/header';

export const metadata: Metadata = {
  title: '土地勘学習Webアプリ',
  description: '自分の感覚や記憶を元に地域情報を視覚的に記録・共有できるWebアプリ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          <Header />
          <main className="min-h-[calc(100vh-64px)]">
            {children}
          </main>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
