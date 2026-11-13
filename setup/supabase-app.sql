-- Raise: connect the hosted app to Supabase.
-- Safe to run more than once. Creates nothing destructive.

-- 1. Each parent's saved progress (one row per account, only they can read or change it)
create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.app_state enable row level security;
drop policy if exists "own state read" on public.app_state;
drop policy if exists "own state write" on public.app_state;
drop policy if exists "own state update" on public.app_state;
drop policy if exists "own state delete" on public.app_state;
create policy "own state read" on public.app_state for select to authenticated using (user_id = (select auth.uid()));
create policy "own state write" on public.app_state for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own state update" on public.app_state for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own state delete" on public.app_state for delete to authenticated using (user_id = (select auth.uid()));

-- 2. Usage events for MVP analytics (a parent can add and delete their own; only the owner of the project reads them)
create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  anon boolean,
  name text not null,
  screen text,
  topic text,
  props jsonb,
  created_at timestamptz not null default now()
);
create index if not exists app_events_user on public.app_events(user_id);
create index if not exists app_events_time on public.app_events(created_at);
alter table public.app_events enable row level security;
drop policy if exists "own events add" on public.app_events;
drop policy if exists "own events delete" on public.app_events;
create policy "own events add" on public.app_events for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own events delete" on public.app_events for delete to authenticated using (user_id = (select auth.uid()));

-- 3. The live lesson feed the app reads on open: published lessons, covers, recorded voice, research sources
create or replace function public.app_catalog()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'topics', coalesce((
      select jsonb_agg(x.item order by x.pub desc, x.created_at)
      from (
        select t.created_at, (t.status = 'published') as pub,
          jsonb_build_object(
            't', to_jsonb(t) - 'research_text' - 'search_queries' - 'rewrite_notes',
            'lesson', (select to_jsonb(l) - 'read_script' - 'code_notes'
                       from public.lessons l where l.topic_id = t.id and t.status = 'published'
                       order by l.version desc nulls last, l.created_at desc limit 1),
            'sources', (select jsonb_agg(to_jsonb(s) - 'abstract') from public.sources s where s.topic_id = t.id and t.status = 'published'),
            'audio', (select jsonb_agg(to_jsonb(a) - 'body') from public.lesson_audio a
                      join public.lessons l2 on l2.id = a.lesson_id
                      where l2.topic_id = t.id and a.status = 'done' and t.status = 'published')
          ) as item
        from public.topics t
        where t.status not in ('rejected', 'archived', 'held')
      ) x
    ), '[]'::jsonb),
    'factory', jsonb_build_object(
      'published', (select count(*) from public.topics where status = 'published'),
      'queued', (select count(*) from public.topics where status not in ('published', 'rejected', 'archived', 'held')),
      'candidates', (select count(*) from public.topic_candidates),
      'sources', (select count(*) from public.sources) + (select count(*) from public.discovery_sources)
    )
  );
$$;
revoke all on function public.app_catalog() from public;
grant execute on function public.app_catalog() to anon, authenticated;

-- 4. MVP numbers for the report: run "select * from public.app_metrics;"
create or replace view public.app_metrics with (security_invoker = true) as
select
  count(distinct user_id) as people,
  count(distinct user_id) filter (where anon = false) as signed_in_with_google,
  count(distinct user_id) filter (where name = 'stage' and props->>'stage' = 'listening') as started_a_lesson,
  count(distinct user_id) filter (where name = 'stage' and props->>'stage' = 'heard') as finished_a_lesson,
  count(distinct user_id) filter (where name = 'stage' and props->>'stage' = 'planned') as planned_a_talk,
  count(distinct user_id) filter (where name = 'stage' and props->>'stage' = 'done') as had_the_talk,
  count(*) filter (where name = 'doubt') as doubts_asked
from public.app_events;
revoke all on public.app_metrics from anon, authenticated;

select 'Raise app setup done' as result, jsonb_array_length(public.app_catalog()->'topics') as topics_in_feed;
