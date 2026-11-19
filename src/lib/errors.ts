// ===== THÔNG BÁO LỖI TIẾNG VIỆT =====
// Chuyển lỗi kỹ thuật từ Supabase/PostgREST thành thông báo dễ hiểu cho người dùng

export function friendlyError(
  error: { message?: string; code?: string } | null | undefined,
  fallback = "Thao tác thất bại. Vui lòng thử lại."
): string {
  const msg = (error?.message || "").toLowerCase();
  const code = (error?.code || "").toLowerCase();
  const all = `${code} ${msg}`;

  // Lỗi mạng
  if (/fetch|network|timeout|econn|load failed|failed to load/.test(all))
    return "Không kết nối được máy chủ. Kiểm tra mạng của bạn rồi thử lại.";
  // Phiên đăng nhập hết hạn
  if (/jwt|token expired|not authorized|invalid claim/.test(all))
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  // Quyền (row-level security)
  if (/row-level security|policy|permission denied/.test(all))
    return "Bạn không có quyền thực hiện thao tác này.";
  // Ràng buộc dữ liệu
  if (/not-null constraint/.test(all))
    return "Thiếu thông tin bắt buộc. Vui lòng kiểm tra lại.";
  if (/unique constraint/.test(all))
    return "Dữ liệu này đã tồn tại, không thể tạo trùng.";
  if (/foreign key/.test(all))
    return "Dữ liệu liên quan không hợp lệ.";
  if (/does not exist/.test(all))
    return "Hệ thống đang thiếu dữ liệu nền tảng. Vui lòng liên hệ quản trị viên.";
  // Lỗi đăng nhập / đăng ký
  if (/invalid login credentials|invalid_credentials/.test(all))
    return "Tài khoản hoặc mật khẩu không đúng.";
  if (/already registered|user already exists/.test(all))
    return "Tên tài khoản này đã được đăng ký. Hãy đăng nhập.";
  if (/at least 6|password_weak|password to be at least/.test(all))
    return "Mật khẩu phải có ít nhất 6 ký tự.";
  if (/email_address_invalid|is invalid|invalid email/.test(all))
    return "Tên tài khoản không hợp lệ. Chỉ dùng chữ thường, số và dấu . _ -";
  if (/rate limit|rate_limit|too many requests/.test(all))
    return "Bạn thử quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.";
  if (/email not confirmed/.test(all))
    return "Tài khoản chưa xác nhận email. Kiểm tra hộp thư của bạn.";
  if (/otp/.test(all))
    return "Mã xác nhận không đúng hoặc đã hết hạn.";
  if (/user not found/.test(all))
    return "Không tìm thấy tài khoản này.";
  if (/password does not match/.test(all))
    return "Mật khẩu hiện tại không đúng.";
  if (/disabled/.test(all))
    return "Tính năng đang tạm khóa. Vui lòng liên hệ quản trị viên.";

  // Không nhận diện được: in ra console để debug, trả về thông báo chung
  if (error?.message) console.error("[shark-fc] raw error:", error);
  return fallback;
}
