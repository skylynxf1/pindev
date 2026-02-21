import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function requireAgentSecret(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const secret = process.env.PIN_AGENT_SECRET ?? "";
  return token === secret;
}

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

interface GithubRepo {
  name: string;
  full_name: string;
  html_url: string;
  homepage: string | null;
  description: string | null;
  topics: string[];
  language: string | null;
}

async function searchGithub(query: string, headers: Record<string, string>): Promise<GithubRepo[]> {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=20`;
  const res = await fetch(url, { headers });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? [];
}

export async function POST(req: Request) {
  if (!requireAgentSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const since = daysAgo(90); // broader window for design content

  const ghHeaders: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    ghHeaders["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  // 3 parallel searches targeting different UI/design categories
  const [uiRepos, animRepos, dsRepos] = await Promise.all([
    searchGithub(`topic:ui-components stars:>200 pushed:>${since}`, ghHeaders),
    searchGithub(`topic:css-animation stars:>100 pushed:>${since}`, ghHeaders),
    searchGithub(`topic:design-system stars:>200 pushed:>${since}`, ghHeaders),
  ]);

  // Merge and deduplicate within the batch by html_url
  const seen = new Set<string>();
  const allRepos: GithubRepo[] = [];
  for (const repo of [...uiRepos, ...animRepos, ...dsRepos]) {
    if (!seen.has(repo.html_url)) {
      seen.add(repo.html_url);
      allRepos.push(repo);
    }
  }

  let created = 0;
  let skipped = 0;
  const createdTitles: string[] = [];

  for (const repo of allRepos) {
    const title = toTitleCase(repo.name);
    const sourceUrl = repo.html_url;

    // Must have a live demo (homepage) — ensures visual content is accessible
    const liveUrl = repo.homepage?.trim();
    if (!liveUrl) {
      skipped++;
      continue;
    }

    if (title.length < 6) {
      skipped++;
      continue;
    }

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
      console.error("[ingest-ui] insert error for", repo.full_name, error.message);
      skipped++;
    } else {
      created++;
      createdTitles.push(title);
    }
  }

  return NextResponse.json({ created, skipped, repos: createdTitles });
}
