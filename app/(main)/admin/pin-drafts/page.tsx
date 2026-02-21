"use client";

import { useEffect, useState } from "react";

type Draft = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  tags: string[];
  live_url: string | null;
  repo_url: string | null;
  source_url: string | null;
  status: string;
  created_at: string;
};

type IngestResult = {
  created: number;
  skipped: number;
  repos: string[];
} | null;

const SECRET = process.env.NEXT_PUBLIC_ADMIN_DRAFTS_SECRET ?? "";

export default function AdminPinDraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<IngestResult>(null);
  const [ingestErr, setIngestErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    const res = await fetch("/api/admin/pin-drafts?status=PENDING", {
      headers: { Authorization: `Bearer ${SECRET}` },
    });

    const json = await res.json();
    if (!res.ok) {
      setErr(json.error || "Failed to load drafts");
      setLoading(false);
      return;
    }

    setDrafts(json.data || []);
    setLoading(false);
  }

  async function publish(id: string) {
    const res = await fetch(`/api/admin/pin-drafts/${id}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    });

    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Publish failed");
      return;
    }

    setDrafts((d) => d.filter((x) => x.id !== id));
  }

  async function reject(id: string) {
    const res = await fetch(`/api/admin/pin-drafts/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "REJECTED" }),
    });

    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Reject failed");
      return;
    }

    setDrafts((d) => d.filter((x) => x.id !== id));
  }

  async function fetchGithubTrending() {
    setIngesting(true);
    setIngestResult(null);
    setIngestErr(null);

    try {
      const res = await fetch("/api/admin/ingest-github", {
        method: "POST",
        headers: { Authorization: `Bearer ${SECRET}` },
      });

      const json = await res.json();
      if (!res.ok) {
        setIngestErr(json.error || "Ingestion failed");
      } else {
        setIngestResult(json);
        // Reload drafts to show new ones
        await load();
        return; // load() already sets loading=false
      }
    } catch (e: unknown) {
      setIngestErr(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIngesting(false);
    }
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pendingCount = drafts.length;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0 }}>
          Pin Drafts{!loading && ` (${pendingCount} pending)`}
        </h1>

        <button
          onClick={fetchGithubTrending}
          disabled={ingesting}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 18px",
            borderRadius: 10,
            border: "1.5px solid var(--border)",
            background: ingesting ? "var(--surface-2)" : "var(--surface)",
            color: "var(--text)",
            cursor: ingesting ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: "0.875rem",
            opacity: ingesting ? 0.7 : 1,
          }}
        >
          {ingesting ? (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: "spin 0.8s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Fetching…
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              Fetch GitHub Trending
            </>
          )}
        </button>
      </div>

      {/* Ingest result */}
      {ingestResult && (
        <div style={{
          marginBottom: 20,
          padding: "12px 16px",
          borderRadius: 10,
          background: "var(--menthe-light, #e6f9f6)",
          border: "1px solid var(--menthe)",
          fontSize: "0.875rem",
          color: "var(--text)",
        }}>
          <strong>{ingestResult.created} draft{ingestResult.created !== 1 ? "s" : ""} created</strong>,{" "}
          {ingestResult.skipped} skipped (duplicates)
          {ingestResult.repos.length > 0 && (
            <span style={{ color: "var(--muted)", marginLeft: 8 }}>
              — {ingestResult.repos.slice(0, 5).join(", ")}{ingestResult.repos.length > 5 ? ` +${ingestResult.repos.length - 5} more` : ""}
            </span>
          )}
        </div>
      )}

      {ingestErr && (
        <div style={{
          marginBottom: 20,
          padding: "12px 16px",
          borderRadius: 10,
          background: "#fff1f1",
          border: "1px solid #f87171",
          fontSize: "0.875rem",
          color: "#b91c1c",
        }}>
          Ingestion error: {ingestErr}
        </div>
      )}

      {/* Draft list */}
      {loading ? (
        <div style={{ color: "var(--muted)", padding: "40px 0", textAlign: "center" }}>Loading drafts…</div>
      ) : err ? (
        <div style={{ color: "#b91c1c", padding: "40px 0", textAlign: "center" }}>{err}</div>
      ) : drafts.length === 0 ? (
        <div style={{ color: "var(--muted)", padding: "40px 0", textAlign: "center" }}>No pending drafts.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {drafts.map((d) => (
            <div
              key={d.id}
              style={{
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Image */}
              {d.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={d.image_url}
                  alt={d.title}
                  style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div style={{
                  width: "100%", aspectRatio: "16/9",
                  background: "var(--surface-2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--muted)", fontSize: "0.8rem",
                }}>
                  No image
                </div>
              )}

              {/* Body */}
              <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text)", lineHeight: 1.3 }}>{d.title}</div>

                {d.description && (
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.5, WebkitLineClamp: 3, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {d.description}
                  </div>
                )}

                {/* Tags */}
                {d.tags?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {d.tags.slice(0, 6).map((t) => (
                      <span key={t} style={{
                        fontSize: "0.7rem",
                        padding: "2px 8px",
                        borderRadius: 9999,
                        border: "1px solid var(--border)",
                        color: "var(--muted)",
                        background: "var(--surface-2)",
                      }}>
                        {t}
                      </span>
                    ))}
                    {d.tags.length > 6 && (
                      <span style={{ fontSize: "0.7rem", color: "var(--muted)", alignSelf: "center" }}>+{d.tags.length - 6}</span>
                    )}
                  </div>
                )}

                {/* Links */}
                <div style={{ display: "flex", gap: 8, fontSize: "0.75rem" }}>
                  {d.live_url && (
                    <a href={d.live_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--menthe)", textDecoration: "none", fontWeight: 500 }}>
                      Live ↗
                    </a>
                  )}
                  {d.repo_url && (
                    <a href={d.repo_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--muted)", textDecoration: "none" }}>
                      Repo ↗
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 4 }}>
                  <button
                    onClick={() => publish(d.id)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 8,
                      border: "none",
                      background: "var(--menthe)",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    Publish
                  </button>
                  <button
                    onClick={() => reject(d.id)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 8,
                      border: "1.5px solid #f87171",
                      background: "transparent",
                      color: "#ef4444",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
