"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { FullLoader } from "@/components/ui";
import { Wrench } from "lucide-react";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, configured } = useAuth();
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

  if (loading || !session) return <FullLoader />;
  return <>{children}</>;
}
