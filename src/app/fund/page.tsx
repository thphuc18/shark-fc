"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Pencil,
  Trash2,
  Plus,
  CheckCircle2,
  XCircle,
  HandCoins,
  RotateCcw,
  PartyPopper,
} from "lucide-react";
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
  FundTransaction,
  PlayerDebt,
  Profile,
  TxType,
  DebtStatus,
} from "@/lib/types";
import { formatVND, formatDateVN, todayISO, displayName } from "@/lib/format";

const DEBT_STATUS_UI: Record<DebtStatus, { label: string; color: "amber" | "sky" | "emerald" | "red" }> = {
  unpaid: { label: "Chưa trả", color: "amber" },
  pending: { label: "Chờ duyệt", color: "sky" },
  paid: { label: "Đã trả", color: "emerald" },
  rejected: { label: "Từ chối", color: "red" },
};

export default function FundPage() {
  return (
    <RequireAuth>
      <FundContent />
    </RequireAuth>
  );
}

type Tab = "fund" | "debt";

function FundContent() {
  const [tab, setTab] = useState<Tab>("fund");

  return (
    <div className="space-y-4">
      {/* Tab switch */}
      <div className="grid grid-cols-2 gap-1 bg-slate-200/70 rounded-2xl p-1">
        {(
          [
            { id: "fund", label: "Nhật Ký Thu/Chi" },
            { id: "debt", label: "Bảng Theo Dõi Nợ" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-2.5 rounded-xl text-xs font-extrabold transition ${
              tab === t.id
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "fund" ? <FundTab /> : <DebtTab />}
    </div>
  );
}

// ============================================================
//  TAB 1: NHẬT KÝ THU/CHI
// ============================================================
function FundTab() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isAdmin = profile?.role === "admin";

  const [txs, setTxs] = useState<FundTransaction[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [balance, setBalance] = useState(0);

  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; tx: FundTransaction } | null>(null);
  const [form, setForm] = useState({
    type: "income" as TxType,
    amount: "",
    description: "",
    date: todayISO(),
    member_id: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const [tx, mem] = await Promise.all([
      sb
        .from("fund_transactions")
        .select("*, profiles(username, full_name, display_name, jersey_number)")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false }),
      sb.from("profiles").select("*").eq("status", "active").eq("is_active", true),
    ]);
    setTxs((tx.data ?? []) as unknown as FundTransaction[]);
    setMembers(((mem.data ?? []) as Profile[]).sort((a, b) => (a.jersey_number ?? 999) - (b.jersey_number ?? 999)));
    const inc = (tx.data ?? []).filter((t) => t.type === "income").reduce((a, t) => a + Number(t.amount), 0);
    const exp = (tx.data ?? []).filter((t) => t.type === "expense").reduce((a, t) => a + Number(t.amount), 0);
    setBalance(inc - exp);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm({ type: "income", amount: "", description: "", date: todayISO(), member_id: "" });
    setModal({ mode: "create" });
  }

  function openEdit(tx: FundTransaction) {
    setForm({
      type: tx.type,
      amount: String(tx.amount),
      description: tx.description ?? "",
      date: tx.transaction_date,
      member_id: tx.member_id ?? "",
    });
    setModal({ mode: "edit", tx });
  }

  async function saveTx(e: React.FormEvent) {
    e.preventDefault();
    if (!modal) return;
    const sb = getSupabase();
    if (!sb || !profile) return;
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      toast("Số tiền phải lớn hơn 0", "error");
      return;
    }
    setSaving(true);
    const payload = {
      type: form.type,
      amount,
      description: form.description.trim() || null,
      transaction_date: form.date,
      member_id: form.member_id || null,
    };
    const { error } =
      modal.mode === "create"
        ? await sb
            .from("fund_transactions")
            .insert({ ...payload, created_by: profile.id })
        : await sb.from("fund_transactions").update(payload).eq("id", modal.tx.id);
    setSaving(false);
    if (error) {
      toast(friendlyError(error), "error");
      return;
    }
    setModal(null);
    toast(modal.mode === "create" ? "Đã ghi thu/chi" : "Đã cập nhật");
    load();
  }

  async function deleteTx(id: string) {
    const sb = getSupabase();
    if (!sb) return;
    if (!confirm("Xóa mục thu/chi này?")) return;
    const { error } = await sb.from("fund_transactions").delete().eq("id", id);
    if (error) {
      toast(friendlyError(error), "error");
      return;
    }
    toast("Đã xóa");
    load();
  }

  return (
    <>
      {/* Số dư */}
      <Card className="bg-gradient-to-br from-blue-600 to-cyan-600 border-0 text-white">
        <p className="text-[11px] font-bold uppercase tracking-wide text-blue-100">Số dư quỹ đội</p>
        <p className="text-3xl font-extrabold mt-1">{formatVND(balance)}</p>
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-bold">
          <div className="bg-white/15 rounded-xl px-3 py-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-300" />
            Thu: {formatVND(txs.filter((t) => t.type === "income").reduce((a, t) => a + Number(t.amount), 0))}
          </div>
          <div className="bg-white/15 rounded-xl px-3 py-2 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-rose-300" />
            Chi: {formatVND(txs.filter((t) => t.type === "expense").reduce((a, t) => a + Number(t.amount), 0))}
          </div>
        </div>
      </Card>

      {isAdmin && (
        <Button onClick={openCreate} className="w-full py-3">
          <Plus className="w-4 h-4" /> Nhập thu / chi mới
        </Button>
      )}

      {/* Danh sách */}
      {txs.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet className="w-6 h-6" />}
            title="Chưa có giao dịch nào"
            sub="Mọi khoản thu chi của đội sẽ hiển thị ở đây."
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {txs.map((t) => (
            <Card key={t.id} className="flex items-center gap-3 !p-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  t.type === "income"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-600"
                }`}
              >
                {t.type === "income" ? <TrendingUp className="w-4.5 h-4.5" /> : <TrendingDown className="w-4.5 h-4.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-slate-700 truncate">
                  {t.description || (t.type === "income" ? "Thu" : "Chi")}
                </p>
                <p className="text-[11px] font-semibold text-slate-400">
                  {formatDateVN(t.transaction_date)}
                  {t.profiles && ` · ${displayName(t.profiles)}`}
                </p>
              </div>
              <span
                className={`text-sm font-extrabold ${
                  t.type === "income" ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {t.type === "income" ? "+" : "-"}
                {formatVND(Number(t.amount))}
              </span>
              {isAdmin && (
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(t)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteTx(t.id)}
                    className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal nhập thu/chi */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? "Chỉnh sửa thu/chi" : "Nhập thu / chi mới"}
      >
        <form onSubmit={saveTx} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: "income" }))}
              className={`py-3 rounded-xl text-sm font-extrabold border-2 transition ${
                form.type === "income"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 text-slate-500"
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-1" /> Thu
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: "expense" }))}
              className={`py-3 rounded-xl text-sm font-extrabold border-2 transition ${
                form.type === "expense"
                  ? "border-rose-500 bg-rose-50 text-rose-700"
                  : "border-slate-200 text-slate-500"
              }`}
            >
              <TrendingDown className="w-4 h-4 inline mr-1" /> Chi
            </button>
          </div>
          <Field label="Số tiền *">
            <Input
              type="number"
              min={0}
              step={1000}
              required
              placeholder="100000"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </Field>
          <Field label="Mô tả">
            <Input
              placeholder="vd: Thu quỹ tháng 11, mua nước đá..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ngày">
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </Field>
            <Field label="Người chịu trách nhiệm">
              <Select
                value={form.member_id}
                onChange={(e) => setForm((f) => ({ ...f, member_id: e.target.value }))}
              >
                <option value="">—</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {displayName(m)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Button type="submit" loading={saving} className="w-full py-3">
            Lưu
          </Button>
        </form>
      </Modal>
    </>
  );
}

// ============================================================
//  TAB 2: BẢNG THEO DÕI NỢ
// ============================================================
function DebtTab() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isAdmin = profile?.role === "admin";

  const [debts, setDebts] = useState<PlayerDebt[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);

  // Form ghi nợ mới
  const [modalOpen, setModalOpen] = useState(false);
  const [selPlayers, setSelPlayers] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const [d, mem] = await Promise.all([
      sb
        .from("player_debts")
        .select("*, profiles(username, full_name, display_name, avatar_url, jersey_number)")
        .order("created_at", { ascending: false }),
      sb.from("profiles").select("*").eq("status", "active").eq("is_active", true),
    ]);
    setDebts((d.data ?? []) as unknown as PlayerDebt[]);
    setMembers(((mem.data ?? []) as Profile[]).sort((a, b) => (a.jersey_number ?? 999) - (b.jersey_number ?? 999)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDebts = debts.filter((d) => d.status === "unpaid" || d.status === "pending");
  const doneDebts = debts.filter((d) => d.status === "paid" || d.status === "rejected");
  const totalDebt = openDebts
    .filter((d) => d.status === "unpaid")
    .reduce((a, d) => a + Number(d.amount), 0);

  function togglePlayer(id: string) {
    setSelPlayers((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function createDebts(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb || !profile) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast("Số tiền phải lớn hơn 0", "error");
      return;
    }
    if (selPlayers.length === 0) {
      toast("Hãy chọn ít nhất 1 cầu thủ", "error");
      return;
    }
    setSaving(true);
    const rows = selPlayers.map((player_id) => ({
      player_id,
      amount: amt,
      description: description.trim() || null,
      status: "unpaid" as DebtStatus,
      created_by: profile.id,
    }));
    const { error } = await sb.from("player_debts").insert(rows);
    setSaving(false);
    if (error) {
      toast(friendlyError(error), "error");
      return;
    }
    setModalOpen(false);
    setSelPlayers([]);
    setAmount("");
    setDescription("");
    toast(`Đã ghi nợ cho ${rows.length} cầu thủ`);
    load();
  }

  async function setDebtStatus(debt: PlayerDebt, status: DebtStatus) {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb
      .from("player_debts")
      .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null })
      .eq("id", debt.id);
    if (error) {
      toast(friendlyError(error), "error");
      return;
    }
    toast("Đã cập nhật");
    load();
  }

  async function deleteDebt(id: string) {
    const sb = getSupabase();
    if (!sb) return;
    if (!confirm("Xóa khoản nợ này?")) return;
    const { error } = await sb.from("player_debts").delete().eq("id", id);
    if (error) {
      toast(friendlyError(error), "error");
      return;
    }
    toast("Đã xóa");
    load();
  }

  return (
    <>
      {/* Tổng công nợ */}
      <Card className="bg-gradient-to-br from-amber-500 to-orange-500 border-0 text-white">
        <p className="text-[11px] font-bold uppercase tracking-wide text-amber-100">Tổng công nợ chưa thanh toán</p>
        <p className="text-3xl font-extrabold mt-1">{formatVND(totalDebt)}</p>
        <p className="text-[11px] font-bold text-amber-100 mt-1">
          {openDebts.length} khoản đang chờ · {doneDebts.length} khoản đã xong
        </p>
      </Card>

      {isAdmin && (
        <Button
          variant="outline"
          onClick={() => setModalOpen(true)}
          className="w-full py-3 border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          <HandCoins className="w-4 h-4" /> Ghi nợ mới cho cầu thủ
        </Button>
      )}

      {openDebts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<PartyPopper className="w-6 h-6" />}
            title="Chúc mừng! Không có công nợ nào chưa thanh toán. 🌟"
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {openDebts.map((d) => {
            const mine = d.player_id === profile?.id;
            return (
              <Card key={d.id} className="!p-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-extrabold shrink-0">
                    {d.profiles?.jersey_number ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-slate-700 truncate">
                      {d.profiles ? displayName(d.profiles) : "?"}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400 truncate">
                      {d.description || "Công nợ"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-rose-600">{formatVND(Number(d.amount))}</p>
                    <Badge color={DEBT_STATUS_UI[d.status].color}>{DEBT_STATUS_UI[d.status].label}</Badge>
                  </div>
                </div>

                {/* Hành động */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {mine && d.status === "unpaid" && (
                    <Button
                      variant="success"
                      className="!px-3 !py-1.5 !text-[11px]"
                      onClick={() => setDebtStatus(d, "pending")}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Báo đã trả
                    </Button>
                  )}
                  {isAdmin && d.status === "pending" && (
                    <>
                      <Button
                        variant="success"
                        className="!px-3 !py-1.5 !text-[11px]"
                        onClick={() => setDebtStatus(d, "paid")}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Phê duyệt
                      </Button>
                      <Button
                        variant="danger"
                        className="!px-3 !py-1.5 !text-[11px]"
                        onClick={() => setDebtStatus(d, "rejected")}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Từ chối
                      </Button>
                    </>
                  )}
                  {isAdmin && d.status === "unpaid" && (
                    <Button
                      variant="outline"
                      className="!px-3 !py-1.5 !text-[11px]"
                      onClick={() => setDebtStatus(d, "paid")}
                    >
                      <HandCoins className="w-3.5 h-3.5" /> Đã trả trực tiếp
                    </Button>
                  )}
                  {isAdmin && (d.status === "paid" || d.status === "rejected") && (
                    <Button
                      variant="outline"
                      className="!px-3 !py-1.5 !text-[11px]"
                      onClick={() => setDebtStatus(d, "unpaid")}
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Đặt lại chưa trả
                    </Button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => deleteDebt(d.id)}
                      className="ml-auto w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Đã thanh toán */}
      {doneDebts.length > 0 && (
        <>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 pt-2">
            Đã thanh toán / xử lý
          </p>
          <div className="space-y-2 opacity-70">
            {doneDebts.map((d) => (
              <Card key={d.id} className="flex items-center gap-3 !p-3">
                <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center text-[11px] font-extrabold shrink-0">
                  {d.profiles?.jersey_number ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-500 truncate">
                    {d.profiles ? displayName(d.profiles) : "?"}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400 truncate">{d.description || "Công nợ"}</p>
                </div>
                <span className="text-xs font-extrabold text-slate-400">{formatVND(Number(d.amount))}</span>
                <Badge color={DEBT_STATUS_UI[d.status].color}>{DEBT_STATUS_UI[d.status].label}</Badge>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Modal ghi nợ mới */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Ghi nợ mới cho cầu thủ">
        <form onSubmit={createDebts} className="space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Chọn cầu thủ (bấm để chọn / bỏ chọn)
            </p>
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setSelPlayers(members.map((m) => m.id))}
                className="text-[11px] font-extrabold text-blue-600"
              >
                Chọn tất cả
              </button>
              <button
                type="button"
                onClick={() => setSelPlayers([])}
                className="text-[11px] font-extrabold text-slate-400"
              >
                Bỏ chọn
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {members.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => togglePlayer(m.id)}
                  className={`px-2.5 py-1.5 rounded-full text-[11px] font-extrabold border transition ${
                    selPlayers.includes(m.id)
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {m.jersey_number != null && `#${m.jersey_number} `}
                  {displayName(m)}
                </button>
              ))}
            </div>
          </div>
          <Field label="Số tiền mỗi người *">
            <Input
              type="number"
              min={0}
              step={1000}
              required
              placeholder="50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Lý do">
            <Input
              placeholder="vd: Quỹ tháng 11, tiền đá sân..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Button type="submit" loading={saving} className="w-full py-3">
            Ghi nợ
          </Button>
        </form>
      </Modal>
    </>
  );
}
