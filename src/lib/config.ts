// ===== CẤU HÌNH ĐỘI BÓNG =====
// Đổi tên đội của bạn tại đây (chỉ cần sửa 1 dòng này)
export const TEAM_NAME = "SHARK FC";
export const TAGLINE = "Quản lý đội bóng phong trào";

// ===== ĐĂNG NHẬP BẰNG TÊN TÀI KHOẢN =====
// Supabase bắt buộc định danh bằng email, nên app tự ghép
// "tên_tài_khoản@sharkfc.app" ở bên trong — người dùng chỉ cần nhập tên.
export const AUTH_EMAIL_DOMAIN = "sharkfc.app";

/** Biến tên tài khoản thành email định danh nội bộ */
export function authEmailFor(username: string): string {
  return `${username.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}
