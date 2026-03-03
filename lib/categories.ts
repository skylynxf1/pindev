/**
 * Maps individual tag names to their parent category ID.
 * Shared between Home feed filtering and Search page filtering.
 */
export const CATEGORY_TAG_MAP: Record<string, string> = {
  design: 'design', ui: 'design', ux: 'design',
  website: 'website', web: 'website', landing: 'website',
  app: 'app', mobile: 'app', ios: 'app', android: 'app',
  'ai-tool': 'ai-tool', ai: 'ai-tool', ml: 'ai-tool', llm: 'ai-tool',
  vibecoding: 'vibecoding', 'vibe-coding': 'vibecoding', vibe: 'vibecoding',
  games: 'games', game: 'games', gaming: 'games',
}
