'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      setIsLoading(false);
    }
  }, [status, router]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[calc(100vh-200px)]">
        <p className="text-lg font-medium">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">プロフィール</h1>
        
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {session?.user?.image ? (
                <img 
                  src={session.user.image} 
                  alt={session.user.name || 'ユーザー'} 
                  className="h-full w-full object-cover" 
                />
              ) : (
                <span className="text-3xl text-gray-600">{session?.user?.name?.[0] || '?'}</span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{session?.user?.name || 'ゲスト'}</h2>
              <p className="text-gray-600">{session?.user?.email}</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">アカウント情報</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ユーザー名</label>
                <p className="p-2 border rounded-md w-full bg-gray-50">{session?.user?.name || '未設定'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                <p className="p-2 border rounded-md w-full bg-gray-50">{session?.user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">保存された地図</h3>
          <div className="bg-gray-50 p-4 rounded-md text-center">
            <p className="text-gray-600">保存された地図はまだありません</p>
            <Button 
              className="mt-4"
              onClick={() => router.push('/')}
            >
              新しい地図を作成
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
