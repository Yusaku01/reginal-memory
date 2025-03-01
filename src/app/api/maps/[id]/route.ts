import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface Params {
  params: {
    id: string;
  };
}

// 特定の地図データを取得
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    const userId = session.user.id;
    
    // 指定されたIDと現在のユーザーに関連する地図データを取得
    const map = await prisma.map.findUnique({
      where: {
        id,
        userId,
      },
    });
    
    if (!map) {
      return NextResponse.json(
        { message: '地図データが見つかりません' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(map);
  } catch (error) {
    console.error('地図データ取得エラー:', error);
    return NextResponse.json(
      { message: '地図データの取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 特定の地図データを更新
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    const userId = session.user.id;
    
    // 現在のユーザーが所有する地図データかチェック
    const existingMap = await prisma.map.findUnique({
      where: {
        id,
        userId,
      },
    });
    
    if (!existingMap) {
      return NextResponse.json(
        { message: '地図データが見つかりません' },
        { status: 404 }
      );
    }
    
    const { title, description, imageData, city, center, zoom } = await request.json();
    
    // 更新するデータのバリデーション
    if (!title || !city || !center || zoom === undefined) {
      return NextResponse.json(
        { message: '必須項目がすべて入力されていません' },
        { status: 400 }
      );
    }
    
    // データベースの地図データを更新
    const updatedMap = await prisma.map.update({
      where: { id },
      data: {
        title,
        description,
        imageData,
        city,
        center: JSON.stringify(center),
        zoom,
      },
    });
    
    return NextResponse.json({
      message: '地図データが正常に更新されました',
      map: {
        id: updatedMap.id,
        title: updatedMap.title,
        updatedAt: updatedMap.updatedAt,
      },
    });
  } catch (error) {
    console.error('地図データ更新エラー:', error);
    return NextResponse.json(
      { message: '地図データの更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 特定の地図データを削除
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    const userId = session.user.id;
    
    // 現在のユーザーが所有する地図データかチェック
    const existingMap = await prisma.map.findUnique({
      where: {
        id,
        userId,
      },
    });
    
    if (!existingMap) {
      return NextResponse.json(
        { message: '地図データが見つかりません' },
        { status: 404 }
      );
    }
    
    // 地図データを削除
    await prisma.map.delete({
      where: { id },
    });
    
    return NextResponse.json({
      message: '地図データが正常に削除されました',
    });
  } catch (error) {
    console.error('地図データ削除エラー:', error);
    return NextResponse.json(
      { message: '地図データの削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
