// app/api/cron/process-decay/route.ts
//
// Next.js Route Handler — Vercel Cron alternative to the Supabase Edge Function.
//
// Vercel Cron hits this endpoint on the schedule defined in vercel.json.
// It automatically attaches `Authorization: Bearer <CRON_SECRET>` from the
// project's environment variables, so no manual secret management is needed
// on the caller side — only on this server.
//
// This route uses the service_role key and the process_decay() RPC,
// identical to the Edge Function approach. Both can coexist safely — only
// one should be active at a time to avoid double-decay.

import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@supabase/supabase-js";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DecayResult {
  decayed_count: number;
  deleted_count: number;
  ran_at: string;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 1. Bearer-token auth ─────────────────────────────────────────────────
  // Vercel Cron injects: Authorization: Bearer <CRON_SECRET>
  // Set CRON_SECRET in Vercel Dashboard → Project Settings → Environment Variables.
  const secret = process.env.CRON_SECRET;
  const auth   = req.headers.get("authorization") ?? "";

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Supabase admin client ─────────────────────────────────────────────
  // SUPABASE_SERVICE_ROLE_KEY is NOT prefixed with NEXT_PUBLIC_ — it never
  // reaches the browser bundle.
  const supabaseUrl        = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // ── 3. Run the atomic decay RPC ──────────────────────────────────────────
  // process_decay() (defined in migration 002) performs two steps atomically:
  //   Step A: UPDATE thoughts SET vitality = GREATEST(0, vitality - 5)
  //   Step B: DELETE FROM thoughts WHERE vitality = 0
  // Realtime DELETE events will fire for step B, removing cards from all
  // subscribed browser tabs automatically.

  const { data, error } = await supabase.rpc("process_decay");

  if (error) {
    console.error("[process-decay] RPC error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result: DecayResult = {
    ...(data as { decayed_count: number; deleted_count: number }),
    ran_at: new Date().toISOString(),
  };

  console.log("[process-decay] success:", result);
  return NextResponse.json(result, { status: 200 });
}

// Explicitly block all other HTTP methods
export async function GET():    Promise<NextResponse> { return method405(); }
export async function PUT():    Promise<NextResponse> { return method405(); }
export async function DELETE(): Promise<NextResponse> { return method405(); }
export async function PATCH():  Promise<NextResponse> { return method405(); }

function method405(): NextResponse {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
