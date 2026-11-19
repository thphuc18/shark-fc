"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, Button, Input, Select, Field, Modal, EmptyState } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { getSupabase } from "@/lib/supabase";
import type { FundTransaction, Profile, TxType } from "@/lib/types";
import { formatVND, todayISO } from "@/lib/format";

const INCOME_CATS = ["Góp quỹ", "Quyên góp", "Thưởng / Tài trợ", "Thu khác"];
const EXPENSE_CATS = ["Tiền sân", "Nước uống", "Thi đấu / Giải", "Dụng cụ tập", "Ăn uống", "Chi khác"];

function FundContent() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isAdmin = profile?.role === "admin";

  const [txs, setTxs] = useState<FundTransaction[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [show, setShow] = useState(false);
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATS[0]);
  const [memberId, setMemberId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    setLoading(true);
    const [t, m] = await Promise.all([
      sb.from("fund_transactions").select("*, profiles!fund_transactions_member_id_fkey(nickname, full_name, jersey_number)").order("transaction_date", { ascending: false }).order("created_at", { ascending: false }).limit(200),
      sb.from("profiles").select("*").eq("is_active", true).order("nickname"),
    ]);
    setTxs(t.data ?? []);
    setMembers(m.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const income = txs.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
  const balance = income - expense;

  // Nhóm theo tháng "MM/yyyy"
  const groups = txs.reduce<Record<string, FundTransaction[]>>((acc, t) => {
    const d = new Date(t.transaction_date + "T00:00:00");
    const key = d.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
    (acc[key] ??= []).push(t);
    return acc;
  }, {});

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast("Vui lòng nhập số tiền hợp lệ", "error");
      return;
    }
    setSaving(true);
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from("fund_transactions").insert({
      type,
      amount: amt,
      category,
      member_id: memberId || null,
      transaction_date: date,
      description: desc.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast("Không thể lưu giao dịch: " + error.message, "error");
      return;
    }
    toast("Đã ghi giao dịch!");
    setShow(false);
    setAmount("");
    setDesc("");
    setMemberId("");
    await load();
  }

  return (
    <div className="space-y-4">
      {/* Balance card */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg shadow-emerald-600/20">
        <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold">
          <Wallet className="w-4 h-4" /> Số dư quỹ đội
        </div>
        <p className="text-3xl font-extrabold mt-1.5 tracking-tight">{formatVND(balance)}</p>
        <div className="flex gap-4 mt-4 text-[11px] font-bold">
          <span className="flex items-center gap-1 bg-white/15 rounded-lg px-2 py-1">
            <ArrowDownLeft className="w-3.5 h-3.5" /> Thu: {formatVND(income)}
          </span>
          <span className="flex items-center gap-1 bg-white/15 rounded-lg px-2 py-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Chi: {formatVND(expense)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold text-slate-800">Giao dịch</h2>
        {isAdmin && (
          <Button onClick={() => setShow(true)} className="px-3 py-2 text-xs">
            <Plus className="w-4 h-4" /> Thu / Chi
          </Button>
        )}
      </div>

      {loading ? (
        <Card><EmptyState icon={<Wallet className="w-5 h-5" />} title="Đang tải..." /></Card>
      ) : txs.length === 0 ? (
        <Card><EmptyState icon={<Wallet className="w-5 h-5" />} title="Chưa có giao dịch" sub={isAdmin ? "Bấm 'Thu / Chi' để ghi giao dịch đầu tiên" : "Chờ admin ghi giao dịch"} /></Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groups).map(([month, list]) => (
            <div key={month}>
              <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 capitalize">{month}</h3>
              <Card className="divide-y divide-slate-100 p-0">
                {list.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.type === "income" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                      {t.type === "income" ? <ArrowDownLeft className="w-4.5 h-4.5" /> : <ArrowUpRight className="w-4.5 h-4.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{t.category}</p>
                      <p className="text-[11px] text-slate-400 font-medium truncate">
                        {t.profiles?.nickname || t.profiles?.full_name || ""}
                        {t.description ? ` · ${t.description}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-extrabold ${t.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                        {t.type === "income" ? "+" : "-"}{formatVND(t.amount)}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Date(t.transaction_date + "T00:00:00").toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Modal thu/chi */}
      <Modal open={show} onClose={() => setShow(false)} title="Ghi giao dịch quỹ">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setType("income"); setCategory(INCOME_CATS[0]); }}
              className={`py-2.5 rounded-xl text-sm font-extrabold border-2 transition ${type === "income" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-400"}`}
            >
              ↓ Thu
            </button>
            <button
              type="button"
              onClick={() => { setType("expense"); setCategory(EXPENSE_CATS[0]); }}
              className={`py-2.5 rounded-xl text-sm font-extrabold border-2 transition ${type === "expense" ? "border-rose-500 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-400"}`}
            >
              ↑ Chi
            </button>
          </div>
          <Field label="Số tiền (VNĐ)">
            <Input type="number" min={0} step={500} required placeholder="500000" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Danh mục">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {(type === "income" ? INCOME_CATS : EXPENSE_CATS).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Người liên quan (tuỳ chọn)">
            <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">— Không —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.nickname || m.full_name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Ngày">
            <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Ghi chú">
            <Input placeholder="VD: Góp quỹ tháng 11" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </Field>
          <Button type="submit" variant={type === "income" ? "success" : "primary"} loading={saving} className="w-full">
            Lưu giao dịch
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export default function FundPage() {
  return (
    <RequireAuth>
      <Shell>
        <FundContent />
      </Shell>
    </RequireAuth>
  );
}
