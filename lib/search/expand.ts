/**
 * Query expansion: synonyms, basic stemming, normalization.
 *
 * Called server-side before passing the query to the Postgres RPC.
 * The expanded query string is a space-separated union of the original
 * tokens plus any synonym/stem expansions, which broadens the trigram
 * and FTS candidate pool.
 */

// ── Domain-specific synonym groups ──────────────────────────────────────────
// Each array is a group of interchangeable terms. If the user types any
// member, we also search for the others.

const SYNONYM_GROUPS: string[][] = [
  ['app', 'application', 'mobile'],
  ['ai', 'artificial intelligence', 'ai-tool', 'machine learning', 'ml', 'llm'],
  ['website', 'site', 'web', 'webpage', 'landing'],
  ['repo', 'repository', 'github', 'gitlab'],
  ['design', 'ui', 'ux', 'interface'],
  ['game', 'games', 'gaming'],
  ['vibe', 'vibecoding', 'vibe-coding', 'vibe coding'],
  ['tool', 'tools', 'utility'],
  ['api', 'endpoint', 'backend'],
  ['frontend', 'front-end', 'client-side'],
  ['dashboard', 'admin', 'panel'],
  ['chat', 'chatbot', 'messaging'],
  ['image', 'photo', 'picture'],
  ['video', 'animation', 'motion'],
  ['generator', 'gen', 'generative'],
  ['auth', 'authentication', 'login', 'signup'],
  ['ecommerce', 'e-commerce', 'shop', 'store'],
  ['database', 'db', 'sql', 'postgres'],
  ['template', 'boilerplate', 'starter'],
  ['saas', 'software as a service'],
]

// Build a fast lookup: token → set of synonyms (excluding itself)
const synonymMap = new Map<string, Set<string>>()
for (const group of SYNONYM_GROUPS) {
  for (const term of group) {
    const lower = term.toLowerCase()
    if (!synonymMap.has(lower)) synonymMap.set(lower, new Set())
    for (const other of group) {
      const otherLower = other.toLowerCase()
      if (otherLower !== lower) synonymMap.get(lower)!.add(otherLower)
    }
  }
}

// ── Basic plural/singular stemming ──────────────────────────────────────────
// Very lightweight — handles the most common English patterns only.

function basicStem(word: string): string[] {
  const stems: string[] = []

  // If word ends in 's', try removing it (games → game)
  if (word.endsWith('s') && word.length > 3) {
    stems.push(word.slice(0, -1))
  }
  // If word ends in 'es', try removing it (matches → match)
  if (word.endsWith('es') && word.length > 4) {
    stems.push(word.slice(0, -2))
  }
  // If word ends in 'ing', try removing it (coding → code)
  if (word.endsWith('ing') && word.length > 5) {
    stems.push(word.slice(0, -3))
    stems.push(word.slice(0, -3) + 'e') // coding → code
  }
  // If word does NOT end in 's', try adding it (game → games)
  if (!word.endsWith('s') && word.length > 2) {
    stems.push(word + 's')
  }

  return stems.filter(s => s.length >= 2)
}

// ── Main expansion function ─────────────────────────────────────────────────

export function expandQuery(raw: string): string {
  // Normalize: lowercase, collapse whitespace, trim
  const normalized = raw.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!normalized) return ''

  const tokens = normalized.split(' ').filter(t => t.length > 0)
  const expanded = new Set<string>(tokens)

  // Also add the full phrase (for trigram matching on multi-word queries)
  expanded.add(normalized)

  for (const token of tokens) {
    // Add synonyms
    const syns = synonymMap.get(token)
    if (syns) {
      for (const syn of syns) {
        // Only add single-word synonyms to avoid bloating the query
        if (!syn.includes(' ')) expanded.add(syn)
      }
    }

    // Add basic stems
    for (const stem of basicStem(token)) {
      expanded.add(stem)
    }
  }

  return [...expanded].join(' ')
}

/**
 * Returns just the normalized tokens (no expansion) for tag matching.
 */
export function tokenize(raw: string): string[] {
  return raw
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(t => t.length > 0)
}
