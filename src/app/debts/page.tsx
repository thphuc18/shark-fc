"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, ReceiptText, ChevronDown, ChevronUp } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, Button, Input, Select, Field, Modal, EmptyState, Badge } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { friendlyError } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase";
import type { Debt, Profile } from "@/lib/types";
import { formatVND } from "@/lib/format";

function DebtsContent() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const me = profile?.id;
  const isAdmin = profile?.role === "admin";

  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [showPaid, setShowPaid] = useState(false);

  const [borrower, setBorrower] = useState("");
  const [lender, setLender] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    setLoading(true);
    const { data } = await sb
      .from("debts")
      .select(
        "*, borrower:profiles!debts_borrower_id_fkey(id, full_name, nickname, jersey_number), lender:profiles!debts_lender_id_fkey(id, full_name, nickname, jersey_number)"
      )
      .order("created_at", { ascending: false })
      .limit(200);
    setDebts((data as Debt[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const all = debts;
  const active = all.filter((d) => d.status === "active");
  const paid = all.filter((d) => d.status === "paid");

  const iOwe = active.filter((d) => d.borrower_id === me).reduce((a, d) => a + d.amount, 0);
  const iGet = active.filter((d) => d.lender_id === me).reduce((a, d) => a + d.amount, 0);

  // Lấy danh sách thành viên từ debts? Không — cần profiles riêng
  const [members, setMembers] = useState<Profile[]>([]);
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.from("profiles").select("*").eq("is_active", true).order("nickname").then(({ data }) => setMembers(data ?? []));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast("Nhập số tiền hợp lệ", "error");
    if (!borrower || !lender) return toast("Chọn đủ người mượn và người cho", "error");
    if (borrower === lender) return toast("Hai người phải khác nhau", "error");
    setSaving(true);
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from("debts").insert({
      borrower_id: borrower,
      lender_id: lender,
      amount: amt,
      reason: reason.trim() || null,
    });
    setSaving(false);
    if (error) return toast("Không thể lưu: " + friendlyError(error), "error");
    toast("Đã ghi công nợ!");
    setShow(false);
    setAmount("");
    setReason("");
    setBorrower("");
    setLender("");
    await load();
  }

  async function handlePaid(d: Debt) {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb
      .from("debts")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", d.id);
    if (error) return toast("Không thể cập nhật: " + friendlyError(error), "error");
    toast("Đã thanh toán xong!");
    await load();
  }

  const canPay = (d: Debt) => isAdmin || d.borrower_id === me || d.lender_id === me;

  function DebtRow({ d }: { d: Debt }) {
    const b = d.borrower?.nickname || d.borrower?.full_name || "?";
    const l = d.lender?.nickname || d.lender?.full_name || "?";
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
          <ReceiptText className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">
            {b} <span className="text-slate-400 font-semibold">nợ</span> {l}
          </p>
          <p className="text-[11px] text-slate-400 font-medium truncate">
            {d.reason || "Không ghi chú"} ·{" "}
            {new Date(d.created_at).toLocaleDateString("vi-VN")}
          </p>
        </div>
        {d.status === "active" ? (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <p className="text-sm font-extrabold text-slate-800">{formatVND(d.amount)}</p>
            {canPay(d) && (
              <button
                onClick={() => handlePaid(d)}
                className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md"
              >
                Đã thanh toán
              </button>
            )}
          </div>
        ) : (
          <Badge color="slate">Đã trả</Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4">
          <p className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wide">Tôi phải trả</p>
          <p className="text-xl font-extrabold text-rose-700 mt-1">{formatVND(iOwe)}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
          <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wide">Tôi được nhận</p>
          <p className="text-xl font-extrabold text-emerald-700 mt-1">{formatVND(iGet)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold text-slate-800">Công nợ nội bộ</h2>
        <Button onClick={() => setShow(true)} className="px-3 py-2 text-xs">
          <Plus className="w-4 h-4" /> Ghi công nợ
        </Button>
      </div>

      {loading ? (
        <Card><EmptyState icon={<ReceiptText className="w-5 h-5" />} title="Đang tải..." /></Card>
      ) : (
        <>
          {active.length === 0 ? (
            <Card>
              <EmptyState icon={<ReceiptText className="w-5 h-5" />} title="Không còn công nợ" sub="Đội mình tài chính minh bạch quá! 🎉" />
            </Card>
          ) : (
            <Card className="divide-y divide-slate-100 p-0">
              {active.map((d) => (
                <DebtRow key={d.id} d={d} />
              ))}
            </Card>
          )}

          {paid.length > 0 && (
            <div>
              <button
                onClick={() => setShowPaid(!showPaid)}
                className="flex items-center gap-1 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2"
              >
                Đã thanh toán ({paid.length})
                {showPaid ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showPaid && (
                <Card className="divide-y divide-slate-100 p-0 opacity-75">
                  {paid.slice(0, 20).map((d) => (
                    <DebtRow key={d.id} d={d} />
                  ))}
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <Modal open={show} onClose={() => setShow(false)} title="Ghi công nợ mới">
        <form onSubmit={handleAdd} className="space-y-4">
          <Field label="Người mượn (nợ)">
            <Select value={borrower} onChange={(e) => setBorrower(e.target.value)} required>
              <option value="">— Chọn —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.nickname || m.full_name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Người cho (được nợ)">
            <Select value={lender} onChange={(e) => setLender(e.target.value)} required>
              <option value="">— Chọn —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.nickname || m.full_name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Số tiền (VNĐ)">
            <Input type="number" min={0} step={500} required placeholder="200000" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Lý do">
            <Input placeholder="VD: Mượn tiền mua nước" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Button type="submit" loading={saving} className="w-full">
            Lưu công nợ
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export default function DebtsPage() {
  return (
    <RequireAuth>
      <DebtsContent />
    </RequireAuth>
  );
}
