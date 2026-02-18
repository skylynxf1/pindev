import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { searchPins, getPopularTags } from '@/lib/db/queries'
import SearchResults from '@/components/search/SearchResults'
import type { Metadata } from 'next'
import type { DbPinWithRelations, DbTag } from '@/lib/db/types'

interface PageProps {
  searchParams: Promise<{ q?: string; tag?: string }>
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { q, tag } = await searchParams
  const parts: string[] = []
  if (q) parts.push(`"${q}"`)
  if (tag) parts.push(`#${tag}`)
  const label = parts.length > 0 ? parts.join(' · ') : 'Discover projects'
  return {
    title: `${label} · PinDev`,
    description: 'Search live web and AI projects on PinDev.',
  }
}

// ── Server component — runs initial search on the server for SSR ─────────────

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = '', tag = '' } = await searchParams
  const supabase = await createClient()

  const [pinsResult, tagsResult] = await Promise.all([
    searchPins(supabase, { keyword: q, tag, limit: 20 }),
    getPopularTags(supabase, 40),
  ])

  const initialPins: DbPinWithRelations[] = pinsResult.data ?? []
  const popularTags: (DbTag & { count: number })[] = tagsResult.data ?? []

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-8">
        <Suspense>
          <SearchResults
            initialPins={initialPins}
            popularTags={popularTags}
            initialKeyword={q}
            initialTag={tag}
          />
        </Suspense>
      </div>
    </main>
  )
}