// ===== HỖ TRỢ ĐỊNH DẠNG + THÔNG TIN ĐỘI BÓNG =====

import type { LineupPosition, PreferredFoot, Profile } from "./types";

/** Định dạng tiền Việt Nam: 500000 -> "500.000đ" */
export function formatVND(n: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Ngày dạng yyyy-mm-dd -> "T4, 19/11" */
export function formatDateVN(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

/** Ngày đầy đủ: "Thứ Năm, 19/11/2026" */
export function formatDateFullVN(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** ISO timestamptz (trận đấu) -> "T4, 19/11, 19:30" */
export function formatMatchDateVN(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  const time = d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}, ${time}`;
}

/** yyyy-mm-dd HH:MM (cho input datetime-local) từ Date */
export function toLocalInputValue(d: Date): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

/** "ngay hom nay" / "mai" / "hôm qua" so với ngày hiện tại */
export function relativeDayVN(iso: string): string | null {
  const today = todayISO();
  if (iso === today) return "Hôm nay";
  const d = new Date(iso + "T00:00:00");
  const t = new Date(today + "T00:00:00");
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000);
  if (diff === 1) return "Ngày mai";
  if (diff === -1) return "Hôm qua";
  return null;
}

/** Số ngày tới sinh nhật kế tiếp (tính theo tháng-ngày, 0 = hôm nay) */
export function daysToBirthday(birthISO: string | null): number | null {
  if (!birthISO) return null;
  const b = new Date(birthISO + "T00:00:00");
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  const thisYear = new Date(now.getFullYear(), b.getMonth(), b.getDate());
  if (thisYear < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    thisYear.setFullYear(now.getFullYear() + 1);
  }
  return Math.round((thisYear.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
}

/** Tuổi từ ngày sinh */
export function ageFromBirthday(birthISO: string | null): number | null {
  if (!birthISO) return null;
  const b = new Date(birthISO + "T00:00:00");
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

// ===== THÔNG TIN BÓNG ĐÁ =====

/** Màu áo trận đấu */
export const JERSEY_COLORS: Record<string, { label: string; cls: string }> = {
  red: { label: "Đỏ", cls: "bg-red-500" },
  blue: { label: "Xanh dương", cls: "bg-blue-500" },
  white: { label: "Trắng", cls: "bg-slate-100 border border-slate-300" },
  yellow: { label: "Vàng", cls: "bg-yellow-400" },
  green: { label: "Xanh lá", cls: "bg-green-500" },
  black: { label: "Đen", cls: "bg-slate-900" },
  orange: { label: "Cam", cls: "bg-orange-500" },
};

/** Chân thuận */
export const FOOT_LABEL: Record<PreferredFoot, string> = {
  right: "Chân phải",
  left: "Chân trái",
  both: "Cả hai chân",
};

/** Vị trí trên sân */
export const POSITION_LABEL: Record<LineupPosition, string> = {
  GK: "Thủ môn",
  DF: "Hậu vệ",
  MF: "Tiền vệ",
  FW: "Tiền đạo",
  SUB: "Dự bị",
};

/** Chỉ số tổng (trung bình các chỉ số FIFA) */
export function overallRating(p: Pick<Profile, "pace" | "stamina" | "shooting" | "passing" | "dribbling">): number {
  return Math.round((p.pace + p.stamina + p.shooting + p.passing + p.dribbling) / 5);
}

/** Màu nền cho chỉ số tổng */
export function ratingColor(ovr: number): string {
  if (ovr >= 80) return "bg-emerald-500";
  if (ovr >= 65) return "bg-blue-500";
  if (ovr >= 50) return "bg-amber-500";
  return "bg-slate-400";
}

// ===== AVATAR =====

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-orange-500",
];

/** Chữ cái đầu cho avatar */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + charCodeSafe(name, i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function charCodeSafe(s: string, i: number): number {
  return s.charCodeAt(i) || 0;
}

/** Ảnh đại diện mặc định kiểu nhân vật (đúng như site gốc) */
export function dicebearUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
}

/** Nguồn ảnh cho hồ sơ: avatar_url hoặc sinh từ tên */
export function avatarSrc(p: Pick<Profile, "avatar_url" | "full_name"> & {
  display_name?: string | null;
}): string {
  return p.avatar_url || dicebearUrl(p.display_name || p.full_name);
}

/** Tên hiển thị ưu tiên biệt danh */
export function displayName(p: Pick<Profile, "full_name" | "display_name">): string {
  return p.display_name || p.full_name;
}
