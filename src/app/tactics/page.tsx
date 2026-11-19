"use client";

import { useEffect, useState } from "react";
import { Save, LayoutTemplate, UserX } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, Button, Input, Field, Modal, EmptyState, Avatar, Badge } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { friendlyError } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { avatarColor } from "@/lib/format";

type SlotPos = { x: number; y: number };

const FORMATIONS: Record<string, SlotPos[]> = {
  "4-4-2": [
    { x: 50, y: 90 },
    { x: 15, y: 74 }, { x: 38, y: 77 }, { x: 62, y: 77 }, { x: 85, y: 74 },
    { x: 15, y: 50 }, { x: 38, y: 54 }, { x: 62, y: 54 }, { x: 85, y: 50 },
    { x: 38, y: 26 }, { x: 62, y: 26 },
  ],
  "4-3-3": [
    { x: 50, y: 90 },
    { x: 15, y: 74 }, { x: 38, y: 77 }, { x: 62, y: 77 }, { x: 85, y: 74 },
    { x: 25, y: 50 }, { x: 50, y: 55 }, { x: 75, y: 50 },
    { x: 15, y: 26 }, { x: 50, y: 29 }, { x: 85, y: 26 },
  ],
  "4-2-3-1": [
    { x: 50, y: 90 },
    { x: 15, y: 74 }, { x: 38, y: 77 }, { x: 62, y: 77 }, { x: 85, y: 74 },
    { x: 35, y: 58 }, { x: 65, y: 58 },
    { x: 15, y: 40 }, { x: 50, y: 36 }, { x: 85, y: 40 },
    { x: 50, y: 20 },
  ],
  "3-5-2": [
    { x: 50, y: 90 },
    { x: 25, y: 75 }, { x: 50, y: 78 }, { x: 75, y: 75 },
    { x: 10, y: 52 }, { x: 30, y: 57 }, { x: 50, y: 48 }, { x: 70, y: 57 }, { x: 90, y: 52 },
    { x: 38, y: 26 }, { x: 62, y: 26 },
  ],
};

type Board = { formation: string; picks: (string | null)[] };

function TacticsContent() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isAdmin = profile?.role === "admin";

  const [members, setMembers] = useState<Profile[]>([]);
  const [board, setBoard] = useState<Board>({ formation: "4-4-2", picks: Array(FORMATIONS["4-4-2"].length).fill(null) });
  const [slotOpen, setSlotOpen] = useState<number | null>(null);
  const [boardName, setBoardName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    (async () => {
      const m = await sb.from("profiles").select("*").eq("is_active", true).order("jersey_number", { ascending: true, nullsFirst: false });
      setMembers(m.data ?? []);
      const b = await sb.from("tactics_boards").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (b.data && FORMATIONS[b.data.formation]) {
        const picks = Array(FORMATIONS[b.data.formation].length).fill(null);
        for (const p of (b.data.players ?? [])) {
          if (p.slot >= 0 && p.slot < picks.length) picks[p.slot] = p.member_id;
        }
        setBoard({ formation: b.data.formation, picks });
        setBoardName(b.data.name || "");
      }
      setLoaded(true);
    })();
  }, []);

  const positions = FORMATIONS[board.formation];

  function switchFormation(f: string) {
    if (!FORMATIONS[f]) return;
    setBoard({ formation: f, picks: Array(FORMATIONS[f].length).fill(null) });
  }

  function pickSlot(slot: number, memberId: string | null) {
    setBoard((b) => {
      const picks = [...b.picks];
      // 1 cầu thủ chỉ đứng 1 vị trí
      if (memberId) {
        for (let i = 0; i < picks.length; i++) if (picks[i] === memberId) picks[i] = null;
      }
      picks[slot] = memberId;
      return { ...b, picks };
    });
    setSlotOpen(null);
  }

  async function handleSave() {
    const sb = getSupabase();
    if (!sb) return;
    setSaving(true);
    const name = boardName.trim() || `Đội hình ${board.formation}`;
    const players = board.picks.map((member_id, slot) => ({ slot, member_id }));
    const { data, error } = await sb
      .from("tactics_boards")
      .insert({ name, formation: board.formation, players, created_by: profile?.id ?? null })
      .select()
      .single();
    setSaving(false);
    if (error) return toast("Không thể lưu: " + friendlyError(error), "error");
    setBoardName(name);
    toast("Đã lưu sơ đồ chiến thuật!");
    void data;
  }

  if (!loaded) {
    return <Card><EmptyState icon={<LayoutTemplate className="w-5 h-5" />} title="Đang tải..." /></Card>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-extrabold text-slate-800">
          {isAdmin ? "Sơ đồ chiến thuật" : "Đội hình"}
        </h2>
        <p className="text-xs text-slate-400 font-semibold">
          {isAdmin ? "Chạm vị trí để chọn cầu thủ" : "Xem đội hình do admin sắp xếp"}
        </p>
      </div>

      {/* Formation chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Object.keys(FORMATIONS).map((f) => (
          <button
            key={f}
            onClick={() => isAdmin && switchFormation(f)}
            disabled={!isAdmin}
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-extrabold border-2 transition ${
              board.formation === f
                ? "border-violet-500 bg-violet-50 text-violet-700"
                : "border-slate-200 bg-white text-slate-400"
            } ${!isAdmin ? "opacity-60" : ""}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Pitch */}
      <div className="relative rounded-2xl overflow-hidden border border-emerald-900/30 shadow-lg" style={{ height: 460 }}>
        {/* cỏ */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-600 to-emerald-700" />
        <div className="absolute inset-x-0 top-0 h-[12%] bg-white/5" />
        <div className="absolute inset-x-0 top-[12%] h-[16%] bg-white/5" />
        <div className="absolute inset-x-0 top-[28%] h-[16%] bg-white/5" />
        <div className="absolute inset-x-0 top-[44%] h-[16%] bg-white/5" />
        <div className="absolute inset-x-0 top-[60%] h-[16%] bg-white/5" />
        <div className="absolute inset-x-0 top-[76%] h-[12%] bg-white/5" />
        {/* vạch sân */}
        <div className="absolute inset-3 border-2 border-white/40 rounded-md" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-white/40" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/50" />
        {/* khung thành */}
        <div className="absolute left-1/2 -translate-x-1/2 top-3 w-28 h-6 border-2 border-white/40 border-b-0 rounded-t" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-3 w-28 h-6 border-2 border-white/40 border-t-0 rounded-b" />

        {/* slots */}
        {positions.map((pos, i) => {
          const memberId = board.picks[i];
          const m = members.find((x) => x.id === memberId);
          return (
            <button
              key={i}
              onClick={() => isAdmin && setSlotOpen(i)}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              {m ? (
                <>
                  <Avatar name={m.nickname || m.full_name} color={avatarColor(m.nickname || m.full_name)} />
                  <span className="mt-1 px-1.5 py-0.5 rounded-md bg-black/50 text-white text-[9px] font-extrabold whitespace-nowrap backdrop-blur-sm">
                    {m.jersey_number != null ? `#${m.jersey_number} ` : ""}{(m.nickname || m.full_name).slice(0, 10)}
                  </span>
                </>
              ) : (
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/60 bg-white/10 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/20 transition">
                  <span className="text-white/70 text-[10px] font-extrabold">{i + 1}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Save (admin) */}
      {isAdmin ? (
        <Card className="space-y-3">
          <Field label="Tên sơ đồ">
            <Input placeholder={`VD: Đội hình đá giải tháng 12 (${board.formation})`} value={boardName} onChange={(e) => setBoardName(e.target.value)} />
          </Field>
          <Button onClick={handleSave} loading={saving} className="w-full" variant="primary">
            <Save className="w-4 h-4" /> Lưu sơ đồ
          </Button>
        </Card>
      ) : (
        <Card className="bg-slate-50">
          <p className="text-[11px] text-slate-400 font-semibold text-center">
            Chỉ quản trị viên mới chỉnh sửa đội hình
          </p>
        </Card>
      )}

      {/* Picker modal */}
      <Modal
        open={slotOpen !== null}
        onClose={() => setSlotOpen(null)}
        title={`Vị trí ${slotOpen !== null ? slotOpen + 1 : ""} — chọn cầu thủ`}
      >
        <div className="space-y-1.5">
          <button
            onClick={() => slotOpen !== null && pickSlot(slotOpen, null)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left"
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
              <UserX className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-slate-500">Bỏ trống vị trí</span>
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => slotOpen !== null && pickSlot(slotOpen, m.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left ${
                board.picks[slotOpen ?? 0] === m.id ? "bg-violet-50" : ""
              }`}
            >
              <Avatar name={m.nickname || m.full_name} color={avatarColor(m.nickname || m.full_name)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">
                  {m.nickname || m.full_name}
                  {m.jersey_number != null && (
                    <span className="ml-1.5 text-[10px] font-extrabold text-slate-400">#{m.jersey_number}</span>
                  )}
                </p>
                <p className="text-[10px] text-slate-400 font-medium truncate">{m.full_name}</p>
              </div>
              {m.position && <Badge color="sky">{m.position}</Badge>}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

export default function TacticsPage() {
  return (
    <RequireAuth>
      <TacticsContent />
    </RequireAuth>
  );
}
