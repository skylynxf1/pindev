import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/requireAdmin";

function toTitleCase(str: string) {
  return str
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) {
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

  // Fetch GitHub trending repos (active in last 30 days, 200+ stars)
  const since = daysAgo(30);
  const ghUrl = `https://api.github.com/search/repositories?q=stars:>200+pushed:>${since}&sort=stars&order=desc&per_page=20`;

  const ghHeaders: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    ghHeaders["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  let ghData: { items: GithubRepo[] };
  try {
    const ghRes = await fetch(ghUrl, { headers: ghHeaders });
    if (!ghRes.ok) {
      const text = await ghRes.text();
      return NextResponse.json(
        { error: `GitHub API error ${ghRes.status}: ${text.slice(0, 200)}` },
        { status: 502 }
      );
    }
    ghData = await ghRes.json();
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch GitHub" },
      { status: 502 }
    );
  }

  const repos: GithubRepo[] = ghData.items ?? [];

  let created = 0;
  let skipped = 0;
  const createdTitles: string[] = [];

  for (const repo of repos) {
    const title = toTitleCase(repo.name);
    const sourceUrl = repo.html_url;

    // Skip if title too short
    if (title.length < 6) {
      skipped++;
      continue;
    }

    // Use homepage as live_url; fall back to repo URL if empty
    const liveUrl = repo.homepage?.trim() || repo.html_url;

    // Deduplication: check if source_url already exists
    const { data: existing } = await supabase
      .from("pin_drafts")
      .select("id")
      .eq("source_url", sourceUrl)
      .limit(1)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    // Build tags: topics (max 8) + language
    const tags: string[] = [
      ...(repo.topics ?? []).slice(0, 8),
      ...(repo.language ? [repo.language.toLowerCase()] : []),
    ];
    const uniqueTags = Array.from(new Set(tags)).slice(0, 9);

    const draft = {
      title,
      description: repo.description
        ? repo.description.trim().slice(0, 300)
        : null,
      live_url: liveUrl,
      repo_url: repo.html_url,
      source_url: sourceUrl,
      image_url: `https://opengraph.githubassets.com/1/${repo.full_name}`,
      video_url: null,
      tags: uniqueTags,
      status: "PENDING",
    };

    const { error } = await supabase.from("pin_drafts").insert(draft);
    if (error) {
      console.error("[ingest-github] insert error for", repo.full_name, error.message);
      skipped++;
    } else {
      created++;
      createdTitles.push(title);
    }
  }

  return NextResponse.json({ created, skipped, repos: createdTitles });
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface GithubRepo {
  name: string;
  full_name: string;
  html_url: string;
  homepage: string | null;
  description: string | null;
  topics: string[];
  language: string | null;
}
