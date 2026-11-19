# ⚽ Ứng Dụng Quản Lý Đội Bóng Phong Trào

Ứng dụng web di động-first quản lý CLB bóng đá: **điểm danh · quỹ đội · công nợ nội bộ · sơ đồ chiến thuật · quản trị thành viên**. Dữ liệu lưu trên **Supabase** (Postgres + Auth + RLS), chạy trên **Next.js 15**.

> Đổi tên đội: sửa 1 dòng trong [`src/lib/config.ts`](src/lib/config.ts)

## Tính năng

| Trang | Đường dẫn | Quyền |
|---|---|---|
| Trang chủ | `/` | Thành viên |
| Điểm danh | `/attendance` | Thành viên (tự điểm danh) / Admin (tạo phiên, chấm tất cả) |
| Quỹ đội | `/fund` | Xem: tất cả · Thu/Chi: Admin |
| Công nợ | `/debts` | Xem: tất cả · Ghi: người trong cuộc · Xoá: Admin |
| Sơ đồ chiến thuật | `/tactics` | Xem: tất cả · Chỉnh sửa & lưu: Admin |
| Thành viên | `/members` | Xem: tất cả · Sửa/cấp quyền: Admin |
| Admin | `/admin` | Chỉ Admin |
| Hồ sơ cá nhân | `/profile` | Thành viên |

**Quy tắc đặc biệt:** người đăng ký đầu tiên tự động thành **Quản trị viên** (kịch bản SQL đã thiết lập sẵn).

---

## 🚀 BƯỚC 1 — Tạo Supabase (miễn phí, ~5 phút)

1. Vào [supabase.com](https://supabase.com) → **Start your project** → đăng ký.
2. **New project**: đặt tên, đặt mật khẩu DB, chọn region gần Việt Nam nhất (Singapore).
3. Chờ ~1 phút cho project sẵn sàng.
4. Mở **SQL Editor** (biểu tượng sổ bên trái) → dán toàn bộ nội dung file [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   → Chạy thành công nếu thấy `success`.
5. Vào **Authentication → Sign In / Providers → Email** → tắt **"Confirm email"** (để thành viên đăng ký là vào được ngay, không phải chờ bấm link email).
6. Lấy 2 chuỗi cấu hình: **Project Settings → API**:
   - `Project URL` (dạng `https://xxxx.supabase.co`)
   - `anon public key` (dạng `eyJhbGci...`)

## 🚀 BƯỚC 2 — Chạy local

```bash
npm install
copy .env.local.example .env.local   # (Windows) rồi điền 2 giá trị ở trên
npm run dev
```

Mở `http://localhost:3000` → **Đăng ký** tài khoản đầu tiên → bạn sẽ là **Admin**.

## 🚀 BƯỚC 3 — Deploy lên Vercel

1. Push code lên GitHub (tạo repo mới, `git push`).
2. Vào [vercel.com](https://vercel.com) → **Add New → Project** → chọn repo vừa push.
3. Framework mặc định nhận ra **Next.js** → **Deploy**.
4. Trước khi deploy, thêm 2 **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key
5. Bấm **Deploy** → xong! Share link cho cả đội.

Mỗi lần sửa code: `git add . && git commit -m "update" && git push` → Vercel tự build lại (~1 phút).

## 🔐 Bảo mật

- Toàn bộ dữ liệu được bảo vệ bằng **Row Level Security** của Postgres — ngay cả khi có API key, user không thể đọc/sửa gì vượt quyền.
- Thành viên **không thể** tự nâng quyền admin hoặc tắt tài khoản (trigger chặn ở DB).
- Không có admin nào bị xoá/khóa khi là admin cuối cùng.
- `anon key` là public key an toàn, chỉ truy cập được những gì RLS cho phép.

## 📝 Ghi chú vận hành

- **Thêm cầu thủ mới**: share link `https://ten-app.vercel.app/register` — tự tạo tài khoản, sau đó admin bấm vào thẻ thành viên để gán số áo/vị trí.
- **Đổi admin**: trong trang Thành viên, sửa quyền của người cũ thành "Thành viên" rồi nâng người mới (không được tắt admin cuối cùng).
- **Số dư quỹ** tính từ danh sách giao dịch (hiển thị 200 giao dịch gần nhất) — nếu đội hoạt động lâu năm vẫn chính xác vì quỹ là tổng thu − tổng chi.
