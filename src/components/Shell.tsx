"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Home,
  ClipboardCheck,
  Wallet,
  ReceiptText,
  User,
} from "lucide-react";
import { TEAM_NAME } from "@/lib/config";
import { useAuth } from "@/contexts/AuthContext";
import { avatarColor, initials } from "@/lib/format";

const TABS = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/attendance", label: "Điểm danh", icon: ClipboardCheck },
  { href: "/fund", label: "Quỹ", icon: Wallet },
  { href: "/debts", label: "Công nợ", icon: ReceiptText },
  { href: "/profile", label: "Tôi", icon: User },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { session, profile } = useAuth();

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full bg-slate-50 min-h-screen shadow-xl border-x border-slate-200 relative">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 active:scale-95 transition-transform"
        >
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center bg-white">
            <Image src="/logo.png" alt={TEAM_NAME} fill className="object-contain" sizes="32px" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wider bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-400 bg-clip-text text-transparent">
              {TEAM_NAME}
            </h1>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {session && profile ? (
            <Link
              href="/profile"
              className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-extrabold ring-2 ring-white shadow ${avatarColor(profile.nickname || profile.full_name)}`}
            >
              {initials(profile.nickname || profile.full_name)}
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 text-xs font-extrabold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/10"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </header>

      {/* ===== Main ===== */}
      <main className="flex-1 flex flex-col p-4 pb-24 overflow-y-auto">
        {children}
      </main>

      {/* ===== Bottom Nav ===== */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200">
        <div className="max-w-md mx-auto grid grid-cols-5">
          {TABS.map((t) => {
            const active =
              t.href === "/"
                ? pathname === "/"
                : pathname.startsWith(t.href);
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition-colors ${
                  active ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "fill-blue-600/10" : ""}`} strokeWidth={active ? 2.5 : 2} />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
