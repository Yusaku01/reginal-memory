'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 基本的なバリデーション
    if (!formData.name || !formData.email || !formData.password) {
      toast({
        title: 'エラー',
        description: 'すべての必須項目を入力してください',
        variant: 'destructive',
      });
      return;
    }

    // パスワードの一致確認
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'エラー',
        description: 'パスワードが一致しません',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // API呼び出しでユーザー登録処理
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'アカウント作成に失敗しました');
      }

      toast({
        title: '登録成功',
        description: 'アカウントが正常に作成されました。ログインしてください',
      });
      
      // 登録成功後、ログインページへリダイレクト
      router.push('/login');
    } catch (error) {
      console.error('登録中にエラーが発生しました:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '登録中に問題が発生しました。もう一度お試しください',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 p-6 bg-white rounded-lg shadow-md">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">アカウント作成</h1>
        <p className="text-gray-500">新しいアカウントを作成してください</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            名前
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="例: 山田太郎"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
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
          <label htmlFor="password" className="text-sm font-medium">
            パスワード
          </label>
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
        
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            パスワード（確認）
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="******"
            value={formData.confirmPassword}
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
          {isLoading ? '登録中...' : 'アカウント作成'}
        </Button>
      </form>
      
      <div className="mt-4 text-center text-sm">
        <p>
          すでにアカウントをお持ちの場合は、
          <Link href="/login" className="text-blue-500 hover:underline">
            ログイン
          </Link>
          してください
        </p>
      </div>
    </div>
  );
}
