// ===== KIỂU DỮ LIỆU (schema v2 - giống site gốc) =====

export type Role = "admin" | "member";
export type MemberStatus = "pending" | "active" | "rejected";
export type PreferredFoot = "right" | "left" | "both";
export type LineupPosition = "GK" | "DF" | "MF" | "FW" | "SUB";

export interface Profile {
  id: string;
  username: string | null;
  full_name: string;
  display_name: string | null;
  avatar_url: string | null;
  birth_date: string | null; // yyyy-mm-dd
  jersey_number: number | null;
  preferred_foot: PreferredFoot | null;
  role: Role;
  status: MemberStatus;
  is_active: boolean;
  fun_title: string | null;
  coach_comment: string | null;
  pace: number;
  stamina: number;
  shooting: number;
  passing: number;
  dribbling: number;
  break_team: number;
  troll_count: number;
  matches_played: number;
  goals: number;
  assists: number;
  created_at: string;
}

export interface Match {
  id: string;
  match_date: string; // ISO timestamptz
  opponent: string;
  location: string | null;
  location_map_url: string | null;
  estimated_cost: number;
  jersey_color: string | null;
  is_completed: boolean;
  home_score: number | null;
  opponent_score: number | null;
  created_at: string;
}

export type AttendStatus = "attending" | "absent" | "undecided";

export interface MatchAttendee {
  id: string;
  match_id: string;
  player_id: string;
  status: AttendStatus;
  updated_at: string;
  profiles?: ProfileBrief | null;
}

export type TxType = "income" | "expense";

export interface FundTransaction {
  id: string;
  type: TxType;
  amount: number;
  description: string | null;
  member_id: string | null;
  transaction_date: string; // yyyy-mm-dd
  created_at: string;
  profiles?: ProfileBrief | null;
}

export type DebtStatus = "unpaid" | "pending" | "paid" | "rejected";

export interface PlayerDebt {
  id: string;
  player_id: string;
  amount: number;
  description: string | null;
  status: DebtStatus;
  paid_at: string | null;
  created_at: string;
  profiles?: ProfileBrief | null;
}

export interface LineupSlot {
  player_id: string;
  position: LineupPosition;
  profiles?: ProfileBrief | null;
}

export interface Trophy {
  id: string;
  player_id: string | null;
  icon: string;
  title: string;
  earned_on: string | null;
  description: string | null;
  created_at: string;
  profiles?: ProfileBrief | null;
}

export interface TeamPhoto {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
}

export type ProfileBrief = Pick<
  Profile,
  "username" | "full_name" | "display_name" | "avatar_url" | "jersey_number"
>;
