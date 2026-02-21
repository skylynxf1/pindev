import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function requireAgentSecret(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === process.env.PIN_AGENT_SECRET;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAgentSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: draftId } = await params;
  const body = await req.json();
  const status = String(body.status || "").toUpperCase();

  if (!["REJECTED", "PENDING"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("pin_drafts")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", draftId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { id: draftId, status } });
}
