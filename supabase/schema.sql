-- ============================================================
--  SCHEMA CSDL - ỨNG DỤNG QUẢN LÝ ĐỘI BÓNG PHONG TRÀO
--  Chạy file này trong Supabase Dashboard -> SQL Editor
--  (chạy 1 lần khi mới tạo project)
-- ============================================================

-- ---------- 1. BẢNG HỒ SƠ THÀNH VIÊN ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  nickname text,
  jersey_number int,
  role text not null default 'member' check (role in ('admin', 'member')),
  phone text,
  position text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- 2. PHIÊN ĐIỂM DANH ----------
create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null,
  session_type text not null default 'practice' check (session_type in ('practice', 'match', 'other')),
  title text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'present' check (status in ('present', 'late', 'absent', 'leave')),
  note text,
  marked_at timestamptz not null default now(),
  unique (session_id, member_id)
);

create index if not exists idx_att_records_member on public.attendance_records(member_id);
create index if not exists idx_att_records_session on public.attendance_records(session_id);

-- ---------- 3. QUỸ ĐỘI ----------
create table if not exists public.fund_transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income', 'expense')),
  amount numeric(14,2) not null check (amount > 0),
  category text not null,
  description text,
  member_id uuid references public.profiles(id) on delete set null,
  transaction_date date not null default current_date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_fund_date on public.fund_transactions(transaction_date desc);

-- ---------- 4. CÔNG NỢ NỘI BỘ ----------
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  borrower_id uuid not null references public.profiles(id) on delete cascade,
  lender_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  reason text,
  status text not null default 'active' check (status in ('active', 'paid')),
  paid_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint debts_no_self_debt check (borrower_id <> lender_id)
);

create index if not exists idx_debts_borrower on public.debts(borrower_id);
create index if not exists idx_debts_lender on public.debts(lender_id);

-- ---------- 5. SƠ ĐỒ CHIẾN THUẬT ----------
create table if not exists public.tactics_boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  formation text not null,
  players jsonb not null default '[]',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
--  HÀM TRỢ GIÚP: kiểm tra quyền admin
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

-- ============================================================
--  TỰ ĐỘNG TẠO HỒ SƠ KHI CÓ NGƯỜI DÙNG MỚI
--  (Người đăng ký ĐẦU TIÊN tự động thành ADMIN)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, nickname, jersey_number, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name',
             split_part(coalesce(new.email, 'ten'), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'nickname', ''),
    nullif(new.raw_user_meta_data ->> 'jersey_number', '')::int,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case
      when exists (select 1 from public.profiles where role = 'admin')
      then 'member'
      else 'admin'
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================
--  BẢO VỆ HỒ SƠ: thành viên không tự nâng quyền / tự tắt tài khoản
-- ============================================================
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Không ai (kể cả chính mình) được tự đổi role trừ admin
  if not public.is_admin()
     and (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
    raise exception 'Chỉ quản trị viên mới thay đổi được quyền / trạng thái tài khoản';
  end if;
  -- Không được tắt admin cuối cùng
  if new.is_active = false and old.is_active = true and old.role = 'admin'
     and (select count(*) from public.profiles where role = 'admin' and is_active) <= 1 then
    raise exception 'Không thể tắt quản trị viên cuối cùng';
  end if;
  -- Không được hạ quyền admin cuối cùng
  if new.role = 'member' and old.role = 'admin' and new.is_active
     and (select count(*) from public.profiles where role = 'admin' and is_active) <= 1 then
    raise exception 'Không thể hạ quyền quản trị viên cuối cùng';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_trg on public.profiles;
create trigger protect_profile_trg
before update on public.profiles
for each row execute function public.protect_profile_fields();

-- ============================================================
--  ROW LEVEL SECURITY (RLS) - BẢO MẬT THEO TÀI KHOẢN
-- ============================================================
alter table public.profiles enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.fund_transactions enable row level security;
alter table public.debts enable row level security;
alter table public.tactics_boards enable row level security;

-- ---------- PROFILES ----------
drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- ATTENDANCE SESSIONS ----------
drop policy if exists "sessions_read_all" on public.attendance_sessions;
create policy "sessions_read_all" on public.attendance_sessions
  for select to authenticated using (true);

drop policy if exists "sessions_admin_crud" on public.attendance_sessions;
create policy "sessions_admin_crud" on public.attendance_sessions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- ATTENDANCE RECORDS ----------
drop policy if exists "records_read_all" on public.attendance_records;
create policy "records_read_all" on public.attendance_records
  for select to authenticated using (true);

-- Thành viên tự điểm danh cho mình; admin điểm danh cho tất cả
drop policy if exists "records_insert_own_or_admin" on public.attendance_records;
create policy "records_insert_own_or_admin" on public.attendance_records
  for insert to authenticated
  with check (member_id = auth.uid() or public.is_admin());

drop policy if exists "records_update_own_or_admin" on public.attendance_records;
create policy "records_update_own_or_admin" on public.attendance_records
  for update to authenticated
  using (member_id = auth.uid() or public.is_admin())
  with check (member_id = auth.uid() or public.is_admin());

drop policy if exists "records_delete_admin" on public.attendance_records;
create policy "records_delete_admin" on public.attendance_records
  for delete to authenticated using (public.is_admin());

-- ---------- FUND ----------
drop policy if exists "fund_read_all" on public.fund_transactions;
create policy "fund_read_all" on public.fund_transactions
  for select to authenticated using (true);

drop policy if exists "fund_admin_crud" on public.fund_transactions;
create policy "fund_admin_crud" on public.fund_transactions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- DEBTS ----------
drop policy if exists "debts_read_all" on public.debts;
create policy "debts_read_all" on public.debts
  for select to authenticated using (true);

-- Chỉ người trong cuộc (hoặc admin) ghi công nợ
drop policy if exists "debts_insert_party" on public.debts;
create policy "debts_insert_party" on public.debts
  for insert to authenticated
  with check (auth.uid() in (borrower_id, lender_id) or public.is_admin());

drop policy if exists "debts_update_party" on public.debts;
create policy "debts_update_party" on public.debts
  for update to authenticated
  using (auth.uid() in (borrower_id, lender_id) or public.is_admin())
  with check (auth.uid() in (borrower_id, lender_id) or public.is_admin());

drop policy if exists "debts_delete_admin" on public.debts;
create policy "debts_delete_admin" on public.debts
  for delete to authenticated using (public.is_admin());

-- ---------- TACTICS ----------
drop policy if exists "tactics_read_all" on public.tactics_boards;
create policy "tactics_read_all" on public.tactics_boards
  for select to authenticated using (true);

drop policy if exists "tactics_admin_crud" on public.tactics_boards;
create policy "tactics_admin_crud" on public.tactics_boards
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================
--  XONG! 🎉
-- ============================================================
