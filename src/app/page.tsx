"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ClipboardCheck,
  Wallet,
  Users,
  ArrowRight,
  LayoutTemplate,
  ReceiptText,
} from "lucide-react";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase } from "@/lib/supabase";
import type {
  Profile,
  AttendanceSession,
  FundTransaction,
} from "@/lib/types";
import {
  formatDateFullVN,
  formatVND,
  todayISO,
} from "@/lib/format";

interface HomeData {
  members: Profile[];
  todaySession: (AttendanceSession & {
    present: number;
    myStatus: string | null;
  }) | null;
  balance: number;
  myAttendance30d: number; // đã điểm danh mấy phiên
  sessions30d: number;
}

function HomeContent() {
  const { profile } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [recent, setRecent] = useState<FundTransaction[]>([]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !profile) return;
    (async () => {
      const today = todayISO();
      const d30 = new Date();
      d30.setDate(d30.getDate() - 30);
      const d30iso = d30.toISOString().slice(0, 10);

      const [members, sessions, txFund, myRecords] = await Promise.all([
        sb.from("profiles").select("*").eq("is_active", true),
        sb.from("attendance_sessions").select("*").gte("session_date", d30iso).lte("session_date", today),
        sb.from("fund_transactions").select("type, amount"),
        sb.from("attendance_records").select("status, attendance_sessions(session_date)").eq("member_id", profile.id).gte("marked_at", new Date(d30.getTime()).toISOString()),
      ]);

      const todaySessions = (sessions.data ?? []).filter((s) => s.session_date === today);
      let todaySession: HomeData["todaySession"] = null;
      if (todaySessions.length > 0) {
        const s = todaySessions[0];
        const recs = await sb
          .from("attendance_records")
          .select("status, member_id")
          .eq("session_id", s.id);
        const rds = recs.data ?? [];
        todaySession = {
          ...s,
          present: rds.filter((r) => r.status === "present" || r.status === "late").length,
          myStatus: rds.find((r) => r.member_id === profile.id)?.status ?? null,
        };
      }

      const inc = (txFund.data ?? []).filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
      const exp = (txFund.data ?? []).filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);

      const sessions30 = (sessions.data ?? []).length;
      const myAtt = (myRecords.data ?? []).filter((r) => r.status === "present" || r.status === "late").length;

      setData({
        members: members.data ?? [],
        todaySession,
        balance: inc - exp,
        myAttendance30d: myAtt,
        sessions30d: sessions30,
      });

      const rec = await sb
        .from("fund_transactions")
        .select("*, profiles(nickname, full_name, jersey_number)")
        .order("created_at", { ascending: false })
        .limit(3);
      setRecent(rec.data ?? []);
    })();
  }, [profile]);

  const name = profile?.nickname || profile?.full_name || "cầu thủ";
  const attRate =
    data && data.sessions30d > 0
      ? Math.round((data.myAttendance30d / data.sessions30d) * 100)
      : null;

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h2 className="text-lg font-extrabold text-slate-800">
          Chào, {name} <span className="inline-block">⚽</span>
        </h2>
        <p className="text-xs text-slate-400 font-semibold capitalize">
          {formatDateFullVN(todayISO())}
        </p>
      </div>

      {/* Session hôm nay */}
      {data?.todaySession && (
        <Link href="/attendance">
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-800">
                    {data.todaySession.title ||
                      (data.todaySession.session_type === "match"
                        ? "Trận đấu"
                        : "Tập luyện")}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500">
                    {data.todaySession.present}/{data.members.length} cầu thủ đã điểm danh
                  </p>
                </div>
              </div>
              {data.todaySession.myStatus ? (
                <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                  ✓ Đã điểm danh
                </span>
              ) : (
                <span className="text-[11px] font-extrabold text-white bg-emerald-600 px-2.5 py-1 rounded-lg">
                  Điểm danh ngay
                </span>
              )}
            </div>
          </Card>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center py-3">
          <Users className="w-4 h-4 mx-auto text-sky-500 mb-1" />
          <p className="text-lg font-extrabold text-slate-800">
            {data?.members.length ?? "-"}
          </p>
          <p className="text-[10px] font-bold text-slate-400">CẦU THỦ</p>
        </Card>
        <Card className="text-center py-3">
          <ClipboardCheck className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
          <p className="text-lg font-extrabold text-slate-800">
            {attRate === null ? "-" : `${attRate}%`}
          </p>
          <p className="text-[10px] font-bold text-slate-400">ĐIỂM DANH 30N</p>
        </Card>
        <Card className="text-center py-3">
          <Wallet className="w-4 h-4 mx-auto text-amber-500 mb-1" />
          <p className="text-lg font-extrabold text-slate-800">
            {data === null ? "-" : Math.round(data.balance / 1000)}K
          </p>
          <p className="text-[10px] font-bold text-slate-400">QUỸ ĐỘI</p>
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
          Thao tác nhanh
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction href="/attendance" icon={<ClipboardCheck className="w-5 h-5" />} label="Điểm danh" color="bg-emerald-500" />
          <QuickAction href="/fund" icon={<Wallet className="w-5 h-5" />} label="Quỹ đội" color="bg-amber-500" />
          <QuickAction href="/debts" icon={<ReceiptText className="w-5 h-5" />} label="Công nợ" color="bg-sky-500" />
          {profile?.role === "admin" ? (
            <QuickAction href="/tactics" icon={<LayoutTemplate className="w-5 h-5" />} label="Sơ đồ T.T" color="bg-violet-500" />
          ) : (
            <QuickAction href="/tactics" icon={<LayoutTemplate className="w-5 h-5" />} label="Đội hình" color="bg-violet-500" />
          )}
        </div>
      </div>

      {/* Recent transactions */}
      {recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Giao dịch gần đây
            </h3>
            <Link href="/fund" className="text-[11px] font-extrabold text-red-600 flex items-center gap-0.5">
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <Card className="divide-y divide-slate-100 p-0">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-extrabold ${
                      t.type === "income"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-rose-50 text-rose-600"
                    }`}
                  >
                    {t.type === "income" ? "↓" : "↑"}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">{t.category}</p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {t.profiles?.nickname ||
                        t.profiles?.full_name ||
                        formatDateFullVN(t.transaction_date).split(",")[0]}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-xs font-extrabold ${
                    t.type === "income" ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {t.type === "income" ? "+" : "-"}
                  {formatVND(t.amount)}
                </p>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Admin hint */}
      {profile?.role !== "admin" && (
        <Card className="flex items-center gap-3 bg-slate-50">
          <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Người đầu tiên đăng ký sẽ là <b>Quản trị viên</b>. Các thành viên khác đăng ký qua trang{" "}
            <Link href="/register" className="text-red-600 font-bold">
              /register
            </Link>{" "}
            hoặc nhờ admin cấp quyền.
          </p>
        </Card>
      )}
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <Card className="flex items-center gap-3 active:scale-[0.98] transition-transform">
        <div className={`w-10 h-10 rounded-xl ${color} text-white flex items-center justify-center shadow-sm`}>
          {icon}
        </div>
        <span className="text-sm font-extrabold text-slate-700">{label}</span>
      </Card>
    </Link>
  );
}

export default function HomePage() {
  return (
    <RequireAuth>
      <Shell>
        <HomeContent />
      </Shell>
    </RequireAuth>
  );
}
