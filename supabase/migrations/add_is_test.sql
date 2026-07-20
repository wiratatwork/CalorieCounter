-- แยกข้อมูล E2E ออกจากข้อมูลจริง (แอปหลักใช้ is_test = false เท่านั้น)
-- รันใน Supabase → SQL Editor → Run

alter table public.daily_calories
  add column if not exists is_test boolean not null default false;

comment on column public.daily_calories.is_test is
  'true = ข้อมูล E2E; แอปหลัก query เฉพาะ false';

create index if not exists daily_calories_live_created_at_idx
  on public.daily_calories (created_at desc)
  where is_test = false;
