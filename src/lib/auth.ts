import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import NextAuth from "next-auth";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// NextAuth v4の設定
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // ユーザーをメールアドレスで検索
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        // ユーザーが存在しない、またはパスワードがない場合
        if (!user || !user.password) {
          return null;
        }

        // パスワードを比較
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      }
    })
    // 必要に応じて他のプロバイダー（Google、GitHubなど）を追加
  ],
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async session({ session, token }) {
      if (token && token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

const handler = NextAuth(authOptions);
export default handler;

// 他のファイルで使用するために必要な関数をエクスポート
export const auth = handler.auth;
