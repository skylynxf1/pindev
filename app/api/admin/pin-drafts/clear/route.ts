import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function requireAgentSecret(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === (process.env.PIN_AGENT_SECRET ?? "");
}

export async function POST(req: Request) {
  if (!requireAgentSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Admin client init failed" },
      { status: 500 }
    );
  }

  // ── Backfill ingested_sources BEFORE deleting ─────────────────────────────
  // Without this, clearing drafts would erase the dedup record and the same
  // URLs would be re-ingested on the next discovery run.
  const { data: pending } = await supabase
    .from("pin_drafts")
    .select("source_url")
    .eq("status", "PENDING")
    .not("source_url", "is", null);

  if (pending && pending.length > 0) {
    const rows = (pending as { source_url: string }[])
      .map((d) => d.source_url)
      .filter(Boolean)
      .map((url) => ({ source_url: url }));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { error: _upsertErr } = await supabase
      .from("ingested_sources")
      .upsert(rows, { onConflict: "source_url", ignoreDuplicates: true });
    // Intentionally ignore — table may not exist yet
  }

  // ── Delete all PENDING drafts ─────────────────────────────────────────────
  const { data, error } = await supabase
    .from("pin_drafts")
    .delete()
    .eq("status", "PENDING")
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: data?.length ?? 0 });
}
