export type Role = "admin" | "member";

export interface Profile {
  id: string;
  full_name: string;
  nickname: string | null;
  jersey_number: number | null;
  role: Role;
  phone: string | null;
  position: string | null;
  is_active: boolean;
  created_at: string;
}

export type SessionType = "practice" | "match" | "other";

export interface AttendanceSession {
  id: string;
  session_date: string; // yyyy-mm-dd
  session_type: SessionType;
  title: string | null;
  created_at: string;
}

export type MarkStatus = "present" | "late" | "absent" | "leave";

export interface AttendanceRecord {
  id: string;
  session_id: string;
  member_id: string;
  status: MarkStatus;
  note: string | null;
  marked_at: string;
}

export type TxType = "income" | "expense";

export interface FundTransaction {
  id: string;
  type: TxType;
  amount: number;
  category: string;
  description: string | null;
  member_id: string | null;
  transaction_date: string; // yyyy-mm-dd
  created_at: string;
  profiles?: Pick<Profile, "nickname" | "full_name" | "jersey_number"> | null;
}

export type DebtStatus = "active" | "paid";

export interface Debt {
  id: string;
  borrower_id: string;
  lender_id: string;
  amount: number;
  reason: string | null;
  status: DebtStatus;
  paid_at: string | null;
  created_at: string;
  borrower?: Pick<Profile, "nickname" | "full_name" | "jersey_number"> | null;
  lender?: Pick<Profile, "nickname" | "full_name" | "jersey_number"> | null;
}

export interface TacticsBoard {
  id: string;
  name: string;
  formation: string;
  players: { slot: number; member_id: string | null }[];
  created_by: string | null;
  created_at: string;
}
