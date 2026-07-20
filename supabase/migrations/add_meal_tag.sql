-- เพิ่มแท็กมื้อ (เช้า/กลางวัน/เย็น/ของว่าง)
-- รันใน Supabase → SQL Editor

alter table public.daily_calories
  add column if not exists meal_tag text
  check (meal_tag is null or meal_tag in ('breakfast', 'lunch', 'dinner', 'snack'));

comment on column public.daily_calories.meal_tag is 'มื้อ: breakfast | lunch | dinner | snack';

create index if not exists daily_calories_meal_tag_idx
  on public.daily_calories (meal_tag);
