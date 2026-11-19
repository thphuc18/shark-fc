"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Camera,
  Dices,
  Link as LinkIcon,
  KeyRound,
  ShieldCheck,
  User,
  LogOut,
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, Badge, Button, Input, Field, Select, Modal } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { getSupabase } from "@/lib/supabase";
import { friendlyError } from "@/lib/errors";
import {
  FOOT_LABEL,
  displayName,
  avatarSrc,
  dicebearUrl,
  ageFromBirthday,
  formatDateFullVN,
} from "@/lib/format";
import type { PreferredFoot } from "@/lib/types";

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  );
}

function ProfileContent() {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    display_name: "",
    birth_date: "",
    jersey_number: "",
    preferred_foot: "" as "" | PreferredFoot,
  });
  const [saving, setSaving] = useState(false);

  // Ảnh đại diện
  const [avatarModal, setAvatarModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");

  // Đổi mật khẩu
  const [pwModal, setPwModal] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !profile) return;
    const { data } = await sb.from("profiles").select("*").eq("id", profile.id).single();
    if (data) {
      const d = data as typeof profile;
      setForm({
        display_name: d.display_name ?? "",
        birth_date: d.birth_date ?? "",
        jersey_number: d.jersey_number != null ? String(d.jersey_number) : "",
        preferred_foot: (d.preferred_foot as "" | PreferredFoot) ?? "",
      });
    }
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  if (!profile) return null;

  const age = ageFromBirthday(form.birth_date);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb || !profile) return;
    setSaving(true);
    const { error } = await sb
      .from("profiles")
      .update({
        display_name: form.display_name.trim() || null,
        birth_date: form.birth_date || null,
        jersey_number: form.jersey_number ? Number(form.jersey_number) : null,
        preferred_foot: form.preferred_foot || null,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast(friendlyError(error), "error");
      return;
    }
    toast("Đã lưu hồ sơ");
    load();
  }

  // ---------- Avatar ----------
  function applyAvatar() {
    if (!avatarUrl.trim()) {
      toast("Chọn ảnh hoặc tạo avatar ngẫu nhiên", "error");
      return;
    }
    const sb = getSupabase();
    if (!sb || !profile) return;
    sb.from("profiles")
      .update({ avatar_url: avatarUrl.trim() })
      .eq("id", profile.id)
      .then(({ error }) => {
        if (error) {
          toast(friendlyError(error), "error");
          return;
        }
        toast("Đã đổi ảnh đại diện");
        setAvatarModal(false);
        setAvatarUrl("");
        load();
      });
  }

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    const sb = getSupabase();
    if (!sb) return;
    const ext = file.name.split(".").pop() || "png";
    const path = `avatars/${profile.id.replace(/[^a-zA-Z0-9-]/g, "")}.${ext}`;
    sb.storage
      .from("avatars")
      .upload(path, file, { cacheControl: "3600", upsert: true })
      .then(({ data, error }) => {
        if (error) {
          toast(friendlyError(error), "error");
          return;
        }
        const publicUrl = sb.storage.from("avatars").getPublicUrl(data.path).data.publicUrl;
        setAvatarUrl(publicUrl);
        toast("Đã tải ảnh lên, nhấn Áp dụng để lưu");
      });
  }

  // ---------- Mật khẩu ----------
  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    if (newPw.length < 6) {
      toast("Mật khẩu phải có ít nhất 6 ký tự", "error");
      return;
    }
    if (newPw !== newPw2) {
      toast("Hai mật khẩu không khớp nhau", "error");
      return;
    }
    setPwSaving(true);
    const { error } = await sb.auth.updateUser({ password: newPw });
    setPwSaving(false);
    if (error) {
      toast(friendlyError(error), "error");
      return;
    }
    toast("Đã đổi mật khẩu. Lần sau đăng nhập bằng mật khẩu mới.");
    setPwModal(false);
    setNewPw("");
    setNewPw2("");
  }

  return (
    <div className="space-y-4">
      {/* Header hồ sơ */}
      <Card className="text-center !p-5">
        <div className="flex justify-center">
          <div className="relative w-24 h-24">
            <div className="w-24 h-24 rounded-full p-0.5 bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName(profile)}
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <img
                  src={avatarSrc(profile)}
                  alt={displayName(profile)}
                  className="w-full h-full rounded-full object-cover bg-slate-100"
                />
              )}
            </div>
            <button
              onClick={() => setAvatarModal(true)}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow hover:bg-blue-700 active:scale-95 transition"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-lg font-extrabold text-slate-800 mt-3">
            {displayName(profile)}
          </h2>
          <p className="text-xs font-semibold text-slate-400">@{profile.username}</p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {profile.role === "admin" ? (
              <Badge color="violet">
                <ShieldCheck className="w-3 h-3 inline mr-1" /> Quản trị viên
              </Badge>
            ) : (
              <Badge color="slate">
                <User className="w-3 h-3 inline mr-1" /> Cầu thủ
              </Badge>
            )}
            {profile.jersey_number != null && (
              <Badge color="sky">Số áo {profile.jersey_number}</Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Hồ sơ cá nhân */}
      <Card>
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500 mb-3">
          Hồ sơ cá nhân
        </h3>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tên tài khoản">
              <Input value={profile.username ?? ""} disabled className="opacity-60" />
            </Field>
            <Field label="Biệt danh">
              <Input
                placeholder="Tên hay gọi"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ngày sinh">
              <Input
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
              />
            </Field>
            <Field label="Số áo">
              <Input
                type="number"
                min={0}
                max={99}
                placeholder="10"
                value={form.jersey_number}
                onChange={(e) => setForm((f) => ({ ...f, jersey_number: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Chân thuận">
            <Select
              value={form.preferred_foot}
              onChange={(e) =>
                setForm((f) => ({ ...f, preferred_foot: e.target.value as "" | PreferredFoot }))
              }
            >
              <option value="">— Chưa chọn —</option>
              <option value="right">Chân phải</option>
              <option value="left">Chân trái</option>
              <option value="both">Cả hai chân</option>
            </Select>
          </Field>

          {/* Thông tin bổ sung */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Họ và tên</p>
              <p className="font-extrabold text-slate-700">{profile.full_name}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tuổi</p>
              <p className="font-extrabold text-slate-700">
                {age !== null ? `${age} tuổi` : "—"}
              </p>
            </div>
            {form.birth_date && (
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Sinh nhật</p>
                <p className="font-extrabold text-slate-700">
                  🎂 {formatDateFullVN(form.birth_date)}
                </p>
              </div>
            )}
            {form.preferred_foot && (
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Chân thuận</p>
                <p className="font-extrabold text-slate-700">
                  {FOOT_LABEL[form.preferred_foot as PreferredFoot]}
                </p>
              </div>
            )}
          </div>

          <Button type="submit" loading={saving} className="w-full py-3">
            Lưu hồ sơ
          </Button>
        </form>
      </Card>

      {/* Bảo mật */}
      <Card>
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500 mb-3">
          Bảo mật
        </h3>
        <Button variant="outline" className="w-full py-3" onClick={() => setPwModal(true)}>
          <KeyRound className="w-4 h-4" /> Đổi mật khẩu
        </Button>
      </Card>

      {/* Đăng xuất */}
      <Button
        variant="danger"
        className="w-full py-3"
        onClick={() => {
          signOut();
        }}
      >
        <LogOut className="w-4 h-4" /> Đăng xuất
      </Button>

      {/* Modal đổi ảnh */}
      <Modal open={avatarModal} onClose={() => setAvatarModal(false)} title="Đổi ảnh đại diện">
        <div className="space-y-4">
          <div className="flex justify-center">
            <img
              src={avatarUrl || avatarSrc(profile)}
              alt="Xem trước"
              className="w-20 h-20 rounded-full object-cover bg-slate-100 border-4 border-white shadow"
            />
          </div>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl p-5 cursor-pointer hover:border-blue-400 transition">
            <Camera className="w-6 h-6 text-slate-400" />
            <span className="text-xs font-bold text-slate-500">Tải ảnh lên</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
          </label>
          <div>
            <button
              onClick={() => setAvatarUrl(dicebearUrl(`${displayName(profile)}-${Date.now()}`))}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold border border-slate-300 bg-white hover:bg-slate-50 transition"
            >
              <Dices className="w-4 h-4 text-blue-600" /> Tạo avatar ngẫu nhiên
            </button>
          </div>
          <Field label="Hoặc dán link ảnh">
            <div className="flex gap-2">
              <LinkIcon className="w-4 h-4 text-slate-400 mt-3 shrink-0" />
              <Input
                placeholder="https://..."
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </div>
          </Field>
          <Button className="w-full py-3" onClick={applyAvatar}>
            Áp dụng
          </Button>
        </div>
      </Modal>

      {/* Modal đổi mật khẩu */}
      <Modal open={pwModal} onClose={() => setPwModal(false)} title="Đổi mật khẩu">
        <form onSubmit={changePassword} className="space-y-4">
          <Field label="Mật khẩu mới (tối thiểu 6 ký tự)">
            <Input
              type="password"
              required
              minLength={6}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
          </Field>
          <Field label="Nhập lại mật khẩu mới">
            <Input
              type="password"
              required
              minLength={6}
              value={newPw2}
              onChange={(e) => setNewPw2(e.target.value)}
            />
          </Field>
          <Button type="submit" loading={pwSaving} className="w-full py-3">
            Đổi mật khẩu
          </Button>
        </form>
      </Modal>
    </div>
  );
}
