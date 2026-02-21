import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function requireAgentSecret(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === (process.env.PIN_AGENT_SECRET ?? "");
}

// ── HN Algolia search ────────────────────────────────────────────────────────

interface HNHit {
  objectID: string;
  title: string;
  url?: string;
  points: number;
}

async function searchShowHN(query: string, minPoints = 15): Promise<HNHit[]> {
  const params = new URLSearchParams({
    tags: "show_hn",
    query,
    hitsPerPage: "15",
    numericFilters: `points>${minPoints}`,
  });
  try {
    const res = await fetch(`https://hn.algolia.com/api/v1/search?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.hits ?? [];
  } catch {
    return [];
  }
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/^Show HN:\s*/i, "")
    .replace(/^Ask HN:\s*/i, "")
    .trim();
}

// ── og:image fetcher ─────────────────────────────────────────────────────────

async function fetchOgImage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PinDev/1.0)" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) { res.body?.cancel(); return null; }

    const reader = res.body?.getReader();
    if (!reader) return null;
    const decoder = new TextDecoder();
    let html = "";
    while (html.length < 60 * 1024) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      html += decoder.decode(value, { stream: !done });
      if (html.includes("og:image")) break;
    }
    reader.cancel().catch(() => {});

    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (!match?.[1]) return null;
    const imgUrl = match[1].trim();
    if (imgUrl.startsWith("http")) return imgUrl;
    try { return new URL(imgUrl, new URL(url).origin).href; } catch { return null; }
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ── Search queries ────────────────────────────────────────────────────────────
// Each entry: the HN search term + tags to attach to drafted pins

const QUERIES: Array<{ q: string; tags: string[] }> = [
  { q: "vibecoding",                        tags: ["vibecoding"] },
  { q: "vibe coding app",                   tags: ["vibecoding", "app"] },
  { q: "mini game browser playable",        tags: ["app"] },
  { q: "interactive playground simulator",  tags: ["website", "app"] },
  { q: "css animation creative art",        tags: ["website"] },
  { q: "webgl three.js canvas experiment",  tags: ["website"] },
  { q: "indie game weekend",               tags: ["app"] },
  { q: "ai tool built weekend",            tags: ["ai-tool", "app"] },
  { q: "cursor claude vibe",              tags: ["vibecoding", "ai-tool"] },
];

// ── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  if (!requireAgentSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return await ingest();
  } catch (err) {
    console.error("[ingest-ui] unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

async function ingest() {
  const supabase = createAdminClient();

  // Run all HN searches in parallel
  const searchResults = await Promise.all(QUERIES.map(({ q }) => searchShowHN(q)));

  // Merge and deduplicate by URL; keep tags from the first matching query
  const seen = new Set<string>();
  const items: Array<{ hit: HNHit; tags: string[] }> = [];
  for (let i = 0; i < QUERIES.length; i++) {
    for (const hit of searchResults[i]) {
      if (!hit.url || seen.has(hit.url)) continue;
      seen.add(hit.url);
      items.push({ hit, tags: QUERIES[i].tags });
    }
  }

  // Only keep items with a reasonable title
  const eligible = items.filter(({ hit }) => cleanTitle(hit.title).length >= 6);

  // Fetch og:images in parallel
  const ogImages = await Promise.all(eligible.map(({ hit }) => fetchOgImage(hit.url!)));

  let created = 0;
  let skipped = 0;
  const createdTitles: string[] = [];

  for (let i = 0; i < eligible.length; i++) {
    const { hit, tags } = eligible[i];
    const imageUrl = ogImages[i];
    const title = cleanTitle(hit.title);
    const liveUrl = hit.url!;

    // Pins are visual — skip if we couldn't get an og:image
    if (!imageUrl) { skipped++; continue; }

    // Deduplication against existing drafts
    const { data: existing } = await supabase
      .from("pin_drafts")
      .select("id")
      .eq("source_url", liveUrl)
      .limit(1)
      .maybeSingle();

    if (existing) { skipped++; continue; }

    const { error } = await supabase.from("pin_drafts").insert({
      title,
      description: null,
      live_url: liveUrl,
      repo_url: null,
      source_url: liveUrl,
      image_url: imageUrl,
      video_url: null,
      tags: Array.from(new Set(tags)),
      status: "PENDING",
    });

    if (error) {
      console.error("[ingest-ui] insert error:", error.message);
      skipped++;
    } else {
      created++;
      createdTitles.push(title);
    }
  }

  return NextResponse.json({ created, skipped, repos: createdTitles });
}
