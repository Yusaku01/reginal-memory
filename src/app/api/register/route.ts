import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // バリデーション
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: '必須項目がすべて入力されていません' },
        { status: 400 }
      );
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: '有効なメールアドレスを入力してください' },
        { status: 400 }
      );
    }

    // パスワードの強度チェック（最低6文字以上）
    if (password.length < 6) {
      return NextResponse.json(
        { message: 'パスワードは6文字以上で入力してください' },
        { status: 400 }
      );
    }

    // 既存ユーザーのチェック
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'このメールアドレスは既に使用されています' },
        { status: 409 }
      );
    }

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // ユーザーの作成
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // パスワードを除いたユーザー情報を返す
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        message: 'ユーザーが正常に作成されました',
        user: userWithoutPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('ユーザー登録エラー:', error);
    return NextResponse.json(
      { message: 'ユーザー登録中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
