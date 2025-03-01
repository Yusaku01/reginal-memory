'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: 'エラー',
        description: 'メールアドレスとパスワードを入力してください',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: 'ログインエラー',
          description: 'メールアドレスまたはパスワードが正しくありません',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'ログイン成功',
        description: 'ログインに成功しました',
      });
      
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('ログイン中にエラーが発生しました:', error);
      toast({
        title: 'エラー',
        description: 'ログイン中に問題が発生しました。もう一度お試しください',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 p-6 bg-white rounded-lg shadow-md">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">ログイン</h1>
        <p className="text-gray-500">アカウントにログインしてください</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            メールアドレス
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="例: your-email@example.com"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              パスワード
            </label>
            {/* パスワードリセット機能を実装する場合はこのリンクを有効にする
            <Link href="/forgot-password" className="text-sm text-blue-500 hover:underline">
              パスワードをお忘れですか？
            </Link>
            */}
          </div>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="******"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'ログイン中...' : 'ログイン'}
        </Button>
      </form>
      
      <div className="mt-4 text-center text-sm">
        <p>
          アカウントをお持ちでない場合は、
          <Link href="/register" className="text-blue-500 hover:underline">
            新規登録
          </Link>
          してください
        </p>
      </div>
    </div>
  );
}
