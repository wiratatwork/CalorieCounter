-- Calorie Tracker: daily_calories
-- รันใน Supabase → SQL Editor → Run

create extension if not exists "pgcrypto";

create table if not exists public.daily_calories (
  id uuid primary key default gen_random_uuid(),
  food_name text not null,
  calories integer not null check (calories >= 0),
  meal_tag text check (meal_tag is null or meal_tag in ('breakfast', 'lunch', 'dinner', 'snack')),
  created_at timestamptz not null default now()
);

comment on table public.daily_calories is 'บันทึกมื้ออาหารและแคลอรี่รายวัน';
comment on column public.daily_calories.food_name is 'ชื่อเมนู / อาหาร';
comment on column public.daily_calories.calories is 'แคลอรี่ (kcal) ต่อมื้อ';
comment on column public.daily_calories.created_at is 'เวลาที่กิน (หรือเวลาที่บันทึก)';

create index if not exists daily_calories_created_at_idx
  on public.daily_calories (created_at desc);

-- RLS: เปิดใช้ และอนุญาต anon อ่าน/เขียนได้ (แอปยังไม่มีล็อกอิน)
alter table public.daily_calories enable row level security;

drop policy if exists "anon_select_daily_calories" on public.daily_calories;
drop policy if exists "anon_insert_daily_calories" on public.daily_calories;
drop policy if exists "anon_update_daily_calories" on public.daily_calories;
drop policy if exists "anon_delete_daily_calories" on public.daily_calories;

create policy "anon_select_daily_calories"
  on public.daily_calories
  for select
  to anon, authenticated
  using (true);

create policy "anon_insert_daily_calories"
  on public.daily_calories
  for insert
  to anon, authenticated
  with check (true);

create policy "anon_update_daily_calories"
  on public.daily_calories
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "anon_delete_daily_calories"
  on public.daily_calories
  for delete
  to anon, authenticated
  using (true);

-- ตัวอย่างข้อมูล (optional)
-- insert into public.daily_calories (food_name, calories)
-- values ('ข้าวผัดกุ้ง', 550);
