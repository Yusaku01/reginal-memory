import { Metadata } from 'next';
import { LoginForm } from '@/components/login-form';

export const metadata: Metadata = {
  title: 'ログイン | 土地勘学習Webアプリ',
  description: 'アカウントにログインして、保存した地図にアクセスしましょう',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <LoginForm />
    </div>
  );
}
