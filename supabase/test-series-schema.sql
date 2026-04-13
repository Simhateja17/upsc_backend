-- Test Series CMS — run in Supabase SQL Editor (or migrate via CLI).
-- Requires: public schema, storage.

create extension if not exists "pgcrypto";

-- Main series (listing card + CMS)
create table if not exists public.test_series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  thumbnail_url text,
  category_label text not null default 'GENERAL',
  listing_status text not null default 'open' check (listing_status in ('open', 'closed')),
  published boolean not null default false,
  duration_label text not null default 'Ongoing',
  enrolled_display integer not null default 0,
  rating numeric(3,2) not null default 4.50,
  price_inr integer not null default 0,
  compare_at_price_inr integer,
  discount_percent integer,
  exam_mode text not null default 'prelims',
  subject text,
  difficulty text not null default 'medium',
  questions_per_test integer not null default 20,
  sort_order integer not null default 0,
  features jsonb not null default '{"analytics": true, "aiAnalysis": false, "videoSolutions": false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.test_series_tests (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.test_series (id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  pdf_url text,
  pdf_path text,
  extracted_text text,
  time_limit_minutes integer not null default 120,
  video_solution_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.test_series_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.test_series_tests (id) on delete cascade,
  sort_order integer not null default 0,
  prompt text not null,
  options jsonb not null,
  correct_index smallint not null default 0,
  explanation text,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.test_series_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  series_id uuid not null references public.test_series (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, series_id)
);

create table if not exists public.test_series_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  test_id uuid not null references public.test_series_tests (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score integer,
  total integer,
  time_taken_seconds integer,
  submitted_at timestamptz not null default now(),
  unique (user_id, test_id)
);

create index if not exists idx_test_series_tests_series on public.test_series_tests (series_id);
create index if not exists idx_test_series_questions_test on public.test_series_questions (test_id);
create index if not exists idx_test_series_enroll_series on public.test_series_enrollments (series_id);
create index if not exists idx_test_series_enroll_user on public.test_series_enrollments (user_id);
create index if not exists idx_test_series_attempts_test on public.test_series_attempts (test_id);
create index if not exists idx_test_series_attempts_user on public.test_series_attempts (user_id);
create index if not exists idx_test_series_published on public.test_series (published, sort_order);

-- Public bucket for thumbnails & PDFs (uploads go through your API with service role).
insert into storage.buckets (id, name, public)
values ('test-series-files', 'test-series-files', true)
on conflict (id) do nothing;

-- Detail page CMS fields (added later via ALTER TABLE)
ALTER TABLE public.test_series ADD COLUMN IF NOT EXISTS tagline text;
ALTER TABLE public.test_series ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.test_series ADD COLUMN IF NOT EXISTS gradient text DEFAULT 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)';
ALTER TABLE public.test_series ADD COLUMN IF NOT EXISTS why_enroll jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.test_series ADD COLUMN IF NOT EXISTS achievements text[] DEFAULT '{}';
ALTER TABLE public.test_series ADD COLUMN IF NOT EXISTS syllabus jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.test_series ADD COLUMN IF NOT EXISTS faqs jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.test_series ADD COLUMN IF NOT EXISTS includes text[] DEFAULT '{}';
