"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  MapPin,
  CalendarClock,
  Map,
  Users,
  Cake,
  ChevronRight,
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, Badge, EmptyState } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { friendlyError } from "@/lib/errors";
import { TEAM_NAME } from "@/lib/config";
import { getSupabase } from "@/lib/supabase";
import type {
  Match,
  MatchAttendee,
  LineupSlot,
  Profile,
  AttendStatus,
  LineupPosition,
} from "@/lib/types";
import {
  formatVND,
  formatMatchDateVN,
  JERSEY_COLORS,
  POSITION_LABEL,
  displayName,
  daysToBirthday,
  ageFromBirthday,
} from "@/lib/format";

const RSVP: { status: AttendStatus; label: string; cls: string }[] = [
  { status: "attending", label: "Tham gia", cls: "bg-emerald-600 text-white" },
  { status: "absent", label: "Vắng mặt", cls: "bg-rose-600 text-white" },
  { status: "undecided", label: "Chưa chắc", cls: "bg-amber-500 text-white" },
];

const POS_ROWS: { pos: LineupPosition; label: string }[] = [
  { pos: "FW", label: "Tiền đạo" },
  { pos: "MF", label: "Tiền vệ" },
  { pos: "DF", label: "Hậu vệ" },
  { pos: "GK", label: "Thủ môn" },
];

export default function HomePage() {
  return (
    <RequireAuth>
      <HomeContent />
    </RequireAuth>
  );
}

function HomeContent() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isAdmin = profile?.role === "admin";

  const [balance, setBalance] = useState(0);
  const [nextMatch, setNextMatch] = useState<Match | null>(null);
  const [attendees, setAttendees] = useState<MatchAttendee[]>([]);
  const [lineups, setLineups] = useState<LineupSlot[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [savingRsvp, setSavingRsvp] = useState(false);

  const loadData = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !profile) return;

    const [tx, matchesRes, lineupsRes, membersRes] = await Promise.all([
      sb.from("fund_transactions").select("type, amount"),
      sb
        .from("matches")
        .select("*")
        .eq("is_completed", false)
        .order("match_date", { ascending: true })
        .limit(1)
        .maybeSingle(),
      sb
        .from("lineups")
        .select("player_id, position, profiles(username, full_name, display_name, avatar_url, jersey_number)"),
      sb.from("profiles").select("*").eq("status", "active").eq("is_active", true),
    ]);

    const inc = (tx.data ?? []).filter((t) => t.type === "income").reduce((a, t) => a + Number(t.amount), 0);
    const exp = (tx.data ?? []).filter((t) => t.type === "expense").reduce((a, t) => a + Number(t.amount), 0);
    setBalance(inc - exp);
    setNextMatch((matchesRes.data as Match | null) ?? null);
    setLineups((lineupsRes.data ?? []) as unknown as LineupSlot[]);
    setMembers(((membersRes.data ?? []) as Profile[]).sort((a, b) => (a.jersey_number ?? 999) - (b.jersey_number ?? 999)));

    if (matchesRes.data) {
      const att = await sb
        .from("match_attendees")
        .select("*, profiles(username, full_name, display_name, avatar_url, jersey_number)")
        .eq("match_id", matchesRes.data.id);
      setAttendees((att.data ?? []) as unknown as MatchAttendee[]);
    } else {
      setAttendees([]);
    }
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRsvp(status: AttendStatus) {
    if (!profile || !nextMatch) return;
    const sb = getSupabase();
    if (!sb) return;
    setSavingRsvp(true);
    const { error } = await sb.from("match_attendees").upsert(
      { match_id: nextMatch.id, player_id: profile.id, status },
      { onConflict: "match_id,player_id" }
    );
    setSavingRsvp(false);
    if (error) {
      toast(friendlyError(error), "error");
      return;
    }
    await loadData();
  }

  async function handleSetPosition(playerId: string, pos: LineupPosition) {
    const sb = getSupabase();
    if (!sb || !profile) return;
    const { error } = await sb
      .from("lineups")
      .upsert({ player_id: playerId, position: pos }, { onConflict: "player_id" });
    if (error) {
      toast(friendlyError(error), "error");
      return;
    }
    await loadData();
  }

  // Người dùng hiện tại đã chọn gì cho trận tới
  const myStatus = nextMatch
    ? attendees.find((a) => a.player_id === profile?.id)?.status ?? null
    : null;
  const going = attendees.filter((a) => a.status === "attending");
  const birthdayList = members
    .map((m) => ({ m, days: daysToBirthday(m.birth_date) }))
    .filter((x) => x.days !== null && (x.days as number) <= 14)
    .sort((a, b) => (a.days as number) - (b.days as number))
    .slice(0, 5);

  const jersey = nextMatch?.jersey_color ? JERSEY_COLORS[nextMatch.jersey_color] : null;

  return (
    <div className="space-y-4">
      {/* ===== Số dư quỹ ===== */}
      <Card className="bg-gradient-to-br from-blue-600 to-cyan-600 border-0 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-100 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> Quỹ đội
            </p>
            <p className="text-2xl font-extrabold mt-1">{formatVND(balance)}</p>
          </div>
          <Link
            href="/fund"
            className="flex items-center gap-1 text-[11px] font-extrabold bg-white/20 hover:bg-white/30 rounded-lg px-2.5 py-1.5 transition"
          >
            Chi tiết thu chi <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Card>

      {/* ===== Trận sắp tới ===== */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold text-slate-700 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-blue-600" /> Lịch trận sắp tới
          </h2>
          {nextMatch && (
            <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sắp diễn ra
            </span>
          )}
        </div>

        {!nextMatch ? (
          <EmptyState
            icon={<CalendarClock className="w-6 h-6" />}
            title="Chưa có trận nào sắp tới"
            sub="Quản trị viên sẽ lên lịch trận đấu mới."
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-3">
              <div>
                <p className="font-extrabold text-slate-800">
                  {TEAM_NAME} vs {nextMatch.opponent}
                </p>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  {formatMatchDateVN(nextMatch.match_date)}
                </p>
              </div>
              {jersey && (
                <div className="flex flex-col items-center gap-1">
                  <span className={`w-6 h-6 rounded-full ${jersey.cls} shadow`} />
                  <span className="text-[10px] font-bold text-slate-400">{jersey.label}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-xs font-semibold text-slate-600">
              {nextMatch.location && (
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {nextMatch.location}
                </p>
              )}
              {nextMatch.location_map_url && (
                <a
                  href={nextMatch.location_map_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-blue-600 font-extrabold"
                >
                  <Map className="w-3.5 h-3.5" /> Xem trên bản đồ
                </a>
              )}
              {nextMatch.estimated_cost > 0 && (
                <p className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-slate-400" />
                  Dự kiến: {formatVND(Number(nextMatch.estimated_cost))}
                </p>
              )}
            </div>

            {/* Điểm danh trận này */}
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 mb-2">
                Bạn có tham gia không?
              </p>
              <div className="grid grid-cols-3 gap-2">
                {RSVP.map((r) => (
                  <button
                    key={r.status}
                    disabled={savingRsvp}
                    onClick={() => handleRsvp(r.status)}
                    className={`py-2 rounded-xl text-xs font-extrabold transition active:scale-95 border ${
                      myStatus === r.status
                        ? r.cls + " border-transparent shadow"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ai đã xác nhận đi */}
            {going.length > 0 && (
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 mb-2">
                  <Users className="w-3 h-3 inline mr-1" />
                  {going.length} cầu thủ tham gia
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {going.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] font-bold text-emerald-800"
                    >
                      {a.profiles?.avatar_url ? (
                        <img src={a.profiles.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-700 text-[9px] font-extrabold flex items-center justify-center">
                          {(a.profiles?.jersey_number ?? "?").toString()}
                        </span>
                      )}
                      {a.profiles ? displayName(a.profiles) : "?"}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ===== Sơ đồ đội hình ===== */}
      <Card>
        <h2 className="text-sm font-extrabold text-slate-700 mb-3">
          Đội hình chiến thuật
        </h2>

        {/* Sân */}
        <div className="rounded-2xl bg-gradient-to-b from-emerald-600 to-emerald-700 p-3 space-y-2 border border-emerald-500">
          {POS_ROWS.map((row) => (
            <div key={row.pos}>
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-100/80 text-center mb-1">
                {row.label}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 min-h-7">
                {lineups
                  .filter((l) => l.position === row.pos)
                  .map((l) => (
                    <span
                      key={l.player_id}
                      className="inline-flex items-center gap-1 rounded-full bg-white/95 text-[10px] font-extrabold text-slate-700 pl-1 pr-2 py-0.5 shadow"
                    >
                      {l.profiles?.jersey_number != null && (
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[8px] flex items-center justify-center">
                          {l.profiles.jersey_number}
                        </span>
                      )}
                      {l.profiles ? displayName(l.profiles) : "?"}
                    </span>
                  ))}
                {lineups.filter((l) => l.position === row.pos).length === 0 && (
                  <span className="text-[10px] text-emerald-100/50 font-semibold italic">
                    {isAdmin ? "(chưa xếp)" : "Chưa có"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Băng ghế dự bị */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
            Băng ghế dự bị
          </span>
          {lineups
            .filter((l) => l.position === "SUB")
            .map((l) => (
              <span
                key={l.player_id}
                className="inline-flex items-center rounded-full bg-white border border-slate-200 text-[10px] font-extrabold text-slate-600 px-2 py-0.5"
              >
                {l.profiles ? displayName(l.profiles) : "?"}
              </span>
            ))}
        </div>

        {/* Admin: bảng bố trí nhân sự */}
        {isAdmin && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 mb-2">
              Bảng bố trí nhân sự (Admin)
            </p>
            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {members.map((m) => {
                const cur = lineups.find((l) => l.player_id === m.id)?.position ?? "SUB";
                return (
                  <div key={m.id} className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-600 truncate">
                      {m.jersey_number != null && (
                        <span className="text-slate-400">#{m.jersey_number} </span>
                      )}
                      {displayName(m)}
                    </span>
                    <select
                      value={cur}
                      onChange={(e) => handleSetPosition(m.id, e.target.value as LineupPosition)}
                      className="text-[11px] font-bold border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                      {(Object.keys(POSITION_LABEL) as LineupPosition[]).map((p) => (
                        <option key={p} value={p}>
                          {POSITION_LABEL[p]}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* ===== Sinh nhật ===== */}
      {birthdayList.length > 0 && (
        <Card>
          <h2 className="text-sm font-extrabold text-slate-700 mb-3 flex items-center gap-2">
            <Cake className="w-4 h-4 text-rose-500" /> Sinh nhật sắp tới
          </h2>
          <div className="space-y-2">
            {birthdayList.map(({ m, days }) => (
              <div key={m.id} className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  🎂 {displayName(m)}
                  {ageFromBirthday(m.birth_date) !== null && (
                    <span className="text-slate-400 font-semibold"> · {ageFromBirthday(m.birth_date)} tuổi</span>
                  )}
                </span>
                <Badge color={days === 0 ? "red" : "amber"}>
                  {days === 0 ? "Hôm nay!" : `Còn ${days} ngày`}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
