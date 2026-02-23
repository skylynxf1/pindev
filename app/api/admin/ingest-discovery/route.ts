import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

// ── Auth ──────────────────────────────────────────────────────────────────────

function requireAgentSecret(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === (process.env.PIN_AGENT_SECRET ?? "");
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isValidUrl(u: string): boolean {
  try { new URL(u); return true; } catch { return false; }
}

/** Hard timeout per source — resolves to [] if fn takes too long or throws. */
function withTimeout<T>(fn: () => Promise<T[]>, ms: number): Promise<T[]> {
  return Promise.race([
    fn().catch((): T[] => []),
    new Promise<T[]>((resolve) => setTimeout(() => resolve([]), ms)),
  ]);
}

// ── og:image fetcher ──────────────────────────────────────────────────────────

async function fetchOgImage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
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

// ── Auto-tagging ──────────────────────────────────────────────────────────────

const VIBECODING_KEYWORDS = [
  "ai", "cursor", "lovable", "replit", "bolt", "vibe", "claude", "chatgpt",
  "gpt", "llm", "built in 24", "built with ai", "weekend project",
];

function autoTag(description: string | null, title: string, existing: string[]): string[] {
  const text = ((description ?? "") + " " + title).toLowerCase();
  const tags = [...existing];
  if (VIBECODING_KEYWORDS.some((kw) => text.includes(kw)) && !tags.includes("vibecoding")) {
    tags.push("vibecoding");
  }
  return Array.from(new Set(tags)).slice(0, 8);
}

// ── Discovery item type ───────────────────────────────────────────────────────

interface DiscoveryItem {
  title: string;
  description: string | null;
  live_url: string;
  repo_url: string | null;
  source_url: string;
  image_url: string | null;
  video_url: string | null;
  tags: string[];
}

// ── Source A: Hacker News / Algolia ──────────────────────────────────────────
// Focused on AI tools, vibecoding, UI/UX design, and mini games

const HN_QUERIES: Array<{ q: string; tags: string[] }> = [
  // AI tools & vibe-coded projects
  { q: "ai tool launch",          tags: ["ai-tool", "app"] },
  { q: "built with claude",       tags: ["vibecoding", "ai-tool"] },
  { q: "built with cursor",       tags: ["vibecoding", "ai-tool"] },
  { q: "built with lovable",      tags: ["vibecoding", "ai-tool"] },
  { q: "built with bolt",         tags: ["vibecoding", "ai-tool"] },
  { q: "vibe coding",             tags: ["vibecoding"] },
  { q: "built in a weekend",      tags: ["vibecoding", "app"] },
  { q: "weekend project launch",  tags: ["vibecoding", "app"] },
  { q: "gpt wrapper tool",        tags: ["ai-tool", "app"] },
  { q: "llm app",                 tags: ["ai-tool", "app"] },
  // UI/UX & design tools
  { q: "design tool",             tags: ["design", "app"] },
  { q: "ui component library",    tags: ["design", "app"] },
  { q: "portfolio website",       tags: ["website", "design"] },
  { q: "generative art",          tags: ["website", "design"] },
  { q: "interactive animation",   tags: ["website", "design"] },
  { q: "creative coding",         tags: ["website", "design"] },
  // Games & playables
  { q: "browser game",            tags: ["app", "game"] },
  { q: "web game playable",       tags: ["app", "game"] },
  { q: "puzzle game",             tags: ["app", "game"] },
  // Open source & indie
  { q: "open source tool",        tags: ["app", "oss"] },
  { q: "indie saas",              tags: ["app"] },
];

const REPO_HOSTS = /^(www\.)?(github|gitlab|bitbucket|sourcehut|codeberg)\.(com|io|org)/;
function isRepoUrl(url: string) {
  try { return REPO_HOSTS.test(new URL(url).hostname); } catch { return false; }
}

async function sourceHN(): Promise<DiscoveryItem[]> {
  const picked = shuffle(HN_QUERIES).slice(0, rand(6, 9));
  const hitsPerPage = rand(8, 15);
  const minPoints = rand(10, 35);

  const results = await Promise.all(
    picked.map(async ({ q }) => {
      const params = new URLSearchParams({
        tags: "show_hn",
        query: q,
        hitsPerPage: String(hitsPerPage),
        numericFilters: `points>${minPoints}`,
      });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch(`https://hn.algolia.com/api/v1/search?${params}`, {
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) return [];
        const json = await res.json();
        return (json.hits ?? []) as Array<{ title: string; url?: string }>;
      } catch { clearTimeout(timer); return []; }
    })
  );

  const seen = new Set<string>();
  const items: DiscoveryItem[] = [];

  for (let i = 0; i < picked.length; i++) {
    for (const hit of results[i]) {
      if (!hit.url || seen.has(hit.url) || isRepoUrl(hit.url)) continue;
      const title = hit.title
        .replace(/^Show HN:\s*/i, "")
        .replace(/^Ask HN:\s*/i, "")
        .trim();
      if (title.length < 6) continue;
      seen.add(hit.url);
      items.push({
        title,
        description: null,
        live_url: hit.url,
        repo_url: null,
        source_url: hit.url,
        image_url: null,
        video_url: null,
        tags: picked[i].tags,
      });
    }
  }

  return shuffle(items);
}

// ── Source B: GitHub topic search ─────────────────────────────────────────────
// Topic-based search gives much better niche targeting than stars-only search

const GH_TOPIC_SETS: Array<{ topics: string[]; tags: string[] }> = [
  { topics: ["ai-tool", "chatgpt-plugin"],         tags: ["ai-tool", "app"] },
  { topics: ["claude-ai", "claude"],               tags: ["ai-tool", "vibecoding"] },
  { topics: ["openai", "gpt-4"],                   tags: ["ai-tool", "app"] },
  { topics: ["vibecoding"],                        tags: ["vibecoding", "app"] },
  { topics: ["generative-art", "creative-coding"], tags: ["design", "website"] },
  { topics: ["web-design", "ui-components"],       tags: ["design", "app"] },
  { topics: ["browser-game", "game"],              tags: ["game", "app"] },
  { topics: ["nextjs", "react"],                   tags: ["app"] },
  { topics: ["tailwindcss", "ui"],                 tags: ["design", "app"] },
  { topics: ["saas", "indie-hacker"],              tags: ["app"] },
];

async function sourceGitHub(): Promise<DiscoveryItem[]> {
  const { topics, tags } = GH_TOPIC_SETS[rand(0, GH_TOPIC_SETS.length - 1)];
  const topic = topics[rand(0, topics.length - 1)];
  const minStars = rand(5, 150);
  const page = rand(1, 5);
  const per = rand(8, 15);

  const url = `https://api.github.com/search/repositories?q=topic:${topic}+stars:>${minStars}&sort=updated&order=desc&per_page=${per}&page=${page}`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();

    const repos = (data.items ?? []) as Array<{
      name: string; full_name: string; html_url: string;
      homepage: string | null; description: string | null;
      topics: string[]; language: string | null;
    }>;

    return repos.filter((r) => r.name.length >= 3).map((r) => {
      const title = r.name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const rawTags = [
        ...(r.topics ?? []).slice(0, 5),
        ...(r.language ? [r.language.toLowerCase()] : []),
        ...tags,
      ];
      return {
        title,
        description: r.description?.trim().slice(0, 300) ?? null,
        live_url: r.homepage?.trim() || r.html_url,
        repo_url: r.html_url,
        source_url: r.html_url,
        image_url: `https://opengraph.githubassets.com/1/${r.full_name}`,
        video_url: null,
        tags: Array.from(new Set(rawTags)).slice(0, 7),
      };
    });
  } catch { clearTimeout(timer); return []; }
}

// ── Source C: Dev.to API ──────────────────────────────────────────────────────
// Public API, no auth, always returns image-bearing posts

async function sourceDevTo(): Promise<DiscoveryItem[]> {
  const tagPool = [
    "showdev", "webdev", "javascript", "typescript",
    "oss", "react", "ai", "machinelearning",
  ];
  const tag = tagPool[rand(0, tagPool.length - 1)];
  const page = rand(1, 6);
  const per = rand(6, 12);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(
      `https://dev.to/api/articles?tag=${tag}&page=${page}&per_page=${per}&state=fresh`,
      { headers: { "User-Agent": "PinDev/1.0" }, signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return [];

    const articles = (await res.json()) as Array<{
      title: string;
      description: string;
      url: string;
      cover_image: string | null;
      social_image: string | null;
      tag_list: string[];
    }>;

    return articles
      .filter((a) => a.cover_image || a.social_image)
      .map((a) => ({
        title: a.title,
        description: a.description?.slice(0, 300) ?? null,
        live_url: a.url,
        repo_url: null,
        source_url: a.url,
        image_url: a.cover_image ?? a.social_image,
        video_url: null,
        tags: a.tag_list.slice(0, 6),
      }));
  } catch { clearTimeout(timer); return []; }
}

// ── Source D: Lobste.rs API ───────────────────────────────────────────────────
// Curated tech link community — public JSON API, highly reliable

async function sourceLobsters(): Promise<DiscoveryItem[]> {
  const endpoints = ["newest", "active"];
  const endpoint = endpoints[rand(0, endpoints.length - 1)];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`https://lobste.rs/${endpoint}.json`, {
      headers: { "User-Agent": "PinDev/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];

    const stories = (await res.json()) as Array<{
      short_id: string;
      title: string;
      url: string;
      score: number;
      tags: string[];
    }>;

    return stories
      .filter((s) => s.url && isValidUrl(s.url) && !isRepoUrl(s.url) && s.score > 3)
      .slice(0, rand(6, 12))
      .map((s) => ({
        title: s.title,
        description: null,
        live_url: s.url,
        repo_url: null,
        source_url: s.url,
        image_url: null,
        video_url: null,
        tags: s.tags.slice(0, 5),
      }));
  } catch { clearTimeout(timer); return []; }
}

// ── Source E: GitHub trending stars (randomized windows) ─────────────────────
// Catch breakout repos with live demo sites

async function sourceGitHubTrending(): Promise<DiscoveryItem[]> {
  const dayWindow = [3, 7, 14][rand(0, 2)];
  const minStars = [100, 200, 500, 1000][rand(0, 3)];
  const page = rand(1, 3);
  const per = rand(6, 12);

  const since = new Date();
  since.setDate(since.getDate() - dayWindow);
  const sinceStr = since.toISOString().split("T")[0];

  const url = `https://api.github.com/search/repositories?q=stars:>${minStars}+pushed:>${sinceStr}&sort=stars&order=desc&per_page=${per}&page=${page}`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();

    const repos = (data.items ?? []) as Array<{
      name: string; full_name: string; html_url: string;
      homepage: string | null; description: string | null;
      topics: string[]; language: string | null;
    }>;

    // Only include repos that have a homepage (live demo/product site)
    return repos
      .filter((r) => r.homepage?.trim() && r.name.length >= 3)
      .map((r) => {
        const title = r.name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const rawTags = [
          ...(r.topics ?? []).slice(0, 5),
          ...(r.language ? [r.language.toLowerCase()] : []),
        ];
        return {
          title,
          description: r.description?.trim().slice(0, 300) ?? null,
          live_url: r.homepage!.trim(),
          repo_url: r.html_url,
          source_url: r.html_url,
          image_url: `https://opengraph.githubassets.com/1/${r.full_name}`,
          video_url: null,
          tags: Array.from(new Set(rawTags)).slice(0, 7),
        };
      });
  } catch { clearTimeout(timer); return []; }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  if (!requireAgentSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return await runDiscovery();
  } catch (err) {
    console.error("[ingest-discovery] unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

async function runDiscovery(): Promise<Response> {
  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Admin client init failed" },
      { status: 500 }
    );
  }

  // Run all 5 sources in parallel, each with a 7s hard cap
  const sourceEntries = shuffle([
    { name: "HN Algolia",      fn: sourceHN },
    { name: "GitHub Topics",   fn: sourceGitHub },
    { name: "Dev.to",          fn: sourceDevTo },
    { name: "Lobste.rs",       fn: sourceLobsters },
    { name: "GitHub Trending", fn: sourceGitHubTrending },
  ]);

  const results = await Promise.all(
    sourceEntries.map(({ fn }) => withTimeout(fn, 7000))
  );
  const sourcesUsed = sourceEntries.map((e) => e.name);

  // Merge and shuffle for variety across sources
  const allRaw = shuffle(results.flat());

  // Items that already have media (GitHub OG images, Dev.to covers) — keep all
  const hasMedia = allRaw.filter((item) => item.image_url || item.video_url);

  // Items that need og:image fetched (HN, Lobste.rs links) — cap at 8 to avoid timeout
  const needsOg = allRaw
    .filter((item) => !item.image_url && !item.video_url)
    .slice(0, 8);

  const ogImages = await Promise.all(needsOg.map((item) => fetchOgImage(item.live_url)));
  for (let i = 0; i < needsOg.length; i++) {
    if (ogImages[i]) needsOg[i].image_url = ogImages[i];
  }

  const eligible = shuffle([
    ...hasMedia,
    ...needsOg.filter((item) => item.image_url || item.video_url),
  ]).slice(0, rand(15, 25));

  // ── Batch deduplication (3 queries, not 3 per item) ───────────────────────

  const candidateUrls = eligible
    .map((item) => item.source_url)
    .filter((u): u is string => !!u && isValidUrl(u));

  const candidateLiveUrls = Array.from(
    new Set(eligible.map((item) => item.live_url).filter((u): u is string => !!u))
  );

  const ingestedSet = new Set<string>();
  try {
    const { data } = await supabase
      .from("ingested_sources")
      .select("source_url")
      .in("source_url", candidateUrls);
    (data ?? []).forEach((r) => ingestedSet.add(r.source_url));
  } catch { /* table may not exist yet — dedup falls back to the next two checks */ }

  const draftSet = new Set<string>();
  if (candidateUrls.length > 0) {
    const { data } = await supabase
      .from("pin_drafts")
      .select("source_url")
      .in("source_url", candidateUrls);
    (data ?? []).forEach((r) => r.source_url && draftSet.add(r.source_url));
  }

  const pinLiveSet = new Set<string>();
  if (candidateLiveUrls.length > 0) {
    const { data } = await supabase
      .from("pins")
      .select("live_url")
      .in("live_url", candidateLiveUrls);
    (data ?? []).forEach((r) => r.live_url && pinLiveSet.add(r.live_url));
  }

  // ── Filter to new items only ──────────────────────────────────────────────

  const newItems = eligible.filter((item) => {
    const url = item.source_url;
    if (!url || !isValidUrl(url)) return false;
    if (ingestedSet.has(url) || draftSet.has(url)) return false;
    if (item.live_url && pinLiveSet.has(item.live_url)) return false;
    return true;
  });

  const skipped = eligible.length - newItems.length;

  // Batch-record in ingested_sources (permanent — survives draft deletion)
  if (newItems.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { error: _ingestErr } = await supabase
      .from("ingested_sources")
      .insert(newItems.map((item) => ({ source_url: item.source_url })));
    // Intentionally ignore — table may not exist yet
  }

  // Insert drafts
  let created = 0;
  const createdTitles: string[] = [];

  for (const item of newItems) {
    const finalTags = autoTag(item.description, item.title, item.tags);
    const { error } = await supabase.from("pin_drafts").insert({
      title: item.title.slice(0, 200),
      description: item.description,
      live_url: item.live_url,
      repo_url: item.repo_url,
      source_url: item.source_url,
      image_url: item.image_url,
      video_url: item.video_url,
      tags: finalTags,
      status: "PENDING",
    });

    if (error) {
      console.error("[ingest-discovery] insert error:", error.message);
    } else {
      created++;
      createdTitles.push(item.title);
    }
  }

  return NextResponse.json({ created, skipped, repos: createdTitles, sources: sourcesUsed });
}
