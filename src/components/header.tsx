'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/user-menu';

export function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register';

  return (
    <header className="border-b bg-white">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold">
            土地勘学習Webアプリ
          </Link>
        </div>

        {!isAuthPage && (
          <nav className="flex items-center gap-4">
            {status === 'authenticated' && session.user ? (
              <UserMenu user={session.user} />
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">ログイン</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">アカウント作成</Link>
                </Button>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
