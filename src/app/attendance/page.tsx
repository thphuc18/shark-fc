"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, ClipboardCheck, CalendarDays } from "lucide-react";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, Button, Input, Select, Field, Modal, Badge, EmptyState, Avatar } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { getSupabase } from "@/lib/supabase";
import type { Profile, AttendanceSession, AttendanceRecord, MarkStatus, SessionType } from "@/lib/types";
import { formatDateVN, relativeDayVN, todayISO, avatarColor } from "@/lib/format";

const STATUS_META: Record<MarkStatus, { label: string; cls: string; chip: string }> = {
  present: { label: "Có mặt", cls: "text-emerald-700", chip: "bg-emerald-100 text-emerald-700" },
  late: { label: "Đi muộn", cls: "text-amber-700", chip: "bg-amber-100 text-amber-700" },
  absent: { label: "Vắng", cls: "text-rose-700", chip: "bg-rose-100 text-rose-700" },
  leave: { label: "Xin phép", cls: "text-sky-700", chip: "bg-sky-100 text-sky-700" },
};

const TYPE_META: Record<SessionType, { label: string; color: "emerald" | "red" | "slate" }> = {
  practice: { label: "Tập luyện", color: "emerald" },
  match: { label: "Trận đấu", color: "red" },
  other: { label: "Khác", color: "slate" },
};

function AttendanceContent() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isAdmin = profile?.role === "admin";
  const me = profile?.id;

  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modal tạo phiên
  const [showCreate, setShowCreate] = useState(false);
  const [cDate, setCDate] = useState(todayISO());
  const [cType, setCType] = useState<SessionType>("practice");
  const [cTitle, setCTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    setLoading(true);
    const [s, m] = await Promise.all([
      sb.from("attendance_sessions").select("*").order("session_date", { ascending: false }).limit(30),
      sb.from("profiles").select("*").eq("is_active", true).order("jersey_number", { ascending: true, nullsFirst: false }),
    ]);
    const list = s.data ?? [];
    setSessions(list);
    setMembers(m.data ?? []);
    if (list.length > 0) {
      const r = await sb.from("attendance_records").select("*").in(
        "session_id",
        list.map((x) => x.id)
      );
      setRecords(r.data ?? []);
    } else {
      setRecords([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const recBySession = useMemo(() => {
    const m = new Map<string, AttendanceRecord>();
    for (const r of records) m.set(`${r.session_id}:${r.member_id}`, r);
    return m;
  }, [records]);

  const countBySession = useMemo(() => {
    const m = new Map<string, { present: number; total: number }>();
    for (const s of sessions) {
      const rs = records.filter((r) => r.session_id === s.id);
      m.set(s.id, {
        present: rs.filter((r) => r.status === "present" || r.status === "late").length,
        total: rs.length,
      });
    }
    return m;
  }, [sessions, records]);

  const selected = sessions.find((s) => s.id === selectedId) ?? null;

  async function markStatus(sessionId: string, memberId: string, status: MarkStatus | null) {
    const sb = getSupabase();
    if (!sb) return;
    let error = null;
    if (status) {
      const up = await sb.from("attendance_records").upsert(
        { session_id: sessionId, member_id: memberId, status },
        { onConflict: "session_id,member_id" }
      );
      error = up.error;
    } else {
      const del = await sb
        .from("attendance_records")
        .delete()
        .eq("session_id", sessionId)
        .eq("member_id", memberId);
      error = del.error;
    }
    if (error) {
      toast("Không thể lưu điểm danh: " + error.message, "error");
      return;
    }
    await load();
  }

  const nextStatus = (cur: MarkStatus | null): MarkStatus | null => {
    switch (cur) {
      case null: return "present";
      case "present": return "late";
      case "late": return "absent";
      case "absent": return "leave";
      case "leave": return null;
    }
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from("attendance_sessions").insert({
      session_date: cDate,
      session_type: cType,
      title: cTitle.trim() || null,
    });
    setCreating(false);
    if (error) {
      toast("Không thể tạo phiên: " + error.message, "error");
      return;
    }
    toast("Đã tạo phiên mới!");
    setShowCreate(false);
    setCTitle("");
    await load();
  }

  // ===== Chi tiết phiên =====
  if (selected) {
    const list = members.map((p) => ({
      p,
      rec: recBySession.get(`${selected.id}:${p.id}`) ?? null,
    }));
    const c = countBySession.get(selected.id);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedId(null)}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-extrabold text-slate-800">
              {selected.title || TYPE_META[selected.session_type].label}
            </h2>
            <p className="text-xs text-slate-400 font-semibold">
              {formatDateVN(selected.session_date)} · {c?.present ?? 0}/{c?.total ?? 0} có mặt
            </p>
          </div>
        </div>

        <Card className="divide-y divide-slate-100 p-0">
          {list.map(({ p, rec }) => {
            const isMe = p.id === me;
            return (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${isMe ? "bg-blue-50/40" : ""}`}>
                <Avatar name={p.nickname || p.full_name} color={avatarColor(p.nickname || p.full_name)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {p.nickname || p.full_name}
                    {p.jersey_number != null && (
                      <span className="ml-1.5 text-[10px] font-extrabold text-slate-400">#{p.jersey_number}</span>
                    )}
                    {isMe && <span className="ml-1.5 text-[10px] font-extrabold text-blue-500">(bạn)</span>}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">{p.full_name}</p>
                </div>
                {isAdmin ? (
                  <button
                    onClick={() => markStatus(selected.id, p.id, nextStatus(rec?.status ?? null))}
                    className={`min-w-[76px] px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition ${
                      rec ? STATUS_META[rec.status].chip : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {rec ? STATUS_META[rec.status].label : "Chưa"}
                  </button>
                ) : isMe ? (
                  <SelfStatus rec={rec} onMark={(st) => markStatus(selected.id, p.id!, st)} />
                ) : (
                  <span className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold ${rec ? STATUS_META[rec.status].chip : "text-slate-300"}`}>
                    {rec ? STATUS_META[rec.status].label : "Chưa"}
                  </span>
                )}
              </div>
            );
          })}
        </Card>

        {isAdmin && (
          <p className="text-[11px] text-slate-400 font-medium text-center">
            Chạm vào trạng thái để chuyển: Có mặt → Muộn → Vắng → Xin phép → Xóa
          </p>
        )}
      </div>
    );
  }

  // ===== Danh sách phiên =====
  const today = todayISO();
  const rel = (d: string) => relativeDayVN(d);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-800">Điểm danh</h2>
          <p className="text-xs text-slate-400 font-semibold">
            {sessions.length > 0 ? `${sessions.length} phiên gần đây` : "Chưa có phiên nào"}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreate(true)} className="px-3 py-2 text-xs">
            <Plus className="w-4 h-4" /> Tạo phiên
          </Button>
        )}
      </div>

      {loading ? (
        <Card>
          <EmptyState icon={<CalendarDays className="w-5 h-5" />} title="Đang tải..." />
        </Card>
      ) : sessions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardCheck className="w-5 h-5" />}
            title="Chưa có phiên điểm danh"
            sub={isAdmin ? "Bấm 'Tạo phiên' để bắt đầu" : "Chờ admin tạo phiên mới"}
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const c = countBySession.get(s.id);
            const r = rel(s.session_date);
            return (
              <Card key={s.id} onClick={() => setSelectedId(s.id)} className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">
                    {new Date(s.session_date + "T00:00:00").toLocaleDateString("vi-VN", { month: "short" })}
                  </span>
                  <span className="text-base font-extrabold text-slate-700 leading-none">
                    {new Date(s.session_date + "T00:00:00").getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-slate-800 truncate">
                    {s.title || TYPE_META[s.session_type].label}
                    {r && (
                      <span className="ml-1.5 text-[10px] font-extrabold text-emerald-600">{r}</span>
                    )}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge color={TYPE_META[s.session_type].color}>{TYPE_META[s.session_type].label}</Badge>
                    <span className="text-[11px] font-bold text-slate-400">
                      {c?.present ?? 0}/{c?.total ?? 0} có mặt
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal tạo phiên */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo phiên điểm danh">
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Ngày">
            <Input type="date" value={cDate} max={today} onChange={(e) => setCDate(e.target.value)} required />
          </Field>
          <Field label="Loại">
            <Select value={cType} onChange={(e) => setCType(e.target.value as SessionType)}>
              <option value="practice">Tập luyện</option>
              <option value="match">Trận đấu</option>
              <option value="other">Hoạt động khác</option>
            </Select>
          </Field>
          <Field label="Tên (tuỳ chọn)">
            <Input placeholder="VD: Tập sân Trung tâm / Đấu giao hữu" value={cTitle} onChange={(e) => setCTitle(e.target.value)} />
          </Field>
          <Button type="submit" loading={creating} className="w-full">
            Tạo phiên
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function SelfStatus({
  rec,
  onMark,
}: {
  rec: AttendanceRecord | null;
  onMark: (st: MarkStatus) => void;
}) {
  if (rec) {
    return (
      <div className="flex gap-1">
        <span className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold ${STATUS_META[rec.status].chip}`}>
          {STATUS_META[rec.status].label}
        </span>
        <button
          onClick={() => onMark("present")}
          className="px-2 py-1.5 rounded-lg text-[11px] font-extrabold bg-slate-100 text-slate-500"
          title="Đổi lại"
        >
          Sửa
        </button>
      </div>
    );
  }
  return (
    <div className="flex gap-1">
      <button
        onClick={() => onMark("present")}
        className="px-3 py-1.5 rounded-lg text-[11px] font-extrabold bg-emerald-600 text-white shadow-sm"
      >
        ✓ Có mặt
      </button>
      <button
        onClick={() => onMark("late")}
        className="px-2 py-1.5 rounded-lg text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200"
      >
        Muộn
      </button>
      <button
        onClick={() => onMark("leave")}
        className="px-2 py-1.5 rounded-lg text-[11px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200"
      >
        Xin phép
      </button>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <RequireAuth>
      <Shell>
        <AttendanceContent />
      </Shell>
    </RequireAuth>
  );
}
