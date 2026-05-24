// ─── Supabase client ──────────────────────────────────────────────────────────
//
// This singleton is imported by both server components (for data fetching)
// and client components (for realtime subscriptions).
//
// SETUP
// ─────
// 1. Go to your Supabase project → Settings → API
// 2. Copy "Project URL" and "anon public" key
// 3. Create `.env.local` and add:
//
//      NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
//      NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
//
// The NEXT_PUBLIC_ prefix exposes these to the browser bundle.
// Never put the service_role key here — that stays server-only.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ─── Database type helpers ────────────────────────────────────────────────────
// Mirrors the `thoughts` table schema so TypeScript catches column mismatches.

export interface ThoughtRow {
  id:         string;   // uuid
  content:    string;
  x_pos:      number;   // float8
  y_pos:      number;   // float8
  vitality:   number;   // int4  0–100
  created_at: string;   // timestamptz as ISO string
}

// ─── Environment validation ───────────────────────────────────────────────────

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy-project.supabase.co";
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-anon-key";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn("[Epitaph] Warning: Running with mock Supabase environment keys.");
}

// ─── Singleton client ─────────────────────────────────────────────────────────
// createClient is safe to call at module scope — Supabase manages the
// underlying WebSocket connection lazily (only opens when .channel() is used).

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnon, {
  realtime: {
    params: {
      // Increase heartbeat so long-idle tabs don't lose their subscription
      eventsPerSecond: 10,
    },
  },
});

// ─── Typed query helpers ──────────────────────────────────────────────────────

/** Fetch all thoughts ordered by creation date (oldest first → stable layout). */
export async function fetchThoughts(): Promise<ThoughtRow[]> {
  const { data, error } = await supabase
    .from("thoughts")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[Epitaph] fetchThoughts error:", error.message);
    return [];
  }
  return (data ?? []) as ThoughtRow[];
}

/** Insert a new thought and return the created row. */
export async function insertThought(
  content: string,
  x_pos: number,
  y_pos: number
): Promise<ThoughtRow | null> {
  const { data, error } = await supabase
    .from("thoughts")
    .insert({ content, x_pos, y_pos, vitality: 100 })
    .select()
    .single();

  if (error) {
    console.error("[Epitaph] insertThought error:", error.message);
    return null;
  }
  return data as ThoughtRow;
}

/** Shock a thought: subtract `amount` from its vitality (floor 0). */
export async function shockThought(
  id: string,
  amount: number = 20
): Promise<void> {
  // Use a Postgres function call to avoid a read-modify-write race condition.
  // Falls back to a manual approach if the rpc isn't defined yet.
  const { error } = await supabase.rpc("shock_thought", { thought_id: id, shock_amount: amount });

  if (error) {
    // Fallback: fetch current vitality, clamp, then update
    console.warn("[Epitaph] rpc shock_thought not found, using fallback:", error.message);
    const { data: row } = await supabase
      .from("thoughts")
      .select("vitality")
      .eq("id", id)
      .single();

    if (!row) return;
    const newVitality = Math.max(0, (row as ThoughtRow).vitality - amount);
    await supabase.from("thoughts").update({ vitality: newVitality }).eq("id", id);
  }
}
