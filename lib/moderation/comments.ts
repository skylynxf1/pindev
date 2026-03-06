/**
 * Server-side comment moderation utility.
 * NEVER imported by client code — banned-word list stays server-only.
 */

// ── Banned content patterns ───────────────────────────────────────────────────
// Simple word-boundary patterns are more reliable than complex substitution chains.
// \b ensures we don't catch substrings (e.g. "classic" won't match "ass").

const BANNED_PATTERNS: RegExp[] = [
  // General profanity & insults
  /\bfuck(ing?|ed|er|s|off|you|face|wit)?\b/i,
  /\bshit(ty|bag|head|hole|face|s)?\b/i,
  /\basshole\b/i,
  /\bbitch(es|ing|y)?\b/i,
  /\bpiss\s*(off|ing)?\b/i,
  /\bcrap(py)?\b/i,
  /\bdick(head|s|face)?\b/i,
  /\bcock(sucker|s)?\b/i,
  /\bcunt(s|ing)?\b/i,
  /\bskank(s|y)?\b/i,
  /\bwhore(s|ish)?\b/i,
  /\bslut(s|ty)?\b/i,
  /\bmoron(s|ic)?\b/i,
  /\bidiot(s|ic)?\b/i,
  /\bstupid\s+(fuck|shit|bitch|ass|cunt)\b/i,
  /\bgo\s+fuck\s+yourself\b/i,
  /\bfuck\s+you\b/i,
  /\bfuck\s+off\b/i,

  // Racial slurs (common English forms)
  /\bn[i1!]+gg[ae]\b/i,
  /\bn[i1!]+gg[e3]r\b/i,
  /\bk[i1]+k[e3]\b/i,
  /\bsp[i1]c\b/i,
  /\bch[i1]nk\b/i,
  /\bg[o0]{2}k\b/i,
  /\bwetback\b/i,
  /\bjig+ab[o0]{2}\b/i,

  // Homophobic / transphobic slurs
  /\bf[a@4]g+[o0]?t?\b/i,
  /\bd[y]+k[e3]\b/i,
  /\btrann?y\b/i,

  // Threats & self-harm encouragement
  /\bkill\s+yourself\b/i,
  /\bkys\b/i,
  /\bgo\s+die\b/i,
  /\bi('ll| will| am going to)\s+(kill|hurt|murder)\s+you\b/i,
  /\byou\s+(should|deserve\s+to)\s+die\b/i,

  // Explicit sexual / NSFW
  /\bporn(ography)?\b/i,
  /\bxxx\b/i,
  /\bnudes?\b/i,
  /\bdickpic\b/i,
]

// ── Spam heuristics ───────────────────────────────────────────────────────────

const REPEATED_CHAR_RE = /(.)\1{4,}/        // 5+ of the same character in a row
const URL_RE           = /https?:\/\//g
const WORD_REPEAT_RE   = /\b(\w{3,})\b(?:.*?\b\1\b){4,}/i  // same word 5+ times

function isSpam(body: string): boolean {
  if (REPEATED_CHAR_RE.test(body)) return true

  const urlMatches = body.match(URL_RE)
  if (urlMatches && urlMatches.length >= 4) return true

  if (body.length > 15 && body === body.toUpperCase() && /[A-Z]{5,}/.test(body)) return true

  if (WORD_REPEAT_RE.test(body)) return true

  return false
}

// ── Public API ────────────────────────────────────────────────────────────────

export type ModerationResult =
  | { ok: true; reason: null }
  | { ok: false; reason: 'flagged-content' | 'spam' }

export function moderateComment(body: string): ModerationResult {
  const normalised = body.trim()

  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(normalised)) {
      return { ok: false, reason: 'flagged-content' }
    }
  }

  if (isSpam(normalised)) {
    return { ok: false, reason: 'spam' }
  }

  return { ok: true, reason: null }
}

export function moderationMessage(reason: 'flagged-content' | 'spam'): string {
  if (reason === 'spam') {
    return "Your comment looks like spam. Please write something genuine."
  }
  return "Your comment was flagged and couldn't be posted. Please keep PinDev respectful."
}
