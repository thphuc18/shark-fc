"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, Pencil, Phone, Shirt, ShieldCheck, Star } from "lucide-react";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, Button, Input, Field, Modal, Badge, Avatar } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { friendlyError } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase";
import { avatarColor, formatVND } from "@/lib/format";

const POSITIONS = ["", "Thủ môn", "Hậu vệ", "Tiền vệ", "Tiền đạo", "Đa năng", "HLV", "BHL"];

function ProfileContent() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [showEdit, setShowEdit] = useState(false);
  const [fName, setFName] = useState("");
  const [fNick, setFNick] = useState("");
  const [fJersey, setFJersey] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fPos, setFPos] = useState("");
  const [saving, setSaving] = useState(false);

  const [myStats, setMyStats] = useState<{ attend: number; owe: number; get: number } | null>(null);

  useEffect(() => {
    if (!profile) return;
    const sb = getSupabase();
    if (!sb) return;
    (async () => {
      const [recs, debts] = await Promise.all([
        sb.from("attendance_records").select("status").eq("member_id", profile.id),
        sb.from("debts").select("amount, status, borrower_id, lender_id").eq("borrower_id", profile.id).or(`lender_id.eq.${profile.id}`),
      ]);
      const attend = (recs.data ?? []).filter((r) => r.status === "present" || r.status === "late").length;
      const dl = (debts.data ?? []) as { amount: number; status: string; borrower_id: string; lender_id: string }[];
      const owe = dl.filter((d) => d.status === "active" && d.borrower_id === profile.id).reduce((a, d) => a + d.amount, 0);
      const get = dl.filter((d) => d.status === "active" && d.lender_id === profile.id).reduce((a, d) => a + d.amount, 0);
      setMyStats({ attend, owe, get });
    })();
  }, [profile]);

  if (!profile) return null;
  const name = profile.nickname || profile.full_name;

  function openEdit() {
    if (!profile) return;
    setFName(profile.full_name);
    setFNick(profile.nickname ?? "");
    setFJersey(profile.jersey_number != null ? String(profile.jersey_number) : "");
    setFPhone(profile.phone ?? "");
    setFPos(profile.position ?? "");
    setShowEdit(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb || !profile) return;
    setSaving(true);
    const { error } = await sb.from("profiles").update({
      full_name: fName.trim(),
      nickname: fNick.trim() || null,
      jersey_number: fJersey ? Number(fJersey) : null,
      phone: fPhone.trim() || null,
      position: fPos || null,
    }).eq("id", profile.id);
    setSaving(false);
    if (error) return toast("Không thể lưu: " + friendlyError(error), "error");
    toast("Đã cập nhật hồ sơ!");
    setShowEdit(false);
    await refreshProfile();
  }

  async function handleLogout() {
    await signOut();
    window.location.href = "/login";
  }

  return (
    <div className="space-y-4">
      {/* Profile card */}
      <Card className="flex flex-col items-center text-center py-6 bg-gradient-to-b from-white to-slate-50">
        <div className="relative">
          {profile.jersey_number != null ? (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center text-3xl font-extrabold shadow-lg shadow-blue-600/25">
              {profile.jersey_number}
            </div>
          ) : (
            <Avatar name={name} color={avatarColor(name)} size="lg" />
          )}
        </div>
        <h2 className="text-lg font-extrabold text-slate-800 mt-3">{name}</h2>
        <p className="text-xs text-slate-400 font-semibold">{profile.full_name}</p>
        <div className="flex items-center gap-2 mt-2.5">
          {profile.role === "admin" && (
            <Badge color="amber">
              <ShieldCheck className="w-3 h-3 mr-1" /> Quản trị viên
            </Badge>
          )}
          {profile.position && <Badge color="sky">{profile.position}</Badge>}
          <Badge color="emerald">Đang hoạt động</Badge>
        </div>
        {profile.phone && (
          <p className="text-xs text-slate-500 font-semibold mt-3 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> {profile.phone}
          </p>
        )}
        <div className="flex gap-2 mt-4 w-full">
          <Button variant="outline" onClick={openEdit} className="flex-1">
            <Pencil className="w-4 h-4" /> Sửa hồ sơ
          </Button>
          <Link href={profile.role === "admin" ? "/admin" : "/members"} className="flex-1">
            <Button variant="ghost" className="w-full">
              <Shirt className="w-4 h-4" /> Đội của tôi
            </Button>
          </Link>
        </div>
      </Card>

      {/* My stats */}
      <div>
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
          Thành tích của bạn
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center py-3">
            <Star className="w-4 h-4 mx-auto text-amber-500 mb-1" />
            <p className="text-lg font-extrabold text-slate-800">{myStats?.attend ?? "-"}</p>
            <p className="text-[10px] font-bold text-slate-400">LƯỢT CÓ MẶT</p>
          </Card>
          <Card className="text-center py-3">
            <p className="text-lg font-extrabold text-rose-600 mt-2.5">{myStats ? formatVND(myStats.owe) : "-"}</p>
            <p className="text-[10px] font-bold text-slate-400">ĐANG NỢ</p>
          </Card>
          <Card className="text-center py-3">
            <p className="text-lg font-extrabold text-emerald-600 mt-2.5">{myStats ? formatVND(myStats.get) : "-"}</p>
            <p className="text-[10px] font-bold text-slate-400">ĐƯỢC NỢ</p>
          </Card>
        </div>
      </div>

      {/* Logout */}
      <Button variant="danger" onClick={handleLogout} className="w-full">
        <LogOut className="w-4 h-4" /> Đăng xuất
      </Button>

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Sửa hồ sơ cá nhân">
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Họ và tên">
            <Input value={fName} onChange={(e) => setFName(e.target.value)} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Biệt danh">
              <Input value={fNick} onChange={(e) => setFNick(e.target.value)} />
            </Field>
            <Field label="Số áo">
              <Input type="number" min={0} max={99} value={fJersey} onChange={(e) => setFJersey(e.target.value)} />
            </Field>
          </div>
          <Field label="Số điện thoại">
            <Input type="tel" value={fPhone} onChange={(e) => setFPhone(e.target.value)} />
          </Field>
          <Field label="Vị trí">
            <div className="flex flex-wrap gap-1.5">
              {POSITIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFPos(fPos === p ? "" : p)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold border-2 transition ${
                    fPos === p ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 text-slate-400"
                  }`}
                >
                  {p || "Không chọn"}
                </button>
              ))}
            </div>
          </Field>
          <Button type="submit" loading={saving} className="w-full">
            Lưu hồ sơ
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <Shell>
        <ProfileContent />
      </Shell>
    </RequireAuth>
  );
}
