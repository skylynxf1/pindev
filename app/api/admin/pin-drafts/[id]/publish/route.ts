import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/requireAdmin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Next.js 15+: params is a Promise — must be awaited
  const { id: draftId } = await params;

  const supabase = createAdminClient();

  // 1) Hard guard on SYSTEM_OWNER_ID
  const SYSTEM_OWNER_ID = process.env.PIN_SYSTEM_OWNER_ID;
  if (!SYSTEM_OWNER_ID || SYSTEM_OWNER_ID === "undefined" || !UUID_RE.test(SYSTEM_OWNER_ID)) {
    return NextResponse.json(
      {
        error: "PIN_SYSTEM_OWNER_ID is missing/invalid",
        hint: "Set it to a valid UUID from Supabase Auth → Users → ID in .env.local",
      },
      { status: 500 }
    );
  }

  // 2) Load draft
  const { data: draft, error: draftErr } = await supabase
    .from("pin_drafts")
    .select("*")
    .eq("id", draftId)
    .single();

  if (draftErr || !draft) {
    return NextResponse.json({ error: draftErr?.message || "Draft not found" }, { status: 404 });
  }

  if (draft.status === "PUBLISHED") {
    return NextResponse.json({ error: "Already published" }, { status: 400 });
  }

  // 3) Build pinInsert — mapping draft fields → pins columns
  //    pins table requires: owner_id, title, description, live_url,
  //                         media_url, media_type, thumbnail_url, is_published
  const mediaUrl: string = draft.image_url ?? draft.video_url ?? "";
  const mediaType: "image" | "video" = draft.video_url ? "video" : "image";

  const pinInsert = {
    owner_id:      SYSTEM_OWNER_ID,
    title:         draft.title,
    description:   draft.description ?? "",
    live_url:      draft.live_url ?? "",
    repo_url:      draft.repo_url ?? null,
    media_url:     mediaUrl,
    media_type:    mediaType,
    thumbnail_url: draft.image_url ?? mediaUrl,
    is_published:  true,
  };

  // 4) Insert pin
  const { data: pin, error: pinErr } = await supabase
    .from("pins")
    .insert(pinInsert)
    .select("id")
    .single();

  if (pinErr) {
    console.error("[publish] insert error:", pinErr.message);
    return NextResponse.json({ error: pinErr.message }, { status: 500 });
  }

  // 5) Mark draft published
  const { error: updErr } = await supabase
    .from("pin_drafts")
    .update({ status: "PUBLISHED", reviewed_at: new Date().toISOString() })
    .eq("id", draftId);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // 6) Attach tags
  if (Array.isArray(draft.tags) && draft.tags.length > 0) {
    const { data: tagRows, error: tagError } = await supabase
      .from("tags")
      .upsert(
        draft.tags.map((name: string) => ({ name })),
        { onConflict: "name", ignoreDuplicates: false }
      )
      .select("id, name");

    if (!tagError && tagRows && tagRows.length > 0) {
      await supabase.from("pin_tags").upsert(
        tagRows.map((tag: { id: string }) => ({ pin_id: pin.id, tag_id: tag.id })),
        { onConflict: "pin_id,tag_id", ignoreDuplicates: true }
      );
    }
    // Tag errors are non-fatal
  }

  return NextResponse.json({ data: { pinId: pin.id } });
}
