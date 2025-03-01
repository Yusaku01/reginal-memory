import { Metadata } from 'next';
import { RegisterForm } from '@/components/register-form';

export const metadata: Metadata = {
  title: 'アカウント作成 | 土地勘学習Webアプリ',
  description: '新しいアカウントを作成して、地図を保存・共有しましょう',
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <RegisterForm />
    </div>
  );
}
