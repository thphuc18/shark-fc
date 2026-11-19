"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  ClipboardCheck,
  Wallet,
  ReceiptText,
  ArrowRight,
  ShieldCheck,
  UsersRound,
  LayoutTemplate,
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, EmptyState } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase } from "@/lib/supabase";
import { formatVND } from "@/lib/format";

interface Stats {
  members: number;
  admins: number;
  attRate: number | null;
  balance: number;
  debtsActive: number;
  debtsAmount: number;
}

function AdminContent() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    (async () => {
      const today = new Date();
      const mStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

      const [members, txFund, debts, sessions, records] = await Promise.all([
        sb.from("profiles").select("*"),
        sb.from("fund_transactions").select("type, amount"),
        sb.from("debts").select("amount, status"),
        sb.from("attendance_sessions").select("*").gte("session_date", mStart),
        sb.from("attendance_records").select("status"),
      ]);

      const ms = members.data ?? [];
      const inc = (txFund.data ?? []).filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
      const exp = (txFund.data ?? []).filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
      const active = (debts.data ?? []).filter((d) => d.status === "active");
      const sess = (sessions.data ?? []).length;
      const present = (records.data ?? []).filter((r) => r.status === "present" || r.status === "late").length;
      const activeCount = ms.filter((m) => m.is_active).length;

      setStats({
        members: activeCount,
        admins: ms.filter((m) => m.role === "admin" && m.is_active).length,
        attRate: sess > 0 && activeCount > 0 ? Math.min(100, Math.round((present / (sess * activeCount)) * 100)) : null,
        balance: inc - exp,
        debtsActive: active.length,
        debtsAmount: active.reduce((a, d) => a + d.amount, 0),
      });
    })();
  }, []);

  if (profile?.role !== "admin") {
    return (
      <Card>
        <EmptyState
          icon={<ShieldCheck className="w-5 h-5" />}
          title="Khu vực quản trị"
          sub="Trang này chỉ dành cho quản trị viên. Liên hệ admin để được cấp quyền."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-800">Bảng điều khiển admin</h2>
          <p className="text-xs text-slate-400 font-semibold">Tổng quan đội bóng tháng này</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Users className="w-4 h-4" />} color="bg-sky-50 text-sky-600" label="Cầu thủ hoạt động" value={stats ? String(stats.members) : "-"} />
        <StatCard icon={<UsersRound className="w-4 h-4" />} color="bg-amber-50 text-amber-600" label="Quản trị viên" value={stats ? String(stats.admins) : "-"} />
        <StatCard icon={<ClipboardCheck className="w-4 h-4" />} color="bg-emerald-50 text-emerald-600" label="Tỷ lệ điểm danh" value={stats?.attRate === null || stats?.attRate === undefined ? "-" : `${stats.attRate}%`} />
        <StatCard icon={<Wallet className="w-4 h-4" />} color="bg-violet-50 text-violet-600" label="Số dư quỹ" value={stats ? formatVND(stats.balance) : "-"} small />
      </div>

      <Card className="flex items-center justify-between bg-gradient-to-br from-rose-50 to-white border-rose-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-slate-800">
              {stats ? `${stats.debtsActive} công nợ đang tồn` : "-"}
            </p>
            <p className="text-[11px] text-slate-400 font-semibold">
              Tổng {stats ? formatVND(stats.debtsAmount) : "-"}
            </p>
          </div>
        </div>
        <Link href="/debts" className="text-blue-600">
          <ArrowRight className="w-5 h-5" />
        </Link>
      </Card>

      <div>
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
          Quản lý nhanh
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <AdminLink href="/attendance" icon={<ClipboardCheck className="w-5 h-5" />} label="Điểm danh" color="bg-emerald-500" />
          <AdminLink href="/fund" icon={<Wallet className="w-5 h-5" />} label="Quỹ đội" color="bg-amber-500" />
          <AdminLink href="/members" icon={<Users className="w-5 h-5" />} label="Thành viên" color="bg-sky-500" />
          <AdminLink href="/tactics" icon={<LayoutTemplate className="w-5 h-5" />} label="Sơ đồ T.T" color="bg-violet-500" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  color,
  label,
  value,
  small,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <Card className="py-3.5">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-2`}>{icon}</div>
      <p className={`font-extrabold text-slate-800 ${small ? "text-base" : "text-xl"}`}>{value}</p>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
    </Card>
  );
}

function AdminLink({ href, icon, label, color }: { href: string; icon: React.ReactNode; label: string; color: string }) {
  return (
    <Link href={href}>
      <Card className="flex items-center gap-3 active:scale-[0.98] transition-transform">
        <div className={`w-9 h-9 rounded-xl ${color} text-white flex items-center justify-center`}>{icon}</div>
        <span className="text-sm font-extrabold text-slate-700">{label}</span>
      </Card>
    </Link>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth>
      <AdminContent />
    </RequireAuth>
  );
}
