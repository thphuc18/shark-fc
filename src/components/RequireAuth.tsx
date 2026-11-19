"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { FullLoader } from "@/components/ui";
import { Wrench, Hourglass, XCircle, Lock } from "lucide-react";
import { TEAM_NAME } from "@/lib/config";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, profile, loading, configured, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  if (!configured) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
          <Wrench className="w-7 h-7" />
        </div>
        <h2 className="text-base font-extrabold text-slate-800">
          Chưa cấu hình Supabase
        </h2>
        <p className="text-xs text-slate-500 font-medium max-w-xs leading-relaxed">
          Hãy tạo file <code className="bg-slate-200 px-1 rounded">.env.local</code> với
          <code className="bg-slate-200 px-1 rounded"> NEXT_PUBLIC_SUPABASE_URL</code> và
          <code className="bg-slate-200 px-1 rounded"> NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          , rồi chạy lại ứng dụng.
        </p>
      </div>
    );
  }

  if (loading || !session || !profile) return <FullLoader />;

  // ---- Chờ admin duyệt ----
  if (profile.status === "pending") {
    return (
      <GateScreen
        icon={<Hourglass className="w-7 h-7" />}
        iconCls="bg-amber-50 border-amber-200 text-amber-600"
        title="Đang chờ quản trị viên phê duyệt"
        sub={`Chào ${profile.display_name || profile.full_name}! Tài khoản của bạn đã được tạo. Quản trị viên ${TEAM_NAME} sẽ duyệt trong thời gian sớm nhất — sau đó bạn vào đây lại là được nhé.`}
        onSignOut={signOut}
      />
    );
  }

  // ---- Bị từ chối ----
  if (profile.status === "rejected") {
    return (
      <GateScreen
        icon={<XCircle className="w-7 h-7" />}
        iconCls="bg-rose-50 border-rose-200 text-rose-600"
        title="Tài khoản chưa được phê duyệt"
        sub="Tài khoản của bạn đã bị từ chối. Vui lòng liên hệ quản trị viên đội để được hỗ trợ."
        onSignOut={signOut}
      />
    );
  }

  // ---- Bị khóa ----
  if (!profile.is_active) {
    return (
      <GateScreen
        icon={<Lock className="w-7 h-7" />}
        iconCls="bg-slate-100 border-slate-200 text-slate-500"
        title="Tài khoản đã bị khóa"
        sub="Tài khoản của bạn đã bị quản trị viên khóa. Vui lòng liên hệ admin để mở lại."
        onSignOut={signOut}
      />
    );
  }

  return <>{children}</>;
}

function GateScreen({
  icon,
  iconCls,
  title,
  sub,
  onSignOut,
}: {
  icon: ReactNode;
  iconCls: string;
  title: string;
  sub: string;
  onSignOut: () => Promise<void>;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-2 text-center">
      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${iconCls}`}>
        {icon}
      </div>
      <div>
        <h2 className="text-base font-extrabold text-slate-800">{title}</h2>
        <p className="text-xs text-slate-500 font-medium max-w-xs leading-relaxed mt-2">
          {sub}
        </p>
      </div>
      <button
        onClick={() => onSignOut()}
        className="mt-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-slate-800 text-white hover:bg-slate-700 active:scale-95 transition"
      >
        Đăng xuất
      </button>
    </div>
  );
}
