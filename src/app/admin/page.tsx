"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  CalendarPlus,
  ClipboardEdit,
  Check,
  X,
  RotateCcw,
  Lock,
  Unlock,
  Shield,
  ShieldOff,
  Pencil,
  Trash2,
  Plus,
  Save,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import {
  Card,
  Badge,
  Button,
  Input,
  Field,
  Select,
  Modal,
  EmptyState,
} from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { getSupabase } from "@/lib/supabase";
import { friendlyError } from "@/lib/errors";
import type { Profile, Match, MemberStatus } from "@/lib/types";
import {
  displayName,
  toLocalInputValue,
  formatMatchDateVN,
  JERSEY_COLORS,
} from "@/lib/format";
import { TEAM_NAME } from "@/lib/config";

type Tab = "players" | "matches" | "scores";

const STATUS_UI: Record<MemberStatus, { label: string; color: "amber" | "emerald" | "red" }> = {
  pending: { label: "Chờ duyệt", color: "amber" },
  active: { label: "Đang hoạt động", color: "emerald" },
  rejected: { label: "Từ chối", color: "red" },
};

export default function AdminPage() {
  return (
    <RequireAuth>
      <AdminContent />
    </RequireAuth>
  );
}

function AdminContent() {
  const [tab, setTab] = useState<Tab>("players");

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-4 text-white">
        <h2 className="font-extrabold text-sm">⚙️ Trung tâm Quản trị {TEAM_NAME}</h2>
        <p className="text-[11px] font-semibold text-blue-100 mt-0.5">
          Duyệt thành viên, lên lịch trận đấu, cập nhật tỉ số &amp; điểm
        </p>
      </div>

      {/* Tab switch */}
      <div className="grid grid-cols-3 gap-1 bg-slate-200/70 rounded-2xl p-1">
        {(
          [
            { id: "players", label: "Cầu Thủ", icon: Users },
            { id: "matches", label: "Trận Đấu", icon: CalendarPlus },
            { id: "scores", label: "Tỉ Số & Điểm", icon: ClipboardEdit },
          ] as { id: Tab; label: string; icon: LucideIcon }[]
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-2.5 rounded-xl text-[11px] font-extrabold transition flex items-center justify-center gap-1.5 ${
                tab === t.id
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "players" && <PlayersTab />}
      {tab === "matches" && <MatchesTab />}
      {tab === "scores" && <ScoresTab />}
    </div>
  );
}

// ============================================================
//  TAB: CẦU THỦ (duyệt / quản lý tài khoản)
// ============================================================
function PlayersTab() {
  const { profile: me } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Profile[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });
    setMembers((data ?? []) as Profile[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: MemberStatus, msg: string) {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(id);
    const { error } = await sb.from("profiles").update({ status }).eq("id", id);
    setBusy(null);
    if (error) {
      toast(friendlyError(error), "error");
      return;
    }
    toast(msg);
    load();
  }

  async function toggleActive(id: string, is_active: boolean) {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(id);
    const { error } = await sb.from("profiles").update({ is_active }).eq("id", id);
    setBusy(null);
    if (error) {
      toast(friendlyError(error), "error");
      return;
    }
    toast(is_active ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản");
    load();
  }

  async function toggleRole(id: string) {
    const sb = getSupabase();
    if (!sb) return;
    const target = members.find((m) => m.id === id);
    if (!target) return;
    const newRole = target.role === "admin" ? "member" : "admin";
    setBusy(id);
    const { error } = await sb.from("profiles").update({ role: newRole }).eq("id", id);
    setBusy(null);
    if (error) {
      toast(friendlyError(error), "error");
      return;
    }
    toast(newRole === "admin" ? "Đã nâng quyền Admin" : "Đã hạ quyền về cầu thủ");
    load();
  }

  const pending = members.filter((m) => m.status === "pending");
  const others = members.filter((m) => m.status !== "pending");

  return (
    <div className="space-y-4">
      {/* Hướng dẫn đăng ký */}
      <Card className="!p-3.5 bg-blue-50 border-blue-100">
        <p className="text-xs font-bold text-slate-600 leading-relaxed">
          📲 Cách thêm cầu thủ mới: gửi link{" "}
          <Link href="/register" className="text-blue-600 font-extrabold underline">
            /register
          </Link>{" "}
          cho bạn bè. Họ tự đăng ký, sau đó bạn bấm{" "}
          <span className="font-extrabold text-emerald-600">Duyệt</span> bên dưới.
        </p>
      </Card>

      {/* Chờ duyệt */}
      {pending.length > 0 && (
        <Card>
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-amber-600 mb-3">
            ⏳ Đang chờ duyệt ({pending.length})
          </h3>
          <div className="space-y-2.5">
            {pending.map((m) => (
              <div key={m.id} className="flex items-center gap-3 bg-amber-50/50 border border-amber-100 rounded-xl p-3">
                <MemberAvatar m={m} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-slate-700 truncate">{displayName(m)}</p>
                  <p className="text-[11px] font-semibold text-slate-400 truncate">
                    @{m.username}
                    {m.jersey_number != null && ` · Áo ${m.jersey_number}`}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="success"
                    loading={busy === m.id}
                    className="!px-3 !py-2 !text-[11px]"
                    onClick={() => setStatus(m.id, "active", `Đã duyệt ${displayName(m)}`)}
                  >
                    <Check className="w-3.5 h-3.5" /> Duyệt
                  </Button>
                  <Button
                    variant="danger"
                    className="!px-3 !py-2 !text-[11px]"
                    disabled={busy === m.id}
                    onClick={() => setStatus(m.id, "rejected", "Đã từ chối")}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Thành viên khác */}
      <Card>
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500 mb-3">
          Thành viên ({others.length})
        </h3>
        {others.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="Chưa có thành viên nào khác"
          />
        ) : (
          <div className="space-y-2">
            {others.map((m) => {
              const isSelf = m.id === me?.id;
              return (
                <div key={m.id} className="flex items-center gap-3 border border-slate-100 rounded-xl p-3">
                  <MemberAvatar m={m} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-slate-700 truncate">
                      {displayName(m)}
                      {isSelf && <span className="text-slate-400 font-semibold"> (bạn)</span>}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[11px] font-semibold text-slate-400">@{m.username}</span>
                      {m.role === "admin" && (
                        <Badge color="violet">
                          <Shield className="w-3 h-3 inline mr-0.5" /> Admin
                        </Badge>
                      )}
                      {!m.is_active ? (
                        <Badge color="red">
                          <Lock className="w-3 h-3 inline mr-0.5" /> Đã khóa
                        </Badge>
                      ) : (
                        <Badge color={STATUS_UI[m.status].color}>{STATUS_UI[m.status].label}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {/* Duyệt / từ chối / khôi phục */}
                    {m.status === "rejected" && (
                      <ActionBtn
                        title="Khôi phục (chờ duyệt)"
                        cls="bg-amber-50 text-amber-600 hover:bg-amber-100"
                        onClick={() => setStatus(m.id, "pending", "Đã đặt lại về chờ duyệt")}
                        disabled={busy === m.id}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </ActionBtn>
                    )}
                    {/* Khóa / mở khóa (không tự khóa chính mình) */}
                    {!isSelf && m.status === "active" && (
                      m.is_active ? (
                        <ActionBtn
                          title="Khóa tài khoản"
                          cls="bg-slate-100 text-slate-600 hover:bg-slate-200"
                          onClick={() => toggleActive(m.id, false)}
                          disabled={busy === m.id}
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </ActionBtn>
                      ) : (
                        <ActionBtn
                          title="Mở khóa tài khoản"
                          cls="bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          onClick={() => toggleActive(m.id, true)}
                          disabled={busy === m.id}
                        >
                          <Unlock className="w-3.5 h-3.5" />
                        </ActionBtn>
                      )
                    )}
                    {/* Nâng / hạ quyền (không tự hạ quyền chính mình) */}
                    {!isSelf && (
                      <ActionBtn
                        title={m.role === "admin" ? "Hạ quyền admin" : "Nâng quyền admin"}
                        cls={
                          m.role === "admin"
                            ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            : "bg-violet-50 text-violet-600 hover:bg-violet-100"
                        }
                        onClick={() => toggleRole(m.id)}
                        disabled={busy === m.id}
                      >
                        {m.role === "admin" ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                      </ActionBtn>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function MemberAvatar({ m }: { m: Profile }) {
  return (
    <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-extrabold shrink-0">
      {m.jersey_number ?? "?"}
    </div>
  );
}

function ActionBtn({
  title,
  cls,
  onClick,
  disabled,
  children,
}: {
  title: string;
  cls: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition active:scale-95 disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  );
}

// ============================================================
//  TAB: TRẬN ĐẤU (tạo / sửa / xóa)
// ============================================================
const EMPTY_MATCH = {
  match_date: "",
  opponent: "",
  location: "",
  location_map_url: "",
  estimated_cost: "",
  jersey_color: "blue",
  is_completed: false,
};

function MatchesTab() {
  const { profile: me } = useAuth();
  const { toast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; m: Match } | null>(null);
  const [form, setForm] = useState(EMPTY_MATCH);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.from("matches").select("*").order("match_date", { ascending: false });
    setMatches((data ?? []) as Match[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    // Mặc định: 1 tuần nữa, 19:30
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(19, 30, 0, 0);
    setForm({ ...EMPTY_MATCH, match_date: toLocalInputValue(d) });
    setModal({ mode: "create" });
  }

  function openEdit(m: Match) {
    setForm({
      match_date: toLocalInputValue(new Date(m.match_date)),
      opponent: m.opponent,
      location: m.location ?? "",
      location_map_url: m.location_map_url ?? "",
      estimated_cost: m.estimated_cost ? String(m.estimated_cost) : "",
      jersey_color: m.jersey_color ?? "blue",
      is_completed: m.is_completed,
    });
    setModal({ mode: "edit", m });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!modal) return;
    const sb = getSupabase();
    if (!sb || !me) return;
    if (!form.opponent.trim()) {
      toast("Nhập tên đối thủ", "error");
      return;
    }
    if (!form.match_date) {
      toast("Chọn ngày giờ trận đấu", "error");
      return;
    }
    setSaving(true);
    const payload = {
      match_date: new Date(form.match_date).toISOString(),
      opponent: form.opponent.trim(),
      location: form.location.trim() || null,
      location_map_url: form.location_map_url.trim() || null,
      estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : 0,
      jersey_color: form.jersey_color,
      is_completed: form.is_completed,
    };
    const { error } =
      modal.mode === "create"
        ? await sb.from("matches").insert({ ...payload, created_by: me.id })
        : await sb.from("matches").update(payload).eq("id", modal.m.id);
    setSaving(false);
    if (error) {
      toast(friendlyError(error), "error");
      return;
    }
    setModal(null);
    toast(modal.mode === "create" ? "Đã lên lịch trận mới" : "Đã cập nhật trận đấu");
    load();
  }

  async function del(id: string) {
    const sb = getSupabase();
    if (!sb) return;
    if (!confirm("Xóa trận đấu này? Điểm danh & tỉ số của trận cũng sẽ bị xóa.")) return;
    const { error } = await sb.from("matches").delete().eq("id", id);
    if (error) {
      toast(friendlyError(error), "error");
      return;
    }
    toast("Đã xóa trận đấu");
    load();
  }

  return (
    <div className="space-y-4">
      <Button onClick={openCreate} className="w-full py-3">
        <Plus className="w-4 h-4" /> Lên lịch trận mới
      </Button>

      {matches.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarPlus className="w-6 h-6" />}
            title="Chưa có trận nào"
            sub="Bấm nút trên để lên lịch trận đấu đầu tiên."
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => {
            const jersey = m.jersey_color ? JERSEY_COLORS[m.jersey_color] : null;
            return (
              <Card key={m.id} className="!p-3">
                <div className="flex items-center gap-3">
                  {jersey && <span className={`w-3 h-3 rounded-full ${jersey.cls} shrink-0`} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-slate-700 truncate">
                      vs {m.opponent}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400">
                      {formatMatchDateVN(m.match_date)}
                      {m.location ? ` · ${m.location}` : ""}
                    </p>
                  </div>
                  {m.is_completed ? (
                    <Badge color="slate">
                      {m.home_score} - {m.opponent_score}
                    </Badge>
                  ) : (
                    <Badge color="sky">Sắp đá</Badge>
                  )}
                  <div className="flex gap-1 shrink-0">
                    <ActionBtn
                      title="Sửa"
                      cls="bg-slate-100 text-slate-600 hover:bg-slate-200"
                      onClick={() => openEdit(m)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </ActionBtn>
                    <ActionBtn
                      title="Xóa"
                      cls="bg-rose-50 text-rose-500 hover:bg-rose-100"
                      onClick={() => del(m.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </ActionBtn>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal tạo/sửa trận */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? "Sửa trận đấu" : "Lên lịch trận mới"}
      >
        <form onSubmit={save} className="space-y-4">
          <Field label="Ngày & giờ trận đấu *">
            <Input
              type="datetime-local"
              required
              value={form.match_date}
              onChange={(e) => setForm((f) => ({ ...f, match_date: e.target.value }))}
            />
          </Field>
          <Field label="Đội khách (đối thủ) *">
            <Input
              placeholder="vd: Bao Thu FC"
              required
              value={form.opponent}
              onChange={(e) => setForm((f) => ({ ...f, opponent: e.target.value }))}
            />
          </Field>
          <Field label="Địa điểm sân">
            <Input
              placeholder="vd: Sân 5m khu công nghiệp..."
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </Field>
          <Field label="Link bản đồ (Google Maps)">
            <Input
              placeholder="https://maps.google.com/..."
              value={form.location_map_url}
              onChange={(e) => setForm((f) => ({ ...f, location_map_url: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Chi phí dự kiến (VNĐ)">
              <Input
                type="number"
                min={0}
                step={10000}
                placeholder="500000"
                value={form.estimated_cost}
                onChange={(e) => setForm((f) => ({ ...f, estimated_cost: e.target.value }))}
              />
            </Field>
            <Field label="Màu áo">
              <Select
                value={form.jersey_color}
                onChange={(e) => setForm((f) => ({ ...f, jersey_color: e.target.value }))}
              >
                {Object.entries(JERSEY_COLORS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <input
              type="checkbox"
              checked={form.is_completed}
              onChange={(e) => setForm((f) => ({ ...f, is_completed: e.target.checked }))}
              className="w-4 h-4 accent-blue-600"
            />
            Trận đã diễn ra (có tỉ số)
          </label>
          <Button type="submit" loading={saving} className="w-full py-3">
            Lưu
          </Button>
        </form>
      </Modal>
    </div>
  );
}

// ============================================================
//  TAB: TỈ SỐ & ĐIỂM
// ============================================================
interface PlayerScore {
  started: boolean;
  goals: number;
  assists: number;
  trolls: number;
}

function ScoresTab() {
  const { profile: me } = useAuth();
  const { toast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [matchId, setMatchId] = useState("");
  const [scores, setScores] = useState<Record<string, PlayerScore>>({});
  const [homeScore, setHomeScore] = useState("");
  const [oppScore, setOppScore] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const [mRes, pRes] = await Promise.all([
      sb.from("matches").select("*").order("match_date", { ascending: false }),
      sb
        .from("profiles")
        .select("*")
        .eq("status", "active")
        .eq("is_active", true)
        .order("jersey_number", { ascending: true }),
    ]);
    const list = (mRes.data ?? []) as Match[];
    setMatches(list);
    setMembers((pRes.data ?? []) as Profile[]);
    if (!matchId && list.length > 0) {
      const firstIncomplete = list.find((m) => !m.is_completed) ?? list[0];
      selectMatch(firstIncomplete.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function selectMatch(id: string) {
    setMatchId(id);
    const m = matches.find((x) => x.id === id);
    setScores({});
    setHomeScore(m?.home_score != null ? String(m.home_score) : "");
    setOppScore(m?.opponent_score != null ? String(m.opponent_score) : "");
  }

  const current = matches.find((m) => m.id === matchId) ?? null;

  function setScore(id: string, patch: Partial<PlayerScore>) {
    setScores((s) => {
      const cur: PlayerScore = s[id] ?? { started: false, goals: 0, assists: 0, trolls: 0 };
      return { ...s, [id]: { ...cur, ...patch } };
    });
  }

  async function saveAll() {
    const sb = getSupabase();
    if (!sb || !me || !current) return;
    const hs = homeScore === "" ? null : Number(homeScore);
    const os = oppScore === "" ? null : Number(oppScore);
    if (hs == null || os == null) {
      toast("Nhập đầy đủ tỉ số trận đấu", "error");
      return;
    }

    setSaving(true);
    try {
      // 1) Lưu tỉ số + hoàn thành trận
      const { error: mErr } = await sb
        .from("matches")
        .update({ home_score: hs, opponent_score: os, is_completed: true })
        .eq("id", current.id);
      if (mErr) throw mErr;

      // 2) Cập nhật thống kê từng cầu thủ
      for (const p of members) {
        const s = scores[p.id];
        if (!s || !s.started) continue;
        const { error } = await sb
          .from("profiles")
          .update({
            matches_played: p.matches_played + 1,
            goals: p.goals + s.goals,
            assists: p.assists + s.assists,
            troll_count: p.troll_count + s.trolls,
          })
          .eq("id", p.id);
        if (error) throw error;
      }
      toast("Đã lưu tỉ số & điểm. Trận đấu đã hoàn thành! ⚽");
      setHomeScore("");
      setOppScore("");
      setScores({});
      await load();
    } catch (e) {
      toast(friendlyError(e as Error | null), "error");
    }
    setSaving(false);
  }

  if (matches.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<ClipboardEdit className="w-6 h-6" />}
          title="Chưa có trận nào"
          sub="Hãy lên lịch trận đấu trước (tab Trận Đấu)."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chọn trận */}
      <Field label="Chọn trận đấu">
        <Select value={matchId} onChange={(e) => selectMatch(e.target.value)}>
          {matches.map((m) => (
            <option key={m.id} value={m.id}>
              {formatMatchDateVN(m.match_date)} — vs {m.opponent}
              {m.is_completed ? " (đã xong)" : ""}
            </option>
          ))}
        </Select>
      </Field>

      {current && (
        <>
          {/* Tỉ số */}
          <Card className="text-center">
            <p className="text-xs font-extrabold text-slate-600 mb-3">
              ⚽ Tỉ số trận đấu
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="flex-1">
                <p className="text-[10px] font-extrabold text-blue-600 uppercase mb-1">
                  {TEAM_NAME}
                </p>
                <Input
                  type="number"
                  min={0}
                  className="text-center text-2xl font-black !py-3"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  placeholder="0"
                />
              </div>
              <span className="text-2xl font-black text-slate-300 mt-4">-</span>
              <div className="flex-1">
                <p className="text-[10px] font-extrabold text-rose-500 uppercase mb-1">
                  {current.opponent}
                </p>
                <Input
                  type="number"
                  min={0}
                  className="text-center text-2xl font-black !py-3"
                  value={oppScore}
                  onChange={(e) => setOppScore(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </Card>

          {/* Điểm từng cầu thủ */}
          <Card>
            <p className="text-xs font-extrabold text-slate-600 mb-3">
              📊 Diễn biến cầu thủ
            </p>
            <div className="space-y-2">
              {members.map((p) => {
                const s = scores[p.id] ?? { started: false, goals: 0, assists: 0, trolls: 0 };
                return (
                  <div
                    key={p.id}
                    className={`border rounded-xl p-2.5 transition ${
                      s.started ? "border-blue-200 bg-blue-50/40" : "border-slate-100"
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={s.started}
                        onChange={(e) => setScore(p.id, { started: e.target.checked })}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <span className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-extrabold shrink-0">
                        {p.jersey_number ?? "?"}
                      </span>
                      <span className="text-xs font-extrabold text-slate-700 flex-1 truncate">
                        {displayName(p)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">Đã ra sân</span>
                    </label>
                    {s.started && (
                      <div className="grid grid-cols-3 gap-2 mt-2 pl-6">
                        <MiniNum
                          label="⚽ Bàn"
                          value={s.goals}
                          onChange={(v) => setScore(p.id, { goals: v })}
                        />
                        <MiniNum
                          label="🎯 Kiến"
                          value={s.assists}
                          onChange={(v) => setScore(p.id, { assists: v })}
                        />
                        <MiniNum
                          label="⚠️ Báo"
                          value={s.trolls}
                          onChange={(v) => setScore(p.id, { trolls: v })}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Button loading={saving} className="w-full py-3.5" onClick={saveAll}>
            <Save className="w-4 h-4" /> Lưu &amp; Hoàn Thành
          </Button>
        </>
      )}
    </div>
  );
}

function MiniNum({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="text-[9px] font-extrabold text-slate-400 uppercase mb-1 text-center">
        {label}
      </p>
      <input
        type="number"
        min={0}
        max={99}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-full text-center text-sm font-black border border-slate-200 rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
    </div>
  );
}
