"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";

export function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <header className="bg-white border-b">
      <div className="container flex justify-between items-center px-4 h-16">
        <div className="flex gap-6 items-center">
          <Link href="/" className="text-xl font-bold">
            Regional Memory
          </Link>
        </div>

        {!isAuthPage && (
          <nav className="flex gap-4 items-center">
            {status === "authenticated" && session.user ? (
              <UserMenu user={session.user} />
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">ログイン</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">アカウント作成</Link>
                </Button>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
