"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  Users,
  Trophy,
  BarChart3,
  Plus,
  Trash2,
  Camera,
  Link as LinkIcon,
  X,
  Pencil,
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
import type {
  Profile,
  LineupSlot,
  Trophy as TrophyType,
  TeamPhoto,
} from "@/lib/types";
import {
  POSITION_LABEL,
  FOOT_LABEL,
  displayName,
  avatarSrc,
  overallRating,
  ratingColor,
  formatDateVN,
} from "@/lib/format";

type Tab = "lineup" | "hall" | "stats";

export default function PlayersPage() {
  return (
    <RequireAuth>
      <PlayersContent />
    </RequireAuth>
  );
}

function PlayersContent() {
  const [tab, setTab] = useState<Tab>("lineup");
  const [players, setPlayers] = useState<Profile[]>([]);
  const [lineups, setLineups] = useState<LineupSlot[]>([]);
  const [trophies, setTrophies] = useState<TrophyType[]>([]);
  const [photos, setPhotos] = useState<TeamPhoto[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const [p, l, t, ph] = await Promise.all([
      sb
        .from("profiles")
        .select("*")
        .eq("status", "active")
        .eq("is_active", true)
        .order("jersey_number", { ascending: true }),
      sb
        .from("lineups")
        .select(
          "player_id, position, profiles(username, full_name, display_name, avatar_url, jersey_number)"
        ),
      sb
        .from("trophies")
        .select(
          "*, profiles(username, full_name, display_name, avatar_url, jersey_number)"
        )
        .order("earned_on", { ascending: false, nullsFirst: false }),
      sb.from("team_photos").select("*").order("created_at", { ascending: false }),
    ]);
    setPlayers((p.data ?? []) as Profile[]);
    setLineups((l.data ?? []) as unknown as LineupSlot[]);
    setTrophies((t.data ?? []) as unknown as TrophyType[]);
    setPhotos((ph.data ?? []) as TeamPhoto[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      {/* Tab switch */}
      <div className="grid grid-cols-3 gap-1 bg-slate-200/70 rounded-2xl p-1">
        {(
          [
            { id: "lineup", label: "Đội Hình", icon: Users },
            { id: "hall", label: "Truyền Thống", icon: Trophy },
            { id: "stats", label: "Thống Kê", icon: BarChart3 },
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

      {tab === "lineup" && (
        <LineupTab
          players={players}
          lineups={lineups}
          onSelect={(p) => setSelected(p)}
        />
      )}
      {tab === "hall" && <HallTab trophies={trophies} photos={photos} onSaved={load} />}
      {tab === "stats" && <StatsTab players={players} />}

      {/* Modal chi tiết cầu thủ */}
      <PlayerDetailModal
        player={selected}
        trophies={trophies.filter((t) => t.player_id === selected?.id)}
        onClose={() => setSelected(null)}
        onSaved={load}
      />
    </div>
  );
}

// ============================================================
//  TAB: ĐỘI HÌNH (thẻ kiểu FIFA)
// ============================================================
function LineupTab({
  players,
  lineups,
  onSelect,
}: {
  players: Profile[];
  lineups: LineupSlot[];
  onSelect: (p: Profile) => void;
}) {
  if (players.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="Chưa có cầu thủ nào"
          sub="Cầu thủ sẽ xuất hiện ở đây sau khi được admin duyệt."
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {players.map((p) => {
        const pos = lineups.find((l) => l.player_id === p.id)?.position ?? "SUB";
        const ovr = overallRating(p);
        return (
          <Card
            key={p.id}
            onClick={() => onSelect(p)}
            className="!p-3 text-center relative overflow-hidden"
          >
            {/* số áo nền */}
            <span className="absolute -top-3 -right-1 text-6xl font-black text-slate-100 select-none">
              {p.jersey_number ?? ""}
            </span>

            <div className="relative flex flex-col items-center gap-1.5">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-blue-500 to-cyan-400 shadow">
                {p.avatar_url ? (
                  <img
                    src={p.avatar_url}
                    alt={displayName(p)}
                    className="w-full h-full rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <img
                    src={avatarSrc(p)}
                    alt={displayName(p)}
                    className="w-full h-full rounded-full object-cover bg-slate-100"
                  />
                )}
              </div>

              {/* Rating */}
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-black text-white ${ratingColor(ovr)}`}
              >
                {ovr}
              </span>

              <p className="text-sm font-extrabold text-slate-800 leading-tight line-clamp-2">
                {displayName(p)}
              </p>

              <div className="flex items-center gap-1 flex-wrap justify-center">
                <Badge color="violet">{POSITION_LABEL[pos]}</Badge>
                {p.preferred_foot && (
                  <Badge color="slate">{FOOT_LABEL[p.preferred_foot]}</Badge>
                )}
              </div>

              {p.fun_title && (
                <p className="text-[10px] font-bold text-amber-600 italic leading-tight line-clamp-1">
                  {p.fun_title}
                </p>
              )}

              {/* Stats mini */}
              <div className="grid grid-cols-4 gap-1 w-full bg-slate-50 border border-slate-100 rounded-lg px-1 py-1.5 mt-1">
                <MiniStat label="Trận" value={p.matches_played} />
                <MiniStat label="Bàn" value={p.goals} />
                <MiniStat label="Kiến" value={p.assists} />
                <MiniStat label="⚠️" value={p.troll_count} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-[11px] font-black text-slate-700">{value}</p>
      <p className="text-[8px] font-bold text-slate-400 uppercase">{label}</p>
    </div>
  );
}

// ============================================================
//  MODAL CHI TIẾT CẦU THỦ
// ============================================================
function PlayerDetailModal({
  player,
  trophies,
  onClose,
  onSaved,
}: {
  player: Profile | null;
  trophies: TrophyType[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile: me } = useAuth();
  const { toast } = useToast();
  const isAdmin = me?.role === "admin";
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    pace: 50,
    stamina: 50,
    shooting: 50,
    passing: 50,
    dribbling: 50,
    break_team: 50,
    fun_title: "",
    coach_comment: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (player) {
      setEdit(false);
      setForm({
        pace: player.pace,
        stamina: player.stamina,
        shooting: player.shooting,
        passing: player.passing,
        dribbling: player.dribbling,
        break_team: player.break_team,
        fun_title: player.fun_title ?? "",
        coach_comment: player.coach_comment ?? "",
      });
    }
  }, [player]);

  if (!player) return null;
  const ovr = overallRating(player);

  const STATS: {
    key: "pace" | "stamina" | "shooting" | "passing" | "dribbling" | "break_team";
    label: string;
  }[] = [
    { key: "pace", label: "Tốc độ" },
    { key: "stamina", label: "Thể lực" },
    { key: "shooting", label: "Bắn phá" },
    { key: "passing", label: "Chuyền" },
    { key: "dribbling", label: "Rê bóng" },
    { key: "break_team", label: "Break team 😈" },
  ];

  async function saveStats(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb || !player) return;
    setSaving(true);
    const { error } = await sb
      .from("profiles")
      .update({
        pace: form.pace,
        stamina: form.stamina,
        shooting: form.shooting,
        passing: form.passing,
        dribbling: form.dribbling,
        break_team: form.break_team,
        fun_title: form.fun_title.trim() || null,
        coach_comment: form.coach_comment.trim() || null,
      })
      .eq("id", player.id);
    setSaving(false);
    if (error) {
      toast(friendlyError(error), "error");
      return;
    }
    toast("Đã lưu hồ sơ cầu thủ");
    setEdit(false);
    onSaved();
  }

  return (
    <Modal open={!!player} onClose={onClose} title="Hồ sơ cầu thủ">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full p-0.5 bg-gradient-to-br from-blue-500 to-cyan-400 shadow shrink-0">
            {player.avatar_url ? (
              <img
                src={player.avatar_url}
                alt={displayName(player)}
                className="w-full h-full rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <img
                src={avatarSrc(player)}
                alt={displayName(player)}
                className="w-full h-full rounded-full object-cover bg-slate-100"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-extrabold text-slate-800">
              {player.jersey_number != null && (
                <span className="text-slate-300">#{player.jersey_number} </span>
              )}
              {displayName(player)}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span
                className={`px-2.5 py-0.5 rounded-lg text-sm font-black text-white ${ratingColor(ovr)}`}
              >
                OVR {ovr}
              </span>
              {player.preferred_foot && (
                <Badge color="slate">{FOOT_LABEL[player.preferred_foot]}</Badge>
              )}
              {player.role === "admin" && <Badge color="violet">Admin</Badge>}
            </div>
            {player.fun_title && (
              <p className="text-xs font-bold text-amber-600 italic mt-1">
                {player.fun_title}
              </p>
            )}
          </div>
        </div>

        {/* Thống kê sự nghiệp */}
        <div className="grid grid-cols-4 gap-2">
          <CareerStat label="Trận" value={player.matches_played} cls="text-blue-600" />
          <CareerStat label="Bàn thắng" value={player.goals} cls="text-emerald-600" />
          <CareerStat label="Kiến tạo" value={player.assists} cls="text-sky-600" />
          <CareerStat label="Lần báo ⚠️" value={player.troll_count} cls="text-amber-600" />
        </div>

        {/* Comment của HLV */}
        {player.coach_comment && !edit && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-blue-400 mb-1">
              Nhận xét của HLV
            </p>
            <p className="text-xs font-semibold text-slate-700 italic">
              “{player.coach_comment}”
            </p>
          </div>
        )}

        {/* Chỉ số FIFA */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Chỉ số
            </h4>
            {isAdmin && !edit && (
              <button
                onClick={() => setEdit(true)}
                className="text-[11px] font-extrabold text-blue-600 flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" /> Chỉnh sửa
              </button>
            )}
          </div>

          {edit ? (
            <form onSubmit={saveStats} className="space-y-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
              {STATS.map((s) => (
                <div key={s.key}>
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                    <span>{s.label}</span>
                    <span className="text-blue-600">{form[s.key]}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={99}
                    value={form[s.key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [s.key]: Number(e.target.value) }))
                    }
                    className="w-full accent-blue-600"
                  />
                </div>
              ))}
              <Field label="Chức danh vui">
                <Input
                  placeholder="vd: Chân gỗ huyền thoại"
                  value={form.fun_title}
                  onChange={(e) => setForm((f) => ({ ...f, fun_title: e.target.value }))}
                />
              </Field>
              <Field label="Nhận xét của HLV">
                <Input
                  placeholder="vd: Đá vui nhất đội"
                  value={form.coach_comment}
                  onChange={(e) => setForm((f) => ({ ...f, coach_comment: e.target.value }))}
                />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" loading={saving} className="flex-1">
                  Lưu
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEdit(false)}>
                  Hủy
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              {STATS.map((s) => (
                <div key={s.key}>
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-0.5">
                    <span>{s.label}</span>
                    <span>{player[s.key]}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                      style={{ width: `${player[s.key]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Huy chương của cầu thủ này */}
        {trophies.length > 0 && (
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500 mb-2">
              🏆 Thành tích
            </h4>
            <div className="space-y-2">
              {trophies.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl p-3"
                >
                  <span className="text-2xl">{t.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-slate-700">{t.title}</p>
                    <p className="text-[10px] font-semibold text-slate-400">
                      {t.earned_on ? formatDateVN(t.earned_on) : ""}
                      {t.description ? ` · ${t.description}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function CareerStat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
      <p className={`text-lg font-black ${cls}`}>{value}</p>
      <p className="text-[9px] font-bold text-slate-400 uppercase">{label}</p>
    </div>
  );
}

// ============================================================
//  TAB: PHÒNG TRUYỀN THỐNG (huy chương + ảnh)
// ============================================================
function HallTab({
  trophies,
  photos,
  onSaved,
}: {
  trophies: TrophyType[];
  photos: TeamPhoto[];
  onSaved: () => void;
}) {
  const { profile: me } = useAuth();
  const { toast } = useToast();
  const isAdmin = me?.role === "admin";

  const [tModal, setTModal] = useState(false);
  const [tForm, setTForm] = useState({
    icon: "🏆",
    title: "",
    earned_on: "",
    description: "",
    player_id: "",
  });
  const [pModal, setPModal] = useState(false);
  const [pCaption, setPCaption] = useState("");
  const [pUrl, setPUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [players, setPlayers] = useState<Profile[]>([]);

  useEffect(() => {
    if (isAdmin) {
      const sb = getSupabase();
      if (!sb) return;
      sb
        .from("profiles")
        .select("*")
        .eq("status", "active")
        .eq("is_active", true)
        .order("jersey_number", { ascending: true })
        .then(({ data }) => setPlayers((data ?? []) as Profile[]));
    }
  }, [isAdmin]);

  async function addTrophy(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb || !me) return;
    if (!tForm.title.trim()) {
      toast("Nhập tên huy chương", "error");
      return;
    }
    setSaving(true);
    const { error } = await sb.from("trophies").insert({
      icon: tForm.icon || "🏆",
      title: tForm.title.trim(),
      earned_on: tForm.earned_on || null,
      description: tForm.description.trim() || null,
      player_id: tForm.player_id || null,
      created_by: me.id,
    });
    setSaving(false);
    if (error) {
      toast(friendlyError(error), "error");
      return;
    }
    setTModal(false);
    setTForm({ icon: "🏆", title: "", earned_on: "", description: "", player_id: "" });
    toast("Đã thêm huy chương");
    onSaved();
  }

  async function deleteTrophy(id: string) {
    const sb = getSupabase();
    if (!sb) return;
    if (!confirm("Xóa huy chương này?")) return;
    const { error } = await sb.from("trophies").delete().eq("id", id);
    if (error) {
      toast(friendlyError(error), "error");
      return;
    }
    toast("Đã xóa");
    onSaved();
  }

  async function addPhoto(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb || !me) return;
    const url = pUrl.trim();
    if (!url) {
      toast("Chèn link ảnh hoặc tải ảnh lên", "error");
      return;
    }
    setSaving(true);
    const { error } = await sb.from("team_photos").insert({
      url,
      caption: pCaption.trim() || null,
      uploaded_by: me.id,
    });
    setSaving(false);
    if (error) {
      toast(friendlyError(error), "error");
      return;
    }
    setPModal(false);
    setPCaption("");
    setPUrl("");
    toast("Đã thêm ảnh");
    onSaved();
  }

  function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !me) return;
    const sb = getSupabase();
    if (!sb) return;
    const path = `photos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-]/g, "_")}`;
    sb.storage
      .from("team-photos")
      .upload(path, file, { cacheControl: "3600", upsert: false })
      .then(({ data, error }) => {
        if (error) {
          toast(friendlyError(error), "error");
          return;
        }
        const publicUrl = sb.storage.from("team-photos").getPublicUrl(data.path).data.publicUrl;
        setPUrl(publicUrl);
        toast("Đã tải ảnh lên, nhấn Thêm để lưu");
      });
  }

  async function deletePhoto(id: string) {
    const sb = getSupabase();
    if (!sb) return;
    if (!confirm("Xóa ảnh này?")) return;
    const { error } = await sb.from("team_photos").delete().eq("id", id);
    if (error) {
      toast(friendlyError(error), "error");
      return;
    }
    toast("Đã xóa");
    onSaved();
  }

  return (
    <div className="space-y-4">
      {/* Huy chương */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold text-slate-700">
            🏆 Phòng truyền thống
          </h2>
          {isAdmin && (
            <Button variant="outline" className="!px-3 !py-1.5 !text-[11px]" onClick={() => setTModal(true)}>
              <Plus className="w-3.5 h-3.5" /> Huy chương
            </Button>
          )}
        </div>

        {trophies.length === 0 ? (
          <EmptyState
            icon={<Trophy className="w-6 h-6" />}
            title="Chưa có huy chương nào"
            sub="Những khoảnh khắc vinh quang của đội sẽ ở đây."
          />
        ) : (
          <div className="space-y-2">
            {trophies.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-white border border-amber-100 rounded-xl p-3"
              >
                <span className="text-2xl shrink-0">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-700">{t.title}</p>
                  <p className="text-[10px] font-semibold text-slate-400 truncate">
                    {t.profiles ? `${displayName(t.profiles)} · ` : ""}
                    {t.earned_on ? formatDateVN(t.earned_on) : ""}
                    {t.description ? ` · ${t.description}` : ""}
                  </p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => deleteTrophy(t.id)}
                    className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-500 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Ảnh khoảnh khắc */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold text-slate-700">
            📸 Khoảnh khắc
          </h2>
          {isAdmin && (
            <Button variant="outline" className="!px-3 !py-1.5 !text-[11px]" onClick={() => setPModal(true)}>
              <Plus className="w-3.5 h-3.5" /> Thêm ảnh
            </Button>
          )}
        </div>

        {photos.length === 0 ? (
          <EmptyState
            icon={<Camera className="w-6 h-6" />}
            title="Chưa có ảnh nào"
            sub="Những bức ảnh kỷ niệm của cả đội."
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {photos.map((ph) => (
              <div key={ph.id} className="relative group">
                <Image
                  src={ph.url}
                  alt={ph.caption || "Khoảnh khắc"}
                  width={300}
                  height={300}
                  className="w-full aspect-square object-cover rounded-xl border border-slate-100"
                />
                {ph.caption && (
                  <p className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] font-bold p-2 rounded-b-xl">
                    {ph.caption}
                  </p>
                )}
                {isAdmin && (
                  <button
                    onClick={() => deletePhoto(ph.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal thêm huy chương */}
      <Modal open={tModal} onClose={() => setTModal(false)} title="Thêm huy chương">
        <form onSubmit={addTrophy} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Biểu tượng (emoji)">
              <Input
                value={tForm.icon}
                onChange={(e) => setTForm((f) => ({ ...f, icon: e.target.value }))}
              />
            </Field>
            <Field label="Ngày đạt được">
              <Input
                type="date"
                value={tForm.earned_on}
                onChange={(e) => setTForm((f) => ({ ...f, earned_on: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Tên huy chương *">
            <Input
              placeholder="vd: Vô địch giải phong trào 2025"
              value={tForm.title}
              onChange={(e) => setTForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </Field>
          <Field label="Của cầu thủ (nếu có)">
            <Select
              value={tForm.player_id}
              onChange={(e) => setTForm((f) => ({ ...f, player_id: e.target.value }))}
            >
              <option value="">— Cả đội —</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {displayName(p)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mô tả">
            <Input
              placeholder="vd: Đoạt cúp chung kết sau loạt luân lưu"
              value={tForm.description}
              onChange={(e) => setTForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <Button type="submit" loading={saving} className="w-full py-3">
            Thêm
          </Button>
        </form>
      </Modal>

      {/* Modal thêm ảnh */}
      <Modal open={pModal} onClose={() => setPModal(false)} title="Thêm ảnh khoảnh khắc">
        <form onSubmit={addPhoto} className="space-y-4">
          <Field label="Tải ảnh lên (bắt buộc)">
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl p-6 cursor-pointer hover:border-blue-400 transition">
              <Camera className="w-6 h-6 text-slate-400" />
              <span className="text-xs font-bold text-slate-500">
                {pUrl ? "Đã chọn ảnh ✓ (có thể chọn khác)" : "Bấm để chọn ảnh từ điện thoại"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoFile}
              />
            </label>
          </Field>
          <Field label="Hoặc dán link ảnh">
            <div className="flex gap-2">
              <LinkIcon className="w-4 h-4 text-slate-400 mt-3 shrink-0" />
              <Input
                placeholder="https://..."
                value={pUrl}
                onChange={(e) => setPUrl(e.target.value)}
              />
            </div>
          </Field>
          <Field label="Chú thích">
            <Input
              placeholder="vd: Chiến thắng 3-1 trước Bao Thu FC"
              value={pCaption}
              onChange={(e) => setPCaption(e.target.value)}
            />
          </Field>
          <Button type="submit" loading={saving} className="w-full py-3">
            Thêm
          </Button>
        </form>
      </Modal>
    </div>
  );
}

// ============================================================
//  TAB: THỐNG KÊ (bảng xếp hạng)
// ============================================================
function StatsTab({ players }: { players: Profile[] }) {
  const boards: { title: string; key: "goals" | "assists" | "matches_played" | "troll_count"; emoji: string }[] = [
    { title: "Vua Bàn Thắng", key: "goals", emoji: "⚽" },
    { title: "Vua Kiến Tạo", key: "assists", emoji: "🎯" },
    { title: "Số Trận Ra Sân", key: "matches_played", emoji: "📅" },
    { title: "Lần Báo ⚠️", key: "troll_count", emoji: "😈" },
  ];
  const MEDALS = ["🥇", "🥈", "🥉"];

  if (players.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<BarChart3 className="w-6 h-6" />}
          title="Chưa có thống kê"
          sub="Thống kê sẽ cập nhật sau mỗi trận đấu."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {boards.map((b) => {
        const sorted = [...players].sort((a, c) => c[b.key] - a[b.key]).slice(0, 5);
        const max = sorted[0] ? sorted[0][b.key] : 0;
        return (
          <Card key={b.key} className="!p-3.5">
            <h3 className="text-xs font-extrabold text-slate-700 mb-2.5">
              {b.emoji} {b.title}
            </h3>
            <div className="space-y-2">
              {sorted.map((p, i) => {
                const v = p[b.key];
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="w-6 text-center text-sm">{MEDALS[i] ?? i + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-[11px] font-extrabold shrink-0">
                      {p.jersey_number ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold text-slate-700 truncate">
                        {displayName(p)}
                      </p>
                      {max > 0 && (
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-0.5">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                            style={{ width: `${Math.max(6, (v / max) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-black text-slate-700">{v}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
