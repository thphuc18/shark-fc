"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Home,
  Wallet,
  Users,
  CalendarClock,
  User,
  ShieldCheck,
} from "lucide-react";
import { TEAM_NAME } from "@/lib/config";
import { useAuth } from "@/contexts/AuthContext";
import { avatarColor, displayName, initials } from "@/lib/format";

const TABS = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/fund", label: "Quỹ & Nợ", icon: Wallet },
  { href: "/players", label: "Cầu thủ", icon: Users },
  { href: "/matches", label: "Trận đấu", icon: CalendarClock },
  { href: "/profile", label: "Cá nhân", icon: User },
];

const ADMIN_TAB = { href: "/admin", label: "Quản trị", icon: ShieldCheck };

export function Frame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { session, profile } = useAuth();

  const isAdmin = !!profile && profile.role === "admin";
  const tabs = isAdmin ? [...TABS, ADMIN_TAB] : TABS;
  // Chỉ hiện menu khi đã đăng nhập VÀ tài khoản được duyệt
  const showNav = !!session && !!profile && profile.status === "active" && profile.is_active;

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
              className="w-9 h-9 shrink-0"
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName(profile)}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-extrabold ring-2 ring-white shadow ${avatarColor(displayName(profile))}`}
                >
                  {initials(displayName(profile))}
                </div>
              )}
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

      {/* ===== Bottom Nav (chỉ hiện khi đã đăng nhập & được duyệt) ===== */}
      {showNav && (
        <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200">
          <div
            className={`max-w-md mx-auto grid ${
              tabs.length === 5 ? "grid-cols-5" : "grid-cols-6"
            }`}
          >
            {tabs.map((t) => {
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
      )}
    </div>
  );
}
