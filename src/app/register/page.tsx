"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { Button, Input, Field } from "@/components/ui";
import { TEAM_NAME } from "@/lib/config";

export default function RegisterPage() {
  const { signUp, session } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [jersey, setJersey] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    const err = await signUp({
      fullName,
      nickname,
      jersey: jersey ? Number(jersey) : null,
      phone,
      email,
      password,
    });
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    // Nếu bật xác nhận email ở Supabase, session chưa có ngay
    setTimeout(() => {
      if (session) router.replace("/");
    }, 500);
    setNotice(
      "Đăng ký thành công! Nếu chưa vào được trang chủ, hãy kiểm tra email xác nhận (nếu admin bật xác nhận email)."
    );
    toast("Đăng ký thành công!");
  }

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full bg-slate-50 min-h-screen shadow-xl border-x border-slate-200">
      <div className="flex-1 flex flex-col justify-center p-6 gap-6">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow overflow-hidden">
            <Image src="/logo.png" alt={TEAM_NAME} fill className="object-contain" sizes="48px" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-800">
              Đăng ký thành viên
            </h1>
            <p className="text-xs text-slate-400 font-semibold">{TEAM_NAME}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Họ và tên *">
            <Input
              required
              placeholder="Trần Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Biệt danh">
              <Input
                placeholder="Tên hay gọi"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </Field>
            <Field label="Số áo">
              <Input
                type="number"
                min={0}
                max={99}
                placeholder="10"
                value={jersey}
                onChange={(e) => setJersey(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Số điện thoại">
            <Input
              type="tel"
              placeholder="09xx xxx xxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Field label="Email *">
            <Input
              type="email"
              required
              autoComplete="email"
              placeholder="bạn@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Mật khẩu *">
            <Input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Tối thiểu 6 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {error && (
            <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5">
              {error}
            </p>
          )}
          {notice && (
            <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
              {notice}
            </p>
          )}

          <Button type="submit" loading={submitting} className="w-full py-3">
            Tạo tài khoản
          </Button>
        </form>

        <p className="text-xs text-slate-500 font-medium text-center">
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-blue-600 font-extrabold">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
