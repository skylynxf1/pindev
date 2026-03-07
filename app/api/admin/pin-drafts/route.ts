import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Minimal validation (keep it strict early)
  const draft = {
    title: String(body.title || "").trim(),
    description: body.description ? String(body.description).trim() : null,
    live_url: body.live_url ? String(body.live_url).trim() : null,
    repo_url: body.repo_url ? String(body.repo_url).trim() : null,
    image_url: body.image_url ? String(body.image_url).trim() : null,
    video_url: body.video_url ? String(body.video_url).trim() : null,
    tags: Array.isArray(body.tags) ? body.tags.map((t: unknown) => String(t).trim().toLowerCase()).filter(Boolean) : [],
    source_url: body.source_url ? String(body.source_url).trim() : null,
    status: "PENDING",
  };

  if (draft.title.length < 6) {
    return NextResponse.json({ error: "Title too short" }, { status: 400 });
  }
  if (!draft.image_url && !draft.video_url) {
    return NextResponse.json({ error: "image_url or video_url required" }, { status: 400 });
  }
  if (draft.tags.length > 12) {
    return NextResponse.json({ error: "Too many tags (max 12)" }, { status: 400 });
  }

  // dedupe tags
  draft.tags = Array.from(new Set(draft.tags));

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pin_drafts")
    .insert(draft)
    .select("id, status, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "PENDING";

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pin_drafts")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}