import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// すべての地図データを取得
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // ユーザーに関連する地図データのみを取得
    const maps = await prisma.map.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        city: true,
        center: true,
        zoom: true,
        createdAt: true,
        updatedAt: true,
        // 画像データは大きすぎるのでリスト表示には含めない
        imageData: false,
      },
    });
    
    return NextResponse.json(maps);
  } catch (error) {
    console.error('地図データ取得エラー:', error);
    return NextResponse.json(
      { message: '地図データの取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 新しい地図データを保存
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const { title, description, imageData, city, center, zoom } = await request.json();
    
    // バリデーション
    if (!title || !city || !center || zoom === undefined) {
      return NextResponse.json(
        { message: '必須項目がすべて入力されていません' },
        { status: 400 }
      );
    }
    
    const userId = session.user.id;
    
    // データベースに保存
    const map = await prisma.map.create({
      data: {
        title,
        description,
        imageData,
        city,
        center: JSON.stringify(center),
        zoom,
        userId,
      },
    });
    
    return NextResponse.json(
      {
        message: '地図データが正常に保存されました',
        map: {
          id: map.id,
          title: map.title,
          city: map.city,
          createdAt: map.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('地図データ保存エラー:', error);
    return NextResponse.json(
      { message: '地図データの保存中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
