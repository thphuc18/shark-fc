-- ============================================================
--  SCHEMA CSDL v2 - ỨNG DỤNG QUẢN LÝ ĐỘI BÓNG PHONG TRÀO
--  Chạy file này trong Supabase Dashboard -> SQL Editor
--
--  Cấu trúc giống site gốc bao-thu-fc:
--  • profiles   : hồ sơ cầu thủ (FIFA stats, avatar, ngày sinh, chân thuận, duyệt tài khoản)
--  • matches    : trận đấu (ngày, đối thủ, địa điểm, màu áo, tỉ số)
--  • match_attendees : điểm danh từng trận (Tham gia / Vắng mặt / Chưa chắc)
--  • fund_transactions : quỹ đội (Thu / Chi)
--  • player_debts : công nợ của cầu thủ với quỹ (Chưa trả -> Báo đã trả -> Duyệt)
--  • lineups    : sơ đồ đội hình (GK/DF/MF/FW/SUB)
--  • trophies   : phòng truyền thống (huy chương vui)
--  • team_photos: ảnh khoảnh khắc
-- ============================================================

-- ---------- 0. XÓA BẢNG CŨ (phiên bản 1) ----------
drop table if exists public.trophies cascade;
drop table if exists public.team_photos cascade;
drop table if exists public.lineups cascade;
drop table if exists public.match_attendees cascade;
drop table if exists public.player_debts cascade;
drop table if exists public.matches cascade;
drop table if exists public.tactics_boards cascade;
drop table if exists public.attendance_records cascade;
drop table if exists public.attendance_sessions cascade;
drop table if exists public.debts cascade;
drop table if exists public.fund_transactions cascade;
drop table if exists public.profiles cascade;

-- ---------- 1. HỒ SƠ CẦU THỦ ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text not null,
  display_name text,
  avatar_url text,
  birth_date date,
  jersey_number int,
  preferred_foot text check (preferred_foot in ('right', 'left', 'both')),
  role text not null default 'member' check (role in ('admin', 'member')),
  -- pending: chờ admin duyệt | active: đã duyệt | rejected: bị từ chối
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected')),
  is_active boolean not null default true,
  -- "chức danh vui" & bình luận của HLV
  fun_title text,
  coach_comment text,
  -- chỉ số kiểu FIFA (0-99, admin chỉnh)
  pace int not null default 50,
  stamina int not null default 50,
  shooting int not null default 50,
  passing int not null default 50,
  dribbling int not null default 50,
  break_team int not null default 50,
  troll_count int not null default 0,
  -- thống kê tự động sau mỗi trận (admin nhập tỉ số & điểm)
  matches_played int not null default 0,
  goals int not null default 0,
  assists int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- 2. TRẬN ĐẤU ----------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  match_date timestamptz not null,
  opponent text not null,
  location text,
  location_map_url text,
  estimated_cost numeric(14,2) not null default 0,
  jersey_color text check (jersey_color in ('red', 'blue', 'white', 'yellow', 'green', 'black', 'orange')),
  is_completed boolean not null default false,
  home_score int,
  opponent_score int,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_matches_date on public.matches(match_date);

-- ---------- 3. ĐIỂM DANH TỪNG TRẬN ----------
create table public.match_attendees (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'attending' check (status in ('attending', 'absent', 'undecided')),
  updated_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create index if not exists idx_match_att_player on public.match_attendees(player_id);

-- ---------- 4. QUỸ ĐỘI (THU / CHI) ----------
create table public.fund_transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income', 'expense')),
  amount numeric(14,2) not null check (amount > 0),
  description text,
  member_id uuid references public.profiles(id) on delete set null,
  transaction_date date not null default current_date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_fund_date on public.fund_transactions(transaction_date desc);

-- ---------- 5. CÔNG NỢ CỦA CẦU THỦ VỚI QUỸ ----------
-- unpaid: chưa trả | pending: cầu thủ đã báo trả, chờ admin duyệt
-- paid: đã duyệt | rejected: admin từ chối thanh toán
create table public.player_debts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  description text,
  status text not null default 'unpaid' check (status in ('unpaid', 'pending', 'paid', 'rejected')),
  paid_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pdebts_player on public.player_debts(player_id);

-- ---------- 6. SƠ ĐỒ ĐỘI HÌNH ----------
create table public.lineups (
  player_id uuid primary key references public.profiles(id) on delete cascade,
  position text not null default 'SUB' check (position in ('GK', 'DF', 'MF', 'FW', 'SUB')),
  updated_at timestamptz not null default now()
);

-- ---------- 7. PHÒNG TRUYỀN THỐNG (HUỶ CHƯƠNG VUI) ----------
create table public.trophies (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.profiles(id) on delete cascade,
  icon text not null default '🏆',
  title text not null,
  earned_on date,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_trophies_player on public.trophies(player_id);

-- ---------- 8. ẢNH KHOẢNH KHẮC CỦA ĐỘI ----------
create table public.team_photos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caption text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
--  HÀM: kiểm tra quyền admin
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
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
      and is_active
  );
$$;

-- ============================================================
--  TỰ ĐỘNG TẠO HỒ SƠ KHI CÓ NGƯỜI DÙNG MỚI
--  • Người đăng ký ĐẦU TIÊN: tự động ADMIN + active (dùng được ngay)
--  • Các người sau: chờ admin DUYỆT (status = pending)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_first boolean;
begin
  select not exists (select 1 from public.profiles) into v_is_first;
  insert into public.profiles (id, username, full_name, display_name, jersey_number, role, status)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'username', ''),
      split_part(coalesce(new.email, 'ten'), '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      split_part(coalesce(new.email, 'ten'), '@', 1)
    ),
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'jersey_number', '')::int,
    case when v_is_first then 'admin' else 'member' end,
    case when v_is_first then 'active' else 'pending' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================
--  BẢO VỆ HỒ SƠ: không tự đổi quyền / trạng thái;
--  không khóa / hạ quyền admin cuối cùng
-- ============================================================
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin()
     and (new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.is_active is distinct from old.is_active) then
    raise exception 'Chỉ quản trị viên mới thay đổi được quyền / trạng thái tài khoản';
  end if;
  if new.is_active = false and old.is_active = true
     and old.role = 'admin'
     and (select count(*) from public.profiles
          where role = 'admin' and is_active and status = 'active') <= 1 then
    raise exception 'Không thể khóa quản trị viên cuối cùng';
  end if;
  if new.role = 'member' and old.role = 'admin'
     and new.is_active and new.status = 'active'
     and (select count(*) from public.profiles
          where role = 'admin' and is_active and status = 'active') <= 1 then
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
--  BẢO VỆ CÔNG NỢ: cầu thủ chỉ được chuyển
--  "chưa trả" -> "chờ duyệt" (nút Báo Đã Trả).
--  Mọi thao tác khác chỉ admin làm được.
-- ============================================================
create or replace function public.protect_debt_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.player_id is distinct from old.player_id
       or new.amount is distinct from old.amount
       or new.description is distinct from old.description then
      raise exception 'Không có quyền thay đổi công nợ này';
    end if;
    if not (old.status = 'unpaid' and new.status = 'pending') then
      raise exception 'Cầu thủ chỉ được báo "Đã trả" khi nợ đang ở trạng thái chưa trả';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_debt_trg on public.player_debts;
create trigger protect_debt_trg
before update on public.player_debts
for each row execute function public.protect_debt_status();

-- ============================================================
--  ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.match_attendees enable row level security;
alter table public.fund_transactions enable row level security;
alter table public.player_debts enable row level security;
alter table public.lineups enable row level security;
alter table public.trophies enable row level security;
alter table public.team_photos enable row level security;

-- ---------- PROFILES ----------
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_admin" on public.profiles;
create policy "profiles_admin" on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- MATCHES ----------
drop policy if exists "matches_read" on public.matches;
create policy "matches_read" on public.matches
  for select to authenticated using (true);

drop policy if exists "matches_admin" on public.matches;
create policy "matches_admin" on public.matches
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- MATCH ATTENDEES ----------
drop policy if exists "att_read" on public.match_attendees;
create policy "att_read" on public.match_attendees
  for select to authenticated using (true);

drop policy if exists "att_insert_own_or_admin" on public.match_attendees;
create policy "att_insert_own_or_admin" on public.match_attendees
  for insert to authenticated
  with check (player_id = auth.uid() or public.is_admin());

drop policy if exists "att_update_own_or_admin" on public.match_attendees;
create policy "att_update_own_or_admin" on public.match_attendees
  for update to authenticated
  using (player_id = auth.uid() or public.is_admin())
  with check (player_id = auth.uid() or public.is_admin());

drop policy if exists "att_delete_admin" on public.match_attendees;
create policy "att_delete_admin" on public.match_attendees
  for delete to authenticated using (public.is_admin());

-- ---------- FUND ----------
drop policy if exists "fund_read" on public.fund_transactions;
create policy "fund_read" on public.fund_transactions
  for select to authenticated using (true);

drop policy if exists "fund_admin" on public.fund_transactions;
create policy "fund_admin" on public.fund_transactions
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- PLAYER DEBTS ----------
drop policy if exists "pdebts_read" on public.player_debts;
create policy "pdebts_read" on public.player_debts
  for select to authenticated using (true);

drop policy if exists "pdebts_admin_insert" on public.player_debts;
create policy "pdebts_admin_insert" on public.player_debts
  for insert to authenticated with check (public.is_admin());

drop policy if exists "pdebts_update" on public.player_debts;
create policy "pdebts_update" on public.player_debts
  for update to authenticated
  using (player_id = auth.uid() or public.is_admin())
  with check (player_id = auth.uid() or public.is_admin());

drop policy if exists "pdebts_delete_admin" on public.player_debts;
create policy "pdebts_delete_admin" on public.player_debts
  for delete to authenticated using (public.is_admin());

-- ---------- LINEUPS ----------
drop policy if exists "lineups_read" on public.lineups;
create policy "lineups_read" on public.lineups
  for select to authenticated using (true);

drop policy if exists "lineups_admin" on public.lineups;
create policy "lineups_admin" on public.lineups
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- TROPHIES ----------
drop policy if exists "trophies_read" on public.trophies;
create policy "trophies_read" on public.trophies
  for select to authenticated using (true);

drop policy if exists "trophies_admin" on public.trophies;
create policy "trophies_admin" on public.trophies
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- TEAM PHOTOS ----------
drop policy if exists "photos_read" on public.team_photos;
create policy "photos_read" on public.team_photos
  for select to authenticated using (true);

drop policy if exists "photos_admin" on public.team_photos;
create policy "photos_admin" on public.team_photos
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
--  STORAGE: bucket lưu avatar + ảnh đội (công khai để xem được)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('team-photos', 'team-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "storage_public_read" on storage.objects;
create policy "storage_public_read" on storage.objects
  for select using (bucket_id in ('avatars', 'team-photos'));

drop policy if exists "storage_auth_write" on storage.objects;
create policy "storage_auth_write" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('avatars', 'team-photos'));

drop policy if exists "storage_auth_update" on storage.objects;
create policy "storage_auth_update" on storage.objects
  for update to authenticated
  using (bucket_id in ('avatars', 'team-photos'));

drop policy if exists "storage_admin_delete" on storage.objects;
create policy "storage_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('avatars', 'team-photos') and public.is_admin());

-- ============================================================
--  XONG! 🎉
--  Sau khi chạy: vào Auth -> Providers -> Email, tắt "Confirm email"
-- ============================================================
