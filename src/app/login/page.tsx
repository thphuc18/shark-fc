"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button, Input, Field } from "@/components/ui";
import { TEAM_NAME, TAGLINE } from "@/lib/config";
import { Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const { signIn, session, loading, configured } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) router.replace("/");
  }, [session, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const err = await signIn(email, password);
    setSubmitting(false);
    if (err) setError(err);
    else router.replace("/");
  }

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full bg-slate-50 min-h-screen shadow-xl border-x border-slate-200">
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-20 h-20 rounded-3xl bg-white border border-slate-200 shadow-lg overflow-hidden">
            <Image src="/logo.png" alt={TEAM_NAME} fill className="object-contain" sizes="80px" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
            {TEAM_NAME}
          </h1>
          <p className="text-xs text-slate-400 font-semibold -mt-2">{TAGLINE}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <Field label="Email">
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="email"
                required
                autoComplete="email"
                placeholder="bạn@email.com"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </Field>
          <Field label="Mật khẩu">
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </Field>

          {error && (
            <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5">
              {error}
            </p>
          )}

          <Button type="submit" loading={submitting} className="w-full py-3">
            Đăng nhập
          </Button>
        </form>

        <p className="text-xs text-slate-500 font-medium">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="text-red-600 font-extrabold">
            Đăng ký ngay
          </Link>
        </p>

        {!configured && (
          <p className="text-[11px] text-amber-600 font-bold bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            Chưa cấu hình Supabase — hãy thêm biến môi trường vào .env.local
          </p>
        )}
      </div>
    </div>
  );
}
