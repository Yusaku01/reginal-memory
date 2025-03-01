import { PrismaClient } from '@prisma/client';

// PrismaClientのグローバルインスタンスを作成
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

// 開発環境では、ホットリロード時に複数のインスタンスが作成されるのを防ぐ
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
