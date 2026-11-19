"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, Button, Input, Select, Field, Modal, Badge, Avatar } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { getSupabase } from "@/lib/supabase";
import type { Profile, Role } from "@/lib/types";
import { avatarColor } from "@/lib/format";

const POSITIONS = ["Thủ môn", "Hậu vệ", "Tiền vệ", "Tiền đạo", "Đa năng", "HLV", "BHL"];

function MembersContent() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const isAdmin = profile?.role === "admin";

  const [members, setMembers] = useState<Profile[]>([]);
  const [editing, setEditing] = useState<Profile | null>(null);

  // form sửa
  const [fName, setFName] = useState("");
  const [fNick, setFNick] = useState("");
  const [fJersey, setFJersey] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fPos, setFPos] = useState("");
  const [fRole, setFRole] = useState<Role>("member");
  const [fActive, setFActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb
      .from("profiles")
      .select("*")
      .order("jersey_number", { ascending: true, nullsFirst: true });
    setMembers(data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(m: Profile) {
    setEditing(m);
    setFName(m.full_name);
    setFNick(m.nickname ?? "");
    setFJersey(m.jersey_number != null ? String(m.jersey_number) : "");
    setFPhone(m.phone ?? "");
    setFPos(m.position ?? "");
    setFRole(m.role);
    setFActive(m.is_active);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from("profiles").update({
      full_name: fName.trim(),
      nickname: fNick.trim() || null,
      jersey_number: fJersey ? Number(fJersey) : null,
      phone: fPhone.trim() || null,
      position: fPos || null,
      role: fRole,
      is_active: fActive,
    }).eq("id", editing.id);
    setSaving(false);
    if (error) return toast("Không thể lưu: " + error.message, "error");
    toast("Đã cập nhật thành viên!");
    setEditing(null);
    await Promise.all([load(), refreshProfile()]);
  }

  async function copyRegisterLink() {
    const url = `${window.location.origin}/register`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Đã copy link đăng ký!");
    } catch {
      toast(url, "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-800">Thành viên</h2>
          <p className="text-xs text-slate-400 font-semibold">
            {members.filter((m) => m.is_active).length}/{members.length} đang hoạt động
          </p>
        </div>
        <Button variant="outline" onClick={copyRegisterLink} className="px-3 py-2 text-xs">
          <Link2 className="w-4 h-4" /> Link đăng ký
        </Button>
      </div>

      <div className="space-y-2">
        {members.map((m) => (
          <Card
            key={m.id}
            onClick={isAdmin ? () => openEdit(m) : undefined}
            className={`flex items-center gap-3 ${!m.is_active ? "opacity-55" : ""}`}
          >
            {m.jersey_number != null ? (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center text-sm font-extrabold shadow-sm shrink-0">
                {m.jersey_number}
              </div>
            ) : (
              <Avatar name={m.nickname || m.full_name} color={avatarColor(m.nickname || m.full_name)} />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-slate-800 truncate">
                {m.nickname || m.full_name}
                {m.id === profile?.id && <span className="ml-1.5 text-[10px] font-extrabold text-blue-500">(bạn)</span>}
              </p>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {m.full_name}
                {m.position ? ` · ${m.position}` : ""}
                {m.phone ? ` · ${m.phone}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {m.role === "admin" && <Badge color="amber">Admin</Badge>}
              {!m.is_active && <Badge color="slate">Nghỉ</Badge>}
            </div>
          </Card>
        ))}
      </div>

      {isAdmin ? (
        <Card className="bg-slate-50">
          <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
            <b className="text-slate-500">Thêm thành viên mới:</b> chia sẻ link đăng ký (nút
            {"Link đăng ký"} phía trên) — người mới tự tạo tài khoản email + mật khẩu. Chạm vào
            thẻ thành viên để sửa thông tin / cấp quyền admin.
          </p>
        </Card>
      ) : (
        <Card className="bg-slate-50">
          <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
            Muốn tham gia đội? Dùng nút <b>{"Link đăng ký"}</b> để tạo tài khoản của bạn, hoặc
            liên hệ ban quản lý đội.
          </p>
        </Card>
      )}

      {/* Modal sửa */}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={`Sửa: ${editing?.nickname || editing?.full_name || ""}`}>
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vị trí">
              <Select value={fPos} onChange={(e) => setFPos(e.target.value)}>
                <option value="">— Chọn —</option>
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <Field label="Quyền">
              <Select value={fRole} onChange={(e) => setFRole(e.target.value as Role)}>
                <option value="member">Thành viên</option>
                <option value="admin">Quản trị viên</option>
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={fActive}
              onChange={(e) => setFActive(e.target.checked)}
              className="w-4.5 h-4.5 accent-blue-600"
            />
            <span className="text-sm font-bold text-slate-700">Đang hoạt động</span>
          </label>
          <Button type="submit" loading={saving} className="w-full">
            Lưu thay đổi
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export default function MembersPage() {
  return (
    <RequireAuth>
      <Shell>
        <MembersContent />
      </Shell>
    </RequireAuth>
  );
}
