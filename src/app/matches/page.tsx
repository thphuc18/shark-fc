"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  MapPin,
  Map,
  Trophy,
  XCircle,
  Minus,
  Wallet,
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, Badge, EmptyState } from "@/components/ui";
import { getSupabase } from "@/lib/supabase";
import type { Match } from "@/lib/types";
import { formatMatchDateVN, formatVND, JERSEY_COLORS } from "@/lib/format";
import { TEAM_NAME } from "@/lib/config";

export default function MatchesPage() {
  return (
    <RequireAuth>
      <MatchesContent />
    </RequireAuth>
  );
}

function MatchesContent() {
  const [matches, setMatches] = useState<Match[]>([]);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb
      .from("matches")
      .select("*")
      .order("match_date", { ascending: false });
    setMatches((data ?? []) as Match[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Thống kê thắng / hòa / thua
  const completed = matches.filter(
    (m) => m.is_completed && m.home_score != null && m.opponent_score != null
  );
  const wins = completed.filter(
    (m) => (m.home_score as number) > (m.opponent_score as number)
  ).length;
  const draws = completed.filter(
    (m) => (m.home_score as number) === (m.opponent_score as number)
  ).length;
  const losses = completed.filter(
    (m) => (m.home_score as number) < (m.opponent_score as number)
  ).length;

  return (
    <div className="space-y-4">
      {/* Bảng thành tích */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-0 text-white">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-300 text-center">
          Thành tích {TEAM_NAME}
        </p>
        <div className="grid grid-cols-4 gap-2 mt-3 text-center">
          <div className="bg-white/10 rounded-xl py-2.5">
            <p className="text-xl font-black text-white">{completed.length}</p>
            <p className="text-[10px] font-bold text-slate-300 uppercase">Trận</p>
          </div>
          <div className="bg-emerald-500/20 rounded-xl py-2.5">
            <p className="text-xl font-black text-emerald-400 flex items-center justify-center gap-1">
              <Trophy className="w-4 h-4" /> {wins}
            </p>
            <p className="text-[10px] font-bold text-emerald-300 uppercase">Thắng</p>
          </div>
          <div className="bg-slate-500/20 rounded-xl py-2.5">
            <p className="text-xl font-black text-slate-300 flex items-center justify-center gap-1">
              <Minus className="w-4 h-4" /> {draws}
            </p>
            <p className="text-[10px] font-bold text-slate-300 uppercase">Hòa</p>
          </div>
          <div className="bg-rose-500/20 rounded-xl py-2.5">
            <p className="text-xl font-black text-rose-400 flex items-center justify-center gap-1">
              <XCircle className="w-4 h-4" /> {losses}
            </p>
            <p className="text-[10px] font-bold text-rose-300 uppercase">Thua</p>
          </div>
        </div>
      </Card>

      {/* Danh sách trận */}
      {matches.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarClock className="w-6 h-6" />}
            title="Chưa có trận đấu nào"
            sub="Quản trị viên sẽ lên lịch trận đấu mới."
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {matches.map((m) => {
            const jersey = m.jersey_color ? JERSEY_COLORS[m.jersey_color] : null;
            return (
              <Card key={m.id} className="!p-3.5">
                <div className="flex items-center gap-3">
                  {jersey && (
                    <span
                      className={`w-10 h-10 rounded-xl ${jersey.cls} shadow flex items-center justify-center shrink-0`}
                    >
                      <CalendarClock className="w-5 h-5 text-white/80" />
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-extrabold text-slate-800 truncate">
                        {TEAM_NAME} <span className="text-slate-300">vs</span>{" "}
                        {m.opponent}
                      </p>
                      {m.is_completed && m.home_score != null ? (
                        <span
                          className={`text-base font-black shrink-0 ${
                            (m.home_score as number) > (m.opponent_score as number)
                              ? "text-emerald-600"
                              : (m.home_score as number) === (m.opponent_score as number)
                                ? "text-slate-500"
                                : "text-rose-600"
                          }`}
                        >
                          {m.home_score} - {m.opponent_score}
                        </span>
                      ) : (
                        <Badge color="sky">Sắp đá</Badge>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                      {formatMatchDateVN(m.match_date)}
                    </p>
                    {m.location && (
                      <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{m.location}</span>
                      </p>
                    )}
                  </div>
                </div>

                {(m.location_map_url || m.estimated_cost > 0) && (
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100">
                    {m.location_map_url && (
                      <a
                        href={m.location_map_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] font-extrabold text-blue-600"
                      >
                        <Map className="w-3.5 h-3.5" /> Bản đồ
                      </a>
                    )}
                    {m.estimated_cost > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 ml-auto">
                        <Wallet className="w-3.5 h-3.5 text-slate-400" />
                        {formatVND(Number(m.estimated_cost))}
                      </span>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
