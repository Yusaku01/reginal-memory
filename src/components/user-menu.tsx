'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { User } from 'next-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserMenuProps {
  user: User;
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut({ redirect: false });
      router.refresh();
      router.push('/');
    } catch (error) {
      console.error('ログアウト中にエラーが発生しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative flex items-center space-x-2 hover:bg-slate-100">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || 'ユーザー'}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200">
              <span className="text-sm font-medium text-slate-600">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          )}
          <span className="text-sm font-medium">{user.name || 'ユーザー'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-4 py-2">
          <p className="text-sm font-medium">{user.name || 'ユーザー'}</p>
          <p className="text-xs text-slate-500">{user.email || ''}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            プロフィール
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile/maps" className="cursor-pointer">
            保存した地図
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-500 focus:text-red-500"
          disabled={isLoading}
          onClick={handleSignOut}
        >
          {isLoading ? 'ログアウト中...' : 'ログアウト'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
