-- ============================================================
--  BitRot — Migration 002
--  Atomic decay RPC + optional pg_cron schedule
--  Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────────────────────
--  1.  shock_thought RPC
--  Referenced by supabaseClient.ts shockThought() as the primary
--  path (read-modify-write fallback used if this doesn't exist).
--  Defined here so it lives in the same migration run as decay.
-- ──────────────────────────────────────────────────────────────
create or replace function public.shock_thought(
  thought_id   uuid,
  shock_amount int4 default 20
)
returns void
language plpgsql
security definer          -- runs as the function owner, bypasses RLS
set search_path = public
as $$
begin
  update public.thoughts
  set    vitality = greatest(0, vitality - shock_amount)
  where  id = thought_id;
end;
$$;

-- ──────────────────────────────────────────────────────────────
--  2.  process_decay() — the atomic decay transaction
--
--  Step A: Reduce every row's vitality by 5 (floor 0).
--  Step B: Hard-delete every row whose vitality has hit exactly 0.
--
--  Both steps run inside a single implicit PL/pgSQL transaction,
--  so a crash between steps cannot leave the table half-updated.
--
--  Returns: JSON { decayed_count int, deleted_count int }
--  Called by: the process-decay Edge Function via supabase.rpc()
-- ──────────────────────────────────────────────────────────────
create or replace function public.process_decay()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_decayed int4;
  v_deleted int4;
begin
  -- ── Step A: decay ──────────────────────────────────────────
  -- GREATEST(0, vitality - 5) prevents underflow below 0.
  -- We capture the row count for the response payload.
  update public.thoughts
  set    vitality = greatest(0, vitality - 5)
  where  vitality > 0;          -- skip already-zero rows

  get diagnostics v_decayed = row_count;

  -- ── Step B: reap ───────────────────────────────────────────
  -- Delete thoughts that have fully decayed.
  -- The realtime DELETE event will propagate to all subscribed
  -- browser tabs automatically via the publication we set up
  -- in migration 001.
  delete from public.thoughts
  where  vitality = 0;

  get diagnostics v_deleted = row_count;

  -- ── Return summary ─────────────────────────────────────────
  return json_build_object(
    'decayed_count', v_decayed,
    'deleted_count', v_deleted
  );
end;
$$;

-- Grant execute to the anon and authenticated roles so the Edge Function
-- (which uses service_role) and any future server-side callers can invoke it.
grant execute on function public.process_decay()    to anon, authenticated;
grant execute on function public.shock_thought(uuid, int4) to anon, authenticated;

