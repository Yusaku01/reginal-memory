import "@/styles/globals.css";
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth-provider";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "地域情報を視覚化しよう | Regional Memory",
  description:
    "地域情報を視覚的に記録・共有できるWebアプリです。慣れない地域の学習や旅行の計画に役立ちます。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          <Header />
          <main className="min-h-[calc(100vh-64px)]">{children}</main>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
