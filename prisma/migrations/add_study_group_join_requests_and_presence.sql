-- Join requests for study groups (approval flow for rooms created by others)
CREATE TABLE IF NOT EXISTS public.study_group_join_requests (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id      text NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id       text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending',
  created_at    timestamptz NOT NULL DEFAULT now(),
  responded_at  timestamptz,
  CONSTRAINT study_group_join_requests_group_user_unique UNIQUE (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS study_group_join_requests_group_status_idx
  ON public.study_group_join_requests (group_id, status);
CREATE INDEX IF NOT EXISTS study_group_join_requests_user_idx
  ON public.study_group_join_requests (user_id);

-- Live "studying now" presence on membership
ALTER TABLE public.study_group_members
  ADD COLUMN IF NOT EXISTS is_studying_now boolean NOT NULL DEFAULT false;
ALTER TABLE public.study_group_members
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;
CREATE INDEX IF NOT EXISTS study_group_members_studying_idx
  ON public.study_group_members (group_id, is_studying_now);
